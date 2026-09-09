# DP Creation — Garment Cutting Management

Angular app for garment factory fabric-lot / cutting management, with a Node/Express
API in front of Firebase.

```
Angular (browser)  ──HTTP + SSE──▶  Node/Express API  ──firebase-admin──▶  Firestore
```

The browser holds no Firebase credentials and never reaches Firestore. Firestore's
security rules deny every client; the server is the only thing that can read or write,
using a service account.

Every account is private: each user sees and edits only the lots, parties and
suppliers they own, and nobody can read or change anyone else's account. There are
no roles — ownership is the whole permission model.

- **App code:** [`angular-app/`](angular-app) — standalone Angular components, organized by feature under `src/app/features/`.
- **API:** [`server/`](server) — Express + firebase-admin. See [`server/README.md`](server/README.md).
- **Data:** Firebase Firestore, reached only through the API.
- **Hosting:** Firebase Hosting for the front end ([`firebase.json`](firebase.json)); the API is deployed separately (any Node host).
- **PDF export:** generated client-side in the browser (jsPDF), including Hindi/Gujarati fonts.

## Local development

One-time setup — put a Firebase service account key at `server/serviceAccountKey.json`
and copy `server/.env.example` to `server/.env` (details in [`server/README.md`](server/README.md)).

```bash
npm run install:all   # root + server + angular-app
npm run dev           # API on :8080 and the app on :4200, together
```

`ng serve` proxies `/api` to `http://localhost:8080` ([`angular-app/proxy.conf.json`](angular-app/proxy.conf.json)),
so there is no CORS in development.

Run them separately if you prefer:

```bash
npm run dev:api
npm run dev:web
```

## Deploy

1. Deploy the API (`server/`) to any Node host — Render, Railway, Fly, Cloud Run, a VPS.
   Set `SESSION_SECRET`, `CORS_ORIGINS` and the service account there.
2. Point the app at it: set `apiUrl` in
   [`angular-app/src/environments/environment.production.ts`](angular-app/src/environments/environment.production.ts).
3. Ship the front end and the locked-down rules:

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

## Structure

```
server/src/
  index.ts        Express app + startup
  firebase.ts     firebase-admin init (service account)
  auth.ts         login tokens, role guards
  stream.ts       one Firestore listener fanned out over Server-Sent Events
  routes/         auth, lots, parties, users, suppliers

angular-app/src/app/
  core/       API client, live-collection (SSE), i18n (en/hi/gu), PDF service, shared models
  shared/     small reusable UI pieces (status badge, empty state, stat cards)
  layout/     app shell (sidebar / mobile nav / topbar)
  features/   one folder per screen (dashboard, lots, cutting, bale, reports, settings, lot-form)
```
