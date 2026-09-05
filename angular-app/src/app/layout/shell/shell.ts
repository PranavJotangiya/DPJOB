import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import type { LangCode, Role } from '../../core/models';
import { LotForm } from '../../features/lot-form/lot-form';
import { LotDetailPanel } from '../../features/lot-detail-panel/lot-detail-panel';

interface NavItem {
  id: string;
  route: string | null;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', route: '/dashboard' },
  { id: 'newLot', route: null },
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

const PRIMARY_NAV = ['dashboard', 'newLot', 'lots', 'cutting'];
const MORE_NAV = ['bale', 'reports', 'settings'];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe, LotForm, LotDetailPanel],
  templateUrl: './shell.html',
})
export class Shell {
  readonly ui = inject(UiStore);
  readonly i18n = inject(I18nService);

  readonly navItems = NAV_ITEMS;
  readonly primaryNav = PRIMARY_NAV.map((id) => NAV_ITEMS.find((n) => n.id === id)!);
  readonly moreNav = MORE_NAV.map((id) => NAV_ITEMS.find((n) => n.id === id)!);
  readonly icons = BN_ICONS;

  readonly roles: Role[] = ['Admin', 'Supervisor', 'Operator', 'Viewer'];

  onRoleChange(event: Event): void {
    this.ui.role.set((event.target as HTMLSelectElement).value as Role);
  }

  onLangChange(event: Event): void {
    this.i18n.setLang((event.target as HTMLSelectElement).value as LangCode);
  }

  goToNav(id: string): void {
    if (id === 'newLot') this.ui.openNewLot();
    this.ui.moreOpen.set(false);
  }
}
