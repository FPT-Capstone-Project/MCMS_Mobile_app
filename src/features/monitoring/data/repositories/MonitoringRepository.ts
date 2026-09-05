import { Tray, TrayId } from '../../../tray/domain/entities/Tray';
import { CameraFeed, TrayTelemetry } from '../../domain/entities/Monitoring';
import { IMonitoringRepository } from '../../domain/repositories/IMonitoringRepository';
import { trayRepository } from '../../../tray/data/repositories/TrayRepository';
import {
  MOCK_CAMERA_FEEDS,
  MOCK_TRAY_TELEMETRY,
} from '../datasources/monitoringMockData';

/**
 * Monitoring Repository Implementation
 * Strictly verifies ownership before serving telemetry or camera stream.
 */
export class MonitoringRepository implements IMonitoringRepository {
  async verifyTrayOwnership(trayId: TrayId | string): Promise<boolean> {
    const myTrays: Tray[] = await trayRepository.getMyRentedTrays();
    return myTrays.some((t: Tray) => t.id === trayId);
  }

  async getTrayTelemetry(trayId: TrayId | string): Promise<TrayTelemetry> {
    const isOwner = await this.verifyTrayOwnership(trayId);
    if (!isOwner) {
      throw new Error('Bạn không có quyền truy cập dữ liệu cảm biến của khay này.');
    }

    if (MOCK_TRAY_TELEMETRY[trayId]) {
      return {
        ...MOCK_TRAY_TELEMETRY[trayId],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Default telemetry fallback for newly booked tray
    return {
      trayId: trayId as TrayId,
      temperature: 24.5,
      humidity: 85,
      co2: 650,
      lightLux: 110,
      ventilationStatus: 'Tốt',
      cultivationStage: 'Giai đoạn cấy phôi và ủ tơ',
      daysElapsed: 1,
      totalDays: 14,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getCameraFeed(trayId: TrayId | string): Promise<CameraFeed> {
    const isOwner = await this.verifyTrayOwnership(trayId);
    if (!isOwner) {
      return {
        trayId: trayId as TrayId,
        status: 'UNAUTHORIZED',
        resolution: 'N/A',
        fps: 0,
        chamberName: 'Chamber Restricted',
        lastSnapshotTime: new Date().toISOString(),
      };
    }

    if (MOCK_CAMERA_FEEDS[trayId]) {
      return {
        ...MOCK_CAMERA_FEEDS[trayId],
        lastSnapshotTime: new Date().toISOString(),
      };
    }

    // Default active camera feed for newly rented tray
    return {
      trayId: trayId as TrayId,
      status: 'ONLINE',
      resolution: '1920x1080 FHD',
      fps: 30,
      chamberName: `Buồng thông minh - Khay ${trayId}`,
      lastSnapshotTime: new Date().toISOString(),
    };
  }
}

export const monitoringRepository = new MonitoringRepository();
