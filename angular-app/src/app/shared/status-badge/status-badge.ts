import { Component, computed, input } from '@angular/core';
import { TPipe } from '../../core/t.pipe';
import type { LotStatus } from '../../core/models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [TPipe],
  template: `<span class="status-badge" [class]="cssClass()">{{ 'status.' + status() | t }}</span>`,
})
export class StatusBadge {
  readonly status = input<LotStatus | string | undefined>('Draft');
  readonly cssClass = computed(() => (this.status() ?? 'draft').toString().toLowerCase().replace(/\s+/g, '-'));
}
