// Enums
export type PaymentMethod = 'cash' | 'card' | 'sumup_terminal' | 'sumup_online';
export type PaymentProvider = 'CASH' | 'CARD' | 'SUMUP';
export type PaymentTransactionStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

// Payment Metadata
export interface PaymentMetadata {
  cardLastFour?: string;
  cardBrand?: string;
  receiptUrl?: string;
  [key: string]: unknown;
}

/** TSE (KassenSichV) signature data attached once a payment is signed. `failed: true`
 *  means signing was attempted and the TSE was unreachable/rejected it (fail-open --
 *  the sale still went through); no tseData at all means TSE isn't configured for
 *  this org, or the payment predates it being enabled. */
export interface TseTransactionData {
  provider: 'fiskaly' | 'local' | 'none';
  clientId: string;
  transactionNumber: number;
  serialNumber: string;
  signatureCounter: number;
  signatureValue: string;
  signatureAlgorithm: string;
  startTime: string;
  endTime: string;
  processType: string;
  processData: string;
  qrCodeData: string;
  failed?: boolean;
  failureReason?: string;
  /** Structured failure detail (set when failed: true) — see api's TseService errorCode mapping
   *  (TSS_NOT_INITIALIZED, TSE_ADMIN_AUTH, raw fiskaly code, HTTP_<status>, NETWORK). */
  errorCode?: string;
  /** HTTP status from the provider/transport when available. */
  httpStatus?: number;
  /** ISO timestamp of the failed attempt. */
  failedAt?: string;
}

// Payment
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentProvider: PaymentProvider;
  providerTransactionId: string | null;
  status: PaymentTransactionStatus;
  metadata: PaymentMetadata;
  processedByUserId: string | null;
  processedByDeviceId: string | null;
  tseData?: TseTransactionData | null;
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreatePaymentData {
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  providerTransactionId?: string;
  metadata?: Record<string, unknown>;
  bewirtungsbelegRequested?: boolean;
}

export interface SplitPaymentItemData {
  orderItemId: string;
  quantity: number;
}

export interface SplitPaymentData {
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  items: SplitPaymentItemData[];
  providerTransactionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ForceRefundPaymentData {
  reason: string;
}

export interface QueryPaymentsParams {
  orderId?: string;
  status?: PaymentTransactionStatus;
  paymentMethod?: PaymentMethod;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
