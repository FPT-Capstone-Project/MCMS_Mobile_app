import { Tray, TrayId } from '../entities/Tray';

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
}
