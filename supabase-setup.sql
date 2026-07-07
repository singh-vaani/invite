-- Vaani invite RSVP backend for Supabase.
-- Run this in Supabase SQL Editor.

create table if not exists public.guests (
  token text primary key,
  host_name text not null,
  phone text default '',
  reserved_adults integer default 0 check (reserved_adults >= 0),
  reserved_kids integer default 0 check (reserved_kids >= 0),
  rsvp text default '' check (rsvp in ('', 'yes', 'no')),
  adults_coming integer default 0 check (adults_coming >= 0),
  kids_coming integer default 0 check (kids_coming >= 0),
  message text default '',
  first_open timestamptz,
  last_open timestamptz,
  view_count integer default 0 check (view_count >= 0),
  last_updated timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invite_admin_settings (
  id integer primary key default 1 check (id = 1),
  admin_key_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.guests enable row level security;
alter table public.invite_admin_settings enable row level security;

revoke all on public.guests from anon;
revoke all on public.guests from authenticated;
revoke all on public.invite_admin_settings from anon;
revoke all on public.invite_admin_settings from authenticated;

create extension if not exists pgcrypto with schema extensions;

-- Run this once in Supabase SQL Editor with your real admin key.
-- Do not commit the real key to GitHub.
--
-- insert into public.invite_admin_settings (id, admin_key_hash)
-- values (1, encode(extensions.digest('PASTE_PRIVATE_ADMIN_KEY_HERE', 'sha256'), 'hex'))
-- on conflict (id) do update set
--   admin_key_hash = excluded.admin_key_hash,
--   updated_at = now();

create or replace function public.invite_guest_json(g public.guests)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'token', g.token,
    'hostName', coalesce(g.host_name, ''),
    'phone', coalesce(g.phone, ''),
    'reservedAdults', coalesce(g.reserved_adults, 0),
    'reservedKids', coalesce(g.reserved_kids, 0),
    'rsvp', coalesce(g.rsvp, ''),
    'adultsComing', coalesce(g.adults_coming, 0),
    'kidsComing', coalesce(g.kids_coming, 0),
    'message', coalesce(g.message, ''),
    'firstOpen', coalesce(to_char(g.first_open at time zone 'America/Los_Angeles', 'Mon FMDD, YYYY FMHH12:MI AM'), ''),
    'lastOpen', coalesce(to_char(g.last_open at time zone 'America/Los_Angeles', 'Mon FMDD, YYYY FMHH12:MI AM'), ''),
    'viewCount', coalesce(g.view_count, 0),
    'lastUpdated', coalesce(to_char(g.last_updated at time zone 'America/Los_Angeles', 'Mon FMDD, YYYY FMHH12:MI AM'), '')
  );
$$;

create or replace function public.get_invite_guest(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.guests;
begin
  update public.guests
    set
      first_open = coalesce(first_open, now()),
      last_open = now(),
      view_count = coalesce(view_count, 0) + 1,
      updated_at = now()
    where token = p_token
    returning * into g;

  if g.token is null then
    return jsonb_build_object('ok', false, 'error', 'This invitation link is invalid.');
  end if;

  return jsonb_build_object('ok', true, 'guest', public.invite_guest_json(g));
end;
$$;

create or replace function public.save_invite_rsvp(
  p_token text,
  p_rsvp text,
  p_adults_coming integer,
  p_kids_coming integer,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.guests;
  clean_rsvp text := lower(coalesce(p_rsvp, ''));
  updated_time timestamptz := now();
begin
  if clean_rsvp not in ('yes', 'no') then
    return jsonb_build_object('ok', false, 'error', 'Please choose whether you are attending.');
  end if;

  update public.guests
    set
      rsvp = clean_rsvp,
      adults_coming = greatest(coalesce(p_adults_coming, 0), 0),
      kids_coming = greatest(coalesce(p_kids_coming, 0), 0),
      message = left(coalesce(p_message, ''), 1000),
      last_updated = updated_time,
      updated_at = updated_time
    where token = p_token
    returning * into g;

  if g.token is null then
    return jsonb_build_object('ok', false, 'error', 'This invitation link is invalid.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'lastUpdated', to_char(updated_time at time zone 'America/Los_Angeles', 'Mon FMDD, YYYY FMHH12:MI AM'),
    'guest', public.invite_guest_json(g)
  );
end;
$$;

create or replace function public.list_invite_guests(p_admin_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  expected_hash text;
  provided_hash text;
  guests_json jsonb;
  summary_json jsonb;
begin
  select admin_key_hash
    into expected_hash
    from public.invite_admin_settings
    where id = 1;

  if expected_hash is null then
    return jsonb_build_object('ok', false, 'error', 'Supabase admin key is not configured.');
  end if;

  provided_hash := encode(extensions.digest(coalesce(p_admin_key, ''), 'sha256'), 'hex');
  if provided_hash <> expected_hash then
    return jsonb_build_object('ok', false, 'error', 'Invalid admin key.');
  end if;

  select coalesce(jsonb_agg(public.invite_guest_json(g) order by lower(g.host_name)), '[]'::jsonb)
    into guests_json
    from public.guests g;

  select jsonb_build_object(
    'invited', count(*),
    'viewed', count(*) filter (where coalesce(view_count, 0) > 0),
    'rsvps', count(*) filter (where coalesce(rsvp, '') <> ''),
    'pending', count(*) filter (where coalesce(rsvp, '') = ''),
    'accepted', count(*) filter (where rsvp = 'yes'),
    'declined', count(*) filter (where rsvp = 'no'),
    'adults', coalesce(sum(case when rsvp = 'yes' then coalesce(adults_coming, 0) else 0 end), 0),
    'kids', coalesce(sum(case when rsvp = 'yes' then coalesce(kids_coming, 0) else 0 end), 0),
    'totalComing', coalesce(sum(case when rsvp = 'yes' then coalesce(adults_coming, 0) + coalesce(kids_coming, 0) else 0 end), 0)
  )
    into summary_json
    from public.guests;

  return jsonb_build_object(
    'ok', true,
    'source', 'supabase',
    'summary', summary_json,
    'guests', guests_json
  );
end;
$$;

grant execute on function public.get_invite_guest(text) to anon;
grant execute on function public.save_invite_rsvp(text, text, integer, integer, text) to anon;
grant execute on function public.list_invite_guests(text) to anon;
