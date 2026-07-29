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
| GET | `/api/profiles` | `gender, minAge, maxAge, religion, community, maritalStatus, educationLevel, location, search, sort, page, pageSize` |
| GET | `/api/profiles/:id` | profile detail |
| POST | `/api/profiles/:id/shortlist` · `/interest` | toggles (auth) |
| GET | `/api/shortlist` | saved profiles (auth) |
| GET | `/api/stories` · `/api/media` | success stories, brand imagery |
| GET | `/api/payments/plans` | membership plans |
| POST | `/api/payments/order` · `/verify` | Razorpay order + signature check (auth) |

## Going live

### Supabase

1. Run [server/supabase/schema.sql](server/supabase/schema.sql) in the Supabase SQL editor.
2. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`.
3. `cd server && npm run seed` to load the profile and story content.

Restart the API — it switches from in-memory to Supabase with no code changes.
RLS is on for every table; the API uses the service role key and enforces access
in application code.

### Razorpay

Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (test keys first) in
`server/.env` and restart. `/membership` then opens the real Razorpay Checkout,
and `/api/payments/verify` validates the HMAC signature before activating a
membership. The service role key and the Razorpay secret stay server-side —
neither is ever sent to the browser.

Set a long random `JWT_SECRET` before deploying anywhere public.
