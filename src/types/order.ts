import type { Product } from './product';
import type { Category } from './category';
import type { Payment } from './payment';

// Enums
export type OrderStatus = 'open' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
export type OrderPaymentStatus = 'unpaid' | 'partly_paid' | 'paid' | 'refunded';
export type OrderSource = 'pos' | 'online' | 'qr_order';
export type OrderFulfillmentType = 'table_service' | 'counter_pickup';
export type OrderPriority = 'normal' | 'high' | 'rush';
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

// Selected Option for Order Items
export interface SelectedOption {
  group: string;
  option: string;
  priceModifier: number;
  excluded?: boolean;
}

export interface OrderItemOptions {
  selected: SelectedOption[];
}

// Order Item
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  categoryId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  optionsPrice: number;
  taxRate: number;
  totalPrice: number;
  options: OrderItemOptions;
  status: OrderItemStatus;
  notes: string | null;
  kitchenNotes: string | null;
  paidQuantity: number;
  pfandTypeId: string | null;
  depositAmount: number;
  isRefill: boolean;
  preparedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  category?: Category;
}

// Order
export interface Order {
  id: string;
  organizationId: string;
  eventId: string | null;
  orderNumber: string;
  dailyNumber: number;
  tableNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  source: OrderSource;
  fulfillmentType: OrderFulfillmentType;
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  tipAmount: number;
  discountAmount: number;
  discountReason: string | null;
  pfandTotal: number;
  notes: string | null;
  priority: OrderPriority;
  estimatedReadyAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdByUserId: string | null;
  createdByDeviceId: string | null;
  onlineSessionId: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  /** Member who rang up the order (POS/manual). Only the display fields are returned. */
  createdByUser?: { id: string; firstName: string; lastName: string } | null;
  /** Device/terminal that created the order. */
  createdByDevice?: { id: string; name: string } | null;
  /** Only present when the list/detail request passed includePayments. */
  payments?: Payment[];
}

/** Aggregate TSE status across an order's payments, for a single badge in the list.
 *  'none': no captured payments yet (nothing to have signed). 'unsigned': has a
 *  captured payment with no tseData at all (TSE off, or not registered yet).
 *  'failed': at least one payment's TSE signing attempt failed. 'signed': every
 *  captured payment carries a successful signature. */
export type OrderTseStatus = 'none' | 'unsigned' | 'failed' | 'signed';

export function getOrderTseStatus(order: Pick<Order, 'payments'>): OrderTseStatus {
  const payments = order.payments;
  if (!payments || payments.length === 0) return 'none';
  if (payments.some((p) => p.tseData?.failed)) return 'failed';
  if (payments.some((p) => !p.tseData)) return 'unsigned';
  return 'signed';
}

export type OrderChannel = 'service' | 'counter' | 'online';

/** Derive a human-facing ordering channel from an order's source + fulfillment. */
export function getOrderChannel(order: Pick<Order, 'source' | 'fulfillmentType'>): OrderChannel {
  // Shop checkout and the QR self-order flow both count as "online".
  if (order.source === 'online' || order.source === 'qr_order') return 'online';
  return order.fulfillmentType === 'table_service' ? 'service' : 'counter';
}

// DTOs for creating/updating orders
export interface CreateOrderItemData {
  productId: string;
  quantity: number;
  notes?: string;
  kitchenNotes?: string;
  selectedOptions?: SelectedOption[];
  isRefill?: boolean;
}

export interface CreateOrderData {
  eventId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  priority?: OrderPriority;
  source?: OrderSource;
  fulfillmentType?: OrderFulfillmentType;
  items?: CreateOrderItemData[];
  discountAmount?: number;
  discountReason?: string;
  userId?: string;
}

export interface UpdateOrderData {
  tableNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  priority?: OrderPriority;
  discountAmount?: number;
  discountReason?: string | null;
}

export interface AddOrderItemData {
  productId: string;
  quantity: number;
  notes?: string;
  kitchenNotes?: string;
  selectedOptions?: SelectedOption[];
}

export interface UpdateOrderItemData {
  quantity?: number;
  notes?: string | null;
  kitchenNotes?: string | null;
}

export interface CancelOrderData {
  reason?: string;
}

/** Org-admin-only overrides (see api's OrdersController force-* routes). Bypass the
 *  normal guardrails (completed-order cancel, illegal status jump) for manual
 *  corrections; force-cancel requires the TSE reversal to actually succeed (rejects
 *  with TSE_REVERSAL_REQUIRED and logs the failed attempt otherwise, instead of the
 *  plain cancel's best-effort signing). */
export interface ForceCancelOrderData {
  reason: string;
}

/** CANCELLED is refused as a target by the api — use ForceCancelOrderData instead
 *  so the required TSE reversal + stock restore actually happen. */
export type ForceableOrderStatus = Exclude<OrderStatus, 'cancelled'>;

export interface ForceUpdateOrderStatusData {
  status: ForceableOrderStatus;
  reason: string;
}

export interface QueryOrdersParams {
  eventId?: string;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  source?: OrderSource;
  fulfillmentType?: OrderFulfillmentType;
  tableNumber?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  includeItems?: boolean;
  includePayments?: boolean;
  page?: number;
  limit?: number;
}

/** Filter params accepted by GET /organizations/:id/orders/stats (same filters, no paging). */
export type QueryOrderStatsParams = Omit<QueryOrdersParams, 'page' | 'limit' | 'includeItems' | 'includePayments'>;

/** Aggregates over ALL orders matching the filters (not just the current page). */
export interface OrderStats {
  count: number;
  revenue: number;
  avgReceipt: number;
  pfand: number;
}
