import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { LotsService } from '../../core/lots.service';
import { apiErrorMessage } from '../../core/api';
import { PartiesService } from '../../core/parties.service';
import { I18nService } from '../../core/i18n.service';
import { fileToCompressedDataUrl } from '../../core/image';
import { PatternPad } from '../pattern-pad/pattern-pad';
import {
  Bale,
  createEmptySizeBreakdown,
  CuttingInfo,
  defaultLotInput,
  LotInput,
  SIZE_OPTIONS,
  toFormInput,
} from '../../core/models';

@Component({
  selector: 'app-lot-form',
  standalone: true,
  imports: [FormsModule, TPipe, PatternPad, RouterLink],
  templateUrl: './lot-form.html',
})
export class LotForm implements OnInit {
  readonly ui = inject(UiStore);
  private lotsService = inject(LotsService);
  private partiesService = inject(PartiesService);
  private i18n = inject(I18nService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly sizeOptions = SIZE_OPTIONS;
  readonly suppliers = this.lotsService.suppliers;
  readonly partyNames = this.partiesService.names;

  private readonly editingId = this.route.snapshot.paramMap.get('id');
  readonly editingLot = this.editingId
    ? this.lotsService.lots().find((l) => l.id === this.editingId) ?? null
    : null;
  readonly isEditing = this.editingLot !== null;

  readonly form = signal<LotInput>(this.editingLot ? toFormInput(this.editingLot) : defaultLotInput());
  readonly errors = signal<string[]>([]);
  readonly bulkFillValue = signal<number | null>(null);
  readonly imageBusy = signal(false);
  readonly drawOpen = signal(false);

  readonly sizeTotal = computed(() =>
    Object.values(this.form().sizeBreakdown).reduce((sum, v) => sum + (Number(v) || 0), 0),
  );
  readonly baleTotal = computed(() =>
    this.form().bales.reduce((sum, b) => sum + (Number(b.meters) || 0), 0),
  );
  readonly averageValue = computed(() => {
    const f = this.form();
    const meters = Number(f.totalMeters) || 0;
    const pieces = this.sizeTotal();
    return meters > 0 && pieces > 0 ? meters / pieces : 0;
  });

  updateField<K extends keyof LotInput>(key: K, value: LotInput[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  updateCutting(patch: Partial<CuttingInfo>): void {
    this.form.update((f) => ({ ...f, cutting: { ...f.cutting, ...patch } }));
  }

  async onPatternImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.imageBusy.set(true);
    try {
      let dataUrl = await fileToCompressedDataUrl(file);
      // keep the lot document comfortably under Firestore's 1 MiB limit
      if (dataUrl.length > 850_000) dataUrl = await fileToCompressedDataUrl(file, 1000, 0.6);
      this.updateField('patternImage', dataUrl);
    } catch {
      this.errors.set(['Could not read that image. Try another photo.']);
    } finally {
      this.imageBusy.set(false);
      input.value = '';
    }
  }

  removePatternImage(): void {
    this.updateField('patternImage', '');
  }

  onDrawDone(dataUrl: string | null): void {
    this.drawOpen.set(false);
    if (dataUrl) this.updateField('patternImage', dataUrl);
  }

  updateSize(size: number, value: string | number): void {
    this.form.update((f) => ({
      ...f,
      sizeBreakdown: { ...f.sizeBreakdown, [String(size)]: Number(value || 0) },
    }));
  }

  bulkFill36(): void {
    this.bulkFill(36);
  }

  applyBulkFill(): void {
    const value = Number(this.bulkFillValue());
    if (!value || value <= 0) return;
    this.bulkFill(value);
  }

  private bulkFill(value: number): void {
    this.form.update((f) => ({
      ...f,
      sizeBreakdown: Object.fromEntries(SIZE_OPTIONS.map((s) => [String(s), value])),
    }));
  }

  clearAllSizes(): void {
    this.form.update((f) => ({ ...f, sizeBreakdown: createEmptySizeBreakdown() }));
  }

  addBale(): void {
    const bale: Bale = { id: crypto.randomUUID(), baleNumber: '', meters: 0 };
    this.form.update((f) => ({ ...f, bales: [...f.bales, bale] }));
  }

  updateBale(id: string, field: 'baleNumber' | 'meters', value: string | number): void {
    this.form.update((f) => ({
      ...f,
      bales: f.bales.map((b) => (b.id === id ? { ...b, [field]: field === 'meters' ? Number(value || 0) : value } : b)),
    }));
  }

  removeBale(id: string): void {
    this.form.update((f) => ({ ...f, bales: f.bales.filter((b) => b.id !== id) }));
  }

  generateLotNumber(): void {
    const maxN = this.lotsService.lots().reduce((max, l) => {
      const match = String(l.lotNumber || '').match(/(\d+)/);
      const num = match ? Number(match[1]) : NaN;
      return Number.isFinite(num) ? Math.max(max, num) : max;
    }, 0);
    this.updateField('lotNumber', `LOT-${maxN + 1}`);
  }

  ngOnInit(): void {
    this.ui.setSection(this.isEditing ? 'editLot' : 'newLot');
  }

  close(): void {
    void this.router.navigateByUrl('/lots');
  }

  async save(): Promise<void> {
    const f = this.form();
    const input: LotInput = {
      ...f,
      lotNumber: (f.lotNumber || '').trim(),
      averageConsumption: this.averageValue(),
      totalPieces: this.sizeTotal(),
    };
    if (!this.isEditing) input.status = 'Ready';

    try {
      let id: string;
      if (this.isEditing && this.editingLot) {
        id = this.editingLot.id;
        await this.lotsService.updateLot(id, input);
        this.ui.showMessage(this.i18n.t()('msg.updated'));
      } else {
        id = await this.lotsService.createLot(input);
        this.ui.showMessage(this.i18n.t()('msg.saved'));
      }
      this.ui.selectLot(id);
      this.errors.set([]);
      void this.router.navigateByUrl('/lots');
    } catch (err) {
      console.error(err);
      // The server explains refusals it knows about (role, validation); only
      // fall back to the connection hint when it said nothing useful.
      this.errors.set([
        apiErrorMessage(err, 'Unable to save lot. Check your connection and try again.'),
      ]);
    }
  }
}
