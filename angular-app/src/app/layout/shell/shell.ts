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

// newLot sits in the middle so its round "+" button is centered in the bar.
const PRIMARY_NAV = ['dashboard', 'lots', 'newLot', 'parties'];
const MORE_NAV = ['bale', 'reports', 'sharedLots', 'users', 'settings'];

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
  readonly primaryNav = computed(() =>
    PRIMARY_NAV.map((id) => this.visibleItems().find((n) => n.id === id)).filter(
      (n): n is NavItem => !!n,
    ),
  );
  readonly moreNav = computed(() =>
    MORE_NAV.map((id) => this.visibleItems().find((n) => n.id === id)).filter(
      (n): n is NavItem => !!n,
    ),
  );

  onLangChange(event: Event): void {
    this.i18n.setLang((event.target as HTMLSelectElement).value as LangCode);
  }
}
