/**
 * One-off migration: give every existing lot, party and supplier an owner.
 *
 * Data written before ownership existed has no `ownerId`, and without one it is
 * invisible to everyone — so this backfills it:
 *
 *  - lots      → matched to a user by their `createdBy` name; anything that
 *                does not match a real username goes to FALLBACK_OWNER.
 *  - parties   → copied to every user, because a party list is a dropdown each
 *                user needs and there is no way to tell whose it was.
 *  - suppliers → the old shared defaults are removed; each user is re-seeded
 *                with their own copy the next time they open the app.
 *
 * Run a dry run first (this is the default):
 *   npx tsx src/migrate-owners.ts
 * Then apply:
 *   npx tsx src/migrate-owners.ts --apply
 */
import { lotsCol, partiesCol, suppliersCol, usersCol } from './firebase.js';
import { OWNER_FIELD } from './owner.js';

const APPLY = process.argv.includes('--apply');
/** Lots whose creator cannot be matched to an account land here. */
const FALLBACK_OWNER = process.env['FALLBACK_OWNER'] ?? 'pranav';

const log = (...args: unknown[]) => console.log(APPLY ? '[apply]' : '[dry-run]', ...args);

async function main(): Promise<void> {
  const users = (await usersCol.get()).docs.map((d) => d.id);
  if (users.length === 0) throw new Error('No users — nothing to assign data to.');
  if (!users.includes(FALLBACK_OWNER)) {
    throw new Error(`FALLBACK_OWNER "${FALLBACK_OWNER}" is not one of: ${users.join(', ')}`);
  }
  log('users:', users.join(', '));

  // --- lots ---------------------------------------------------------------
  const lots = await lotsCol.get();
  const lotPlan = new Map<string, number>();
  const lotWrites: { id: string; owner: string }[] = [];

  for (const doc of lots.docs) {
    const data = doc.data();
    if (typeof data[OWNER_FIELD] === 'string' && data[OWNER_FIELD]) continue;

    const createdBy = String(data['createdBy'] ?? '').trim().toLowerCase();
    const owner = users.includes(createdBy) ? createdBy : FALLBACK_OWNER;
    lotWrites.push({ id: doc.id, owner });
    lotPlan.set(owner, (lotPlan.get(owner) ?? 0) + 1);
  }
  log(`lots needing an owner: ${lotWrites.length} of ${lots.size}`);
  for (const [owner, n] of lotPlan) log(`   -> ${owner}: ${n}`);

  // --- parties ------------------------------------------------------------
  const parties = await partiesCol.get();
  const orphanParties = parties.docs.filter((d) => !d.data()[OWNER_FIELD]);
  log(
    `parties to copy to each of ${users.length} users: ${orphanParties.length}` +
      ` (${orphanParties.length * users.length} documents)`,
  );

  // --- suppliers ----------------------------------------------------------
  const suppliers = await suppliersCol.get();
  const orphanSuppliers = suppliers.docs.filter((d) => !d.data()[OWNER_FIELD]);
  log(`shared suppliers to remove (re-seeded per user on next open): ${orphanSuppliers.length}`);

  if (!APPLY) {
    log('nothing written. Re-run with --apply to make these changes.');
    return;
  }

  const batch = lotsCol.firestore.batch();
  for (const { id, owner } of lotWrites) batch.update(lotsCol.doc(id), { [OWNER_FIELD]: owner });

  for (const doc of orphanParties) {
    const name = String(doc.data()['name'] ?? '');
    const createdAt = String(doc.data()['createdAt'] ?? new Date().toISOString());
    for (const owner of users) {
      batch.set(partiesCol.doc(`${owner}--${doc.id}`), { name, [OWNER_FIELD]: owner, createdAt });
    }
    batch.delete(doc.ref);
  }

  for (const doc of orphanSuppliers) batch.delete(doc.ref);

  await batch.commit();
  log('done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
