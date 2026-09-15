import { computed, inject, Injectable } from '@angular/core';
import { ApiService } from './api';
import { liveCollection } from './live-collection';

export interface Party {
  id: string;
  name: string;
  /** Normalized 10-digit mobile number, or '' if this party has no linked
   *  account. When it resolves to a real account, the server keeps `name` in
   *  sync with that account's own registered name — see `setPhone`. */
  phone: string;
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

  async addParty(name: string, phone?: string): Promise<void> {
    const n = name.trim();
    if (!n || this.nameTaken(n)) return;
    await this.api.post<Party>('/parties', phone ? { name: n, phone } : { name: n });
  }

  async removeParty(id: string): Promise<void> {
    await this.api.delete(`/parties/${id}`);
  }

  /** Attaches, changes or clears (pass '') the mobile number linked to a party. */
  async setPhone(id: string, phone: string): Promise<Party> {
    return this.api.patch<Party>(`/parties/${id}`, { phone });
  }

  /** Whose account (if any) a mobile number belongs to. Never throws on a
   *  well-formed but unmatched number — resolves to null instead. */
  async lookupPhone(phone: string): Promise<string | null> {
    try {
      const { name } = await this.api.get<{ name: string | null }>(
        `/users/lookup?phone=${encodeURIComponent(phone)}`,
      );
      return name;
    } catch {
      return null;
    }
  }
}
