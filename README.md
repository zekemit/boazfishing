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
| `BOAZ_SEED_SAMPLES` | unset | Set to `false` to seed the calendar without fake sample bookings (use for a live site). |
| `BLOB_READ_WRITE_TOKEN` | unset | Set automatically by Vercel when a Blob store is connected. Switches storage from local files to a private Vercel Blob. |

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
