# Boaz Fishing Co.

Summer fishing lesson site with a real booking engine and an instructor portal.
Next.js 16 (App Router), TypeScript, Tailwind, Framer Motion. No API keys, no external database.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

First request creates `data/db.json` and seeds a realistic calendar (always starting tomorrow) plus 5 sample bookings.

| URL | What |
|---|---|
| `/` | Public site + booking scheduler |
| `/admin` | Instructor portal (or footer link "Instructor login") |

Passcode: **`boaz2026`** (shown as a hint in the login modal). Change it with `ADMIN_PASSCODE`.

Production: `npm run build && npm start`.

## Settings (all optional)

Copy `.env.example` to `.env.local`.

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_PASSCODE` | `boaz2026` | Instructor passcode. Changing it signs everyone out. |
| `BUSINESS_TZ` | `America/New_York` | Time zone Boaz works in. Decides "today" and which same-day times have passed. |
| `BOAZ_DATA_DIR` | `./data` | Where `db.json` and uploaded photos live. Point at a persistent disk in production. |
| `NEXT_PUBLIC_HIDE_PASSCODE_HINT` | unset | Set to `true` **before building** to hide the passcode hint. |
| `NTFY_TOPIC`, `SMTP_USER`, `SMTP_PASS`, `BOAZ_PHONE`, `BOAZ_EMAIL`, `CRON_SECRET` | unset | Notifications. See the checklist above and `.env.example`. |
| `BOAZ_SEED_SAMPLES` | unset | Set to `false` to seed the calendar without fake sample bookings (use for a live site). |
| `BLOB_READ_WRITE_TOKEN` | unset | Set automatically by Vercel when a Blob store is connected. Switches storage from local files to a private Vercel Blob. |

## Notifications (student emails and Boaz's phone)

Nothing here needs a key to run. With no keys set, every message is **simulated** and logged in **Admin > Alerts**, so booking never breaks.

| What | When | How it is sent |
|---|---|---|
| Student confirmation email (package, date and time, backyard-to-pond details, what to bring, Boaz's contact info, calendar invite) | The moment they book | SMTP, free with a Gmail app password |
| Student approval email ("Boaz confirmed your lesson", with a calendar update) | When Boaz taps Approve | SMTP |
| Student cancellation email (time is open again, how to rebook, and a calendar cancel that removes the lesson from their calendar) | When Boaz cancels a lesson. A checkbox on the cancel prompt lets him skip it | SMTP |
| Student reminder email | About a day before (any lesson within 30 hours that has not had one) | SMTP |
| Booking alert to Boaz's phone (name, phone, package, time) | The moment someone books | ntfy push (free, no account). Optional: Twilio text, or any email address |
| Morning agenda to Boaz | Once per lesson day, after 6 AM local | Same phone channels |

`GET/POST /api/reminders` sends the scheduled ones. It is safe to call as often as you like: every reminder is claimed in a transaction before it goes out, so nothing is sent twice. It accepts the admin login, or `Authorization: Bearer $CRON_SECRET` (Vercel Cron does this by itself), or `?key=$CRON_SECRET` for any free pinger. `vercel.json` runs it daily at 11:00 UTC (7 AM Eastern in summer). Vercel's free plan only allows daily cron jobs, which is why reminders go out a day ahead rather than at an exact 24 hours.

### Turn live sending on (free)

1. **Phone alerts:** install the free **ntfy** app (iPhone or Android), tap +, subscribe to your private topic name, and set `NTFY_TOPIC` to that exact name.
2. **Student emails:** in your Google Account turn on 2-Step Verification, create an **App password**, and set `SMTP_USER` (the Gmail address) and `SMTP_PASS` (the 16-character password).
3. Set `BOAZ_PHONE` and `BOAZ_EMAIL`. They appear as Boaz's contact info in student emails.
4. Set `CRON_SECRET` to any long random string (on Vercel, the daily reminders need it).
5. Open **Admin > Alerts** and press **Send test now**. A pass means real bookings will work too.

Optional: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` add real text messages (a US number may need carrier registration, so ntfy is the simple route). `BOAZ_ALERT_EMAIL` also sends each alert to an address, and a carrier email-to-text address works there.

Privacy note: ntfy alerts pass through ntfy.sh, and the long random topic name is the only thing protecting them. Keep it private.

## Command Center (`/admin`)

- **Command:** live marsh tide, summer KPIs (upcoming lessons, lessons taught, hours on the water, estimated summer revenue) and today's agenda.
- **Tide:** NOAA Tides & Currents, no key. Default station is Charleston Harbor (8665530), the nearest NOAA gauge with live water level to the Oyster Point and Hamlin Creek marsh. It shows rising or falling, current height, next high and low, a 24-hour curve, and "Marsh Bite Window" bands (the middle half of each rising or falling tide, when the current is strongest). That is a rule of thumb, not a forecast. If NOAA is unreachable, a typical tide curve is shown and labeled simulated.
- **Availability** shows each day's high and low tides, and tells you whether each time block catches moving water.
- **Bookings:** filters for Today, This week, Pending, Upcoming, Completed, Cancelled. One-tap Call and Text buttons. A notes and skill-tracker drawer on each booking (progress tags, what was practiced, lesson notes) and a returning-student badge.
- **Integrate Calendar:** a private `.ics` link (`/api/calendar/feed.ics?token=...`) for Apple Calendar, Google Calendar and Outlook, plus Add to Google Calendar and Download .ics on every booking. "Reset link" issues a new private link.
- **Alerts:** channel status, Send test now, Run reminders now, and the full notification log.

## How booking works

- Boaz marks **open windows** (e.g. 7:00 to 11:00 AM). Guests don't book windows, they book **lessons carved out of them**: every 30 minutes inside a window where the whole lesson fits.
  A 4 hour Summer Angler fits a 7 to 11 block exactly. A 2.5 hour Sunset Session fits 5:00 to 7:30 PM. Sunset Sessions only start at 4:00 PM or later.
- The public calendar highlights only dates with at least one bookable start time. Blocked, booked and past times never appear.
- Booking = one locked transaction: re-check availability, then insert. Ten simultaneous requests for one slot produce exactly one success and nine "that time was just taken" responses.
- New bookings are **Needs approval** and hold the slot immediately. Boaz can Approve, Mark completed or Cancel. **Cancelling frees the time** on the public calendar at once. Restoring a cancelled booking fails if someone else took the time.
- Lead time: same-day times must be at least 3 hours away (`LEAD_MIN` in `src/server/availability.ts`).
- Live updates: tabs in the same browser sync instantly via `BroadcastChannel`. Across devices, pages refresh when you return to the tab and poll every 15 to 30 seconds while it is visible and in use. Polling pauses after 5 idle minutes, which keeps storage reads low.

## Admin portal

- **Bookings**: filter by upcoming / needs approval / completed / cancelled, contact links, notes, "Clear sample bookings".
- **Availability**: month and week views. In week view, tap any block to flip it between Open and Blocked. Day panel adds blocks (one-click presets or exact times). **Recurring availability** adds, blocks, reopens or removes blocks across a date range for chosen weekdays (e.g. every Sat and Sun morning in July).
- **Photos**: upload, drag and drop (with preview before saving), or paste a URL. Per-photo focus sliders, caption and alt text. Uploads are resized, auto-rotated and stripped of metadata (including GPS).

## Photos: drop-in file paths

Put a JPG at these paths and refresh, or use Admin > Photos with no file copying.

| Slot | File |
|---|---|
| Hero background | `public/images/boaz/hero.jpg` |
| Meet Boaz portrait | `public/images/boaz/bio.jpg` |
| Summer Catch Gallery 1 to 6 | `public/images/boaz/gallery-1.jpg` ... `gallery-6.jpg` |

Empty gallery slots are hidden on the site. After `npm run build`, files copied into `public/` need a rebuild or restart to be served; Admin uploads work instantly in any mode.

## Where to edit things

| To change | Edit |
|---|---|
| Headline, bio, FAQ, reviews, value props | `src/content/site.ts` |
| Lesson names, prices, durations, angler limits | `src/lib/packages.ts` |
| Colors, fonts | `tailwind.config.ts`, `src/app/layout.tsx` |
| Seed calendar and sample bookings | `src/server/seed.ts` |

## Layout

```
src/app/            pages and API routes (/api/auth, availability, bookings, photos, media)
src/server/         JSON store with write lock, availability engine, auth, validation
src/components/     site/ (public), site/booking/ (scheduler), admin/ (portal)
src/lib/            shared types, packages, date helpers
data/               db.json + uploads (created on first run, git-ignored)
```

## Before you launch

1. **Replace the three testimonials** in `src/content/site.ts` with real quotes. They are written as samples.
2. Confirm **prices, the cancellation and payment policy, age and license answers** in `src/lib/packages.ts` and `src/content/site.ts`. They are drafted, not sourced from you.
3. Set `ADMIN_PASSCODE`, `NEXT_PUBLIC_HIDE_PASSCODE_HINT=true` and `BUSINESS_TZ` (already done on the Vercel project).
4. Click **Clear sample bookings** in Admin > Bookings (they hold real time slots until removed).
5. Photos: the five provided photos are assigned to slots as a starting point. Swap any in Admin > Photos.

## Deploying

**Vercel (what is live now).** Serverless functions have no durable disk, so on Vercel the data lives in a **private Vercel Blob store**, switched on automatically when `BLOB_READ_WRITE_TOKEN` exists. Writes are conditional on the blob's ETag, so two serverless instances can never overwrite each other or double-book a slot. Reads are cached for a few seconds per instance to keep Blob operations low.

```bash
npx vercel link            # once
npx vercel deploy --prod
```

Project settings to have in place: a Blob store connected to the project, `ADMIN_PASSCODE`, `NEXT_PUBLIC_HIDE_PASSCODE_HINT=true`, `BOAZ_SEED_SAMPLES=false`, `BUSINESS_TZ`. Uploads are shrunk in the browser first, because Vercel rejects request bodies over about 4.5 MB.
Watch your Blob usage on small plans: reading and writing the database counts as Blob operations.

**Anywhere with a disk** (VPS, Fly.io or Render with a volume, Docker with a mount): run one server process and set `BOAZ_DATA_DIR` to the persistent folder. Back up by copying `data/`.

There is no email or SMS sending yet; Boaz confirms from the contact details on each booking.

## Reset

Stop the server, delete `data/`, start again. A fresh seed is created.

## Deploys

This repo is connected to the Vercel project `boaz-fishing-co`. Every push to `main` deploys to production at https://boaz-fishing-co.vercel.app and every other branch gets a preview URL.
