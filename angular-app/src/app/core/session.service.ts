import { computed, Injectable, signal } from '@angular/core';
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { db } from './firestore';
import { ensureAuth } from './auth';
import { hashPin } from './pin';
import type { Role, SessionUser } from './models';

const STORAGE_KEY = 'dp-session';

/**
 * App-level login on top of the (still-anonymous) Firebase session.
 * Firebase anonymous auth is the transport that satisfies the Firestore
 * rules; this service is the "who is using the app" identity — a username +
 * PIN checked against the `users` collection, remembered in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly currentUser = signal<SessionUser | null>(null);
  readonly ready = signal(false);

  readonly isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  readonly canEdit = computed(() => {
    const r = this.currentUser()?.role;
    return r === 'Admin' || r === 'Supervisor' || r === 'Operator';
  });

  constructor() {
    this.restore();
    ensureAuth()
      .then(() => this.ensureBootstrapAdmin())
      .catch(() => {
        /* offline — login will just fail until connectivity returns */
      });
  }

  /** First run on a fresh database has no users — seed admin / 1234 so
   *  someone can get in. The Users page nags to change it. */
  private async ensureBootstrapAdmin(): Promise<void> {
    try {
      const existing = await getDocs(query(collection(db, 'users'), limit(1)));
      if (!existing.empty) return;
      await setDoc(doc(db, 'users', 'admin'), {
        name: 'Admin',
        role: 'Admin' as Role,
        active: true,
        pinHash: await hashPin('1234'),
        createdAt: new Date().toISOString(),
      });
    } catch {
      /* rules or connectivity — nothing we can do here */
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.currentUser.set(JSON.parse(raw) as SessionUser);
    } catch {
      // ignore corrupt/blocked storage — user just logs in again
    }
    this.ready.set(true);
  }

  /** Returns true on success; false for unknown user / wrong PIN / disabled. */
  async login(username: string, pin: string): Promise<boolean> {
    const id = username.trim().toLowerCase();
    if (!id || !pin) return false;

    const snap = await getDoc(doc(db, 'users', id));
    if (!snap.exists()) return false;

    const data = snap.data();
    if (data['active'] === false) return false;
    if (data['pinHash'] !== (await hashPin(pin))) return false;

    const session: SessionUser = {
      username: id,
      name: (data['name'] as string) || id,
      role: (data['role'] as Role) || 'Operator',
    };
    this.currentUser.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // non-fatal — session just won't survive a reload
    }
    return true;
  }

  logout(): void {
    this.currentUser.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
