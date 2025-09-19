// Core SDK Types
export interface PMTGatewayConfig {
  publicKey: string;
  apiUrl?: string;
  environment?: 'test' | 'live';
  debug?: boolean;
}

export interface PaymentIntent {
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

export type PaymentStatus = 
  | 'REQUIRES_PAYMENT'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'EXPIRED';

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  crypto_currency?: 'dot' | 'dot-stablecoin';
  metadata?: Record<string, any>;
}

export interface WalletConnection {
  address: string;
  source: string;
  name?: string;
  version?: string;
}

export interface WalletAuthChallenge {
  message: string;
  nonce: string;
  timestamp: number;
}

export interface SupportedWallet {
  id: string;
  name: string;
  icon: string;
  downloadUrl: string;
}

// Event Types
export interface PaymentEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'payment.canceled' | 'payment.expired' | 'payment.processing';
  paymentIntent: PaymentIntent;
}

export type PaymentEventHandler = (event: PaymentEvent) => void;

// Widget Configuration
export interface PaymentWidgetConfig {
  container: string | HTMLElement;
  paymentIntent: string | PaymentIntent;
  onSuccess?: PaymentEventHandler;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  theme?: PaymentWidgetTheme;
  locale?: string;
}

export interface PaymentWidgetTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    request_id: string;
  };
}

// Error Types
export class PMTGatewayError extends Error {
  public code: string;
  public details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'PMTGatewayError';
    this.code = code;
    this.details = details;
  }
}

// Widget State
export interface WidgetState {
  isLoading: boolean;
  isConnected: boolean;
  currentStep: 'select-wallet' | 'connect-wallet' | 'confirm-payment' | 'processing' | 'success' | 'error';
  error?: string;
  paymentIntent?: PaymentIntent;
  walletConnection?: WalletConnection;
}
