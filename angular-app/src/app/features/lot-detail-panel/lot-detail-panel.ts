import { Component, computed, inject } from '@angular/core';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { LotsService } from '../../core/lots.service';
import { PdfService } from '../../core/pdf.service';
import { I18nService } from '../../core/i18n.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';

@Component({
  selector: 'app-lot-detail-panel',
  standalone: true,
  imports: [TPipe, StatusBadge],
  templateUrl: './lot-detail-panel.html',
})
export class LotDetailPanel {
  readonly ui = inject(UiStore);
  private lotsService = inject(LotsService);
  private pdf = inject(PdfService);
  private i18n = inject(I18nService);

  readonly lot = computed(() => {
    const id = this.ui.selectedLotId();
    if (!id) return null;
    return this.lotsService.lots().find((l) => l.id === id) ?? null;
  });

  readonly visible = computed(
    () => Boolean(this.lot()) && this.ui.currentSection() !== 'dashboard' && !this.ui.wizardOpen(),
  );

  edit(): void {
    const lot = this.lot();
    if (lot) this.ui.openEditLot(lot);
  }

  setStatus(status: 'Ready' | 'Cutting' | 'Completed'): void {
    const lot = this.lot();
    if (lot) void this.lotsService.updateStatus(lot.id, status);
  }

  print(): void {
    const lot = this.lot();
    if (lot) void this.pdf.printLot(lot, this.i18n.lang());
  }

  share(): void {
    const lot = this.lot();
    if (lot) void this.pdf.sharePdf(lot, this.i18n.lang());
  }

  async remove(): Promise<void> {
    const lot = this.lot();
    if (!lot) return;
    const ok = confirm(`Delete lot ${lot.lotNumber}? This cannot be undone.`);
    if (!ok) return;
    await this.lotsService.deleteLot(lot.id);
    this.ui.selectedLotId.set(null);
  }
}
