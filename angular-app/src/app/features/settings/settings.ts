import { Component, inject, OnInit } from '@angular/core';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { I18nService } from '../../core/i18n.service';
import type { LangCode } from '../../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [TPipe],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  readonly ui = inject(UiStore);
  readonly i18n = inject(I18nService);

  ngOnInit(): void {
    this.ui.setSection('settings');
  }

  onLangChange(event: Event): void {
    this.i18n.setLang((event.target as HTMLSelectElement).value as LangCode);
  }
}
