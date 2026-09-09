import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { LoadingService } from '../../core/loading.service';
import { TPipe } from '../../core/t.pipe';

/** The garments this factory actually cuts — they rotate while you wait. */
const GARMENTS = ['👕', '👖', '👗', '👔', '🧥', '🩳'];
const SWAP_MS = 450;

/**
 * The one loader for the whole app: a full-screen scrim with a card whose icon
 * cycles through garments while any API request is pending. It is driven by
 * LoadingService, so no screen has to wire up its own spinner.
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
          <div class="loader-ring">
            <!-- Every garment is rendered and only the current one is shown.
                 Swapping the text of a single element would not replay the CSS
                 animation; toggling the class on a hidden element does. -->
            @for (g of garments; track $index) {
              <span class="loader-garment" [class.on]="$index === step()">{{ g }}</span>
            }
          </div>
          <span class="loader-label">{{ 'loader.working' | t }}</span>
          <div class="loader-dots" aria-hidden="true">
            <i></i><i></i><i></i>
          </div>
        </div>
      </div>
    }
  `,
})
export class GarmentLoader {
  readonly loading = inject(LoadingService);

  readonly garments = GARMENTS;
  readonly step = signal(0);

  constructor() {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stopCycle = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    // Only cycle while the loader is actually on screen — no timer ticking away
    // in the background for a screen nobody is looking at.
    effect(() => {
      stopCycle();
      if (!this.loading.visible()) return;

      this.step.set(0);
      timer = setInterval(() => {
        this.step.update((n) => (n + 1) % GARMENTS.length);
      }, SWAP_MS);
    });

    inject(DestroyRef).onDestroy(stopCycle);
  }
}
