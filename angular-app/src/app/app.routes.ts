import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
  { path: 'lots', loadComponent: () => import('./features/lots/lots-list').then((m) => m.LotsList) },
  { path: 'cutting', loadComponent: () => import('./features/cutting/cutting').then((m) => m.Cutting) },
  { path: 'bale', loadComponent: () => import('./features/bale/bale').then((m) => m.Bale) },
  { path: 'reports', loadComponent: () => import('./features/reports/reports').then((m) => m.Reports) },
  { path: 'settings', loadComponent: () => import('./features/settings/settings').then((m) => m.Settings) },
  { path: '**', redirectTo: 'dashboard' },
];
