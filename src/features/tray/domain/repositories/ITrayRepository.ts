import {
  CustomerEnvironmentHistoryPoint,
  CustomerTrayDetails,
  Tray,
  TrayId,
} from '../entities/Tray';

/**
 * Tray Repository Interface (Domain Boundary)
 */
export interface ITrayRepository {
  /**
   * Retrieves all 9 rack trays
   */
  getTrays(): Promise<Tray[]>;

  /**
   * Retrieves a specific tray by ID
   */
  getTrayById(id: TrayId | string): Promise<Tray | null>;

  /**
   * Retrieves the current user's rented tray(s)
   */
  getMyRentedTrays(): Promise<Tray[]>;

  /**
   * Retrieves cultivation progress; device data is loaded separately when its tab opens.
   */
  getCustomerCultivationDetails(sessionId: number, orderId?: number | null): Promise<CustomerTrayDetails>;

  getCustomerDeviceLogs(sessionId: number): Promise<CustomerTrayDetails['device_logs']>;

  /** Retrieves the latest reading from each sensor on an owned session's assigned floors. */
  getCustomerCurrentSensorReadings(sessionId: number): Promise<CustomerTrayDetails['sensor_readings']>;

  /** Retrieves summarized environment history for a customer's cultivation session. */
  getCustomerEnvironmentHistory(
    sessionId: number,
    floorId: number,
    from: string,
    to: string
  ): Promise<CustomerEnvironmentHistoryPoint[]>;
}
