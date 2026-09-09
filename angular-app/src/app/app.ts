import { Component, inject } from '@angular/core';
import { SessionService } from './core/session.service';
import { Shell } from './layout/shell/shell';
import { Login } from './features/login/login';
import { Setup } from './features/setup/setup';
import { GarmentLoader } from './shared/garment-loader/garment-loader';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Shell, Login, Setup, GarmentLoader],
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

    <!-- Sits outside the screens so login, setup and the shell all share it. -->
    <app-garment-loader />
  `,
})
export class App {
  readonly session = inject(SessionService);
}
