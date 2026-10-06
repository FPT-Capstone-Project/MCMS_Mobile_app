import { DeliveryOrder } from '../../domain/entities/DeliveryOrder';

/**
 * Mock Delivery Orders for Shipper Demonstration
 * Realistic sample data for local testing and prototype validation.
 */
export const MOCK_DELIVERY_ORDERS: DeliveryOrder[] = [
  {
    id: 'DELIV-001',
    orderCode: 'ORD-GH-2026-001',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0912345678',
    deliveryAddress: 'Số 45, Đường Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
    trayId: 'A-01',
    mushroomType: 'Nấm Bào Ngư Xám',
    status: 'READY_FOR_PICKUP',
    statusText: 'Chờ lấy hàng',
    createdAt: '2026-09-15T08:30:00Z',
    notes: 'Giao trong giờ hành chính, gọi trước khi đến 15 phút.',
  },
  {
    id: 'DELIV-002',
    orderCode: 'ORD-GH-2026-002',
    customerName: 'Trần Thị Mai',
    customerPhone: '0987654321',
    deliveryAddress: 'Tòa nhà Landmark 81, P. 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
    trayId: 'B-02',
    mushroomType: 'Nấm Hương Hoàng Đế',
    status: 'IN_TRANSIT',
    statusText: 'Đang vận chuyển',
    createdAt: '2026-09-15T09:15:00Z',
    notes: 'Giao tại sảnh Lễ tân tầng trệt.',
  },
  {
    id: 'DELIV-003',
    orderCode: 'ORD-GH-2026-003',
    customerName: 'Lê Hoàng Nam',
    customerPhone: '0933112233',
    deliveryAddress: '120 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
    trayId: 'C-03',
    mushroomType: 'Nấm Linh Chi Đỏ',
    status: 'DELIVERED',
    statusText: 'Đã giao thành công',
    createdAt: '2026-09-14T14:00:00Z',
    deliveredAt: '2026-09-14T16:30:00Z',
    notes: 'Khách hàng đã nhận và kiểm tra khay nuôi trồng.',
    proofOfDeliveryImage:
      'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800&auto=format&fit=crop&q=80',
  },
];
