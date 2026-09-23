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
| `/admin/*` | new — admin panel: overview, profiles & approvals, biodata upload with matching, members, export (Excel / PDF / CSV), payments, newsletter, parent emails, team & roles |

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
| GET | `/api/admin/export.csv` | every registered member as a downloadable CSV (`export.data`) |
| GET | `/api/admin/me` | the signed-in panel user, their role name and permission list |
| GET | `/api/admin/profiles?status=` | directory profiles, filterable by `pending` / `approved` / `rejected` |
| POST | `/api/admin/profiles` | create a profile with full biodata `details`; `status` honoured only with `profiles.approve` |
| POST | `/api/admin/profiles/parse-biodata` | read one biodata PDF into form values, nothing saved |
| POST | `/api/admin/profiles/import-biodata` | bulk PDF import; each result carries its top 3 matches |
| POST | `/api/admin/profiles/:id/status` | approve (publish) / reject / unpublish (`profiles.approve`) |
| GET | `/api/admin/profiles/:id/matches` | ranked matches (1, 2, 3…) with score and reasons (`matches.view`) |
| POST | `/api/admin/profiles/match-preview` | the same ranking for an unsaved biodata |
| POST | `/api/admin/uploads/photo` | upload a directory-profile photo |
| GET | `/api/admin/export/columns` | exportable columns per dataset |
| POST | `/api/admin/export/preview` · `/export` | preview / download selected rows × columns as `xlsx`, `pdf` (`table` or `sheets`) or `csv` |
| GET | `/api/admin/email-logs` | every parent confirmation email and its delivery status |
| GET/POST/PATCH/DELETE | `/api/admin/roles` · `/api/admin/team` | roles, their permissions, and team accounts (super admin only) |

## Admin panel

`/admin/login` — a super-admin account is seeded automatically the first time
the API boots, from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env`. Its
password is re-synced to that env var on every restart, so rotating it is a
one-line change, no SQL needed. Left unset, the server falls back to
`admin@everafter.com` / `ChangeMe123!` and prints a warning on startup —
**always set both before deploying anywhere public.**

Admin sessions are entirely separate from member sessions — different login
endpoint, different token, different `localStorage` key — so a browser can
have both open without either signing the other out.

### Profiles & approvals

Every directory profile has a status: **pending**, **approved** (live) or
**rejected**. Only approved profiles appear anywhere on the public site —
`/browse`, `/matches`, profile pages, shortlists. Someone with the
`profiles.approve` permission publishes a profile with one click; anyone
without it (e.g. Staff) can only create pending profiles. Profiles carry the
full biodata — family, horoscope, education, contact and reference — in a
`details` blob, and the public profile page shows the non-private parts.

### Upload biodata & matching

`/admin/upload` is a three-step flow: upload a biodata PDF (or type it in) →
review and complete every field → see the **ranked matches** — 1, 2, 3… —
against every live opposite-gender profile and registered member, each with
its score and the exact reasons behind it (`server/src/matching.js`). Then
publish it or save it for approval. Bulk PDF import shows the top 3 matches
for each imported profile.

### Team & roles

The super admin creates team accounts at `/admin/team` and assigns each a
role. Four roles are seeded — **Staff** (upload profiles only; everything
they add waits for approval), **Content Editor**, **Manager** and
**Developer** — and new ones can be created with any combination of the
permissions in `server/src/permissions.js`. Permissions are enforced by the
API on every request; the panel only hides what a role can't use. Suspending
or re-roling an account takes effect immediately.

### Export

`/admin/export` shows every biodata (directory profiles or registered
members) as a table. Tick rows (or export everything the filters match), pick
columns, and download as **Excel** (logo header, filters, frozen header row),
**PDF** (a landscape table, or one branded biodata sheet per person with
photo) or **CSV**. The branding comes from `server/assets/`.

### Registration reference & parent confirmation

Every new registration must include a reference (name, phone, relation) —
checked in the form and again by the API. When a member enters a father's or
mother's email they're asked whether to send that parent a confirmation; the
result is shown on the success screen, recorded on the member, and listed in
**Parent Emails** in the admin panel. Mail is sent over SMTP when `SMTP_HOST`
is set, otherwise printed to the API console. Members who joined before
references were required are asked to add one on their dashboard.

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

**Existing databases:** run
[server/supabase/migrations/002_team_roles_approval.sql](server/supabase/migrations/002_team_roles_approval.sql)
once in the SQL editor, then restart the API. It adds profile approval, full
biodata details, team roles and the email log. Until it has run, the API keeps
serving the site and says so on boot and at `GET /api/health`; only those
features are unavailable. (`schema.sql` already includes it for new projects.)
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

### Email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` in
`server/.env` to actually deliver parent confirmation emails. Without them,
emails are printed to the API console and logged as "Logged only".

## Tests

```bash
cd server
npm run test:admin        # roles, approvals, matching, exports, reference (boots its own in-memory API)
npm run test:gender       # opposite-gender matching
npm run test:biodata      # biodata PDF parser
npm run verify            # full API walkthrough against a running API
```
