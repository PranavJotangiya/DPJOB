import { computed, inject, Injectable } from '@angular/core';
import { ApiService } from './api';
import { liveCollection } from './live-collection';
import type { Lot, LotInput, LotStatus } from './models';

/** Shown while the supplier stream is still connecting, or if it fails. */
const DEFAULT_SUPPLIERS = ['MTLNY', 'JAYDEEP', 'SUGAM', 'RUDRA', 'AMMEF', 'KAPIL', 'MGB', 'VISHAL'];

/**
 * Talks to the Node server (server/src/routes/lots.routes.ts) — never to
 * Firebase. Lot numbering and the piece/consumption totals are the server's
 * job now, so they are computed once against the whole database instead of
 * against whatever each browser happens to have loaded.
 */
@Injectable({ providedIn: 'root' })
export class LotsService {
  private api = inject(ApiService);

  private lotsLive = liveCollection<Lot>('/lots/stream');
  private suppliersLive = liveCollection<string>('/suppliers/stream');

  readonly lots = this.lotsLive.rows;
  readonly suppliers = computed(() => {
    const names = this.suppliersLive.rows();
    return names.length > 0 ? names : DEFAULT_SUPPLIERS;
  });
  readonly ready = this.lotsLive.ready;
  readonly offline = this.lotsLive.offline;

  async createLot(input: LotInput): Promise<string> {
    const { id } = await this.api.post<{ id: string }>('/lots', input);
    return id;
  }

  async updateLot(id: string, input: LotInput): Promise<void> {
    await this.api.put<{ id: string }>(`/lots/${id}`, input);
  }

  async updateStatus(id: string, status: LotStatus): Promise<void> {
    await this.api.patch<{ id: string }>(`/lots/${id}/status`, { status });
  }

  async deleteLot(id: string): Promise<void> {
    await this.api.delete(`/lots/${id}`);
  }
}
