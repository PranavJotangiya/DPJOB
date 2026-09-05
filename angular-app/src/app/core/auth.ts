import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { firebaseApp } from './firestore';

// Single Firebase Auth instance, built on the same app as Firestore
// (see firestore.ts — one source of truth for Firebase init).
export const auth = getAuth(firebaseApp);

let readyPromise: Promise<User> | null = null;

/**
 * No login screen — every visitor is silently signed in anonymously so
 * Firestore security rules can require `request.auth != null` without any
 * UI change. Call once; safe to call many times (returns the same promise).
 */
export function ensureAuth(): Promise<User> {
  if (!readyPromise) {
    readyPromise = new Promise<User>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsubscribe();
            resolve(user);
          }
        },
        (err) => {
          unsubscribe();
          reject(err);
        },
      );
      signInAnonymously(auth).catch(reject);
    });
  }
  return readyPromise;
}
