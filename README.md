# EverAfter — Matrimonial Platform

A full-stack matrimonial application built from the Google Stitch design screens.
Next.js frontend, Node.js/Express backend, Supabase for data, Razorpay for payments.

```text
web/      Next.js 15 (App Router, TypeScript, Tailwind) — frontend
server/   Node.js + Express — REST API, Supabase, Razorpay
```

## Running locally

Two terminals:

```bash
cd server && npm install && npm start     # http://localhost:4000
cd web    && npm install && npm run dev   # http://localhost:3000
```

Open **[http://localhost:3000](http://localhost:3000)**.

It runs with no credentials at all. Without Supabase keys the API serves seeded
data from memory; without Razorpay keys checkout completes as a local
simulation. Both are reported at `GET /api/health`.

## Pages

| Route | Built from |
| --- | --- |
| `/` | `home.html` — hero, live search, about, recent profiles, why choose us |
| `/browse` | `browse_profiles.html` — filter rail, sorting, pagination |
| `/profile/[id]` | new — full profile detail, shortlist, express interest |
| `/register` | `register.html` — two-step signup with progress bar |
| `/login` | new — sign in |
| `/success-stories` | `success_stories.html` — story carousel, film, app promo |
| `/membership` | new — plans and Razorpay checkout |
| `/shortlist` | new — saved profiles |
| `/help` | new — the footer's About / Safety / Support / Terms links |
| `/onboarding` | new — the full matrimonial profile wizard (family, career, horoscope, photos) every member fills in after registering |
| `/matches` | new — the matching algorithm's output: opposite-gender profiles ranked by `scoreMatch`, no filters to set |
| `/interests` | new — profiles you've expressed interest in (tabbed with `/shortlist`) |
| `/admin/login`, `/admin/dashboard` | new — super-admin panel: search members, view full profiles, export CSV |

The "Eternal Union" design tokens from the original Stitch design system are
transcribed into [web/tailwind.config.ts](web/tailwind.config.ts) — colours,
type scale, spacing and shadows all carry over, so the markup uses the same
class names as the original screens. That config is now the single source of
truth for the design language; the Stitch export has been removed.

## API

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/health` | which database and payment mode are active |
| POST | `/api/auth/register` · `/login` | returns a JWT |
| GET | `/api/auth/me` | current user (auth) |
| PATCH | `/api/auth/me` | save any part of the matrimonial profile — `{ phone?, details? }`, merged (auth) |
| POST | `/api/uploads/photo` | multipart photo upload, `field="photo"`, ≤5MB JPEG/PNG/WebP (auth) |
| DELETE | `/api/uploads/photo` | remove a photo, `{ url }` (auth) |
| GET | `/api/profiles` | `gender, minAge, maxAge, religion, community, maritalStatus, educationLevel, location, search, sort, page, pageSize`; adds `is_shortlisted`/`is_interested` per item when authed |
| GET | `/api/profiles/:id` | profile detail, same viewer flags |
| POST | `/api/profiles/:id/shortlist` · `/interest` | toggles (auth) |
| GET | `/api/shortlist` · `/api/interests` | saved / interested profiles (auth) |
| GET | `/api/matches` | the matching algorithm — opposite-gender profiles ranked by `match_score`, paginated (auth) |
| GET | `/api/stories` · `/api/media` | success stories, brand imagery |
| GET | `/api/payments/plans` | membership plans |
| POST | `/api/payments/order` · `/verify` | Razorpay order + signature check (auth) |
| POST | `/api/admin/login` | separate from member login — only succeeds for a `role: 'admin'` account |
| GET | `/api/admin/members` | paginated, searchable member list with full profiles (admin) |
| GET | `/api/admin/members/:id` | single member's full profile (admin) |
| GET | `/api/admin/export.csv` | every registered member as a downloadable CSV (admin) |

## Admin panel

`/admin/login` — a super-admin account is seeded automatically the first time
the API boots, from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env`. Its
password is re-synced to that env var on every restart, so rotating it is a
one-line change, no SQL needed. Left unset, the server falls back to
`admin@everafter.com` / `ChangeMe123!` and prints a warning on startup —
**always set both before deploying anywhere public.**

The dashboard lists every registered member (search by name/email, paginated),
a detail drawer per member showing the complete profile including uploaded
photos, and a CSV export of the full member table.

Admin sessions are entirely separate from member sessions — different login
endpoint, different token, different `localStorage` key — so a browser can
have both open without either signing the other out.

## Member profiles &amp; photo uploads

Registration (`/register`) captures only identity + password, matching the
original design screen. Everything else — height, religion, horoscope,
family, career, about-me, partner preferences — is filled in afterwards on
`/onboarding` (linked from the header as **My Profile** once signed in), saved
section by section via `PATCH /api/auth/me`. Nothing there is required to
browse or shortlist profiles.

Photos upload to local disk under `server/uploads/<userId>/` and are served by
the API at `/uploads/...` (proxied by Nginx in production — see
[deploy/nginx.conf](deploy/nginx.conf)). This directory holds real user data:
it's gitignored, and **isn't covered by anything in this repo** — back it up
separately, or swap the storage in `server/src/routes/uploads.js` for Supabase
Storage / S3 if durability matters before user photos accumulate.

## Matching algorithm

`/matches` (auth) is the automatic side of the site: sign in as a man and
every result is a woman, and vice versa — no gender toggle, nothing to
configure. It's `GET /api/matches`, which:

1. Hard-filters the profile directory to the opposite gender of the signed-in
   member (`server/src/store.js#getMatches`).
2. Scores every candidate against the viewer's own `/onboarding` details with
   `scoreMatch` — religion (+25), community (+15), city or state (+10/+5),
   diet (+10), marital status (+10), age within 5/10 years (+10/+5), verified
   (+5).
3. Sorts by that score, highest first.

It's rule-based and fully explainable on purpose — every point in a score
traces to a specific field match, which matters for a matrimonial audience
more than a black-box model would. The emptier a member's onboarding profile,
the more `/matches` degenerates to "verified members first" — filling in
`/onboarding` is what makes the ranking mean something.

The directory it ranks over is seeded with 64 profiles: the original 24 from
the design screens plus 20 male + 20 female additions in
`server/src/data/seed.js`, added so `/matches` has a real pool on both sides
from day one. Their photos are [randomuser.me](https://randomuser.me)
portraits — a placeholder-photo service built for exactly this purpose, not
real individuals' photos.

## Going live

### Supabase

1. Run [server/supabase/schema.sql](server/supabase/schema.sql) in the Supabase SQL editor.
2. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`.
3. `cd server && npm run seed` to load the profile and story content.

Restart the API — it switches from in-memory to Supabase with no code changes.
RLS is on for every table; the API uses the service role key and enforces access
in application code.

`schema.sql` is safe to re-run against a database you already created — the
`role`, `phone`, `photo_url`, `photos` and `details` columns on `users` are
added with `add column if not exists`, so running it again just picks up
anything new without touching existing rows.

### Razorpay

Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (test keys first) in
`server/.env` and restart. `/membership` then opens the real Razorpay Checkout,
and `/api/payments/verify` validates the HMAC signature before activating a
membership. The service role key and the Razorpay secret stay server-side —
neither is ever sent to the browser.

Set a long random `JWT_SECRET` before deploying anywhere public.
