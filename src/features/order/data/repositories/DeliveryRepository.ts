import { DeliveryOrder, DeliveryStatus } from '../../domain/entities/DeliveryOrder';
import { IDeliveryRepository } from '../../domain/repositories/IDeliveryRepository';
import { MOCK_DELIVERY_ORDERS } from '../datasources/deliveryMockData';

/**
 * Delivery Repository Implementation for Shipper Order Management
 * Supports local state cache and is structured for backend API integration.
 */
export class DeliveryRepository implements IDeliveryRepository {
  private orders: DeliveryOrder[] = [...MOCK_DELIVERY_ORDERS];

  /**
   * Retrieve list of delivery orders for the authenticated shipper
   */
  async getDeliveryOrders(): Promise<DeliveryOrder[]> {
    // Simulate brief network latency for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 250));
    return [...this.orders];
  }

  /**
   * Retrieve a specific delivery order by ID
   */
  async getOrderById(id: string): Promise<DeliveryOrder | null> {
    const order = this.orders.find((o) => o.id === id);
    return order ? { ...order } : null;
  }

  /**
   * Update the delivery status of an order
   */
  async updateDeliveryStatus(
    orderId: string,
    status: DeliveryStatus,
    notes?: string
  ): Promise<DeliveryOrder> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const index = this.orders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      throw new Error(`Không tìm thấy đơn giao hàng với mã ${orderId}`);
    }

    let statusText = 'Chờ lấy hàng';
    let deliveredAt: string | undefined = undefined;

    if (status === 'IN_TRANSIT') {
      statusText = 'Đang vận chuyển';
    } else if (status === 'DELIVERED') {
      statusText = 'Đã giao thành công';
      deliveredAt = new Date().toISOString();
    } else if (status === 'CANCELLED') {
      statusText = 'Đã hủy';
    }

    const updatedOrder: DeliveryOrder = {
      ...this.orders[index],
      status,
      statusText,
      deliveredAt: deliveredAt || this.orders[index].deliveredAt,
      notes: notes !== undefined ? notes : this.orders[index].notes,
    };

    this.orders[index] = updatedOrder;
    return { ...updatedOrder };
  }
}

export const deliveryRepository = new DeliveryRepository();
