import { Component, computed, inject, OnInit } from '@angular/core';
import { TPipe } from '../../core/t.pipe';
import { UiStore } from '../../core/ui-store';
import { LotsService } from '../../core/lots.service';

@Component({
  selector: 'app-bale',
  standalone: true,
  imports: [TPipe],
  templateUrl: './bale.html',
})
export class Bale implements OnInit {
  readonly ui = inject(UiStore);
  private lotsService = inject(LotsService);

  readonly selectedLot = computed(() => {
    const id = this.ui.selectedLotId();
    const lots = this.lotsService.lots();
    return lots.find((l) => l.id === id) ?? lots[0] ?? null;
  });

  readonly totalMeters = computed(
    () => this.selectedLot()?.bales?.reduce((sum, b) => sum + Number(b.meters || 0), 0) ?? 0,
  );

  ngOnInit(): void {
    this.ui.setSection('bale');
  }
}
