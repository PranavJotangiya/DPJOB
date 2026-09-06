import { computed, Injectable, signal } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firestore';
import { ensureAuth } from './auth';

export interface Party {
  id: string;
  name: string;
}

/**
 * Master list of parties (customers). Every lot is filed under one party, and
 * the dashboard can be filtered by party. Stored as `parties/{autoId}` with a
 * `name` field.
 */
@Injectable({ providedIn: 'root' })
export class PartiesService {
  private col = collection(db, 'parties');

  readonly parties = signal<Party[]>([]);
  readonly ready = signal(false);
  readonly names = computed(() => this.parties().map((p) => p.name));

  constructor() {
    ensureAuth()
      .then(() => this.watch())
      .catch(() => this.ready.set(true));
  }

  private watch(): void {
    onSnapshot(
      this.col,
      (snap) => {
        this.parties.set(
          snap.docs
            .map((d) => ({ id: d.id, name: String(d.data()['name'] ?? '') }))
            .filter((p) => p.name)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        this.ready.set(true);
      },
      () => this.ready.set(true),
    );
  }

  nameTaken(name: string): boolean {
    const n = name.trim().toLowerCase();
    return this.parties().some((p) => p.name.toLowerCase() === n);
  }

  async addParty(name: string): Promise<void> {
    const n = name.trim();
    if (!n || this.nameTaken(n)) return;
    await addDoc(this.col, { name: n, createdAt: new Date().toISOString() });
  }

  async removeParty(id: string): Promise<void> {
    await deleteDoc(doc(this.col, id));
  }
}
