/**
 * Delivery Order Domain Entities & Types for Shipper Operations
 * Pure domain definitions independent of UI, Redux, and framework logic.
 */

export type DeliveryStatus = 'READY_FOR_PICKUP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface DeliveryOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  trayId: string;
  mushroomType: string;
  status: DeliveryStatus;
  statusText: string;
  createdAt: string;
  deliveredAt?: string;
  notes?: string;
  proofOfDeliveryImage?: string;
}

export interface UpdateDeliveryStatusDto {
  orderId: string;
  status: DeliveryStatus;
  notes?: string;
  proofOfDeliveryImage?: string;
}
