import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { SessionService } from '../../core/session.service';
import { LotsService } from '../../core/lots.service';
import { PartiesService } from '../../core/parties.service';
import { LinksService } from '../../core/links.service';
import { StatCard } from '../../shared/stat-card/stat-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { SkeletonRows } from '../../shared/skeleton-rows/skeleton-rows';

const FILTER_KEY = 'dp-dash-filter';

interface FilterOption {
  value: string;
  label: string;
}

/** The dashboard's row shape, whichever source it comes from. */
interface DashLot {
  id: string;
  lotNumber: string;
  party: string;
  totalMeters: number;
  totalPieces: number;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, TPipe, StatCard, StatusBadge, EmptyState, RouterLink, SkeletonRows],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  readonly ui = inject(UiStore);
  readonly session = inject(SessionService);
  readonly lotsService = inject(LotsService);
  readonly links = inject(LinksService);
  private partiesService = inject(PartiesService);
  private router = inject(Router);

  readonly isParty = this.session.isParty;

  /** Party name (jobber view) or jobber username (party view). */
  readonly filterValue = signal<string>(this.readStoredFilter());

  /** What the dropdown offers: a jobber sees their own parties; a party sees
   *  the jobbers they've linked to (LinksService.jobbers). */
  readonly filterOptions = computed<FilterOption[]>(() =>
    this.isParty()
      ? this.links.jobbers().map((j) => ({ value: j.username, label: j.name }))
      : this.partiesService.names().map((n) => ({ value: n, label: n })),
  );

  readonly ready = computed(() => (this.isParty() ? this.links.ready() : this.lotsService.ready()));

  readonly lots = computed<DashLot[]>(() => {
    const f = this.filterValue();
    if (this.isParty()) {
      const all = this.links.sharedLots();
      return f ? all.filter((l) => l.sharedBy.username === f) : all;
    }
    const all = this.lotsService.lots();
    return f ? all.filter((l) => l.party === f) : all;
  });
  readonly today5 = computed(() => this.lots().slice(0, 5));

  readonly stats = computed(() => {
    const lots = this.lots();
    return {
      activeLots: lots.filter((l) => l.status !== 'Completed').length,
      completedLots: lots.filter((l) => l.status === 'Completed').length,
      totalFabricUsed: lots.reduce((sum, l) => sum + Number(l.totalMeters || 0), 0),
      totalPieces: lots.reduce((sum, l) => sum + Number(l.totalPieces || 0), 0),
    };
  });

  constructor() {
    effect(() => {
      const f = this.filterValue();
      try {
        if (f) localStorage.setItem(FILTER_KEY, f);
        else localStorage.removeItem(FILTER_KEY);
      } catch {
        /* ignore */
      }
    });
  }

  ngOnInit(): void {
    this.ui.setSection('dashboard');
    if (this.isParty()) void this.links.refresh();
  }

  setFilter(value: string): void {
    this.filterValue.set(value);
  }

  open(id: string): void {
    if (this.isParty()) {
      // Shared lots are read-only and live in a different collection — the
      // detail panel below only knows the signed-in owner's own lots.
      void this.router.navigateByUrl('/shared-lots');
      return;
    }
    this.ui.selectLot(id);
    void this.router.navigateByUrl('/lots');
  }

  private readStoredFilter(): string {
    try {
      return localStorage.getItem(FILTER_KEY) || '';
    } catch {
      return '';
    }
  }
}
