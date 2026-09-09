import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { PartiesService } from '../../core/parties.service';
import { LotsService } from '../../core/lots.service';

@Component({
  selector: 'app-parties',
  standalone: true,
  imports: [FormsModule, TPipe],
  templateUrl: './parties.html',
})
export class Parties implements OnInit {
  readonly ui = inject(UiStore);
  readonly partiesService = inject(PartiesService);
  private lotsService = inject(LotsService);

  readonly parties = this.partiesService.parties;
  readonly name = signal('');
  readonly takenError = signal(false);

  ngOnInit(): void {
    this.ui.setSection('parties');
  }

  setName(value: string): void {
    this.name.set(value);
    this.takenError.set(false);
  }

  async add(): Promise<void> {
    const n = this.name().trim();
    if (!n) return;
    if (this.partiesService.nameTaken(n)) {
      this.takenError.set(true);
      return;
    }
    try {
      await this.partiesService.addParty(n);
    } catch {
      // The server rejects duplicates too, checked against the whole collection.
      this.takenError.set(true);
      return;
    }
    this.name.set('');
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
}
