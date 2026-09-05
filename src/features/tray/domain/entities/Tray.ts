/**
 * Tray Domain Entity & Value Types
 */

export type TrayId =
  | '1-1'
  | '1-2'
  | '1-3'
  | '2-1'
  | '2-2'
  | '2-3'
  | '3-1'
  | '3-2'
  | '3-3';

export type TrayStatus =
  | 'AVAILABLE'
  | 'SELECTED'
  | 'MY_RENTED_TRAY'
  | 'RENTED_BY_OTHER'
  | 'MAINTENANCE';

export type TierLevel = 1 | 2 | 3;
export type TrayPosition = 1 | 2 | 3;

export interface Tray {
  id: TrayId;
  tier: TierLevel;
  position: TrayPosition;
  status: TrayStatus;
  name: string;
  description?: string;
  currentRentalId?: string;
}

export interface TrayRackTier {
  tier: TierLevel;
  title: string;
  trays: Tray[];
}
