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
  sessionTrayId?: number;
  orderId?: number;
  floorId?: number;
  floorNumber?: number;
}

export interface CustomerGrowthHistoryItem {
  progress_id: number | string;
  session_id: number | string;
  current_stage: string;
  progress_percent: number | null;
  condition?: string | null;
  description: string | null;
  updated_at: string;
}

export interface CustomerDeviceLogItem {
  commandId: number | string;
  channel: number;
  action: string;
  status: string;
  controlMode: 'AUTOMATIC' | 'MANUAL';
  reason: string;
  requestedAt: string;
  publishedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  floors: {
    floorId: number;
    floorName: string;
    deviceType: string;
  }[];
}

export interface CustomerSensorReading {
  id: number | string;
  temperature: number | string | null;
  humidity: number | string | null;
  ok: boolean;
  receivedAt: string | null;
  measuredAt: string | null;
  retained: boolean;
  floorName: string;
  floorId?: number;
  sensorId: number | string;
}

export interface CustomerTrayDetails {
  session_id: number;
  cultivation_status?: string;
  harvest_status?: string | null;
  current_stage?: string | null;
  progress_percent?: number | null;
  growth_history: CustomerGrowthHistoryItem[];
  device_logs: CustomerDeviceLogItem[];
  sensor_readings: CustomerSensorReading[];
}

export interface CustomerFloorRack {
  id: number;
  floorNumber: number;
  floorName: string;
  trays: CustomerTrayCard[];
}
