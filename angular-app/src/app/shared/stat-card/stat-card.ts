import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <div class="stat-card" [class]="tone()">
      <span>{{ label() }}</span>
      <strong>{{ value() }}</strong>
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input<string | number>('');
  readonly tone = input<string>('blue');
}
