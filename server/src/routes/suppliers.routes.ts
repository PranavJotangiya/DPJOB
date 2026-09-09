import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { suppliersCol } from '../firebase.js';
import { badRequest, param, str, wrap } from '../http.js';
import { ownerOf, OWNER_FIELD, readOwned } from '../owner.js';
import { OwnerStreams } from '../stream.js';

const DEFAULT_SUPPLIERS = ['MTLNY', 'JAYDEEP', 'SUGAM', 'RUDRA', 'AMMEF', 'KAPIL', 'MGB', 'VISHAL'];

const suppliersStream = new OwnerStreams<string>(
  'suppliers',
  (owner) => suppliersCol.where(OWNER_FIELD, '==', owner),
  (docs) => docs.map((d) => str(d.data()['name'], d.id)).sort(),
);

/**
 * Each user gets their own copy of the default supplier list the first time
 * they look at it. Seeding used to run in the browser, where every client with
 * an empty database raced to write the same eight documents.
 */
async function seedFor(owner: string): Promise<void> {
  const existing = await suppliersCol.where(OWNER_FIELD, '==', owner).limit(1).get();
  if (!existing.empty) return;

  const batch = suppliersCol.firestore.batch();
  for (const name of DEFAULT_SUPPLIERS) {
    // Doc ids are namespaced by owner so two users can hold the same supplier.
    batch.set(suppliersCol.doc(`${owner}:${name}`), { name, [OWNER_FIELD]: owner });
  }
  await batch.commit();
  console.log(`[api] seeded default suppliers for ${owner}`);
}

export const suppliersRouter = Router();

suppliersRouter.get(
  '/stream',
  requireAuth,
  wrap(async (req, res) => {
    const owner = ownerOf(req);
    await seedFor(owner);
    return suppliersStream.for(owner).subscribe(req, res);
  }),
);

suppliersRouter.get(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const owner = ownerOf(req);
    await seedFor(owner);
    res.json(await suppliersStream.for(owner).current());
  }),
);

suppliersRouter.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const owner = ownerOf(req);
    const name = str(((req.body ?? {}) as Record<string, unknown>)['name']).trim().toUpperCase();
    if (!name) throw badRequest('Supplier name is required');
    await suppliersCol.doc(`${owner}:${name}`).set({ name, [OWNER_FIELD]: owner });
    res.status(201).json({ name });
  }),
);

suppliersRouter.delete(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ref = suppliersCol.doc(param(req, 'id'));
    await readOwned(ref, ownerOf(req), 'Supplier not found');
    await ref.delete();
    res.status(204).end();
  }),
);
