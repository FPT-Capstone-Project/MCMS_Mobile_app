import { TrayId } from '../../../tray/domain/entities/Tray';

/**
 * Monitoring & IoT Domain Types
 */

export type CameraStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'CONNECTING'
  | 'ERROR'
  | 'UNAUTHORIZED';

export interface TrayTelemetry {
  trayId: TrayId;
  temperature: number; // in °C (e.g. 24.5)
  humidity: number; // in % (e.g. 84)
  co2: number; // in ppm (e.g. 650)
  lightLux?: number;
  ventilationStatus: 'Tốt' | 'Bình thường' | 'Cần chú ý';
  cultivationStage: string; // e.g. 'Giai đoạn ra quả thể tối ưu'
  daysElapsed: number; // e.g. 8
  totalDays: number; // e.g. 14
  lastUpdated: string;
}

export interface CameraFeed {
  trayId: TrayId;
  status: CameraStatus;
  resolution: string;
  fps: number;
  chamberName: string;
  streamUrl?: string;
  lastSnapshotTime: string;
}
