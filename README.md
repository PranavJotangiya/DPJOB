# DP Creation — Garment Cutting Management

Angular + Firebase app for garment factory fabric-lot / cutting management.

- **App code:** [`angular-app/`](angular-app) — standalone Angular components, organized by feature under `src/app/features/`.
- **Data:** Firebase Firestore, accessed directly from the Angular app (no backend server).
- **Hosting:** Firebase Hosting, configured by the root [`firebase.json`](firebase.json).
- **PDF export:** generated client-side in the browser (jsPDF), including Hindi/Gujarati fonts.

## Local development

```bash
cd angular-app
npm install
npm start          # ng serve, http://localhost:4200
```

Fill in your Firebase project's web config in
[`angular-app/src/app/core/firebase.config.ts`](angular-app/src/app/core/firebase.config.ts)
before running — the app talks straight to Firestore.

## Deploy

```bash
cd angular-app && npm run build && cd ..
firebase deploy --only hosting,firestore:rules
```

## Structure

```
angular-app/src/app/
  core/       Firebase init, i18n (en/hi/gu), Firestore + PDF services, shared models
  shared/     small reusable UI pieces (status badge, empty state, stat cards)
  layout/     app shell (sidebar / mobile nav / topbar)
  features/   one folder per screen (dashboard, lots, cutting, bale, reports, settings, lot-form)
```
