import { TrayId } from '../../../tray/domain/entities/Tray';
import { CameraFeed, TrayTelemetry } from '../entities/Monitoring';

/**
 * Monitoring Repository Domain Boundary
 */
export interface IMonitoringRepository {
  /**
   * Retrieves real-time IoT sensor telemetry for a tray
   */
  getTrayTelemetry(trayId: TrayId | string): Promise<TrayTelemetry>;

  /**
   * Retrieves live camera feed metadata for a tray
   * Throws or returns UNAUTHORIZED if the customer does not own this tray
   */
  getCameraFeed(trayId: TrayId | string): Promise<CameraFeed>;

  /**
   * Validates if the customer is the authorized owner of this tray
   */
  verifyTrayOwnership(trayId: TrayId | string): Promise<boolean>;
}
