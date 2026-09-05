import {
  MushroomVariety,
  RentalDuration,
  RentalOrder,
  RentalPriceBreakdown,
  RentalSelection,
} from '../entities/Rental';

/**
 * Rental Repository Domain Contract
 */
export interface IRentalRepository {
  /**
   * Returns available rental duration packages
   */
  getRentalDurations(): Promise<RentalDuration[]>;

  /**
   * Returns available mushroom varieties for the first spawn batch
   */
  getMushroomVarieties(): Promise<MushroomVariety[]>;

  /**
   * Calculates total price: Rental Fee + Mushroom Spawn Fee + Service Fee (30,000 VND)
   */
  calculatePrice(
    duration: RentalDuration,
    mushroom: MushroomVariety
  ): Promise<RentalPriceBreakdown>;

  /**
   * Confirms and creates a new rental order
   */
  confirmRental(selection: RentalSelection): Promise<RentalOrder>;

  /**
   * Retrieves the current user's active rental (if any)
   */
  getActiveRental(): Promise<RentalOrder | null>;
}
