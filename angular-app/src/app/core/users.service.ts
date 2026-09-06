import { Injectable, signal } from '@angular/core';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firestore';
import { ensureAuth } from './auth';
import { hashPin } from './pin';
import type { AppUser, Role } from './models';

/**
 * CRUD for the `users` collection (doc id = lowercase username). Used by the
 * Admin-only Users page. The default `admin` / `1234` user is seeded by
 * SessionService on a fresh database.
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private col = collection(db, 'users');

  readonly users = signal<AppUser[]>([]);
  readonly ready = signal(false);

  constructor() {
    ensureAuth()
      .then(() => this.watch())
      .catch(() => this.ready.set(true));
  }

  private watch(): void {
    onSnapshot(
      this.col,
      (snap) => {
        this.users.set(
          snap.docs
            .map((d) => ({ username: d.id, ...(d.data() as Omit<AppUser, 'username'>) }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        this.ready.set(true);
      },
      () => this.ready.set(true),
    );
  }

  usernameTaken(username: string): boolean {
    const id = username.trim().toLowerCase();
    return this.users().some((u) => u.username === id);
  }

  async addUser(input: { username: string; name: string; pin: string; role: Role }): Promise<void> {
    const id = input.username.trim().toLowerCase();
    await setDoc(doc(this.col, id), {
      name: input.name.trim() || id,
      role: input.role,
      active: true,
      pinHash: await hashPin(input.pin),
      createdAt: new Date().toISOString(),
    });
  }

  async setPin(username: string, pin: string): Promise<void> {
    await updateDoc(doc(this.col, username), { pinHash: await hashPin(pin) });
  }

  async setRole(username: string, role: Role): Promise<void> {
    await updateDoc(doc(this.col, username), { role });
  }

  async setActive(username: string, active: boolean): Promise<void> {
    await updateDoc(doc(this.col, username), { active });
  }

  async remove(username: string): Promise<void> {
    await deleteDoc(doc(this.col, username));
  }
}
