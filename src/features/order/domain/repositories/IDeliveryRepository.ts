import { DeliveryOrder, DeliveryStatus } from '../entities/DeliveryOrder';

/**
 * Interface contract for Shipper Delivery Order Repository
 */
export interface IDeliveryRepository {
  getDeliveryOrders(): Promise<DeliveryOrder[]>;
  getOrderById(id: string): Promise<DeliveryOrder | null>;
  updateDeliveryStatus(
    orderId: string,
    status: DeliveryStatus,
    notes?: string,
    proofOfDeliveryImage?: string
  ): Promise<DeliveryOrder>;
}
