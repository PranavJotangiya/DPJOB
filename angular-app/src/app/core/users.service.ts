import { inject, Injectable } from '@angular/core';
import { ApiService } from './api';
import { liveCollection } from './live-collection';
import type { AppUser, Role } from './models';

/**
 * The account page. The API only ever returns the signed-in user's own record,
 * so `users()` holds exactly one row — nobody can see or change anyone else's
 * account. Creating a new account is still allowed: that is how someone is
 * onboarded now that there are no admins.
 *
 * PINs are hashed on the server; `pinHash` never reaches the browser.
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private api = inject(ApiService);

  private live = liveCollection<AppUser>('/users/stream');

  readonly users = this.live.rows;
  readonly ready = this.live.ready;

  usernameTaken(username: string): boolean {
    const id = username.trim().toLowerCase();
    return this.users().some((u) => u.username === id);
  }

  async addUser(input: { username: string; name: string; pin: string; role: Role }): Promise<void> {
    await this.api.post<{ username: string }>('/users', {
      username: input.username.trim().toLowerCase(),
      name: input.name.trim(),
      pin: input.pin,
      role: input.role,
    });
  }

  async setPin(username: string, pin: string): Promise<void> {
    await this.api.patch<{ username: string }>(`/users/${username}`, { pin });
  }

  async setRole(username: string, role: Role): Promise<void> {
    await this.api.patch<{ username: string }>(`/users/${username}`, { role });
  }
}
