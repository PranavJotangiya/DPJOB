import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
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
  { id: 'cutting', route: '/cutting' },
  { id: 'bale', route: '/bale' },
  { id: 'reports', route: '/reports' },
  { id: 'settings', route: '/settings' },
];

const BN_ICONS: Record<string, string> = {
  dashboard: '🏭',
  newLot: '＋',
  lots: '📋',
  cutting: '✂️',
  bale: '🧵',
  reports: '📊',
  settings: '⚙️',
};

// newLot sits in the middle so its round "+" button is centered in the bar.
const PRIMARY_NAV = ['dashboard', 'lots', 'newLot', 'cutting'];
const MORE_NAV = ['bale', 'reports', 'settings'];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe, LotDetailPanel],
  templateUrl: './shell.html',
})
export class Shell {
  readonly ui = inject(UiStore);
  readonly i18n = inject(I18nService);

  readonly navItems = NAV_ITEMS;
  readonly primaryNav = PRIMARY_NAV.map((id) => NAV_ITEMS.find((n) => n.id === id)!);
  readonly moreNav = MORE_NAV.map((id) => NAV_ITEMS.find((n) => n.id === id)!);
  readonly icons = BN_ICONS;

  onLangChange(event: Event): void {
    this.i18n.setLang((event.target as HTMLSelectElement).value as LangCode);
  }
}
