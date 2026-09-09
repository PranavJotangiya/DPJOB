import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationDefault, cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';

const here = dirname(fileURLToPath(import.meta.url));
// src/ during dev, dist/ after a build — the key file lives one level up in both.
const keyFile = resolve(here, '..', 'serviceAccountKey.json');

/**
 * The service account is what makes this layer trusted: it talks to Firestore
 * with admin rights, which is why the security rules can now lock every client
 * out of the database entirely (see firestore.rules).
 *
 * Credentials are read from, in order: FIREBASE_SERVICE_ACCOUNT (inline JSON),
 * server/serviceAccountKey.json, then Google application default credentials.
 */
function credential() {
  if (env.serviceAccountJson) {
    return cert(JSON.parse(env.serviceAccountJson) as ServiceAccount);
  }
  if (existsSync(keyFile)) {
    return cert(JSON.parse(readFileSync(keyFile, 'utf8')) as ServiceAccount);
  }
  return applicationDefault();
}

const app = getApps().length > 0
  ? getApps()[0]!
  : initializeApp({
      credential: credential(),
      ...(env.projectId ? { projectId: env.projectId } : {}),
    });

export const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

export const lotsCol = db.collection('lots');
export const partiesCol = db.collection('parties');
export const usersCol = db.collection('users');
export const suppliersCol = db.collection('suppliers');
