import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  CreateRentalOrderRequest,
  BackendCustomerOrder,
  CustomerOrder,
  CustomerCultivationStatus,
  PaymentStatusData,
  PayosPaymentData,
  RentalPackage,
  SepayQrData,
} from '../../domain/entities/Order';

function toAmount(value: number | string | undefined, field: string): number | undefined {
  if (value === undefined) return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new AppError(`Giá trị ${field} từ máy chủ không hợp lệ.`, 'API_ERROR', 500);
  }
  return amount;
}

function normalizeRentalPackage(rentalPackage: RentalPackage): RentalPackage {
  const durationDays = Number(rentalPackage.duration_days);
  const price = Number(rentalPackage.price);
  if (!Number.isSafeInteger(durationDays) || durationDays <= 0 || !Number.isFinite(price) || price < 0) {
    throw new AppError('Thông tin gói thuê từ máy chủ không hợp lệ.', 'API_ERROR', 500);
  }
  return { ...rentalPackage, duration_days: durationDays, price };
}

function mapOrderStatus(status: string): CustomerOrder['order_status'] {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'PENDING';
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'PAID':
      return 'PAID';
    case 'PROCESSING':
    case 'PREPARING':
    case 'ACTIVE':
      return 'PROCESSING';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      throw new AppError(`Trạng thái đơn hàng "${status}" chưa được hỗ trợ.`, 'API_ERROR', 500);
  }
}

function mapBackendOrder(order: BackendCustomerOrder): CustomerOrder {
  if (!order || typeof order.status !== 'string' || typeof order.payment_status !== 'string') {
    throw new AppError('Dữ liệu đơn hàng từ máy chủ không hợp lệ.', 'API_ERROR', 500);
  }
  const totalAmount = toAmount(order.total_amount, 'total_amount');
  if (totalAmount === undefined) {
    throw new AppError('Thiếu tổng tiền đơn hàng từ máy chủ.', 'API_ERROR', 500);
  }
  const items = order.items?.map((item) => ({
    order_item_id: item.order_item_id,
    item_type: item.item_type,
    package_id: item.rental_package_id ?? undefined,
    mushroom_type_id: item.mushroom_type_id ?? undefined,
    package_name: item.package_name ?? undefined,
    mushroom_name: item.mushroom_name ?? undefined,
    quantity: toAmount(item.quantity, 'quantity'),
    price: toAmount(item.unit_price, 'unit_price'),
    unit_price: toAmount(item.unit_price, 'unit_price'),
    total_price: toAmount(item.total_price, 'total_price'),
  }));
  return {
    order_id: order.order_id,
    user_id: order.user_id,
    order_status: mapOrderStatus(order.status),
    payment_status: order.payment_status.toUpperCase(),
    subtotal: toAmount(order.subtotal, 'subtotal'),
    discount: toAmount(order.discount, 'discount'),
    shipping_fee: toAmount(order.shipping_fee, 'shipping_fee'),
    total_amount: totalAmount,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items,
  };
}

/**
 * Order & PayOS Payment Repository Implementation
 */
export class OrderRepository {
  /**
   * Fetch rental packages catalog
   */
  async getRentalPackages(status?: 'ACTIVE' | 'INACTIVE'): Promise<RentalPackage[]> {
    try {
      const response = await axiosClient.get<RentalPackage[] | { data: RentalPackage[] }>(
        API_ENDPOINTS.RENTAL_PACKAGES.BASE,
        { params: status ? { status } : undefined }
      );
      const packages = Array.isArray(response.data) ? response.data : response.data.data;
      return packages.map(normalizeRentalPackage);
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch single rental package
   */
  async getRentalPackage(id: number): Promise<RentalPackage> {
    try {
      const response = await axiosClient.get<RentalPackage | { data: RentalPackage }>(
        API_ENDPOINTS.RENTAL_PACKAGES.DETAIL(id)
      );
      const rentalPackage = 'package_id' in response.data ? response.data : response.data.data;
      return normalizeRentalPackage(rentalPackage);
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Create an order for a rental package and mushroom type
   */
  async createRentalOrder(data: CreateRentalOrderRequest): Promise<CustomerOrder> {
    try {
      const response = await axiosClient.post<{ data: BackendCustomerOrder }>(
        API_ENDPOINTS.ORDERS.CULTIVATION,
        {
          packageId: data.packageId,
          mushroomTypeId: data.mushroomTypeId,
          quantity: data.quantity,
        }
      );
      if (!response.data?.data) {
        throw new AppError('Phản hồi tạo đơn hàng không hợp lệ.', 'API_ERROR', 500);
      }
      return mapBackendOrder(response.data.data);
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * List orders belonging to the authenticated customer
   */
  async getCustomerOrders(status?: string): Promise<CustomerOrder[]> {
    try {
      const response = await axiosClient.get<{ data: BackendCustomerOrder[] }>(
        API_ENDPOINTS.ORDERS.BASE,
        { params: status ? { status } : undefined }
      );
      if (!Array.isArray(response.data?.data)) {
        throw new AppError('Danh sách đơn hàng từ máy chủ không hợp lệ.', 'API_ERROR', 500);
      }
      return response.data.data.map(mapBackendOrder);
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Get order details
   */
  async getOrderDetail(orderId: number): Promise<CustomerOrder> {
    try {
      const response = await axiosClient.get<{ data: BackendCustomerOrder }>(
        API_ENDPOINTS.ORDERS.DETAIL(orderId)
      );
      if (!response.data?.data) {
        throw new AppError('Chi tiết đơn hàng từ máy chủ không hợp lệ.', 'API_ERROR', 500);
      }
      return mapBackendOrder(response.data.data);
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Get cultivation sessions and assigned trays for an order owned by the customer
   */
  async getCustomerCultivationStatus(orderId: number): Promise<CustomerCultivationStatus> {
    try {
      const response = await axiosClient.get<{ data: CustomerCultivationStatus }>(
        API_ENDPOINTS.CUSTOMER.CULTIVATION_STATUS(orderId)
      );
      if (!response.data?.data || !Array.isArray(response.data.data.sessions)) {
        throw new AppError('Dữ liệu phiên nuôi trồng từ máy chủ không hợp lệ.', 'API_ERROR', 500);
      }
      return response.data.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Cancel pending order
   */
  async cancelOrder(orderId: number): Promise<void> {
    try {
      await axiosClient.patch(API_ENDPOINTS.ORDERS.CANCEL(orderId));
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Create or reuse a PayOS payment link for an order
   */
  async createPayosPayment(orderId: number): Promise<PayosPaymentData> {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        message?: string;
        data: PayosPaymentData;
      }>(API_ENDPOINTS.PAYMENTS.PAYOS(orderId));
      if (!response.data?.data) {
        throw new AppError('Không tạo được liên kết thanh toán PayOS.', 'PAYMENT_ERROR', 500);
      }
      return response.data.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * @deprecated Use createPayosPayment instead
   */
  async generateSepayQr(orderId: number): Promise<SepayQrData> {
    return this.createPayosPayment(orderId) as unknown as Promise<SepayQrData>;
  }

  /**
   * Check PayOS payment and order status
   */
  async getPaymentStatus(orderId: number): Promise<PaymentStatusData> {
    try {
      const response = await axiosClient.get<{ success: boolean; data: PaymentStatusData }>(
        API_ENDPOINTS.PAYMENTS.STATUS(orderId)
      );
      if (!response.data?.data) {
        throw new AppError('Không lấy được trạng thái thanh toán.', 'PAYMENT_ERROR', 404);
      }
      return response.data.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Synchronize PayOS after the customer returns from the payment provider
   */
  async syncPayosPayment(orderId: number): Promise<PaymentStatusData> {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: PaymentStatusData;
      }>(API_ENDPOINTS.PAYMENTS.SYNC(orderId));
      if (!response.data?.data) {
        throw new AppError('Không xác nhận được trạng thái thanh toán.', 'PAYMENT_ERROR', 404);
      }
      return response.data.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }
}

export const orderRepository = new OrderRepository();
