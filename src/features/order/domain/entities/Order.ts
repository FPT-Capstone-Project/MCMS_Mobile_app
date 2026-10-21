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
}

export interface OrderItem {
  order_item_id?: number;
  id?: number;
  package_id?: number;
  mushroom_type_id?: number;
  package_name?: string;
  mushroom_name?: string;
  price?: number;
  quantity?: number;
}

export interface CustomerOrder {
  order_id: number;
  user_id: number;
  order_status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  total_amount: number;
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
