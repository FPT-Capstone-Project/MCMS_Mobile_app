import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  CreateRentalOrderRequest,
  CustomerOrder,
  PaymentStatusData,
  PayosPaymentData,
  RentalPackage,
  SepayQrData,
} from '../../domain/entities/Order';

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
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return (response.data as { data: RentalPackage[] })?.data || [];
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
      if ('package_id' in response.data) {
        return response.data as RentalPackage;
      }
      return (response.data as { data: RentalPackage }).data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Create an order for a rental package and mushroom type
   */
  async createRentalOrder(data: CreateRentalOrderRequest): Promise<CustomerOrder> {
    try {
      const response = await axiosClient.post<{ data: CustomerOrder } | CustomerOrder>(
        API_ENDPOINTS.ORDERS.RENTALS,
        {
          packageId: data.packageId,
          mushroomTypeId: data.mushroomTypeId,
        }
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as CustomerOrder;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * List orders belonging to the authenticated customer
   */
  async getCustomerOrders(): Promise<CustomerOrder[]> {
    try {
      const response = await axiosClient.get<CustomerOrder[] | { data: CustomerOrder[] }>(
        API_ENDPOINTS.ORDERS.BASE
      );
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return (response.data as { data: CustomerOrder[] })?.data || [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Get order details
   */
  async getOrderDetail(orderId: number): Promise<CustomerOrder> {
    try {
      const response = await axiosClient.get<{ data: CustomerOrder } | CustomerOrder>(
        API_ENDPOINTS.ORDERS.DETAIL(orderId)
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as CustomerOrder;
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
}

export const orderRepository = new OrderRepository();
