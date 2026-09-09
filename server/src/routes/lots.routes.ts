import { Router } from 'express';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { requireAuth } from '../auth.js';
import { lotsCol } from '../firebase.js';
import { badRequest, num, param, str, wrap } from '../http.js';
import { ownerOf, OWNER_FIELD, readOwned } from '../owner.js';
import { OwnerStreams } from '../stream.js';
import {
  createEmptySizeBreakdown,
  LOT_STATUSES,
  type Lot,
  type LotInput,
  type LotStatus,
} from '../types.js';

function docToLot(snap: QueryDocumentSnapshot): Lot {
  const data = snap.data();
  return {
    id: snap.id,
    lotNumber: str(data['lotNumber']),
    party: str(data['party']),
    date: str(data['date']),
    supplier: str(data['supplier']),
    shortNumber: str(data['shortNumber']),
    shortName: str(data['shortName']),
    programDate: str(data['programDate']),
    cuttingDate: str(data['cuttingDate']),
    fabricType: str(data['fabricType']),
    color: str(data['color']),
    description: str(data['description']),
    pana: num(data['pana']),
    totalMeters: num(data['totalMeters']),
    averageConsumption: num(data['averageConsumption']),
    totalPieces: num(data['totalPieces']),
    status: (data['status'] as LotStatus) ?? 'Draft',
    notes: str(data['notes']),
    createdBy: str(data['createdBy']),
    createdAt: str(data['createdAt']),
    updatedAt: str(data['updatedAt']),
    patternImage: str(data['patternImage']),
    sizeBreakdown: { ...createEmptySizeBreakdown(), ...((data['sizeBreakdown'] as object) ?? {}) },
    bales: Array.isArray(data['bales']) ? data['bales'] : [],
    cutting: (data['cutting'] as Lot['cutting']) ?? {
      patternType: '',
      markerLength: '',
      markerWidth: '',
      layLength: '',
      noOfLayers: '',
      noOfPlies: '',
    },
  };
}

/**
 * Sorted here rather than with `.orderBy()` so the query stays a single
 * equality filter — a composite Firestore index would otherwise have to be
 * deployed before the app worked at all.
 */
const lotsStream = new OwnerStreams<Lot>(
  'lots',
  (owner) => lotsCol.where(OWNER_FIELD, '==', owner),
  (docs) =>
    docs
      .map(docToLot)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)),
);

/** Only fields the client is allowed to send — id/createdAt/updatedAt are ours. */
function sanitize(body: unknown): LotInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const sizeBreakdown: Record<string, number> = { ...createEmptySizeBreakdown() };
  for (const [key, value] of Object.entries((b['sizeBreakdown'] as object) ?? {})) {
    sizeBreakdown[key] = num(value);
  }
  const cutting = (b['cutting'] ?? {}) as Record<string, unknown>;
  return {
    lotNumber: str(b['lotNumber']).trim().toUpperCase(),
    party: str(b['party']),
    date: str(b['date']),
    supplier: str(b['supplier']),
    shortNumber: str(b['shortNumber']),
    shortName: str(b['shortName']),
    programDate: str(b['programDate']),
    cuttingDate: str(b['cuttingDate']),
    fabricType: str(b['fabricType']),
    color: str(b['color']),
    description: str(b['description']),
    pana: num(b['pana']),
    totalMeters: num(b['totalMeters']),
    averageConsumption: num(b['averageConsumption']),
    totalPieces: num(b['totalPieces']),
    status: LOT_STATUSES.includes(b['status'] as LotStatus) ? (b['status'] as LotStatus) : 'Draft',
    notes: str(b['notes']),
    createdBy: str(b['createdBy']),
    patternImage: str(b['patternImage']),
    sizeBreakdown,
    bales: (Array.isArray(b['bales']) ? b['bales'] : []).map((raw, i) => {
      const bale = (raw ?? {}) as Record<string, unknown>;
      return {
        id: str(bale['id']) || `${Date.now()}-${i}`,
        baleNumber: str(bale['baleNumber']),
        meters: num(bale['meters']),
      };
    }),
    cutting: {
      patternType: str(cutting['patternType'], 'Marker'),
      markerLength: (cutting['markerLength'] as string | number) ?? '',
      markerWidth: (cutting['markerWidth'] as string | number) ?? '',
      layLength: (cutting['layLength'] as string | number) ?? '',
      noOfLayers: (cutting['noOfLayers'] as string | number) ?? '',
      noOfPlies: (cutting['noOfPlies'] as string | number) ?? '',
    },
  };
}

/** Totals are derived here so two clients can never disagree about them. */
function computeTotals(input: LotInput): { totalPieces: number; averageConsumption: number } {
  const totalPieces = Object.values(input.sizeBreakdown).reduce((sum, v) => sum + num(v), 0);
  const totalMeters = num(input.totalMeters);
  return {
    totalPieces,
    averageConsumption:
      totalPieces > 0 && totalMeters > 0 ? Number((totalMeters / totalPieces).toFixed(2)) : 0,
  };
}

/**
 * Lot numbers are allocated against every lot this user owns, not just the ones
 * one browser happens to have loaded — the reason this logic moved off the
 * client. Two users can hold the same lot number; their data never meets.
 * A clash never fails the save; it gets a `-2`, `-3`, ... suffix.
 */
async function resolveLotNumber(
  owner: string,
  requested: string,
  excludeId?: string,
): Promise<string> {
  const snap = await lotsCol.where(OWNER_FIELD, '==', owner).get();
  const taken = new Set(
    snap.docs
      .filter((d) => d.id !== excludeId)
      .map((d) => String(d.data()['lotNumber'] ?? ''))
      .filter(Boolean),
  );

  let base = requested;
  if (!base) {
    const maxN = snap.docs.reduce((max, d) => {
      const match = String(d.data()['lotNumber'] ?? '').match(/(\d+)/);
      const n = match ? Number(match[1]) : NaN;
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    base = `LOT-${maxN + 1}`;
  }

  let candidate = base;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export const lotsRouter = Router();

lotsRouter.get(
  '/stream',
  requireAuth,
  wrap(async (req, res) => lotsStream.for(ownerOf(req)).subscribe(req, res)),
);

lotsRouter.get(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    res.json(await lotsStream.for(ownerOf(req)).current());
  }),
);

lotsRouter.get(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const snap = await readOwned(lotsCol.doc(param(req, 'id')), ownerOf(req), 'Lot not found');
    res.json(docToLot(snap as QueryDocumentSnapshot));
  }),
);

lotsRouter.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const owner = ownerOf(req);
    const input = sanitize(req.body);
    const now = new Date().toISOString();
    const ref = await lotsCol.add({
      ...input,
      [OWNER_FIELD]: owner,
      lotNumber: await resolveLotNumber(owner, input.lotNumber),
      ...computeTotals(input),
      createdBy: req.user?.name || input.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json({ id: ref.id });
  }),
);

lotsRouter.put(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const id = param(req, 'id');
    const owner = ownerOf(req);
    const existing = await readOwned(lotsCol.doc(id), owner, 'Lot not found');

    const input = sanitize(req.body);
    const requested = input.lotNumber || String(existing.data()?.['lotNumber'] ?? '');
    await lotsCol.doc(id).update({
      ...input,
      [OWNER_FIELD]: owner,
      lotNumber: await resolveLotNumber(owner, requested, id),
      ...computeTotals(input),
      updatedAt: new Date().toISOString(),
    });
    res.json({ id });
  }),
);

lotsRouter.patch(
  '/:id/status',
  requireAuth,
  wrap(async (req, res) => {
    const status = ((req.body ?? {}) as Record<string, unknown>)['status'] as LotStatus;
    if (!LOT_STATUSES.includes(status)) throw badRequest('Unknown status');
    const ref = lotsCol.doc(param(req, 'id'));
    await readOwned(ref, ownerOf(req), 'Lot not found');
    await ref.update({ status, updatedAt: new Date().toISOString() });
    res.json({ id: param(req, 'id'), status });
  }),
);

lotsRouter.delete(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ref = lotsCol.doc(param(req, 'id'));
    await readOwned(ref, ownerOf(req), 'Lot not found');
    await ref.delete();
    res.status(204).end();
  }),
);
