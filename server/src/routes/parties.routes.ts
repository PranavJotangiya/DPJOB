import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { partiesCol } from '../firebase.js';
import { badRequest, param, str, wrap } from '../http.js';
import { ownerOf, OWNER_FIELD, readOwned } from '../owner.js';
import { OwnerStreams } from '../stream.js';
import type { Party } from '../types.js';

const partiesStream = new OwnerStreams<Party>(
  'parties',
  (owner) => partiesCol.where(OWNER_FIELD, '==', owner),
  (docs) =>
    docs
      .map((d) => ({ id: d.id, name: str(d.data()['name']) }))
      .filter((p) => p.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
);

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
    const name = str(((req.body ?? {}) as Record<string, unknown>)['name']).trim();
    if (!name) throw badRequest('Party name is required');

    // Unique within this user's own list — another user may hold the same name.
    const existing = await partiesCol.where(OWNER_FIELD, '==', owner).get();
    const clash = existing.docs.some(
      (d) => str(d.data()['name']).trim().toLowerCase() === name.toLowerCase(),
    );
    if (clash) throw badRequest('That party already exists');

    const ref = await partiesCol.add({
      name,
      [OWNER_FIELD]: owner,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ id: ref.id, name });
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
