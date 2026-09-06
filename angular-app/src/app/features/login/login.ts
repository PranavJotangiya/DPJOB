import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../core/t.pipe';
import { SessionService } from '../../core/session.service';
import { I18nService } from '../../core/i18n.service';
import type { LangCode } from '../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, TPipe],
  templateUrl: './login.html',
})
export class Login {
  private session = inject(SessionService);
  readonly i18n = inject(I18nService);

  readonly username = signal('');
  readonly pin = signal('');
  readonly error = signal(false);
  readonly busy = signal(false);

  readonly languages = this.i18n.languages;

  onLang(event: Event): void {
    this.i18n.setLang((event.target as HTMLSelectElement).value as LangCode);
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(false);
    try {
      const ok = await this.session.login(this.username(), this.pin());
      if (!ok) this.error.set(true);
    } catch {
      this.error.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
