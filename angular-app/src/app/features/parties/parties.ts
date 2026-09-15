import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { SessionService } from '../../core/session.service';
import { PartiesService } from '../../core/parties.service';
import { LotsService } from '../../core/lots.service';

/** 'idle' before 10 digits, 'checking' mid-debounce, 'notfound', 'self' (your
 *  own number), or the registered account's name. */
type LookupStatus = 'idle' | 'checking' | 'notfound' | 'self' | string;

const DEBOUNCE_MS = 400;

@Component({
  selector: 'app-parties',
  standalone: true,
  imports: [FormsModule, TPipe],
  templateUrl: './parties.html',
})
export class Parties implements OnInit {
  readonly ui = inject(UiStore);
  readonly session = inject(SessionService);
  readonly partiesService = inject(PartiesService);
  private lotsService = inject(LotsService);

  readonly parties = this.partiesService.parties;
  readonly name = signal('');
  readonly phone = signal('');
  readonly phoneLookup = signal<LookupStatus>('idle');
  readonly takenError = signal(false);

  readonly phoneEdits = signal<Record<string, string>>({});
  readonly phoneEditLookup = signal<Record<string, LookupStatus>>({});

  private addTimer?: ReturnType<typeof setTimeout>;
  private readonly editTimers = new Map<string, ReturnType<typeof setTimeout>>();

  ngOnInit(): void {
    this.ui.setSection('parties');
  }

  setName(value: string): void {
    this.name.set(value);
    this.takenError.set(false);
  }

  setPhone(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    this.phone.set(digits);
    if (this.addTimer) clearTimeout(this.addTimer);
    if (digits.length !== 10) {
      this.phoneLookup.set('idle');
      return;
    }
    if (digits === this.session.currentUser()?.username) {
      this.phoneLookup.set('self');
      return;
    }
    this.phoneLookup.set('checking');
    this.addTimer = setTimeout(async () => {
      const found = await this.partiesService.lookupPhone(digits);
      if (this.phone() !== digits) return; // stale — number changed while awaiting
      this.phoneLookup.set(found ?? 'notfound');
      if (found) this.name.set(found);
    }, DEBOUNCE_MS);
  }

  async add(): Promise<void> {
    const n = this.name().trim();
    if (!n) return;
    if (this.partiesService.nameTaken(n)) {
      this.takenError.set(true);
      return;
    }
    try {
      await this.partiesService.addParty(n, this.phone() || undefined);
    } catch {
      // The server rejects duplicates too, checked against the whole collection.
      this.takenError.set(true);
      return;
    }
    this.name.set('');
    this.phone.set('');
    this.phoneLookup.set('idle');
  }

  lotCount(partyName: string): number {
    return this.lotsService.lots().filter((l) => l.party === partyName).length;
  }

  async remove(id: string, partyName: string): Promise<void> {
    const used = this.lotCount(partyName);
    const msg = used
      ? `"${partyName}" has ${used} lot(s). Delete the party anyway? Lots keep the name.`
      : `Delete party "${partyName}"?`;
    if (!confirm(msg)) return;
    await this.partiesService.removeParty(id);
  }

  setPhoneEdit(id: string, value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    this.phoneEdits.update((m) => ({ ...m, [id]: digits }));

    const existing = this.editTimers.get(id);
    if (existing) clearTimeout(existing);

    if (digits.length !== 10) {
      this.phoneEditLookup.update((m) => ({ ...m, [id]: 'idle' }));
      return;
    }
    if (digits === this.session.currentUser()?.username) {
      this.phoneEditLookup.update((m) => ({ ...m, [id]: 'self' }));
      return;
    }
    this.phoneEditLookup.update((m) => ({ ...m, [id]: 'checking' }));
    const timer = setTimeout(async () => {
      const found = await this.partiesService.lookupPhone(digits);
      if (this.phoneEdits()[id] !== digits) return; // stale
      this.phoneEditLookup.update((m) => ({ ...m, [id]: found ?? 'notfound' }));
    }, DEBOUNCE_MS);
    this.editTimers.set(id, timer);
  }

  async savePhone(id: string): Promise<void> {
    const digits = (this.phoneEdits()[id] || '').trim();
    if (digits && digits.length !== 10) return;
    await this.partiesService.setPhone(id, digits);
    this.phoneEdits.update((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    this.phoneEditLookup.update((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  }
}
