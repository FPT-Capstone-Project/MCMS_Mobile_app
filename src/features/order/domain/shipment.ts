export const SHIPMENT_LABELS = {
  PENDING: 'Chờ giao hàng',
  SHIPPED: 'Đã bàn giao vận chuyển',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy giao hàng',
  RETURNED: 'Đã hoàn hàng',
} as const;

export type ShipmentStatus = keyof typeof SHIPMENT_LABELS;
export interface CreateShipment {
  orderId: number;
  address: string;
  recipientName: string;
  recipientPhone: string;
  shippingFee: number | string;
}
export interface Shipment {
  shipment_id: number;
  order_id: number;
  status: string;
  address: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_fee: number | string;
  carrier: string | null;
  tracking_code: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export function shipmentLabel(status: string): string {
  return Object.prototype.hasOwnProperty.call(SHIPMENT_LABELS, status)
    ? SHIPMENT_LABELS[status as ShipmentStatus] : `Trạng thái khác (${status})`;
}

export function latestShipment(shipments: readonly Shipment[]): Shipment | undefined {
  return shipments.reduce<Shipment | undefined>((latest, shipment) =>
    !latest || shipment.shipment_id > latest.shipment_id ? shipment : latest, undefined);
}

// Shipments belong to an order, not an individual cultivation session.
export function deliveryHandoverAllowed(shipments: readonly Shipment[]): boolean {
  return latestShipment(shipments)?.status === 'DELIVERED';
}

export function shipmentError(error: unknown): string {
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message) : '';
  const translations: Record<string, string> = {
    'An active shipment already exists for the order': 'Đơn hàng đã có vận đơn đang xử lý. Hãy tải lại để xem trạng thái mới nhất.',
    'Shipment not found': 'Không tìm thấy vận đơn. Hãy tải lại dữ liệu.',
    'Order not found': 'Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập.',
  };
  return translations[message] || 'Không thể cập nhật vận đơn. Vui lòng tải lại dữ liệu và thử lại.';
}
