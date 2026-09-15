import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
import { SessionService } from '../../core/session.service';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import type { LangCode } from '../../core/models';
import { LotDetailPanel } from '../../features/lot-detail-panel/lot-detail-panel';

interface NavItem {
  id: string;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', route: '/dashboard' },
  { id: 'newLot', route: '/lots/new' },
  { id: 'lots', route: '/lots' },
  { id: 'parties', route: '/parties' },
  { id: 'bale', route: '/bale' },
  { id: 'reports', route: '/reports' },
  { id: 'sharedLots', route: '/shared-lots' },
  { id: 'users', route: '/users' },
  { id: 'settings', route: '/settings' },
];

const BN_ICONS: Record<string, string> = {
  dashboard: '🏭',
  newLot: '＋',
  lots: '📋',
  parties: '🏷️',
  bale: '🧵',
  reports: '📊',
  sharedLots: '🔗',
  users: '👥',
  settings: '⚙️',
};

// The primary row's most useful slot differs by account type: a Jobber's
// day-to-day actions are dashboard/lots/new-lot/"Add Party"; a Party doesn't
// file job cards or keep its own party list, so "Add Jobber" (shared-lots)
// takes that spot instead. newLot sits in the middle for a Jobber so its
// round "+" button is centered in the bar.
const PRIMARY_NAV_JOBBER = ['dashboard', 'lots', 'newLot', 'parties'];
const PRIMARY_NAV_PARTY = ['dashboard', 'lots', 'sharedLots'];
const MORE_NAV_JOBBER = ['bale', 'reports', 'sharedLots', 'users', 'settings'];
const MORE_NAV_PARTY = ['bale', 'reports', 'parties', 'users', 'settings'];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe, LotDetailPanel],
  templateUrl: './shell.html',
})
export class Shell {
  readonly ui = inject(UiStore);
  readonly i18n = inject(I18nService);
  readonly session = inject(SessionService);

  readonly icons = BN_ICONS;

  // A Party account doesn't file its own job cards, so "New Lot" is left out
  // of every nav surface for it — see SessionService.isParty.
  private readonly visibleItems = computed(() =>
    this.session.isParty() ? NAV_ITEMS.filter((n) => n.id !== 'newLot') : NAV_ITEMS,
  );
  readonly navItems = this.visibleItems;
  readonly primaryNav = computed(() => {
    const ids = this.session.isParty() ? PRIMARY_NAV_PARTY : PRIMARY_NAV_JOBBER;
    return ids
      .map((id) => this.visibleItems().find((n) => n.id === id))
      .filter((n): n is NavItem => !!n);
  });
  readonly moreNav = computed(() => {
    const ids = this.session.isParty() ? MORE_NAV_PARTY : MORE_NAV_JOBBER;
    return ids
      .map((id) => this.visibleItems().find((n) => n.id === id))
      .filter((n): n is NavItem => !!n);
  });

  onLangChange(event: Event): void {
    this.i18n.setLang((event.target as HTMLSelectElement).value as LangCode);
  }
}
