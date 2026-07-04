
const CONFIG = window.INVITE_CONFIG || {};
let rows = [];

function setStatus(msg, error=false){
  const el = document.getElementById('status');
  el.textContent = msg || '';
  el.style.color = error ? '#9b2f2f' : '';
}

function callApi(params){
  return new Promise((resolve, reject)=>{
    if(!CONFIG.apiUrl || CONFIG.apiUrl.includes('PASTE_YOUR')) return reject(new Error('Update config.js with your Apps Script Web App URL first.'));
    const cb = 'jsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const url = new URL(CONFIG.apiUrl);
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k, v == null ? '' : String(v)));
    url.searchParams.set('callback', cb);
    const s = document.createElement('script');
    const timer = setTimeout(()=>{ cleanup(); reject(new Error('Request timed out.')); }, 15000);
    function cleanup(){ clearTimeout(timer); delete window[cb]; s.remove(); }
    window[cb] = data => { cleanup(); resolve(data); };
    s.onerror = () => { cleanup(); reject(new Error('Could not reach RSVP service.')); };
    s.src = url.toString();
    document.body.appendChild(s);
  });
}

function kpi(label, num){ return `<div class="kpi"><div class="num">${num}</div><div class="label">${label}</div></div>`; }
function badge(rsvp){
  if(rsvp === 'yes') return '<span class="badge yes">Attending</span>';
  if(rsvp === 'no') return '<span class="badge no">Declined</span>';
  return '<span class="badge pending">Pending</span>';
}
function render(data){
  rows = data.guests || [];
  const s = data.summary || {};
  document.getElementById('kpis').innerHTML = [
    kpi('Invited', s.invited || 0), kpi('Viewed', s.viewed || 0), kpi('RSVPs', s.rsvps || 0), kpi('Pending', s.pending || 0),
    kpi('Accepted', s.accepted || 0), kpi('Declined', s.declined || 0), kpi('Adults', s.adults || 0), kpi('Kids', s.kids || 0), kpi('Total Coming', s.totalComing || 0)
  ].join('');
  renderTable(rows);
  document.getElementById('csvBtn').disabled = false;
}
function renderTable(list){
  const headers = ['Host Name','RSVP','Adults','Kids','Message','Views','Last Open','Last Updated','Phone','Token'];
  const body = list.map(g => `<tr><td>${esc(g.hostName)}</td><td>${badge(g.rsvp)}</td><td>${esc(g.adultsComing)}</td><td>${esc(g.kidsComing)}</td><td>${esc(g.message)}</td><td>${esc(g.viewCount)}</td><td>${esc(g.lastOpen)}</td><td>${esc(g.lastUpdated)}</td><td>${esc(g.phone)}</td><td>${esc(g.token)}</td></tr>`).join('');
  document.getElementById('guestTable').innerHTML = `<thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody>`;
}
function esc(v){ return String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

document.getElementById('loadBtn').addEventListener('click', async()=>{
  const adminKey = document.getElementById('adminKey').value || CONFIG.adminKey;
  setStatus('Loading...');
  try{
    const data = await callApi({ action:'admin', adminKey });
    if(!data.ok) throw new Error(data.error || 'Could not load dashboard.');
    render(data);
    setStatus('Dashboard loaded.');
  }catch(err){ setStatus(err.message, true); }
});

document.getElementById('search').addEventListener('input', e=>{
  const q = e.target.value.toLowerCase();
  renderTable(rows.filter(g => JSON.stringify(g).toLowerCase().includes(q)));
});

document.getElementById('csvBtn').addEventListener('click', ()=>{
  const cols = ['hostName','rsvp','adultsComing','kidsComing','message','viewCount','lastOpen','lastUpdated','phone','token'];
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => '"' + String(r[c] ?? '').replace(/"/g,'""') + '"').join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='vaani-rsvps.csv'; a.click(); URL.revokeObjectURL(url);
});
