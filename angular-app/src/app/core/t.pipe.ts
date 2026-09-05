import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Template translate pipe: `{{ 'nav.dashboard' | t }}`.
 * Marked impure so it re-evaluates when the active language signal changes
 * (the key argument itself never changes, so a pure pipe would never refresh).
 */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string): string {
    return this.i18n.t()(key);
  }
}
