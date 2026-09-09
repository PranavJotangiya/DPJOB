# DP Creation API

Node + Express + TypeScript. Sits between the Angular app and Firebase: the browser
talks only to this server, and this server is the only thing holding Firebase
credentials.

## Setup

1. **Service account key** — Firebase console → Project settings → Service accounts →
   *Generate new private key*. Save it as `server/serviceAccountKey.json` (already
   gitignored). Alternatives: set `GOOGLE_APPLICATION_CREDENTIALS` to its path, or paste
   the whole JSON into `FIREBASE_SERVICE_ACCOUNT` (handy on hosts with no file system).

2. **Environment** — copy `.env.example` to `.env` and set at least `SESSION_SECRET`
   (any long random string; it signs the login tokens — changing it logs everyone out).

3. **Run**

```bash
npm install
npm run dev     # tsx watch, http://localhost:8080
npm run build && npm start   # production
```

## Endpoints

All paths are under `/api`. Everything except `/health`, `/auth/setup-status`,
`/auth/setup` and `/auth/login` needs `Authorization: Bearer <token>`.

| Method | Path | Who |
| --- | --- | --- |
| `GET` | `/health` | anyone |
| `GET` | `/auth/setup-status` | anyone |
| `POST` | `/auth/setup` | anyone, but only while there are no users |
| `POST` | `/auth/login` | anyone |
| `GET` | `/auth/me` | signed in |
| `GET` `POST` `PUT` `PATCH` `DELETE` | `/lots…` | signed in |
| `GET` `POST` `DELETE` | `/parties…` | signed in |
| `GET` `POST` `DELETE` | `/suppliers…` | signed in |
| `GET` `POST` `PATCH` `DELETE` | `/users…` | signed in |
| `GET` | `/*/stream` | signed in (SSE) |

**Every account is private, and so is its data.** Signing in is the only gate,
and what you can reach is decided by ownership, not by a role:

- Lots, parties and suppliers each carry an `ownerId` (the owner's username).
  Every read is filtered to the caller; every write stamps them as owner.
- Another user's document is reported as **404, not 403** — a 403 would confirm
  that the id exists, which is itself a leak.
- `GET /users` returns exactly one row: you. `PATCH /users/:username` refuses
  anything but your own account. Deleting accounts is not possible from the app.
- Creating an account is open to any signed-in user — that is how someone is
  onboarded now that there are no admins. The creator gets no rights over the
  new account.
- `role` is a label on the user record. It grants and withholds nothing.

Two users can hold the same lot number, party name or supplier; their data
never meets. The `--apply` migration in `src/migrate-owners.ts` is what gave
pre-ownership data an owner.

## Live updates

`/lots/stream`, `/parties/stream`, `/users/stream` and `/suppliers/stream` are
Server-Sent Event streams. The server keeps one Firestore `onSnapshot` listener per
collection **per owner** and fans it out to that owner's connected clients
(`OwnerStreams` in `src/stream.ts`) — a shared listener would hand one user another
user's rows. A listener is dropped as soon as its last subscriber disconnects.

Each message is `event: data` with the full row array. `event: stream-error` means the
Firestore listener failed. EventSource cannot set headers, so these accept the token as
`?token=…`.

## Notes

- **PINs** are hashed with the same SHA-256 scheme the browser used before, so every
  existing PIN still works — but the hashes now stay server-side.
- **Lot numbers and totals** are decided here, against the whole `lots` collection,
  instead of against whatever one browser had loaded.
- **Firestore rules** deny all client access (`../firestore.rules`); the Admin SDK
  bypasses rules, which is what makes that safe.
