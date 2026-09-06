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
  /** True when the `users` collection is empty — show the first-run setup. */
  readonly needsSetup = signal(false);

  readonly isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  readonly canEdit = computed(() => {
    const r = this.currentUser()?.role;
    return r === 'Admin' || r === 'Supervisor' || r === 'Operator';
  });

  constructor() {
    const hadSession = this.restore();
    if (hadSession) {
      this.ready.set(true);
      return;
    }
    ensureAuth()
      .then(() => this.checkSetup())
      .catch(() => {
        // offline — no way to know; fall back to the login screen
        this.needsSetup.set(false);
        this.ready.set(true);
      });
  }

  private async checkSetup(): Promise<void> {
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(1)));
      this.needsSetup.set(snap.empty);
    } catch {
      this.needsSetup.set(false);
    } finally {
      this.ready.set(true);
    }
  }

  /** @returns true if a saved session was loaded. */
  private restore(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.currentUser.set(JSON.parse(raw) as SessionUser);
        return true;
      }
    } catch {
      // ignore corrupt/blocked storage — user just logs in again
    }
    return false;
  }

  private persist(user: SessionUser): void {
    this.currentUser.set(user);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // non-fatal — session just won't survive a reload
    }
  }

  /** First-run: create the very first user as Admin and sign them in. */
  async createFirstAdmin(input: { username: string; name: string; pin: string }): Promise<void> {
    const id = input.username.trim().toLowerCase();
    const name = input.name.trim() || id;
    await setDoc(doc(db, 'users', id), {
      name,
      role: 'Admin' as Role,
      active: true,
      pinHash: await hashPin(input.pin),
      createdAt: new Date().toISOString(),
    });
    this.needsSetup.set(false);
    this.persist({ username: id, name, role: 'Admin' });
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

    this.persist({
      username: id,
      name: (data['name'] as string) || id,
      role: (data['role'] as Role) || 'Operator',
    });
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
