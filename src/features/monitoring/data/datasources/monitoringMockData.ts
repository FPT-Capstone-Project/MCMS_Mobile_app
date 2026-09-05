import { CameraFeed, TrayTelemetry } from '../../domain/entities/Monitoring';

/**
 * Mock IoT Chamber Telemetry for Tray 1-1
 */
export const MOCK_TRAY_TELEMETRY: Record<string, TrayTelemetry> = {
  '1-1': {
    trayId: '1-1',
    temperature: 24.8,
    humidity: 86,
    co2: 640,
    lightLux: 120,
    ventilationStatus: 'Tốt',
    cultivationStage: 'Giai đoạn ra quả thể (Mũ nấm phát triển tốt)',
    daysElapsed: 8,
    totalDays: 14,
    lastUpdated: new Date().toISOString(),
  },
};

/**
 * Mock Camera Stream Metadata
 */
export const MOCK_CAMERA_FEEDS: Record<string, CameraFeed> = {
  '1-1': {
    trayId: '1-1',
    status: 'ONLINE',
    resolution: '1920x1080 FHD',
    fps: 30,
    chamberName: 'Buồng thông minh A1 - Giàn 1',
    lastSnapshotTime: new Date().toISOString(),
  },
};
