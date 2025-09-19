import { PaymentStatus, WebhookStatus } from '@prisma/client';

// API Request/Response Types
export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  crypto_currency?: 'dot' | 'dot-stablecoin';
  metadata?: Record<string, any>;
}

// Alias for backward compatibility
export type CreatePaymentIntentInput = CreatePaymentIntentRequest;

export interface PaymentIntentResponse {
  id: string;
  amount: number;
  currency: string;
  crypto_amount: string;
  crypto_currency: string;
  status: PaymentStatus;
  wallet_address?: string;
  transaction_hash?: string;
  expires_at: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface WebhookPayload {
  id: string;
  type: string;
  created: number;
  data: {
    payment_intent: PaymentIntentResponse;
  };
}

// Internal Types
export interface PaymentIntentData {
  id: string;
  amount: number;
  currency: string;
  cryptoAmount: string;
  cryptoCurrency: string;
  status: PaymentStatus;
  walletAddress?: string;
  transactionHash?: string;
  expiresAt: Date;
  metadata?: Record<string, any>;
  merchantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantData {
  id: string;
  name: string;
  email: string;
  apiKeyHash: string;
  webhookUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEventData {
  id: string;
  paymentIntentId: string;
  eventType: string;
  payload: any;
  deliveryStatus: WebhookStatus;
  retryCount: number;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

// Polkadot Types
export interface PolkadotTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
  timestamp: number;
}

export interface WalletConnection {
  address: string;
  source: string;
  name?: string;
  version?: string;
}

// Price Oracle Types
export interface PriceData {
  currency: string;
  price: string;
  lastUpdated: Date;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Webhook Event Types
export type WebhookEventType = 
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.canceled'
  | 'payment.expired'
  | 'payment.processing';

// Supported Currencies
export type SupportedFiatCurrency = 'usd' | 'eur' | 'gbp' | 'jpy';
export type SupportedCryptoCurrency = 'dot' | 'dot-stablecoin';

// API Response Wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    request_id: string;
  };
}
