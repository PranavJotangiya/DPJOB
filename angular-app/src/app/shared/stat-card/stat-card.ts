import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="stat-card" [class]="tone()" [class.hero]="hero()">
      @if (icon()) {
        <span class="stat-ico" aria-hidden="true"><app-icon [name]="icon()" [size]="18" /></span>
      }
      <span class="stat-k">{{ label() }}</span>
      <strong class="stat-v">{{ value() }}</strong>
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input<string | number>('');
  readonly tone = input<string>('blue');
  readonly icon = input<string>('');
  readonly hero = input<boolean>(false);
}
