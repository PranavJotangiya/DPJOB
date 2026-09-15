import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../core/t.pipe';
import { SessionService } from '../../core/session.service';
import { I18nService } from '../../core/i18n.service';
import type { AccountType, LangCode } from '../../core/models';

type Mode = 'login' | 'signup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, TPipe],
  templateUrl: './login.html',
})
export class Login {
  private session = inject(SessionService);
  readonly i18n = inject(I18nService);

  readonly mode = signal<Mode>('login');
  readonly busy = signal(false);

  // Log in
  readonly username = signal('');
  readonly pin = signal('');
  readonly error = signal(false);

  // Create account
  readonly companyName = signal('');
  readonly signupPhone = signal('');
  readonly accountType = signal<AccountType>('jobber');
  readonly signupPin = signal('');
  readonly signupPin2 = signal('');
  readonly signupError = signal(false);

  readonly languages = this.i18n.languages;

  readonly signupPinValid = computed(() => /^\d{4,6}$/.test(this.signupPin()));
  readonly canSignup = computed(
    () =>
      this.companyName().trim().length > 0 &&
      /^\d{10}$/.test(this.signupPhone()) &&
      this.signupPinValid() &&
      this.signupPin() === this.signupPin2(),
  );

  setMode(mode: Mode): void {
    this.mode.set(mode);
    this.error.set(false);
    this.signupError.set(false);
  }

  onLang(event: Event): void {
    this.i18n.setLang((event.target as HTMLSelectElement).value as LangCode);
  }

  setSignupPhone(value: string): void {
    this.signupPhone.set(value.replace(/\D/g, '').slice(0, 10));
  }

  onSubmit(): void {
    void (this.mode() === 'login' ? this.submit() : this.signup());
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

  async signup(): Promise<void> {
    if (this.busy() || !this.canSignup()) return;
    this.busy.set(true);
    this.signupError.set(false);
    try {
      await this.session.register({
        username: this.signupPhone(),
        name: this.companyName(),
        pin: this.signupPin(),
        accountType: this.accountType(),
      });
    } catch {
      this.signupError.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
