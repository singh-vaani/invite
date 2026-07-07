# Vaani 2nd Birthday Invite

Live site:

- https://singh-vaani.github.io/invite/

Example personal invite:

- https://singh-vaani.github.io/invite/?token=aKjRwP

## Current setup

This project keeps the butterfly invite design and uses a hybrid RSVP backend:

- GitHub Pages hosts the public invite.
- Supabase is the fast RSVP backend.
- Google Sheet remains the fallback and host-friendly RSVP sheet.
- Personal invite links use random tokens, not public guest names.
- Guest info is cached in the browser for 24 hours after a successful lookup.
- Admin dashboard reads Supabase first and falls back to the Google Sheet.

## Backend

Supabase project:

- Project URL: `https://wjgolkvnnhajthdcjpor.supabase.co`
- Region: West US / North California
- Public RPC functions:
  - `get_invite_guest`
  - `save_invite_rsvp`
  - `list_invite_guests`
- Schema file: `supabase-setup.sql`

Important: do not put a Supabase service role key or Google admin key in public files. The current `config.js` only contains the publishable Supabase key and the Google Apps Script URL.

The Supabase admin key is stored as a SHA-256 hash in `public.invite_admin_settings`. Run the commented setup statement in `supabase-setup.sql` from Supabase SQL Editor with the real admin key. Do not commit the real key.

## Google Sheet

The Sheet is still the source the host can easily read and manage. It should have a `Guests` tab with these columns:

```text
Token,Host Name,Phone,Reserved Adults,Reserved Kids,RSVP,Adults Coming,Kids Coming,Message,First Open,Last Open,View Count,Last Updated,Invite Link,Invite Message
```

The `Invite Message` column should use this message format:

```text
Hi [Host Name],
With joyful hearts, we invite you to celebrate Vaani's 2nd Birthday.
Come join us for an evening filled with butterflies, laughter, delicious food, sweet memories, and lots of love as our little Vaani turns two.
Please open your personal invite and RSVP here:
[Invite Link]
We can't wait to celebrate Vaani's special day with you.
With love
```

The Apps Script file is `google-apps-script-code.gs`.

Apps Script deployment settings:

1. Apps Script → Deploy → New deployment
2. Type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Deploy
6. Copy the Web App URL

## config.js

`config.js` currently points the live site at both services:

```text
apiUrl: Google Apps Script fallback and Sheet sync URL
supabaseUrl: Supabase project URL
supabaseAnonKey: Supabase publishable key
```

Do not publish the admin key in `config.js`. Enter the admin key on `admin.html` only when loading the dashboard.

## Guest links

Each guest opens:

```text
https://singh-vaani.github.io/invite/?token=TOKEN_HERE
```

The current live test token is:

```text
https://singh-vaani.github.io/invite/?token=aKjRwP
```

## RSVP flow

1. Guest opens a personal link.
2. The invite tries Supabase first for a faster response.
3. If Supabase is unavailable, the invite falls back to Google Apps Script.
4. When a guest submits RSVP, Supabase saves first.
5. Google Sheet sync runs in the background after the Supabase save.
6. If Supabase save fails, the invite falls back to saving through Google Apps Script.

## Admin flow

1. Open `admin.html`.
2. Enter the private admin key.
3. The dashboard tries Supabase first through `list_invite_guests`.
4. If Supabase admin results are unavailable, the dashboard falls back to the Google Sheet admin endpoint.
5. The badge below the controls shows whether the current results came from Supabase live results or Google Sheet fallback.

## Deployment

GitHub repository:

- https://github.com/singh-vaani/invite

GitHub Pages URL:

- https://singh-vaani.github.io/invite/

The site is deployed from the `main` branch through GitHub Pages.
