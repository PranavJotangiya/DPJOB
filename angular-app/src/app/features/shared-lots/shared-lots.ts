import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { SessionService } from '../../core/session.service';
import { LinksService, type SharedLot } from '../../core/links.service';
import { PdfService } from '../../core/pdf.service';
import { I18nService } from '../../core/i18n.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { SkeletonRows } from '../../shared/skeleton-rows/skeleton-rows';
import { Icon } from '../../shared/icon/icon';

/** 'idle' before 10 digits, 'checking' mid-debounce, 'notfound', 'self', or
 *  the registered account's name. */
type LookupStatus = 'idle' | 'checking' | 'notfound' | 'self' | string;

const DEBOUNCE_MS = 400;

/**
 * The Party side of the party↔jobber phone-number link. Add a jobber by
 * mobile number, see who you're linked to, and browse the lots they've filed
 * under your own registered name — entirely read-only (server/src/routes/
 * links.routes.ts enforces this too; the regular /lots routes still 404 for
 * anything you don't own).
 */
@Component({
  selector: 'app-shared-lots',
  standalone: true,
  imports: [FormsModule, TPipe, StatusBadge, EmptyState, SkeletonRows, Icon],
  templateUrl: './shared-lots.html',
})
export class SharedLots implements OnInit {
  readonly ui = inject(UiStore);
  readonly session = inject(SessionService);
  readonly links = inject(LinksService);
  private pdf = inject(PdfService);
  private i18n = inject(I18nService);

  readonly jobbers = this.links.jobbers;
  readonly sharedLots = this.links.sharedLots;
  readonly ready = this.links.ready;

  readonly phone = signal('');
  readonly phoneLookup = signal<LookupStatus>('idle');
  readonly addError = signal(false);
  readonly selected = signal<SharedLot | null>(null);

  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.ui.setSection('sharedLots');
    void this.links.refresh();
  }

  setPhone(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    this.phone.set(digits);
    this.addError.set(false);
    if (this.timer) clearTimeout(this.timer);
    if (digits.length !== 10) {
      this.phoneLookup.set('idle');
      return;
    }
    if (digits === this.session.currentUser()?.username) {
      this.phoneLookup.set('self');
      return;
    }
    this.phoneLookup.set('checking');
    this.timer = setTimeout(async () => {
      const found = await this.links.lookupJobber(digits);
      if (this.phone() !== digits) return; // stale — number changed while awaiting
      this.phoneLookup.set(found ?? 'notfound');
    }, DEBOUNCE_MS);
  }

  async addJobber(): Promise<void> {
    if (this.phone().length !== 10 || this.phoneLookup() === 'self') return;
    this.addError.set(false);
    try {
      await this.links.addJobber(this.phone());
    } catch {
      this.addError.set(true);
      return;
    }
    this.phone.set('');
    this.phoneLookup.set('idle');
  }

  async removeJobber(username: string): Promise<void> {
    if (!confirm('Stop viewing job cards from this jobber?')) return;
    await this.links.removeJobber(username);
  }

  refresh(): void {
    void this.links.refresh();
  }

  open(lot: SharedLot): void {
    this.selected.set(lot);
  }

  close(): void {
    this.selected.set(null);
  }

  print(lot: SharedLot): void {
    void this.pdf.printLot(lot, this.i18n.lang());
  }

  share(lot: SharedLot): void {
    void this.pdf.sharePdf(lot, this.i18n.lang());
  }
}
