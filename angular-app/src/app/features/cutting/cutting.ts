import { Component, computed, inject, OnInit } from '@angular/core';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { LotsService } from '../../core/lots.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { MiniStat } from '../../shared/mini-stat/mini-stat';

@Component({
  selector: 'app-cutting',
  standalone: true,
  imports: [TPipe, StatusBadge, MiniStat],
  templateUrl: './cutting.html',
})
export class Cutting implements OnInit {
  readonly ui = inject(UiStore);
  readonly lotsService = inject(LotsService);

  readonly lots = this.lotsService.lots;
  readonly waiting = computed(() => this.lots().filter((l) => l.status === 'Ready').length);
  readonly inCutting = computed(() => this.lots().filter((l) => l.status === 'Cutting').length);
  readonly completed = computed(() => this.lots().filter((l) => l.status === 'Completed').length);
  readonly plannedPieces = computed(() => this.lots().reduce((s, l) => s + Number(l.totalPieces || 0), 0));

  ngOnInit(): void {
    this.ui.setSection('cutting');
  }

  start(id: string): void {
    void this.lotsService.updateStatus(id, 'Cutting');
  }
}
