import { Injectable, signal } from '@angular/core';
import type { Lot, Role } from './models';

/**
 * Small piece of shared UI state that doesn't belong to routing:
 * the active role, the New/Edit Lot overlay, which lot is "selected" for the
 * detail panel, and the current section (used to decide when to show that
 * panel — it hides on the dashboard, same as the original app).
 */
@Injectable({ providedIn: 'root' })
export class UiStore {
  readonly role = signal<Role>('Supervisor');
  readonly moreOpen = signal(false);
  readonly statusMessage = signal('');
  readonly currentSection = signal<string>('dashboard');

  readonly wizardOpen = signal(false);
  readonly editingLot = signal<Lot | null>(null);

  readonly selectedLotId = signal<string | null>(null);

  setSection(section: string): void {
    this.currentSection.set(section);
  }

  openNewLot(): void {
    this.editingLot.set(null);
    this.wizardOpen.set(true);
    this.moreOpen.set(false);
  }

  openEditLot(lot: Lot): void {
    this.editingLot.set(lot);
    this.wizardOpen.set(true);
    this.moreOpen.set(false);
  }

  closeWizard(): void {
    this.wizardOpen.set(false);
    this.editingLot.set(null);
  }

  selectLot(id: string): void {
    this.selectedLotId.set(id);
  }

  showMessage(message: string): void {
    this.statusMessage.set(message);
  }
}
