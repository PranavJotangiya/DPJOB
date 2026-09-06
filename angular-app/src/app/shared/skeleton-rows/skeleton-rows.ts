import { Component, computed, input } from '@angular/core';

/** Shimmering placeholder rows shown while a list is still loading from Firestore. */
@Component({
  selector: 'app-skeleton-rows',
  standalone: true,
  template: `
    <div class="skeleton-rows">
      @for (i of rowsArray(); track i) {
        <div class="skeleton-row">
          <span class="skeleton-bar w-lg"></span>
          <span class="skeleton-bar w-md"></span>
          <span class="skeleton-bar w-sm"></span>
        </div>
      }
    </div>
  `,
})
export class SkeletonRows {
  readonly rows = input(4);
  readonly rowsArray = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
}
