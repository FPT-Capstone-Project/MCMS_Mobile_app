import { Tray, TrayId } from '../../domain/entities/Tray';
import { ITrayRepository } from '../../domain/repositories/ITrayRepository';
import { MOCK_TRAYS } from '../datasources/trayMockData';

/**
 * Tray Repository Implementation
 * Provides mock data fallback and typed contract ready for backend endpoints.
 */
export class TrayRepository implements ITrayRepository {
  private trays: Tray[] = [...MOCK_TRAYS];

  async getTrays(): Promise<Tray[]> {
    // Return a shallow clone of trays
    return [...this.trays];
  }

  async getTrayById(id: TrayId | string): Promise<Tray | null> {
    const found = this.trays.find((t) => t.id === id);
    return found ? { ...found } : null;
  }

  async getMyRentedTrays(): Promise<Tray[]> {
    return this.trays.filter((t) => t.status === 'MY_RENTED_TRAY');
  }

  /**
   * Helper to update tray status locally after booking
   */
  async updateTrayStatus(id: TrayId, status: Tray['status']): Promise<Tray> {
    const index = this.trays.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.trays[index] = {
        ...this.trays[index],
        status,
      };
      return this.trays[index];
    }
    throw new Error(`Tray ${id} not found`);
  }
}

export const trayRepository = new TrayRepository();
