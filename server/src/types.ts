// Mirrors angular-app/src/app/core/models.ts — the wire contract between the
// two halves of the app. Keep the two files in step.

export const SIZE_OPTIONS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42];

export type LotStatus = 'Draft' | 'Ready' | 'Cutting' | 'Completed';
export const LOT_STATUSES: LotStatus[] = ['Draft', 'Ready', 'Cutting', 'Completed'];

export type Role = 'Admin' | 'Supervisor' | 'Operator' | 'Viewer';
export const ROLE_OPTIONS: Role[] = ['Admin', 'Supervisor', 'Operator', 'Viewer'];

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
  party: string;
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
  patternImage: string;
  sizeBreakdown: Record<string, number>;
  bales: Bale[];
  cutting: CuttingInfo;
}

export type LotInput = Omit<Lot, 'id' | 'createdAt' | 'updatedAt'>;

export interface Party {
  id: string;
  name: string;
  /** Normalized 10-digit mobile number, or '' if this party has no linked
   *  account. When set to a real account's number, `name` is kept in sync
   *  with that account's own registered name by the server — see
   *  `links.routes.ts` and the phone-handling in `parties.routes.ts`. */
  phone: string;
}

/** A jobber's lot, as returned to a Party account that has been linked to it. */
export type SharedLot = Lot & { sharedBy: { username: string; name: string } };

export interface LinkedJobber {
  username: string;
  name: string;
}

/** A user as the client is allowed to see them — never includes `pinHash`. */
export interface PublicUser {
  username: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface SessionUser {
  username: string;
  name: string;
  role: Role;
}

export const createEmptySizeBreakdown = (): Record<string, number> =>
  Object.fromEntries(SIZE_OPTIONS.map((size) => [String(size), 0]));
