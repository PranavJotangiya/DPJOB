import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { LotsService } from '../../core/lots.service';
import { StatCard } from '../../shared/stat-card/stat-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { EmptyState } from '../../shared/empty-state/empty-state';

const TODAY = new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TPipe, StatCard, StatusBadge, EmptyState],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  readonly ui = inject(UiStore);
  readonly lotsService = inject(LotsService);
  private router = inject(Router);

  readonly lots = this.lotsService.lots;
  readonly today5 = computed(() => this.lots().slice(0, 5));

  readonly stats = computed(() => {
    const lots = this.lots();
    return {
      activeLots: lots.filter((l) => l.status !== 'Completed').length,
      todaysCutting: lots.filter((l) => l.cuttingDate === TODAY).length,
      pendingCutting: lots.filter((l) => ['Draft', 'Ready'].includes(l.status)).length,
      completedLots: lots.filter((l) => l.status === 'Completed').length,
      totalFabricUsed: lots.reduce((sum, l) => sum + Number(l.totalMeters || 0), 0),
      totalPieces: lots.reduce((sum, l) => sum + Number(l.totalPieces || 0), 0),
    };
  });

  ngOnInit(): void {
    this.ui.setSection('dashboard');
  }

  open(id: string): void {
    this.ui.selectLot(id);
    void this.router.navigateByUrl('/lots');
  }
}