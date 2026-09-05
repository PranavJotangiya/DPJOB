import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { LotsService } from '../../core/lots.service';
import { I18nService } from '../../core/i18n.service';
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
  imports: [FormsModule, TPipe],
  templateUrl: './lot-form.html',
})
export class LotForm {
  readonly ui = inject(UiStore);
  private lotsService = inject(LotsService);
  private i18n = inject(I18nService);
  private router = inject(Router);

  readonly sizeOptions = SIZE_OPTIONS;
  readonly suppliers = this.lotsService.suppliers;

  readonly editingLot = this.ui.editingLot();
  readonly isEditing = this.editingLot !== null;

  readonly form = signal<LotInput>(this.editingLot ? toFormInput(this.editingLot) : defaultLotInput());
  readonly errors = signal<string[]>([]);

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

  updateSize(size: number, value: string | number): void {
    this.form.update((f) => ({
      ...f,
      sizeBreakdown: { ...f.sizeBreakdown, [String(size)]: Number(value || 0) },
    }));
  }

  bulkFill36(): void {
    this.form.update((f) => ({
      ...f,
      sizeBreakdown: Object.fromEntries(SIZE_OPTIONS.map((s) => [String(s), 36])),
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

  close(): void {
    this.ui.closeWizard();
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
      this.ui.closeWizard();
      this.errors.set([]);
      void this.router.navigateByUrl('/lots');
    } catch (err) {
      console.error(err);
      this.errors.set(['Unable to save lot. Check your connection and try again.']);
    }
  }
}
