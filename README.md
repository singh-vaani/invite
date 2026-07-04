# Vaani 2nd Birthday Invite - Free Private RSVP System

This project keeps the existing butterfly invite design and adds:

- Private Google Sheet guest list
- Unique invite links using random tokens
- Personalized guest greeting
- Editable RSVP from the same link
- Adults/kids counts only; no food preference
- View tracking
- Separate host admin dashboard
- No paid domain, no paid hosting, no paid backend

## 1) Create the Google Sheet

Create a new Google Sheet named `Vaani Invite RSVPs`, or upload/import `guest-list-template.xlsx`.

Add a sheet/tab named `Guests` with this header row:

```text
Token,Host Name,Phone,Reserved Adults,Reserved Kids,RSVP,Adults Coming,Kids Coming,Message,First Open,Last Open,View Count,Last Updated
```

You can paste your guest list below the header. Leave RSVP-related columns blank.

Example:

```text
Token,Host Name,Phone,Reserved Adults,Reserved Kids,RSVP,Adults Coming,Kids Coming,Message,First Open,Last Open,View Count,Last Updated
,Sharma Family,4085551234,2,1,,,,,,,,
,Patel Family,6505551234,2,2,,,,,,,,
```

## 2) Add Apps Script backend

In the Google Sheet:

1. Extensions → Apps Script
2. Delete the default code
3. Paste the full contents of `google-apps-script-code.gs`
4. Replace `PASTE_PRIVATE_ADMIN_KEY_HERE` with your private admin key
5. Save
6. Run the function `fillMissingTokens` once to generate tokens
7. Authorize when Google asks

## 3) Deploy Apps Script

1. Apps Script → Deploy → New deployment
2. Type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Deploy
6. Copy the Web App URL

## 4) Update config.js

Open `config.js` and replace only the Apps Script URL:

```js
apiUrl: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

with your Apps Script Web App URL. Do not publish your admin key in `config.js`; enter it on `admin.html` only when loading the dashboard.

## 5) Generate guest links

Once tokens are generated in the sheet, create a new column called `Invite Link` and use this formula:

```excel
="https://singh-vaani.github.io/invite/?token=" & A2
```

For local testing, you can use:

```text
index.html?token=TOKEN_HERE
```

## 6) Host for free

Recommended free options:

- GitHub Pages
- Netlify
- Vercel

Upload these files:

- `index.html`
- `admin.html`
- `admin.js`
- `config.js`

Guests only need the `index.html?token=...` link.
You use `admin.html` to view RSVP totals.

## Notes

- The Google Sheet remains private.
- Guests can only load the row matching their random token.
- Guests can update RSVP by opening the same link again.
- The latest RSVP overwrites the previous RSVP, so there are no duplicate entries.
- Admin dashboard requires your private admin key.
