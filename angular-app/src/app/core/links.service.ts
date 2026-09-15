import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api';
import type { Lot } from './models';

export interface LinkedJobber {
  username: string;
  name: string;
}

export type SharedLot = Lot & { sharedBy: LinkedJobber };

/**
 * The Party side of the party↔jobber mobile-number link (server/src/routes/
 * links.routes.ts): add a jobber by phone number, list who you're linked to,
 * and read the lots they've filed under your own registered name. Plain
 * on-demand calls, not a live stream — a multi-owner fan-in doesn't fit the
 * server's per-owner SSE broadcaster, so this is refreshed on demand instead.
 */
@Injectable({ providedIn: 'root' })
export class LinksService {
  private api = inject(ApiService);

  readonly jobbers = signal<LinkedJobber[]>([]);
  readonly sharedLots = signal<SharedLot[]>([]);
  readonly ready = signal(false);

  /** Whose account (if any) a mobile number belongs to. */
  async lookupJobber(phone: string): Promise<string | null> {
    try {
      const { name } = await this.api.get<{ name: string | null }>(
        `/users/lookup?phone=${encodeURIComponent(phone)}`,
      );
      return name;
    } catch {
      return null;
    }
  }

  async addJobber(phone: string): Promise<LinkedJobber> {
    const jobber = await this.api.post<{ username: string; name: string }>('/links/jobbers', { phone });
    await this.refresh();
    return jobber;
  }

  async removeJobber(username: string): Promise<void> {
    await this.api.delete(`/links/jobbers/${username}`);
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.ready.set(false);
    try {
      const [jobbers, lots] = await Promise.all([
        this.api.get<LinkedJobber[]>('/links/jobbers'),
        this.api.get<SharedLot[]>('/links/lots'),
      ]);
      this.jobbers.set(jobbers);
      this.sharedLots.set(lots);
    } finally {
      this.ready.set(true);
    }
  }
}
