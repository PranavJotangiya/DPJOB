import { Router } from 'express';
import { FieldPath } from 'firebase-admin/firestore';
import { requireAuth } from '../auth.js';
import { usersCol } from '../firebase.js';
import { badRequest, isValidPhone, normalizePhone, notFound, param, str, wrap } from '../http.js';
import { hashPin } from '../pin.js';
import { ownerOf } from '../owner.js';
import { OwnerStreams } from '../stream.js';
import { ROLE_OPTIONS, type PublicUser, type Role } from '../types.js';

/**
 * Accounts are private. A signed-in user can read and change exactly one
 * account — their own — and can create a new account for someone else. Nobody
 * can read, rename, re-PIN, deactivate or delete another user, and the user
 * list never names anyone but the caller.
 *
 * `pinHash` is dropped here and never appears in any response.
 */
const usersStream = new OwnerStreams<PublicUser>(
  'users',
  // The "owner" of a user record is the record itself, so the scoped query is
  // simply "the document whose id is my username".
  (username) => usersCol.where(FieldPath.documentId(), '==', username),
  (docs) =>
    docs.map((d) => {
      const data = d.data();
      return {
        username: d.id,
        name: str(data['name'], d.id),
        role: (data['role'] as Role) ?? 'Operator',
        active: data['active'] !== false,
        createdAt: str(data['createdAt']),
      };
    }),
);

const validRole = (value: unknown): value is Role => ROLE_OPTIONS.includes(value as Role);
const validPin = (pin: string): boolean => /^\d{4,8}$/.test(pin);

/**
 * Looks up another account by mobile number — the one deliberate exception to
 * "you can only see your own account" in this file. Returns only the name (or
 * null if there is no matching active account), so a party/jobber link can be
 * confirmed before it's made. Nothing else about the account is ever exposed
 * this way — no role, no createdAt, nothing. Used by the `/lookup` route
 * below and by `parties.routes.ts` / `links.routes.ts` when a phone number is
 * attached to a party record.
 */
export async function findRegisteredName(phone: string): Promise<string | null> {
  if (!isValidPhone(phone)) return null;
  const snap = await usersCol.doc(phone).get();
  const data = snap.data();
  if (!snap.exists || !data || data['active'] === false) return null;
  return str(data['name'], phone);
}

/** Refuses anything that is not the caller's own account. */
function requireSelf(caller: string, target: string): void {
  if (caller !== target) {
    // Reported as missing rather than forbidden: a 403 would confirm the
    // account exists, which is itself something the caller may not know.
    throw notFound('User not found');
  }
}

export const usersRouter = Router();

usersRouter.get(
  '/stream',
  requireAuth,
  wrap(async (req, res) => usersStream.for(ownerOf(req)).subscribe(req, res)),
);

usersRouter.get(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    res.json(await usersStream.for(ownerOf(req)).current());
  }),
);

/**
 * Looks up whether a mobile number belongs to a registered, active account —
 * and whose. This exists so a party/jobber link can be confirmed before it's
 * made (see the party-phone feature in `parties.routes.ts` and
 * `links.routes.ts`); it returns only a name, nothing else about the account.
 */
usersRouter.get(
  '/lookup',
  requireAuth,
  wrap(async (req, res) => {
    const phone = normalizePhone(req.query['phone']);
    if (!isValidPhone(phone)) throw badRequest('Enter a valid 10-digit mobile number');
    res.json({ name: await findRegisteredName(phone) });
  }),
);

/**
 * Creating an account is open to any signed-in user — that is how a new person
 * is onboarded now that there are no admins. The creator gets no rights over
 * the account afterwards; it starts empty and belongs to whoever signs into it.
 */
usersRouter.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const username = normalizePhone(b['username']);
    const pin = str(b['pin']).trim();
    // Role is no longer surfaced in the app; accept it if a caller still sends a
    // valid one, otherwise fall back to a neutral default. It has no effect on
    // access — being signed in is the only thing that gates anything.
    const role: Role = validRole(b['role']) ? b['role'] : 'Operator';

    if (!isValidPhone(username)) throw badRequest('Enter a valid 10-digit mobile number');
    if (!validPin(pin)) throw badRequest('PIN must be 4-8 digits');
    if ((await usersCol.doc(username).get()).exists) throw badRequest('That mobile number is already registered');

    await usersCol.doc(username).set({
      name: str(b['name']).trim() || username,
      role,
      active: true,
      pinHash: hashPin(pin),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ username });
  }),
);

usersRouter.patch(
  '/:username',
  requireAuth,
  wrap(async (req, res) => {
    const username = param(req, 'username').toLowerCase();
    requireSelf(ownerOf(req), username);

    const ref = usersCol.doc(username);
    if (!(await ref.get()).exists) throw notFound('User not found');

    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (b['pin'] !== undefined) {
      const pin = str(b['pin']).trim();
      if (!validPin(pin)) throw badRequest('PIN must be 4-8 digits');
      patch['pinHash'] = hashPin(pin);
    }
    if (b['role'] !== undefined) {
      if (!validRole(b['role'])) throw badRequest('Unknown role');
      patch['role'] = b['role'];
    }
    if (b['name'] !== undefined) patch['name'] = str(b['name']).trim() || username;
    if (b['active'] === false) throw badRequest('You cannot deactivate your own account');

    if (Object.keys(patch).length === 0) throw badRequest('Nothing to update');
    await ref.update(patch);
    res.json({ username });
  }),
);

/**
 * Deleting accounts is not possible from the app. Your own account would strand
 * every lot you own, and another user's is not yours to delete — so this always
 * refuses, and a real removal is done in the Firebase console.
 */
usersRouter.delete(
  '/:username',
  requireAuth,
  wrap(async (req, res) => {
    requireSelf(ownerOf(req), param(req, 'username').toLowerCase());
    void res;
    throw badRequest('Accounts cannot be deleted from the app');
  }),
);
