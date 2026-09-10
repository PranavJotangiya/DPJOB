import { Injectable, signal } from '@angular/core';

/**
 * Small piece of shared UI state that doesn't belong to routing: which lot is
 * "selected" for the floating detail panel, and the current section (used to
 * decide when to show that panel — it hides on the dashboard and on the
 * New/Edit Lot pages, same as the original app).
 */
@Injectable({ providedIn: 'root' })
export class UiStore {
  readonly moreOpen = signal(false);
  readonly statusMessage = signal('');
  readonly currentSection = signal<string>('dashboard');

  readonly selectedLotId = signal<string | null>(null);

  setSection(section: string): void {
    this.currentSection.set(section);
  }

  selectLot(id: string): void {
    this.selectedLotId.set(id);
  }

  clearSelectedLot(): void {
    this.selectedLotId.set(null);
  }

  showMessage(message: string): void {
    this.statusMessage.set(message);
  }
}
