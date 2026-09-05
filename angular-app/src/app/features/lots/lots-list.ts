import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { LotsService } from '../../core/lots.service';
import { PdfService } from '../../core/pdf.service';
import { I18nService } from '../../core/i18n.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { EmptyState } from '../../shared/empty-state/empty-state';

const TODAY = new Date().toISOString().slice(0, 10);

const FILTERS: Array<[string, string]> = [
  ['All', 'filter.All'],
  ['Today', 'filter.Today'],
  ['This Week', 'filter.ThisWeek'],
  ['This Month', 'filter.ThisMonth'],
  ['Pending', 'filter.Pending'],
  ['Cutting', 'filter.Cutting'],
  ['Completed', 'filter.Completed'],
];

@Component({
  selector: 'app-lots-list',
  standalone: true,
  imports: [FormsModule, TPipe, StatusBadge, EmptyState],
  templateUrl: './lots-list.html',
})
export class LotsList implements OnInit {
  readonly ui = inject(UiStore);
  readonly lotsService = inject(LotsService);
  private pdf = inject(PdfService);
  private i18n = inject(I18nService);

  readonly filters = FILTERS;
  readonly search = signal('');
  readonly filter = signal('All');

  readonly filtered = computed(() => {
    const term = this.search().toLowerCase();
    const filter = this.filter();
    return this.lotsService.lots().filter((item) => {
      const textMatch =
        !term ||
        item.lotNumber.toLowerCase().includes(term) ||
        item.shortNumber.toLowerCase().includes(term) ||
        (item.shortName || '').toLowerCase().includes(term) ||
        item.supplier.toLowerCase().includes(term) ||
        (item.bales || []).some((b) => (b.baleNumber || '').toLowerCase().includes(term));

      const statusMatch =
        filter === 'All' ||
        (filter === 'Pending' && ['Draft', 'Ready'].includes(item.status)) ||
        (filter === 'Cutting' && item.status === 'Cutting') ||
        (filter === 'Completed' && item.status === 'Completed') ||
        (filter === 'Today' && item.cuttingDate === TODAY) ||
        (filter === 'This Week' && Boolean(item.programDate)) ||
        (filter === 'This Month' && Boolean(item.date));

      return textMatch && statusMatch;
    });
  });

  ngOnInit(): void {
    this.ui.setSection('lots');
  }

  clearSearch(): void {
    this.search.set('');
    this.filter.set('All');
  }

  openDetail(id: string): void {
    this.ui.selectLot(id);
  }

  print(id: string): void {
    const lot = this.lotsService.lots().find((l) => l.id === id);
    if (lot) void this.pdf.printLot(lot, this.i18n.lang());
  }
}
