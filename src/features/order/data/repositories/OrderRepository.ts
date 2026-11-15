import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  CreateRentalOrderRequest,
  BackendCustomerOrder,
  CustomerOrder,
  CustomerCultivationStatus,
  OrderHarvestHistory,
  CompletedSessionReportData,
  CultivationProgressEntry,
  CultivationEnvironmentSessionReport,
  PaymentStatusData,
  PayosPaymentData,
  RentalPackage,
  SepayQrData,
} from '../../domain/entities/Order';

interface SessionReportApiPayload {
  data?: SessionReportApiPayload;
  pagination?: { total?: number };
  total?: number;
  inspections?: unknown[];
  records?: { temperature_avg?: number | string | null; humidity_avg?: number | string | null }[];
  temperature_avg?: number | string | null;
  humidity_avg?: number | string | null;
  readings?: { temperature?: number | string | null; humidity?: number | string | null }[];
}

interface EnvironmentHistoryApiPoint {
  session_id: number;
  floor_id: number;
  period_start: string;
  period_end: string;
  growth_stage: string;
  temperature_avg: number | string | null;
  humidity_avg: number | string | null;
}

interface EnvironmentHistoryApiResponse {
  data?: EnvironmentHistoryApiPoint[];
  pagination?: { totalPages?: number };
}

interface MushroomConditionApiResponse {
  data?: {
    mushroom_type_id: number;
    temperature_min: number | string | null;
    temperature_max: number | string | null;
    humidity_min: number | string | null;
    humidity_max: number | string | null;
  }[];
}

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
    duration_days: toAmount(item.duration_days ?? undefined, 'duration_days'),
    mushroom_name: item.mushroom_name ?? undefined,
    image_url: item.image_url ?? undefined,
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
    package_name: order.package_name ?? undefined,
    mushroom_name: order.mushroom_name ?? undefined,
    image_url: order.image_url ?? undefined,
    mushroom_image_url: order.mushroom_image_url ?? undefined,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items,
  };
}

/**
 * Order & PayOS Payment Repository Implementation
 */
export class OrderRepository {
  async getAdminOrders(): Promise<CustomerOrder[]> {
    try {
      const orders: CustomerOrder[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await axiosClient.get<{
          data: (Omit<BackendCustomerOrder, 'user_id'> & { customer_id: number })[];
          pagination: { totalPages: number };
        }>(API_ENDPOINTS.ORDERS.ADMIN_LIST, { params: { page, pageSize: 100 } });
        orders.push(...response.data.data.map(order => mapBackendOrder({ ...order, user_id: order.customer_id })));
        totalPages = response.data.pagination.totalPages;
        page += 1;
      } while (page <= totalPages);
      return orders;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

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

  async getCustomerHarvestHistory(orderId: number): Promise<OrderHarvestHistory> {
    try {
      const response = await axiosClient.get<{ data: OrderHarvestHistory }>(
        API_ENDPOINTS.CUSTOMER.HARVEST_HISTORY(orderId)
      );
      if (!response.data?.data || !Array.isArray(response.data.data.harvests)) {
        throw new AppError('Dữ liệu thu hoạch từ máy chủ không hợp lệ.', 'API_ERROR', 500);
      }
      return response.data.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  async getCustomerCultivationProgress(orderId: number): Promise<CultivationProgressEntry[]> {
    try {
      const response = await axiosClient.get<{ data: CultivationProgressEntry[] } | CultivationProgressEntry[]>(
        API_ENDPOINTS.CUSTOMER.CULTIVATION_PROGRESS(orderId)
      );
      const entries = Array.isArray(response.data) ? response.data : response.data?.data;
      return Array.isArray(entries) ? entries : [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  async getSessionInspectionCount(sessionId: number): Promise<number | null> {
    try {
      const response = await axiosClient.get<SessionReportApiPayload>(
        API_ENDPOINTS.CULTIVATION_SESSIONS.DAILY_INSPECTIONS(sessionId),
        { params: { page: 1, pageSize: 1 } }
      );
      const body = response.data?.data ?? response.data;
      const pagination = body?.pagination;
      return Number.isFinite(Number(pagination?.total))
        ? Number(pagination?.total)
        : (body?.inspections?.length ?? 0);
    } catch {
      return null;
    }
  }

  async getSessionEnvironmentReport(
    sessionId: number,
    mushroomTypeId?: number,
    startAt?: string | null,
    endAt?: string | null
  ): Promise<CultivationEnvironmentSessionReport | null> {
    try {
      const response = await axiosClient.get<{ data: CultivationEnvironmentSessionReport }>(
        API_ENDPOINTS.ENVIRONMENT_HISTORY.SESSION_REPORT(sessionId)
      );
      return response.data?.data ?? null;
    } catch {
      return this.getEnvironmentReportFallback(sessionId, mushroomTypeId, startAt, endAt);
    }
  }

  async getCompletedSessionReportData(
    sessionId: number,
    mushroomTypeId?: number,
    startAt?: string | null,
    endAt?: string | null
  ): Promise<CompletedSessionReportData> {
    const [inspectionCount, environmentReport] = await Promise.all([
      this.getSessionInspectionCount(sessionId),
      this.getSessionEnvironmentReport(sessionId, mushroomTypeId, startAt, endAt),
    ]);
    return { inspectionCount, environmentReport };
  }

  private async getEnvironmentReportFallback(
    sessionId: number,
    mushroomTypeId?: number,
    startAt?: string | null,
    endAt?: string | null
  ): Promise<CultivationEnvironmentSessionReport | null> {
    try {
      const firstPage = await axiosClient.get<EnvironmentHistoryApiResponse>(
        API_ENDPOINTS.ENVIRONMENT_HISTORY.SESSION(sessionId),
        { params: { page: 1, pageSize: 100 } }
      );
      const totalPages = Math.max(1, Number(firstPage.data?.pagination?.totalPages) || 1);
      const otherPages = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
        axiosClient.get<EnvironmentHistoryApiResponse>(
          API_ENDPOINTS.ENVIRONMENT_HISTORY.SESSION(sessionId),
          { params: { page: index + 2, pageSize: 100 } }
        )
      ));
      const rows = [firstPage.data?.data ?? [], ...otherPages.map((page) => page.data?.data ?? [])].flat();
      const fromTime = startAt ? Date.parse(startAt) : Number.NEGATIVE_INFINITY;
      const toTime = endAt ? Date.parse(endAt) : Number.POSITIVE_INFINITY;
      const grouped = new Map<string, EnvironmentHistoryApiPoint[]>();
      rows.forEach((row) => {
        const timestamp = Date.parse(row.period_start);
        if (!Number.isFinite(timestamp) || timestamp < fromTime || timestamp >= toTime) return;
        const bucket = grouped.get(row.period_start) ?? [];
        bucket.push(row);
        grouped.set(row.period_start, bucket);
      });
      const averageValue = (values: (number | string | null)[]) => {
        const valid = values.map((value) => value == null ? Number.NaN : Number(value)).filter(Number.isFinite);
        return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
      };
      const points = [...grouped.entries()].sort(([left], [right]) => Date.parse(left) - Date.parse(right)).map(([periodStart, bucket]) => ({
        period_start: periodStart,
        period_end: bucket[0].period_end,
        growth_stage: bucket[0].growth_stage,
        temperature_avg: averageValue(bucket.map((point) => point.temperature_avg)),
        humidity_avg: averageValue(bucket.map((point) => point.humidity_avg)),
      }));

      const conditionResponse = mushroomTypeId
        ? await axiosClient.get<MushroomConditionApiResponse>(API_ENDPOINTS.MUSHROOM_CONDITIONS.BASE, { params: { mushroomTypeId } })
        : null;
      const condition = conditionResponse?.data?.data?.find((item) => item.mushroom_type_id === mushroomTypeId);
      const toNullableNumber = (value: number | string | null | undefined) => value == null ? null : Number(value);
      const thresholds = {
        temperatureMin: toNullableNumber(condition?.temperature_min),
        temperatureMax: toNullableNumber(condition?.temperature_max),
        humidityMin: toNullableNumber(condition?.humidity_min),
        humidityMax: toNullableNumber(condition?.humidity_max),
      };
      const tempValues = points.map((point) => point.temperature_avg).filter((value): value is number => value != null);
      const humidityValues = points.map((point) => point.humidity_avg).filter((value): value is number => value != null);
      const hasTemperatureThresholds = thresholds.temperatureMin != null && thresholds.temperatureMax != null;
      const hasHumidityThresholds = thresholds.humidityMin != null && thresholds.humidityMax != null;
      const tempExceeds = (value: number | null) => hasTemperatureThresholds && value != null
        && (value < thresholds.temperatureMin! || value > thresholds.temperatureMax!);
      const humidityExceeds = (value: number | null) => hasHumidityThresholds && value != null
        && (value < thresholds.humidityMin! || value > thresholds.humidityMax!);
      const temperatureExceedanceCount = hasTemperatureThresholds ? points.filter((point) => tempExceeds(point.temperature_avg)).length : null;
      const humidityExceedanceCount = hasHumidityThresholds ? points.filter((point) => humidityExceeds(point.humidity_avg)).length : null;
      const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

      return {
        sessionId,
        startAt: startAt ?? points[0]?.period_start ?? null,
        endAt: endAt ?? points[points.length - 1]?.period_end ?? null,
        thresholds,
        summary: {
          averageTemperature: mean(tempValues),
          averageHumidity: mean(humidityValues),
          temperatureExceedanceCount,
          humidityExceedanceCount,
          exceededBucketCount: hasTemperatureThresholds || hasHumidityThresholds
            ? points.filter((point) => tempExceeds(point.temperature_avg) || humidityExceeds(point.humidity_avg)).length
            : null,
          bucketCount: points.length,
        },
        points,
      };
    } catch {
      return null;
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
