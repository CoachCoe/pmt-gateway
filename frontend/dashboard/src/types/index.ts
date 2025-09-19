// Dashboard Types
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
  updated_at: string;
}

export type PaymentStatus = 
  | 'REQUIRES_PAYMENT'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'EXPIRED';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  api_key_hash: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  merchant_id: string;
  payment_intent_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: WebhookStatus;
  attempts: number;
  max_attempts: number;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export type WebhookStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING';

export interface DashboardStats {
  total_payments: number;
  successful_payments: number;
  failed_payments: number;
  total_volume: number;
  total_volume_crypto: string;
  average_payment: number;
  success_rate: number;
  recent_payments: PaymentIntent[];
}

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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface FilterOptions {
  status?: PaymentStatus;
  currency?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

export interface NotificationSettings {
  email: boolean;
  webhook: boolean;
  dashboard: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'merchant';
  created_at: string;
  last_login?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string;
}
