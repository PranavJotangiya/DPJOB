import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { LotsService } from '../../core/lots.service';
import { PartiesService } from '../../core/parties.service';
import { StatCard } from '../../shared/stat-card/stat-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { SkeletonRows } from '../../shared/skeleton-rows/skeleton-rows';

const TODAY = new Date().toISOString().slice(0, 10);
const PARTY_KEY = 'dp-dash-party';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, TPipe, StatCard, StatusBadge, EmptyState, RouterLink, SkeletonRows],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  readonly ui = inject(UiStore);
  readonly lotsService = inject(LotsService);
  private partiesService = inject(PartiesService);
  private router = inject(Router);

  readonly partyNames = this.partiesService.names;
  readonly party = signal<string>(this.readStoredParty());

  readonly lots = computed(() => {
    const p = this.party();
    const all = this.lotsService.lots();
    return p ? all.filter((l) => l.party === p) : all;
  });
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

  constructor() {
    effect(() => {
      const p = this.party();
      try {
        if (p) localStorage.setItem(PARTY_KEY, p);
        else localStorage.removeItem(PARTY_KEY);
      } catch {
        /* ignore */
      }
    });
  }

  ngOnInit(): void {
    this.ui.setSection('dashboard');
  }

  setParty(value: string): void {
    this.party.set(value);
  }

  open(id: string): void {
    this.ui.selectLot(id);
    void this.router.navigateByUrl('/lots');
  }

  private readStoredParty(): string {
    try {
      return localStorage.getItem(PARTY_KEY) || '';
    } catch {
      return '';
    }
  }
}
