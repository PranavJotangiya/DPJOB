import { Component, inject } from '@angular/core';
import { SessionService } from './core/session.service';
import { Shell } from './layout/shell/shell';
import { Login } from './features/login/login';
import { Setup } from './features/setup/setup';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Shell, Login, Setup],
  template: `
    @if (session.ready()) {
      @if (session.currentUser()) {
        <app-shell />
      } @else if (session.needsSetup()) {
        <app-setup />
      } @else {
        <app-login />
      }
    } @else {
      <div class="app-boot"></div>
    }
  `,
})
export class App {
  readonly session = inject(SessionService);
}
