import { Router } from 'express';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { requireAuth } from '../auth.js';
import { lotsCol, partiesCol, usersCol } from '../firebase.js';
import { badRequest, isValidPhone, normalizePhone, param, str, wrap } from '../http.js';
import { ownerOf, OWNER_FIELD } from '../owner.js';
import type { LinkedJobber, SharedLot } from '../types.js';
import { docToLot } from './lots.routes.js';
import { findRegisteredName } from './users.routes.js';

/**
 * Every other route file in this app enforces "you can only ever read or
 * write your own owner-scoped documents" — see `owner.ts`. This file is the
 * one deliberate, narrow exception: it lets a Party account see a Jobber's
 * lots, but only the ones filed under a party name that resolves back to the
 * Party's own account. Every cross-owner read/write below exists only to
 * serve that one purpose and is commented as such; nothing here ever exposes
 * more than a name and the already-scoped lot fields.
 */

/** Party docs across ALL owners with `phone === me` — the one deliberate
 *  cross-owner read this whole feature is built on. */
async function partiesLinkedToMe(me: string): Promise<{ ownerId: string; name: string }[]> {
  const snap = await partiesCol.where('phone', '==', me).get();
  return snap.docs
    .map((d) => ({ ownerId: str(d.data()[OWNER_FIELD]), name: str(d.data()['name']) }))
    .filter((p) => p.ownerId && p.name);
}

/** Current display names for a list of owner ids — the other half of the
 *  same deliberate exception, used only to label who a shared lot is from. */
async function jobberNames(ownerIds: string[]): Promise<Map<string, string>> {
  const entries = await Promise.all(
    ownerIds.map(async (id) => {
      const snap = await usersCol.doc(id).get();
      const data = snap.data();
      return [id, data && snap.exists ? str(data['name'], id) : id] as const;
    }),
  );
  return new Map(entries);
}

export const linksRouter = Router();

/** Jobbers currently linked to me (as a Party), regardless of which side created the link. */
linksRouter.get(
  '/jobbers',
  requireAuth,
  wrap(async (req, res) => {
    const links = await partiesLinkedToMe(ownerOf(req));
    const ownerIds = [...new Set(links.map((l) => l.ownerId))];
    const names = await jobberNames(ownerIds);
    const jobbers: LinkedJobber[] = ownerIds.map((id) => ({ username: id, name: names.get(id) ?? id }));
    res.json(jobbers);
  }),
);

/**
 * Party-initiated link: I type a Jobber's mobile number. If it belongs to a
 * real account, we find-or-create a party record under *their* `parties`
 * collection, named after my own account (from my JWT — never client-typed,
 * so it can never drift from what `resolvePartyFields` in parties.routes.ts
 * would derive for the same phone number).
 */
linksRouter.post(
  '/jobbers',
  requireAuth,
  wrap(async (req, res) => {
    const me = ownerOf(req);
    const jobber = normalizePhone(((req.body ?? {}) as Record<string, unknown>)['phone']);
    if (!isValidPhone(jobber)) throw badRequest('Enter a valid 10-digit mobile number');
    if (jobber === me) throw badRequest("You can't link your own mobile number");

    const jobberName = await findRegisteredName(jobber);
    if (!jobberName) throw badRequest('No account is registered with that mobile number');

    const existing = await partiesCol.where(OWNER_FIELD, '==', jobber).get();
    const alreadyLinked = existing.docs.some((d) => str(d.data()['phone']) === me);
    if (!alreadyLinked) {
      // Deterministic id: repeat calls converge on one doc instead of racing
      // into duplicates (the same trick suppliers.routes.ts uses for owner:name).
      await partiesCol.doc(`${jobber}:phone:${me}`).set({
        name: req.user?.name || me,
        phone: me,
        [OWNER_FIELD]: jobber,
        createdAt: new Date().toISOString(),
      });
    }
    res.status(201).json({ username: jobber, name: jobberName });
  }),
);

/** Revokes only my own visibility — clears `phone` on that jobber's matching
 *  party doc(s), never deletes them, so the jobber's own records are untouched. */
linksRouter.delete(
  '/jobbers/:jobberUsername',
  requireAuth,
  wrap(async (req, res) => {
    const me = ownerOf(req);
    const jobber = param(req, 'jobberUsername');
    const snap = await partiesCol.where(OWNER_FIELD, '==', jobber).get();
    const mine = snap.docs.filter((d) => str(d.data()['phone']) === me);
    await Promise.all(mine.map((d) => d.ref.update({ phone: '' })));
    res.status(204).end();
  }),
);

/**
 * The shared-lots read. No `/stream` variant on purpose — `OwnerStreams` is
 * keyed by exactly one owner, and a live multi-owner fan-in doesn't fit it;
 * this is a plain on-demand GET, refetched by the client's refresh action.
 */
linksRouter.get(
  '/lots',
  requireAuth,
  wrap(async (req, res) => {
    const links = await partiesLinkedToMe(ownerOf(req));
    if (links.length === 0) {
      res.json([]);
      return;
    }

    const namesByOwner = new Map<string, Set<string>>();
    for (const link of links) {
      if (!namesByOwner.has(link.ownerId)) namesByOwner.set(link.ownerId, new Set());
      namesByOwner.get(link.ownerId)!.add(link.name);
    }
    const jobberDisplayNames = await jobberNames([...namesByOwner.keys()]);

    const shared: SharedLot[] = [];
    for (const [ownerId, partyNames] of namesByOwner) {
      // Same single-equality-filter shape as the owner's own `GET /lots` —
      // reuses that index, no compound query anywhere in this feature.
      const snap = await lotsCol.where(OWNER_FIELD, '==', ownerId).get();
      for (const doc of snap.docs) {
        const lot = docToLot(doc as QueryDocumentSnapshot);
        if (partyNames.has(lot.party)) {
          shared.push({ ...lot, sharedBy: { username: ownerId, name: jobberDisplayNames.get(ownerId) ?? ownerId } });
        }
      }
    }
    shared.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    res.json(shared);
  }),
);
