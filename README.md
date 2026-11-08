# Nakshathran Travels

Nakshathran Travels is a React customer booking experience backed by a modular Express/MongoDB API for fleet onboarding, verification, route planning, permit compliance, dispatch, and Razorpay payments. Real booking and payment flows are enabled when the API and provider credentials are configured; sample fleet entries remain as a clearly labeled fallback when the live fleet API is unavailable.

## Codebase audit

| Area | Present implementation |
|---|---|
| Frontend | React 18 / Create React App, MUI landing page, sample Urbania listing, client-side filters, local booking-preview interaction |
| API | Express API under `server/`, structured errors, request IDs, CORS/security headers, rate-limited auth routes |
| Data | Mongoose schemas for users, refresh tokens, vehicles, drivers, permits, bookings, audit logs, payment events, and payment transactions |
| Auth | Email/password with bcrypt, HttpOnly 15-minute access cookies, rotating 7-day refresh tokens stored as hashes; Google, Apple, Facebook, and GitHub OAuth; Firebase phone OTP verification; role middleware |
| Fleet/dispatch | Commercial vehicle and driver records, pending verification and audit trail, active/certification-valid public fleet search, 12-hour turnaround diagnostics |
| Trip/pricing | Google Directions, state reverse geocoding, traffic-aware Distance Matrix estimates, elevation-based ghat-road review warnings, day/night driver bata, admin quote overrides |
| Payments | Razorpay INR orders and checkout, raw-body HMAC-SHA256 webhook verification, transactional/idempotent booking confirmation and payment transaction ledger |
| Tests | Node test-runner tests for core fare, permit, turnaround, routing utility, and API error/health behavior |

This repository contains the application implementation, but it is not deployed or live-verified. Integrations activate only when their credentials are present. No credentials, permits, official tax tables, or private document-storage provider are included.

## Requirements

- Node.js 20 or newer
- MongoDB (a replica set is required for transactional admin/audit operations)
- Google Maps Directions, Distance Matrix, Geocoding, Places, and Elevation APIs enabled for the supplied API key
- Provider credentials for any OAuth, Firebase phone auth, or Razorpay flows you intend to use

## Local setup

```sh
npm install
cp .env.example .env
```

Set `MONGODB_URI`, independent random `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `OAUTH_STATE_SECRET` values (each at least 32 characters), `FRONTEND_URL`, and any provider credentials you want enabled. Configure `REACT_APP_API_BASE_URL`, Firebase client settings, and a referrer-restricted `REACT_APP_GOOGLE_MAPS_API_KEY` for static route previews in the web build environment when needed.

Run the API and React development server together:

```sh
npm run dev
```

The React app is served at `http://localhost:3000`; the API listens on `http://127.0.0.1:4000`. Create React App proxies `/api` requests to the API. To run them separately, use `npm start` and `npm run start:api`.

The API will not start without a reachable MongoDB instance and `MONGODB_URI`. The React landing page can still be built separately with `npm run build`.
Production deployments disable automatic index creation; after migrating existing data and reviewing new required fleet fields, run `npm run db:indexes` as a deployment step. A MongoDB replica set is required for verification/audit updates and payment webhook transactions.

## First administrator

Set `SEED_SUPERADMIN_EMAIL` and `SEED_SUPERADMIN_PASSWORD` in your local `.env`, then run:

```sh
npm run seed:superadmin
```

The seed command creates the account only if that email is unused. It refuses to promote an existing non-superadmin account. Use the admin role-management endpoint to grant `DRIVER` or `FLEET_OWNER` roles after confirming the person's identity.

## API outline

- `POST /api/auth/register`, `/login`, `/refresh`, `/logout`; `GET /api/auth/me`
- `GET /api/auth/providers`; `GET /api/auth/oauth/:provider` and provider callback routes
- `POST /api/auth/phone/firebase` accepts a Firebase ID token after the client completes SMS OTP verification; access and refresh JWTs are only returned as HttpOnly cookies
- `GET /api/vehicles` returns only active vehicles with current insurance, fitness, PUC, and an active driver; add `startAt`, `endAt`, and optional `minSeats` to check availability and the 12-hour buffer; `POST /api/vehicles` starts vehicle verification
- Fleet owners can manage their records via `/api/vehicles/mine`, `/api/drivers/mine`, and `/api/permits/mine`; `POST /api/drivers` and `POST /api/permits` onboard pending records
- `GET /api/places/autocomplete?input=...` provides India-restricted Places suggestions
- `POST /api/bookings` plans a multi-stop route, checks permits through scheduled trip completion, and returns a fare estimate plus route warnings; `GET /api/bookings/mine`
- `GET /api/bookings/assigned` lists a driver's assigned trips
- Admin dispatch queues and verification queues are available under `/api/admin/bookings` and `/api/admin/verification/:type`
- `PATCH /api/bookings/:id/quote` and `/assign` are restricted to admins; `/start`, `/complete`, and `/cancel` enforce trip lifecycle transitions
- `POST /api/payments/create-order`; `POST /api/payments/verify-webhook`
- `PATCH /api/admin/verification/:type/:id`, `/api/admin/users/:id/role`, `/api/admin/audit/:type/:id`
- `GET /api/health`

OAuth callback URLs must match the provider console and the corresponding `*_OAUTH_CALLBACK_URL` environment values. Apple form-post callbacks require HTTPS because browsers only send the cross-site state cookie over a secure connection.

## Trip rules and estimates

- Directions route geometry is sampled at `ROUTE_STATE_SAMPLE_METERS` intervals and reverse-geocoded to identify Indian state codes. Configure an interval appropriate for route accuracy and Google Maps quota; review compliance before dispatch.
- Booking itineraries store the encoded route polyline and display a Google Static Maps preview when the frontend Maps key is configured. Route warnings include Google Directions toll hints and an elevation-gain heuristic for dispatcher review.
- A valid `AITP` or authorized state permits must cover every traversed state for the entire scheduled trip. Missing or near-expiry coverage sets `BORDER_PERMIT_REQUIRED` (and the legacy `PERMIT_TAX_REQUIRED` flag).
- `BORDER_TAX_ESTIMATES_INR` is an optional JSON object keyed by state code. If a required estimate is not configured, the API reports an incomplete estimate rather than inventing a tax amount and blocks payment until dispatch supplies a verified tax figure in the audited quote. Configure current, vehicle-specific rates only after checking official rules.
- Fare calculation uses base fare, distance × rate/km, driver bata, tolls, border taxes, surcharges, and fee waivers. Fleet rates and toll estimates are not authoritative; admins can set quote adjustments before payment.
- Assignments check both vehicle and driver schedules and reject overlaps or less than 12 hours between trips, including actual drop-off time for completed trips. Vehicles and drivers enter a 12-hour operational rest state after trip completion.
- Distance Matrix requests use traffic-aware durations when Google returns them. Elevation results use a conservative ascent heuristic to flag routes for dispatcher review; it is not an authoritative road-safety classification. Google Directions warnings are also returned. Tolls and official border-tax amounts still require dispatcher/configured inputs.
- Driver day/night bata is estimated from configured per-vehicle day/night rates and India-local trip hours. Tolls are left for dispatcher/admin quote input because no authoritative toll-price source is configured.

## Security and operations

- Never commit `.env` or provider secrets. Document URLs must use HTTPS; configure a private, access-controlled storage provider before accepting real RC, Aadhaar, or license documents.
- OAuth account linking occurs by email only when the provider marks that email verified. Firebase phone tokens are checked with Firebase Admin.
- Razorpay webhook requests are read as raw bytes and signature-checked before JSON parsing. Configure the Razorpay webhook URL and secret in both environments.
- `npm audit` currently reports transitive dependency advisories from this Create React App stack and its dependencies. Review them before production deployment; do not apply breaking automatic upgrades without testing.

## Customer frontend

The customer experience loads verified vehicles, supports sign-in via email/password, configured OAuth providers, or Firebase phone OTP, submits requests with Places Autocomplete stops, lists booking statuses, and opens Razorpay Checkout for live quotes. Payment confirmation remains server-webhook driven. If the live fleet endpoint is unreachable, illustrative data from [`src/data/vehicles.js`](src/data/vehicles.js) is shown as a non-bookable demo preview.
