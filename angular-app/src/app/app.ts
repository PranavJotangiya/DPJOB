import { Component, inject } from '@angular/core';
import { SessionService } from './core/session.service';
import { Shell } from './layout/shell/shell';
import { Login } from './features/login/login';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Shell, Login],
  template: `
    @if (session.ready()) {
      @if (session.currentUser(); as user) {
        <app-shell />
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
