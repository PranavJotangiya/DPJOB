// Shared domain types for a fabric Lot. Firestore stores each Lot as one
// document — sizes, bales and cutting info are embedded (map/array fields),
// no joins needed.

export const SIZE_OPTIONS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42];

export type LotStatus = 'Draft' | 'Ready' | 'Cutting' | 'Completed';

export interface Bale {
  id: string;
  baleNumber: string;
  meters: number;
}

export interface CuttingInfo {
  patternType: string;
  markerLength: number | string;
  markerWidth: number | string;
  layLength: number | string;
  noOfLayers: number | string;
  noOfPlies: number | string;
}

export interface Lot {
  id: string;
  lotNumber: string;
  date: string;
  supplier: string;
  shortNumber: string;
  shortName: string;
  programDate: string;
  cuttingDate: string;
  fabricType: string;
  color: string;
  description: string;
  pana: number;
  totalMeters: number;
  averageConsumption: number;
  totalPieces: number;
  status: LotStatus;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sizeBreakdown: Record<string, number>;
  bales: Bale[];
  cutting: CuttingInfo;
}

/** Everything except server-assigned fields — the shape saveLot() sends. */
export type LotInput = Omit<Lot, 'id' | 'createdAt' | 'updatedAt'>;

export const createEmptySizeBreakdown = (): Record<string, number> =>
  Object.fromEntries(SIZE_OPTIONS.map((size) => [String(size), 0]));

export const defaultCutting = (): CuttingInfo => ({
  patternType: 'Marker',
  markerLength: '',
  markerWidth: '',
  layLength: '',
  noOfLayers: '',
  noOfPlies: '',
});

export const defaultLotInput = (): LotInput => ({
  lotNumber: '',
  date: new Date().toISOString().slice(0, 10),
  supplier: 'MTLNY',
  shortNumber: 'RUORA-FANCY',
  shortName: 'RUORA FANCY TOP',
  programDate: '',
  cuttingDate: '',
  fabricType: 'Cotton Poplin',
  color: 'Navy',
  description: 'Premium stretch twill',
  pana: 54,
  totalMeters: 512,
  averageConsumption: 0,
  totalPieces: 0,
  status: 'Draft',
  notes: '2 set cutting required',
  createdBy: 'Operator 01',
  sizeBreakdown: createEmptySizeBreakdown(),
  bales: [
    { id: crypto.randomUUID(), baleNumber: '283264', meters: 86 },
    { id: crypto.randomUUID(), baleNumber: '282193', meters: 80 },
  ],
  cutting: defaultCutting(),
});

export type Role = 'Admin' | 'Supervisor' | 'Operator' | 'Viewer';
export type LangCode = 'en' | 'hi' | 'gu';

/** Editing an existing lot: seed the form from it (merging in any sizes it's
 * missing so the matrix always shows all 19). */
export function toFormInput(lot: Lot): LotInput {
  return {
    lotNumber: lot.lotNumber || '',
    date: lot.date || new Date().toISOString().slice(0, 10),
    supplier: lot.supplier || '',
    shortNumber: lot.shortNumber || '',
    shortName: lot.shortName || '',
    programDate: lot.programDate || '',
    cuttingDate: lot.cuttingDate || '',
    fabricType: lot.fabricType || '',
    color: lot.color || '',
    description: lot.description || '',
    pana: lot.pana || 0,
    totalMeters: lot.totalMeters || 0,
    averageConsumption: lot.averageConsumption || 0,
    totalPieces: lot.totalPieces || 0,
    status: lot.status || 'Draft',
    notes: lot.notes || '',
    createdBy: lot.createdBy || 'Operator 01',
    sizeBreakdown: { ...createEmptySizeBreakdown(), ...(lot.sizeBreakdown || {}) },
    bales: (lot.bales || []).map((b, i) => ({
      id: b.id || `${Date.now()}-${i}`,
      baleNumber: b.baleNumber || '',
      meters: Number(b.meters) || 0,
    })),
    cutting: {
      patternType: lot.cutting?.patternType || 'Marker',
      markerLength: lot.cutting?.markerLength ?? '',
      markerWidth: lot.cutting?.markerWidth ?? '',
      layLength: lot.cutting?.layLength ?? '',
      noOfLayers: lot.cutting?.noOfLayers ?? '',
      noOfPlies: lot.cutting?.noOfPlies ?? '',
    },
  };
}
