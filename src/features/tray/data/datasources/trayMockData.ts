import { Tray } from '../../domain/entities/Tray';

/**
 * Initial 3x3 Mushroom Rack Trays Data
 * Rack layout:
 * - Tầng 3 (Top):    [3-1: AVAILABLE]       [3-2: RENTED_BY_OTHER] [3-3: AVAILABLE]
 * - Tầng 2 (Middle): [2-1: AVAILABLE]       [2-2: MAINTENANCE]     [2-3: AVAILABLE]
 * - Tầng 1 (Bottom): [1-1: MY_RENTED_TRAY]  [1-2: AVAILABLE]       [1-3: RENTED_BY_OTHER]
 */
export const MOCK_TRAYS: Tray[] = [
  // Tầng 3
  {
    id: '3-1',
    tier: 3,
    position: 1,
    status: 'AVAILABLE',
    name: 'Khay 3-1',
    description: 'Tầng 3 - Vị trí 1 (Thông gió tối ưu)',
  },
  {
    id: '3-2',
    tier: 3,
    position: 2,
    status: 'RENTED_BY_OTHER',
    name: 'Khay 3-2',
    description: 'Tầng 3 - Vị trí 2',
  },
  {
    id: '3-3',
    tier: 3,
    position: 3,
    status: 'AVAILABLE',
    name: 'Khay 3-3',
    description: 'Tầng 3 - Vị trí 3 (Ánh sáng tán xạ)',
  },

  // Tầng 2
  {
    id: '2-1',
    tier: 2,
    position: 1,
    status: 'AVAILABLE',
    name: 'Khay 2-1',
    description: 'Tầng 2 - Vị trí 1 (Độ ẩm ổn định)',
  },
  {
    id: '2-2',
    tier: 2,
    position: 2,
    status: 'MAINTENANCE',
    name: 'Khay 2-2',
    description: 'Tầng 2 - Vị trí 2 (Đang bảo dưỡng cảm biến)',
  },
  {
    id: '2-3',
    tier: 2,
    position: 3,
    status: 'AVAILABLE',
    name: 'Khay 2-3',
    description: 'Tầng 2 - Vị trí 3 (Nhiệt độ lý tưởng)',
  },

  // Tầng 1
  {
    id: '1-1',
    tier: 1,
    position: 1,
    status: 'MY_RENTED_TRAY',
    name: 'Khay 1-1',
    description: 'Tầng 1 - Vị trí 1 (Khay của bạn)',
    currentRentalId: 'RENT-2026-001',
  },
  {
    id: '1-2',
    tier: 1,
    position: 2,
    status: 'AVAILABLE',
    name: 'Khay 1-2',
    description: 'Tầng 1 - Vị trí 2 (Độ ẩm cao)',
  },
  {
    id: '1-3',
    tier: 1,
    position: 3,
    status: 'RENTED_BY_OTHER',
    name: 'Khay 1-3',
    description: 'Tầng 1 - Vị trí 3',
  },
];
