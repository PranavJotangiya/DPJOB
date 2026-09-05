import { Component, computed, inject, OnInit } from '@angular/core';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { LotsService } from '../../core/lots.service';
import { MiniStat } from '../../shared/mini-stat/mini-stat';

const TODAY = new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [TPipe, MiniStat],
  templateUrl: './reports.html',
})
export class Reports implements OnInit {
  readonly ui = inject(UiStore);
  private lotsService = inject(LotsService);

  readonly lots = this.lotsService.lots;

  readonly lotsWaiting = computed(() => this.lots().filter((l) => ['Draft', 'Ready'].includes(l.status)).length);
  readonly fabricMismatch = computed(
    () => this.lots().filter((l) => Number(l.totalMeters) !== (l.bales || []).reduce((s, b) => s + Number(b.meters || 0), 0)).length,
  );
  readonly todaysProduction = computed(
    () => this.lots().filter((l) => l.cuttingDate === TODAY).reduce((s, l) => s + Number(l.totalPieces || 0), 0),
  );
  readonly completedCutting = computed(() => this.lots().filter((l) => l.status === 'Completed').length);
  readonly pendingCutting = computed(() => this.lots().filter((l) => l.status === 'Ready').length);

  ngOnInit(): void {
    this.ui.setSection('reports');
  }
}
