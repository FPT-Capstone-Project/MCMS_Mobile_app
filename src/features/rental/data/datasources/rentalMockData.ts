import {
  MushroomVariety,
  RentalDuration,
  RentalOrder,
} from '../../domain/entities/Rental';

/**
 * Standard Shop/Service Fee (30.000đ as specified in business rules)
 */
export const SHOP_SERVICE_FEE = 30000;

/**
 * Rental Duration Options
 * Provided through typed repository / mock data
 */
export const MOCK_RENTAL_DURATIONS: RentalDuration[] = [
  {
    id: '1w',
    weeks: 1,
    label: '1 tuần',
    price: 120000,
    description: 'Trải nghiệm thử nghiệm chu kỳ ngắn',
  },
  {
    id: '2w',
    weeks: 2,
    label: '2 tuần',
    price: 220000,
    description: 'Chu kỳ chuẩn 1 đợt thu hoạch trọn vẹn',
    popular: true,
  },
  {
    id: '3w',
    weeks: 3,
    label: '3 tuần',
    price: 310000,
    description: 'Nuôi trồng liên tục qua 2 đợt nấm',
  },
  {
    id: '4w',
    weeks: 4,
    label: '4 tuần',
    price: 390000,
    description: 'Gói 1 tháng tối ưu chi phí thuê nhất',
  },
];

/**
 * Available Mushroom Spawn Varieties for First Cultivation Batch
 */
export const MOCK_MUSHROOM_VARIETIES: MushroomVariety[] = [
  {
    id: 'mush-oyster-white',
    name: 'Nấm sò trắng',
    scientificName: 'Pleurotus ostreatus',
    description: 'Dễ trồng, sinh trưởng nhanh, phù hợp cho người mới bắt đầu',
    price: 20000,
    harvestDays: 10,
    difficulty: 'Dễ',
    yieldPerBatch: '1.2 - 1.5 kg',
    iconName: 'leaf',
  },
  {
    id: 'mush-grey-abalone',
    name: 'Nấm bào ngư xám',
    scientificName: 'Pleurotus pulmonarius',
    description: 'Mũ nấm dày dặn, vị ngọt thanh tự nhiên và giàu đạm thực vật',
    price: 30000,
    harvestDays: 12,
    difficulty: 'Dễ',
    yieldPerBatch: '1.4 - 1.8 kg',
    iconName: 'flower',
  },
  {
    id: 'mush-golden-oyster',
    name: 'Nấm hoàng kim',
    scientificName: 'Pleurotus citrinopileatus',
    description: 'Màu vàng rực rỡ đẹp mắt, vị bùi béo bơ và giòn thơm',
    price: 35000,
    harvestDays: 14,
    difficulty: 'Trung bình',
    yieldPerBatch: '1.0 - 1.3 kg',
    iconName: 'sparkles',
  },
  {
    id: 'mush-shiitake',
    name: 'Nấm hương (Shiitake)',
    scientificName: 'Lentinula edodes',
    description: 'Hương vị đậm đà thơm nức, giàu chất chống oxy hóa cao cấp',
    price: 45000,
    harvestDays: 18,
    difficulty: 'Trung bình',
    yieldPerBatch: '0.9 - 1.2 kg',
    iconName: 'nutrition',
  },
  {
    id: 'mush-reishi',
    name: 'Nấm linh chi đỏ',
    scientificName: 'Ganoderma lucidum',
    description: 'Thảo dược quý tăng cường đề kháng, kiểm soát vi khí hậu chuẩn',
    price: 60000,
    harvestDays: 25,
    difficulty: 'Khá',
    yieldPerBatch: '0.5 - 0.8 kg',
    iconName: 'shield',
  },
];

/**
 * Initial User Active Rental (Seed for Tray 1-1)
 */
export const INITIAL_ACTIVE_RENTAL: RentalOrder = {
  id: 'RENT-2026-001',
  orderNumber: 'SM-RENT-0842',
  trayId: '1-1',
  duration: MOCK_RENTAL_DURATIONS[1], // 2 tuần
  mushroom: MOCK_MUSHROOM_VARIETIES[0], // Nấm sò trắng
  pricing: {
    rentalFee: 220000,
    mushroomFee: 20000,
    serviceFee: SHOP_SERVICE_FEE,
    totalAmount: 220000 + 20000 + SHOP_SERVICE_FEE,
  },
  startDate: '2026-09-01T08:00:00.000Z',
  endDate: '2026-09-15T08:00:00.000Z',
  status: 'ACTIVE',
  createdAt: '2026-09-01T07:30:00.000Z',
};
