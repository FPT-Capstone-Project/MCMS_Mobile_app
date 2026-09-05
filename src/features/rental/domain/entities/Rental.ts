import { TrayId } from '../../../tray/domain/entities/Tray';

/**
 * Rental Domain Entities & Types
 */

export type RentalStep = 'SELECT_TRAY' | 'SELECT_DURATION' | 'SELECT_MUSHROOM' | 'CONFIRM_SUMMARY';

export interface RentalDuration {
  id: string; // '1w' | '2w' | '3w' | '4w'
  weeks: number;
  label: string; // '1 tuần', '2 tuần', '3 tuần', '4 tuần'
  price: number; // e.g. 150000, 280000, 390000, 480000
  description?: string;
  popular?: boolean;
}

export type MushroomDifficulty = 'Dễ' | 'Trung bình' | 'Khá';

export interface MushroomVariety {
  id: string;
  name: string; // e.g. 'Nấm sò trắng', 'Nấm bào ngư xám'
  scientificName?: string;
  description: string;
  price: number; // spawn fee for 1st cultivation batch
  harvestDays: number; // estimated days to first harvest
  difficulty: MushroomDifficulty;
  yieldPerBatch: string; // e.g. '1.2 - 1.5 kg'
  iconName: string;
}

export interface RentalSelection {
  trayId: TrayId | null;
  duration: RentalDuration | null;
  mushroom: MushroomVariety | null;
}

export interface RentalPriceBreakdown {
  rentalFee: number;
  mushroomFee: number;
  serviceFee: number; // 30,000 VND
  totalAmount: number;
}

export type RentalStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'HARVESTING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface RentalOrder {
  id: string;
  orderNumber: string;
  trayId: TrayId;
  duration: RentalDuration;
  mushroom: MushroomVariety;
  pricing: RentalPriceBreakdown;
  startDate: string;
  endDate: string;
  status: RentalStatus;
  createdAt: string;
}
