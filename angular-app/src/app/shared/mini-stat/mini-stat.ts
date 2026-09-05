import { Component, input } from '@angular/core';

@Component({
  selector: 'app-mini-stat',
  standalone: true,
  template: `
    <div class="mini-stat">
      <span>{{ label() }}</span>
      <strong>{{ value() }}</strong>
    </div>
  `,
})
export class MiniStat {
  readonly label = input.required<string>();
  readonly value = input<string | number>('');
}
