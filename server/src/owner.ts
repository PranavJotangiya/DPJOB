import type { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import type { Request } from 'express';
import { HttpError } from './http.js';

/**
 * Every lot, party and supplier carries the username of the user it belongs to.
 * Nothing is shared: two users signed into the same app see two separate sets
 * of data, and neither can read or touch the other's.
 */
export const OWNER_FIELD = 'ownerId';

/** The signed-in user's id. requireAuth has already run, so this is present. */
export function ownerOf(req: Request): string {
  const username = req.user?.username;
  if (!username) throw new HttpError(401, 'Sign in required');
  return username;
}

/**
 * Loads a document and refuses it unless the caller owns it.
 *
 * Someone else's document is reported as "not found", not "forbidden" — a
 * 403 would confirm that the id exists, which is itself a leak.
 */
export async function readOwned(
  ref: DocumentReference,
  owner: string,
  missing: string,
): Promise<DocumentSnapshot> {
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.[OWNER_FIELD] !== owner) {
    throw new HttpError(404, missing);
  }
  return snap;
}
