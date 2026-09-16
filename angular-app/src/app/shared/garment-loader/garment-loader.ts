import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../core/loading.service';
import { TPipe } from '../../core/t.pipe';

/**
 * The one loader for the whole app: a full-screen scrim with a small card and
 * a spinner, shown while any API request is pending. Driven by
 * LoadingService, so no screen has to wire up its own.
 */
@Component({
  selector: 'app-garment-loader',
  standalone: true,
  imports: [TPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading.visible()) {
      <div class="loader-scrim" role="status" aria-live="polite">
        <div class="loader-card">
          <div class="loader-spinner" aria-hidden="true"></div>
          <span class="loader-label">{{ 'loader.working' | t }}</span>
        </div>
      </div>
    }
  `,
})
export class GarmentLoader {
  readonly loading = inject(LoadingService);
}
