import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { partiesCol } from '../firebase.js';
import { badRequest, isValidPhone, normalizePhone, param, str, wrap } from '../http.js';
import { ownerOf, OWNER_FIELD, readOwned } from '../owner.js';
import { OwnerStreams } from '../stream.js';
import type { Party } from '../types.js';
import { findRegisteredName } from './users.routes.js';

const partiesStream = new OwnerStreams<Party>(
  'parties',
  (owner) => partiesCol.where(OWNER_FIELD, '==', owner),
  (docs) =>
    docs
      .map((d) => ({ id: d.id, name: str(d.data()['name']), phone: str(d.data()['phone']) }))
      .filter((p) => p.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
);

/**
 * Resolves what a party's `name` and `phone` should be saved as, given a
 * requested phone number. When the number belongs to a real, active account,
 * that account's own registered name always wins over whatever was typed —
 * this is what lets a Party's shared-lots read (`links.routes.ts`) match
 * `lot.party` by plain string equality, with no fuzzy matching anywhere. An
 * unregistered number is still stored as typed: harmless, and it starts
 * matching on its own the moment that person signs up (see `links.routes.ts`).
 */
async function resolvePartyFields(
  owner: string,
  typedName: string,
  rawPhone: unknown,
): Promise<{ name: string; phone: string }> {
  if (rawPhone === undefined) return { name: typedName, phone: '' };
  const phone = normalizePhone(rawPhone);
  if (!phone) return { name: typedName, phone: '' };
  if (!isValidPhone(phone)) throw badRequest('Enter a valid 10-digit mobile number');
  if (phone === owner) throw badRequest("You can't link your own mobile number");
  const registeredName = await findRegisteredName(phone);
  return { name: registeredName ?? typedName, phone };
}

export const partiesRouter = Router();

partiesRouter.get(
  '/stream',
  requireAuth,
  wrap(async (req, res) => partiesStream.for(ownerOf(req)).subscribe(req, res)),
);

partiesRouter.get(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    res.json(await partiesStream.for(ownerOf(req)).current());
  }),
);

partiesRouter.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const owner = ownerOf(req);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const typedName = str(b['name']).trim();
    if (!typedName) throw badRequest('Party name is required');

    const { name, phone } = await resolvePartyFields(owner, typedName, b['phone']);

    // Unique within this user's own list — another user may hold the same name.
    const existing = await partiesCol.where(OWNER_FIELD, '==', owner).get();
    const clash = existing.docs.some(
      (d) => str(d.data()['name']).trim().toLowerCase() === name.toLowerCase(),
    );
    if (clash) throw badRequest('That party already exists');

    const ref = await partiesCol.add({
      name,
      phone,
      [OWNER_FIELD]: owner,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ id: ref.id, name, phone });
  }),
);

/** Attaches, changes or clears the mobile number linked to a party. */
partiesRouter.patch(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const owner = ownerOf(req);
    const ref = partiesCol.doc(param(req, 'id'));
    const snap = await readOwned(ref, owner, 'Party not found');

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (b['phone'] === undefined) throw badRequest('Nothing to update');

    const currentName = str(snap.data()?.['name']);
    const { name, phone } = await resolvePartyFields(owner, currentName, b['phone'] || undefined);
    await ref.update({ name, phone });
    res.json({ id: ref.id, name, phone });
  }),
);

partiesRouter.delete(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ref = partiesCol.doc(param(req, 'id'));
    await readOwned(ref, ownerOf(req), 'Party not found');
    await ref.delete();
    res.status(204).end();
  }),
);
