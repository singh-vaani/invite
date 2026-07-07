// Google Apps Script stays as the fallback and Sheet sync target.
// Supabase is the fast RSVP backend when supabaseUrl + supabaseAnonKey are filled.
// Do not put your admin key in this public file; enter it in admin.html when needed.
window.INVITE_CONFIG = {
  apiUrl: "https://script.google.com/macros/s/AKfycbwEMJxLSrdJWH4usiwkX7Prw5NZHG6NYlmZEKQxy2JLXkkZxmX8m-oNyHR4gBhFrEkm/exec",
  supabaseUrl: "https://wjgolkvnnhajthdcjpor.supabase.co",
  supabaseAnonKey: "sb_publishable_ap0NLXS1bvufq0_R44Ij0w_HeEsYmEe",
  adminKey: "",
  eventTitle: "Vaani's 2nd Birthday",
  location: "Thecha Restaurant & Banquet Hall, 731 S Wolfe Rd, Sunnyvale, CA 94086",
  startUTC: "20260727T010000Z",
  endUTC: "20260727T030000Z"
};
