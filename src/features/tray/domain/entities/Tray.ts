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

export type CustomerTrayUsage = 'MY_CULTIVATION' | 'OTHER_CULTIVATION' | 'AVAILABLE';

export interface CustomerTrayCard {
  id: number;
  code: string;
  usage: CustomerTrayUsage;
  mushroomName?: string;
  sessionId?: number;
  orderId?: number;
}

export interface CustomerGrowthHistoryItem {
  progress_id: number;
  session_id: number;
  current_stage: string;
  progress_percent: number;
  condition: string | null;
  description: string | null;
  updated_at: string;
}

export interface CustomerDeviceLogItem {
  command_id: string;
  action: 'ON' | 'OFF';
  command_status: 'PENDING' | 'PUBLISHED' | 'FAILED' | 'TIMED_OUT';
  control_mode: 'AUTOMATIC' | 'MANUAL';
  reason: string;
  floor_name: string;
  requested_at: string;
  published_at: string | null;
  error_message: string | null;
}

export interface CustomerTrayDetails {
  session_id: number;
  growth_history: CustomerGrowthHistoryItem[];
  device_logs: CustomerDeviceLogItem[];
}

export interface CustomerFloorRack {
  id: number;
  floorNumber: number;
  floorName: string;
  trays: CustomerTrayCard[];
}
