import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api';
import { TokenStore } from './token.store';
import type { SessionUser } from './models';

interface LoginResponse {
  token: string;
  user: SessionUser;
}

/**
 * Who is using the app. The username + PIN are checked by the Node server,
 * which returns a signed token; the browser never sees a PIN hash and never
 * touches Firebase. A remembered session is re-validated against the server on
 * start, so a deactivated or deleted user is signed out on their next visit.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private api = inject(ApiService);
  private tokens = inject(TokenStore);

  readonly currentUser = this.tokens.user.asReadonly();
  readonly ready = signal(false);
  /** True when the server reports no users yet — show the first-run setup. */
  readonly needsSetup = signal(false);

  /**
   * There is no role-based access control — being signed in is the only thing
   * that gates anything, and the server enforces exactly that. `role` survives
   * as a label on the user record, not as a permission.
   */
  readonly isSignedIn = computed(() => this.currentUser() !== null);

  constructor() {
    void this.boot();
  }

  private async boot(): Promise<void> {
    if (this.tokens.token()) {
      try {
        this.tokens.setUser(await this.api.get<SessionUser>('/auth/me'));
        this.ready.set(true);
        return;
      } catch {
        // A 401 already cleared the token in the interceptor; anything else
        // means the server is unreachable. Either way, fall through.
      }
    }
    try {
      const { needsSetup } = await this.api.get<{ needsSetup: boolean }>('/auth/setup-status');
      this.needsSetup.set(needsSetup);
    } catch {
      // Server down — show the login screen rather than the setup wizard.
      this.needsSetup.set(false);
    } finally {
      this.ready.set(true);
    }
  }

  /** First-run: create the very first user as Admin and sign them in. */
  async createFirstAdmin(input: { username: string; name: string; pin: string }): Promise<void> {
    this.tokens.set(await this.api.post<LoginResponse>('/auth/setup', input));
    this.needsSetup.set(false);
  }

  /** Returns true on success; false for unknown user / wrong PIN / disabled. */
  async login(username: string, pin: string): Promise<boolean> {
    try {
      this.tokens.set(await this.api.post<LoginResponse>('/auth/login', { username, pin }));
      return true;
    } catch {
      return false;
    }
  }

  logout(): void {
    this.tokens.clear();
  }
}
