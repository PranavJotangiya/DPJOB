import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../core/t.pipe';
import { SessionService } from '../../core/session.service';
import { I18nService } from '../../core/i18n.service';
import type { LangCode } from '../../core/models';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [FormsModule, TPipe],
  templateUrl: './setup.html',
})
export class Setup {
  private session = inject(SessionService);
  readonly i18n = inject(I18nService);

  readonly name = signal('');
  readonly username = signal('');
  readonly pin = signal('');
  readonly pin2 = signal('');
  readonly busy = signal(false);
  readonly error = signal('');

  readonly languages = this.i18n.languages;

  readonly pinValid = computed(() => /^\d{4,6}$/.test(this.pin()));
  readonly canSubmit = computed(
    () => this.username().trim().length > 0 && this.pinValid() && this.pin() === this.pin2(),
  );

  onLang(event: Event): void {
    this.i18n.setLang((event.target as HTMLSelectElement).value as LangCode);
  }

  async submit(): Promise<void> {
    if (this.busy() || !this.canSubmit()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.session.createFirstAdmin({
        username: this.username(),
        name: this.name(),
        pin: this.pin(),
      });
    } catch {
      this.error.set('generic');
    } finally {
      this.busy.set(false);
    }
  }
}
