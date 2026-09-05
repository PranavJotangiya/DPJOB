import { Injectable, signal } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firestore';
import { ensureAuth } from './auth';
import { createEmptySizeBreakdown, Lot, LotInput, LotStatus } from './models';

const DEFAULT_SUPPLIERS = ['MTLNY', 'JAYDEEP', 'SUGAM', 'RUDRA', 'AMMEF', 'KAPIL', 'MGB', 'VISHAL'];

const toNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

function docToLot(docSnap: QueryDocumentSnapshot<DocumentData>): Lot {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    lotNumber: data['lotNumber'] ?? '',
    date: data['date'] ?? '',
    supplier: data['supplier'] ?? '',
    shortNumber: data['shortNumber'] ?? '',
    shortName: data['shortName'] ?? '',
    programDate: data['programDate'] ?? '',
    cuttingDate: data['cuttingDate'] ?? '',
    fabricType: data['fabricType'] ?? '',
    color: data['color'] ?? '',
    description: data['description'] ?? '',
    pana: toNumber(data['pana']),
    totalMeters: toNumber(data['totalMeters']),
    averageConsumption: toNumber(data['averageConsumption']),
    totalPieces: toNumber(data['totalPieces']),
    status: (data['status'] as LotStatus) ?? 'Draft',
    notes: data['notes'] ?? '',
    createdBy: data['createdBy'] ?? '',
    createdAt: data['createdAt'] ?? '',
    updatedAt: data['updatedAt'] ?? '',
    sizeBreakdown: { ...createEmptySizeBreakdown(), ...(data['sizeBreakdown'] ?? {}) },
    bales: Array.isArray(data['bales']) ? data['bales'] : [],
    cutting: data['cutting'] ?? {
      patternType: '', markerLength: '', markerWidth: '', layLength: '', noOfLayers: '', noOfPlies: '',
    },
  };
}

/**
 * Talks directly to Firestore (no backend server). Two collections:
 *  - lots       — one document per fabric lot, sizes/bales/cutting embedded
 *  - suppliers  — { name } documents, doc id == supplier name
 */
@Injectable({ providedIn: 'root' })
export class LotsService {
  private lotsCol = collection(db, 'lots');
  private suppliersCol = collection(db, 'suppliers');

  readonly lots = signal<Lot[]>([]);
  readonly suppliers = signal<string[]>(DEFAULT_SUPPLIERS);
  readonly ready = signal(false);
  readonly offline = signal(false);

  constructor() {
    // No login screen (see product decision) — sign in anonymously first so
    // Firestore security rules can require request.auth != null. Firestore
    // would otherwise queue/retry the listener as permission-denied while
    // the (near-instant) anonymous sign-in is in flight.
    ensureAuth()
      .then(() => {
        this.attachLotsListener();
        this.watchSuppliers();
      })
      .catch((err) => {
        console.error('anonymous sign-in failed', err);
        this.ready.set(true);
        this.offline.set(true);
      });
  }

  private attachLotsListener(): void {
    onSnapshot(
      query(this.lotsCol, orderBy('createdAt', 'desc')),
      (snap) => {
        this.lots.set(snap.docs.map(docToLot));
        this.ready.set(true);
        this.offline.set(false);
      },
      (err) => {
        console.error('lots stream failed', err);
        this.ready.set(true);
        this.offline.set(true);
      },
    );
  }

  private watchSuppliers(): void {
    onSnapshot(
      this.suppliersCol,
      (snap) => {
        if (snap.empty) {
          this.seedSuppliers();
          return;
        }
        const names = snap.docs.map((d) => String(d.data()['name'] ?? d.id)).sort();
        this.suppliers.set(names);
      },
      () => this.suppliers.set(DEFAULT_SUPPLIERS),
    );
  }

  private async seedSuppliers(): Promise<void> {
    try {
      await Promise.all(
        DEFAULT_SUPPLIERS.map((name) => setDoc(doc(this.suppliersCol, name), { name })),
      );
    } catch (err) {
      console.error('supplier seed failed', err);
    }
  }

  private nextLotNumber(): string {
    const maxN = this.lots().reduce((max, l) => {
      const match = String(l.lotNumber || '').match(/(\d+)/);
      const num = match ? Number(match[1]) : NaN;
      return Number.isFinite(num) ? Math.max(max, num) : max;
    }, 0);
    return `LOT-${maxN + 1}`;
  }

  /** Silently de-duplicates — a save must never fail on a clashing lot number. */
  private uniqueLotNumber(base: string, excludeId?: string): string {
    const taken = (name: string) => this.lots().some((l) => l.id !== excludeId && l.lotNumber === name);
    let candidate = base;
    let suffix = 2;
    while (taken(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private computeTotals(input: LotInput): { totalPieces: number; averageConsumption: number } {
    const totalPieces = Object.values(input.sizeBreakdown || {}).reduce((s, v) => s + toNumber(v), 0);
    const totalMeters = toNumber(input.totalMeters);
    const averageConsumption = totalPieces > 0 && totalMeters > 0
      ? Number((totalMeters / totalPieces).toFixed(2))
      : 0;
    return { totalPieces, averageConsumption };
  }

  async createLot(input: LotInput): Promise<string> {
    let lotNumber = (input.lotNumber || '').trim().toUpperCase();
    if (!lotNumber) lotNumber = this.nextLotNumber();
    lotNumber = this.uniqueLotNumber(lotNumber);

    const { totalPieces, averageConsumption } = this.computeTotals(input);
    const now = new Date().toISOString();

    const ref = await addDoc(this.lotsCol, {
      ...input,
      lotNumber,
      totalPieces,
      averageConsumption,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  async updateLot(id: string, input: LotInput): Promise<void> {
    const existing = this.lots().find((l) => l.id === id);
    let lotNumber = (input.lotNumber || '').trim().toUpperCase() || existing?.lotNumber || '';
    lotNumber = this.uniqueLotNumber(lotNumber, id);

    const { totalPieces, averageConsumption } = this.computeTotals(input);

    await updateDoc(doc(this.lotsCol, id), {
      ...input,
      lotNumber,
      totalPieces,
      averageConsumption,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateStatus(id: string, status: LotStatus): Promise<void> {
    await updateDoc(doc(this.lotsCol, id), { status, updatedAt: new Date().toISOString() });
  }

  async deleteLot(id: string): Promise<void> {
    await deleteDoc(doc(this.lotsCol, id));
  }
}
