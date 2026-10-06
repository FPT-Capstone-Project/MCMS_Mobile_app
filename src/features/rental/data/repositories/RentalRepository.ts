import {
  MushroomVariety,
  RentalDuration,
  RentalOrder,
  RentalPriceBreakdown,
  RentalSelection,
  getMinimumWeeksForMushroom,
} from '../../domain/entities/Rental';
import { IRentalRepository } from '../../domain/repositories/IRentalRepository';
import { trayRepository } from '../../../tray/data/repositories/TrayRepository';
import {
  INITIAL_ACTIVE_RENTAL,
  MOCK_MUSHROOM_VARIETIES,
  MOCK_RENTAL_DURATIONS,
  SHOP_SERVICE_FEE,
} from '../datasources/rentalMockData';

/**
 * Rental Repository Implementation
 */
export class RentalRepository implements IRentalRepository {
  private activeRental: RentalOrder | null = { ...INITIAL_ACTIVE_RENTAL };
  private rentalHistory: RentalOrder[] = [{ ...INITIAL_ACTIVE_RENTAL }];

  async getRentalDurations(): Promise<RentalDuration[]> {
    return [...MOCK_RENTAL_DURATIONS];
  }

  async getMushroomVarieties(): Promise<MushroomVariety[]> {
    return [...MOCK_MUSHROOM_VARIETIES];
  }

  async calculatePrice(
    duration: RentalDuration,
    mushroom: MushroomVariety
  ): Promise<RentalPriceBreakdown> {
    const rentalFee = duration.price;
    const mushroomFee = mushroom.price;
    const serviceFee = SHOP_SERVICE_FEE;
    const totalAmount = rentalFee + mushroomFee + serviceFee;

    return {
      rentalFee,
      mushroomFee,
      serviceFee,
      totalAmount,
    };
  }

  async confirmRental(selection: RentalSelection): Promise<RentalOrder> {
    if (!selection.trayId || !selection.duration || !selection.mushroom) {
      throw new Error('Vui lòng chọn đầy đủ khay, thời gian thuê và phôi nấm.');
    }

    const minWeeks = getMinimumWeeksForMushroom(selection.mushroom.harvestDays);
    if (selection.duration.weeks < minWeeks) {
      throw new Error(
        `Thời gian thuê không đủ chu kỳ sinh trưởng của giống ${selection.mushroom.name} (cần tối thiểu ${minWeeks} tuần).`
      );
    }

    const pricing = await this.calculatePrice(selection.duration, selection.mushroom);

    const now = new Date();
    const startDate = now.toISOString();
    const endDate = new Date(
      now.getTime() + selection.duration.weeks * 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const orderNumber = `SM-RENT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: RentalOrder = {
      id: `RENT-${Date.now()}`,
      orderNumber,
      trayId: selection.trayId,
      duration: selection.duration,
      mushroom: selection.mushroom,
      pricing,
      startDate,
      endDate,
      status: 'ACTIVE',
      createdAt: startDate,
    };

    // Update tray status to MY_RENTED_TRAY
    await trayRepository.updateTrayStatus(selection.trayId, 'MY_RENTED_TRAY');

    this.activeRental = newOrder;
    this.rentalHistory.unshift(newOrder);

    return newOrder;
  }

  async getActiveRental(): Promise<RentalOrder | null> {
    return this.activeRental ? { ...this.activeRental } : null;
  }

  async getRentalHistory(): Promise<RentalOrder[]> {
    return [...this.rentalHistory];
  }
}

export const rentalRepository = new RentalRepository();
