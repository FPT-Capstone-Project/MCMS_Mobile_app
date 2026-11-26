export const SHIPMENT_LABELS = {
  PENDING: 'Chờ giao hàng',
  SHIPPED: 'Đã bàn giao cho đơn vị vận chuyển',
  DELIVERED: 'Đã giao hàng thành công',
  CANCELLED: 'Đã hủy giao hàng',
  RETURNED: 'Đã hoàn hàng',
} as const;

export type ShipmentStatus = keyof typeof SHIPMENT_LABELS;

export function canTrackSessionShipment(session: {
  status?: string;
  harvest_status?: string | null;
  harvest_ready?: boolean;
}): boolean {
  if (session.status === 'CANCELLED') return false;
  return session.status === 'HARVEST_READY' || session.status === 'HARVESTING' ||
    session.status === 'COMPLETED' || session.harvest_status === 'HARVEST_READY' ||
    session.harvest_ready === true;
}

const NEXT_SHIPMENT_STATUSES: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  PENDING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

export function nextShipmentStatuses(status: string): readonly ShipmentStatus[] {
  return Object.prototype.hasOwnProperty.call(NEXT_SHIPMENT_STATUSES, status)
    ? NEXT_SHIPMENT_STATUSES[status as ShipmentStatus] : [];
}
export interface CreateShipment {
  orderId: number;
  address: string;
  recipientName: string;
  recipientPhone: string;
  shippingFee: number | string;
}

export interface UpdateShipmentDetails {
  orderId: number;
  shipmentId: number;
  carrier: string | null;
  trackingCode: string | null;
  shippingFee: number;
  shippedAt: string | null;
  deliveredAt?: string | null;
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

export function canCustomerConfirmDeliveryReceipt(
  session: {
    status?: string;
    harvest_method?: string | null;
    harvest_request_id?: number | null;
    harvest_request_status?: string | null;
  },
  shipments: readonly Shipment[],
): boolean {
  const shipment = latestShipment(shipments);
  if (
    session.harvest_method !== 'DELIVERY' ||
    !session.harvest_request_id ||
    session.status !== 'HARVESTING' ||
    ['COMPLETED', 'CANCELLED'].includes(session.harvest_request_status?.toUpperCase() ?? '') ||
    !shipment
  ) {
    return false;
  }
  return ['PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(
    shipment.status.toUpperCase(),
  );
}

// Shipments belong to an order, not an individual cultivation session.
export function deliveryHandoverAllowed(shipments: readonly Shipment[]): boolean {
  return latestShipment(shipments)?.status === 'DELIVERED';
}

const COMPLAINT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export function canComplainAboutShipment(
  shipment: Shipment | undefined,
  now = Date.now()
): boolean {
  if (shipment?.status !== 'DELIVERED' || !shipment.delivered_at) return false;

  const deliveredAt = new Date(shipment.delivered_at).getTime();
  return (
    Number.isFinite(deliveredAt) &&
    deliveredAt <= now &&
    now - deliveredAt <= COMPLAINT_WINDOW_MS
  );
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
