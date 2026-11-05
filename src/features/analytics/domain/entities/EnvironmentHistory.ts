/**
 * Environment History & Telemetry Entities
 * Aggregated 24-hour vi khí hậu metrics per cultivation floor.
 */

export interface FloorThresholds {
  temperature_min: number | null;
  temperature_max: number | null;
  humidity_min: number | null;
  humidity_max: number | null;
}

export interface EnvironmentHistoryPoint {
  timestamp: number; // epoch milliseconds
  temperature: number | null; // °C
  humidity: number | null; // %RH
}

export interface FloorEnvironmentHistory {
  floorId: number;
  floorName: string;
  floorNumber: number;
  roomId: number;
  masterDbId: number;
  masterId: string;
  nodeId: number;
  thresholds: FloorThresholds | null;
  points: EnvironmentHistoryPoint[];
}

export interface EnvironmentHistoryData {
  from: number;
  to: number;
  bucketMs: number;
  refreshAfterMs: number;
  floors: FloorEnvironmentHistory[];
}

