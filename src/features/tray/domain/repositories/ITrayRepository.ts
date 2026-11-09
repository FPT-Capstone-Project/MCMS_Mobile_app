import { CustomerTrayDetails, Tray, TrayId } from '../entities/Tray';

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
   * Retrieves cultivation progress and device command history for an owned session
   */
  getCustomerCultivationDetails(sessionId: number, orderId?: number | null): Promise<CustomerTrayDetails>;

  /**
   * Retrieves recent sensor readings for an owned cultivation session.
   */
  getCustomerSensorHistory(sessionId: number): Promise<CustomerTrayDetails['sensor_readings']>;
}
