import { Router } from 'express';
import { issueToken, requireAuth } from '../auth.js';
import { usersCol } from '../firebase.js';
import { badRequest, str, wrap } from '../http.js';
import { hashPin, pinMatches } from '../pin.js';
import type { Role, SessionUser } from '../types.js';

export const authRouter = Router();

const usersEmpty = async (): Promise<boolean> => (await usersCol.limit(1).get()).empty;

/** Drives the first-run setup screen. */
authRouter.get(
  '/setup-status',
  wrap(async (_req, res) => {
    res.json({ needsSetup: await usersEmpty() });
  }),
);

/**
 * Creates the very first user as Admin. Open on purpose — but only while the
 * `users` collection is empty, so it closes itself the moment it is used.
 */
authRouter.post(
  '/setup',
  wrap(async (req, res) => {
    if (!(await usersEmpty())) throw badRequest('Setup has already been completed');

    const b = (req.body ?? {}) as Record<string, unknown>;
    const username = str(b['username']).trim().toLowerCase();
    const pin = str(b['pin']).trim();
    if (!username) throw badRequest('Username is required');
    if (!/^\d{4,8}$/.test(pin)) throw badRequest('PIN must be 4-8 digits');

    const name = str(b['name']).trim() || username;
    await usersCol.doc(username).set({
      name,
      role: 'Admin' as Role,
      active: true,
      pinHash: hashPin(pin),
      createdAt: new Date().toISOString(),
    });

    const user: SessionUser = { username, name, role: 'Admin' };
    res.status(201).json({ token: issueToken(user), user });
  }),
);

/**
 * Username + PIN, checked server-side. The PIN hashes stay in Firestore where
 * only this server can read them, and the client gets back a signed token that
 * every other endpoint requires.
 */
authRouter.post(
  '/login',
  wrap(async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const username = str(b['username']).trim().toLowerCase();
    const pin = str(b['pin']).trim();
    if (!username || !pin) throw badRequest('Username and PIN are required');

    const snap = await usersCol.doc(username).get();
    const data = snap.data();
    // One message for every failure — no hints about which usernames exist.
    if (!snap.exists || !data || data['active'] === false || !pinMatches(pin, data['pinHash'])) {
      res.status(401).json({ error: 'Wrong username or PIN' });
      return;
    }

    const user: SessionUser = {
      username,
      name: str(data['name'], username),
      role: (data['role'] as Role) ?? 'Operator',
    };
    res.json({ token: issueToken(user), user });
  }),
);

/** Re-validates a remembered session on app start (role changes land here too). */
authRouter.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const snap = await usersCol.doc(req.user!.username).get();
    const data = snap.data();
    if (!snap.exists || !data || data['active'] === false) {
      res.status(401).json({ error: 'Session is no longer valid' });
      return;
    }
    res.json({
      username: req.user!.username,
      name: str(data['name'], req.user!.username),
      role: (data['role'] as Role) ?? 'Operator',
    });
  }),
);
