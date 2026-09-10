import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { SessionService } from '../../core/session.service';
import { UsersService } from '../../core/users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, TPipe],
  templateUrl: './users.html',
})
export class Users implements OnInit {
  readonly ui = inject(UiStore);
  readonly session = inject(SessionService);
  readonly usersService = inject(UsersService);

  readonly users = this.usersService.users;

  readonly form = signal<{ username: string; name: string; pin: string }>({
    username: '',
    name: '',
    pin: '',
  });
  readonly takenError = signal(false);

  readonly pinEdits = signal<Record<string, string>>({});

  readonly canAdd = computed(() => {
    const f = this.form();
    return f.username.trim().length > 0 && /^\d{4,6}$/.test(f.pin);
  });

  ngOnInit(): void {
    this.ui.setSection('users');
  }

  patch<K extends 'username' | 'name' | 'pin'>(key: K, value: string): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    this.takenError.set(false);
  }

  async add(): Promise<void> {
    const f = this.form();
    if (!this.canAdd()) return;
    if (this.usersService.usernameTaken(f.username)) {
      this.takenError.set(true);
      return;
    }
    try {
      await this.usersService.addUser(f);
    } catch {
      // The server checks the username too, against the whole collection.
      this.takenError.set(true);
      return;
    }
    this.form.set({ username: '', name: '', pin: '' });
  }

  setPinEdit(username: string, value: string): void {
    this.pinEdits.update((m) => ({ ...m, [username]: value }));
  }

  async savePin(username: string): Promise<void> {
    const pin = (this.pinEdits()[username] || '').trim();
    if (!/^\d{4,6}$/.test(pin)) return;
    await this.usersService.setPin(username, pin);
    this.pinEdits.update((m) => {
      const next = { ...m };
      delete next[username];
      return next;
    });
  }
}
