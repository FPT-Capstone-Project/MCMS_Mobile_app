/**
 * Order & PayOS Payment Domain Entities
 * Matching SmartMush OpenAPI contracts
 */

export interface RentalPackage {
  package_id: number;
  package_name: string;
  description: string | null;
  duration_days: number;
  price: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CreateRentalOrderRequest {
  packageId: number;
  mushroomTypeId: number;
  quantity: number;
}

export interface OrderItem {
  order_item_id?: number;
  id?: number;
  package_id?: number;
  mushroom_type_id?: number;
  item_type?: 'MUSHROOM' | 'RENTAL' | string;
  package_name?: string;
  duration_days?: number;
  mushroom_name?: string;
  image_url?: string | null;
  price?: number;
  unit_price?: number;
  total_price?: number;
  quantity?: number;
}

export interface CustomerOrder {
  order_id: number;
  user_id: number;
  order_status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  payment_status?: string;
  subtotal?: number;
  discount?: number;
  shipping_fee?: number;
  total_amount: number;
  package_name?: string;
  mushroom_name?: string;
  image_url?: string | null;
  mushroom_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: OrderItem[];
  order_items?: OrderItem[];
  payment?: {
    payment_id: number;
    payment_status: string;
    payment_method: string;
    payment_code: string;
    amount: number;
  };
}

export interface BackendCustomerOrder {
  order_id: number;
  user_id: number;
  subtotal?: number | string;
  discount?: number | string;
  shipping_fee?: number | string;
  total_amount: number | string;
  status: string;
  payment_status: string;
  package_name?: string | null;
  mushroom_name?: string | null;
  image_url?: string | null;
  mushroom_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: {
    order_item_id?: number;
    item_type?: string;
    rental_package_id?: number | null;
    mushroom_type_id?: number | null;
    package_name?: string | null;
    duration_days?: number | string | null;
    mushroom_name?: string | null;
    image_url?: string | null;
    quantity?: number | string;
    unit_price?: number | string;
    total_price?: number | string;
  }[];
}

export interface CustomerCultivationStatus {
  orderId: number;
  sessions: {
    order_item_id?: number;
    session_id: number;
    mushroom_type_id?: number;
    harvest_request_id?: number | null;
    status: string;
    tray_quantity?: number | null;
    start_at?: string | null;
    end_at?: string | null;
    harvest_status?: string | null;
    harvest_method?: 'PICKUP' | 'DELIVERY' | null;
    harvest_request_status?: string | null;
    scheduled_at?: string | null;
    harvest_date?: string | null;
    current_stage?: string | null;
    progress_percent?: number | null;
    mushroom_name: string;
    assigned_trays: {
      tray_id: number;
      tray_code?: string;
      status: string;
    }[];
  }[];
}

export interface OrderHarvestHistory {
  order_id: number;
  order_code: string;
  harvests: {
    session_id: number;
    mushroom_type: { id: number; name: string };
    harvest: null | {
      harvest_id: number;
      status: string;
      harvest_date: string | null;
      total_weight_kg: number | string | null;
      usable_weight_kg: number | string | null;
      rejected_weight_kg: number | string | null;
      quality_grade: string | null;
      harvest_method: 'PICKUP' | 'DELIVERY' | null;
    };
  }[];
}

export interface CompletedSessionReportData {
  inspectionCount: number | null;
  environmentReport: CultivationEnvironmentSessionReport | null;
}

export interface CultivationEnvironmentSessionReport {
  sessionId: number;
  startAt: string | null;
  endAt: string | null;
  thresholds: {
    temperatureMin: number | null;
    temperatureMax: number | null;
    humidityMin: number | null;
    humidityMax: number | null;
  };
  summary: {
    averageTemperature: number | null;
    averageHumidity: number | null;
    temperatureExceedanceCount: number | null;
    humidityExceedanceCount: number | null;
    exceededBucketCount: number | null;
    bucketCount: number;
  };
  points: {
    period_start: string;
    period_end: string;
    growth_stage: string;
    temperature_avg: number | null;
    humidity_avg: number | null;
  }[];
}

export interface CultivationProgressEntry {
  session_id: number;
  current_stage: string | null;
  progress_percent: number | null;
  updated_at: string | null;
  description: string | null;
}

/**
 * PayOS payment link creation response data
 */
export interface PayosPaymentData {
  paymentId: number;
  orderCode: number;
  orderId: number;
  amount: number;
  checkoutUrl: string;
  qrCode: string | null;
  expiresAt: number; // Unix timestamp in seconds
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED' | string;
}

/**
 * PayOS payment status response data
 */
export interface PaymentStatusData {
  orderId: number;
  orderStatus: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | string;
  paymentStatus:
    | 'UNPAID'
    | 'PENDING'
    | 'PAID'
    | 'FAILED'
    | 'REFUND_PENDING'
    | 'REFUNDED'
    | 'CANCELLED'
    | 'EXPIRED'
    | string;
  paymentCode: string;
  amount: number;
}

/**
 * @deprecated Use PayosPaymentData instead
 */
export interface SepayQrData {
  payment_id: number;
  order_id: number;
  amount: number;
  payment_method: string;
  payment_status: string;
  payment_code: string;
  bank_code: string;
  account_number: string;
  qr_url: string;
}
