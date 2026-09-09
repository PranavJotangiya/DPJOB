import { computed, inject, Injectable } from '@angular/core';
import { ApiService } from './api';
import { liveCollection } from './live-collection';

export interface Party {
  id: string;
  name: string;
}

/**
 * Master list of parties (customers). Every lot is filed under one party, and
 * the dashboard can be filtered by party. Served by the Node API
 * (server/src/routes/parties.routes.ts), which also enforces unique names.
 */
@Injectable({ providedIn: 'root' })
export class PartiesService {
  private api = inject(ApiService);
  private live = liveCollection<Party>('/parties/stream');

  readonly parties = this.live.rows;
  readonly ready = this.live.ready;
  readonly names = computed(() => this.parties().map((p) => p.name));

  nameTaken(name: string): boolean {
    const n = name.trim().toLowerCase();
    return this.parties().some((p) => p.name.toLowerCase() === n);
  }

  async addParty(name: string): Promise<void> {
    const n = name.trim();
    if (!n || this.nameTaken(n)) return;
    await this.api.post<Party>('/parties', { name: n });
  }

  async removeParty(id: string): Promise<void> {
    await this.api.delete(`/parties/${id}`);
  }
}
