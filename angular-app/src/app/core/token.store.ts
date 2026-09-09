import { Injectable, signal } from '@angular/core';
import type { SessionUser } from './models';

const TOKEN_KEY = 'dp-token';
const USER_KEY = 'dp-session';

interface Saved {
  token: string;
  user: SessionUser;
}

/**
 * Holds the signed token the API issues at login, plus the user it describes.
 *
 * It lives apart from SessionService so the HTTP interceptor can read the token
 * without depending on the service that performs the login (which itself uses
 * HttpClient). Services watch `token()` to know when to open their streams.
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  readonly token = signal<string>('');
  readonly user = signal<SessionUser | null>(null);

  constructor() {
    this.restore();
  }

  private restore(): void {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const rawUser = localStorage.getItem(USER_KEY);
      if (token && rawUser) {
        this.token.set(token);
        this.user.set(JSON.parse(rawUser) as SessionUser);
      }
    } catch {
      // corrupt or blocked storage — the user just signs in again
    }
  }

  set({ token, user }: Saved): void {
    this.token.set(token);
    this.user.set(user);
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // non-fatal — the session just won't survive a reload
    }
  }

  /** Keeps the token, refreshes the identity (name/role can change server-side). */
  setUser(user: SessionUser): void {
    this.user.set(user);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  clear(): void {
    this.token.set('');
    this.user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
  }
}
