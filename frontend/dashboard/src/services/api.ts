import axios, { AxiosInstance } from 'axios';
import { 
  PaymentIntent, 
  Merchant, 
  WebhookEvent, 
  DashboardStats, 
  ApiResponse, 
  PaginatedResponse,
  FilterOptions,
  SortOptions,
  LoginCredentials,
  AuthResponse
} from '@/types';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: '/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
    if (this.token) {
      this.setAuthToken(this.token);
    }

    // Add request interceptor
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    this.api.defaults.headers.Authorization = `Bearer ${token}`;
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    delete this.api.defaults.headers.Authorization;
  }

  logout() {
    this.clearAuthToken();
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    if (response.data.success && response.data.data) {
      this.setAuthToken(response.data.data.token);
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Login failed');
  }

  async logoutUser(): Promise<void> {
    await this.api.post('/auth/logout');
    this.logout();
  }

  async getProfile(): Promise<Merchant> {
    const response = await this.api.get<ApiResponse<Merchant>>('/auth/profile');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Failed to get profile');
  }

  // Payment Intent endpoints
  async getPaymentIntents(
    page = 1,
    limit = 20,
    filters?: FilterOptions,
    sort?: SortOptions
  ): Promise<PaginatedResponse<PaymentIntent>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    if (sort) {
      params.append('sort_by', sort.field);
      params.append('sort_direction', sort.direction);
    }

    const response = await this.api.get<ApiResponse<PaginatedResponse<PaymentIntent>>>(
      `/payment-intents?${params.toString()}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Failed to get payment intents');
  }

  async getPaymentIntent(id: string): Promise<PaymentIntent> {
    const response = await this.api.get<ApiResponse<PaymentIntent>>(`/payment-intents/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Payment intent not found');
  }

  async cancelPaymentIntent(id: string): Promise<PaymentIntent> {
    const response = await this.api.post<ApiResponse<PaymentIntent>>(`/payment-intents/${id}/cancel`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Failed to cancel payment intent');
  }

  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Failed to get dashboard stats');
  }

  // Webhook events
  async getWebhookEvents(
    page = 1,
    limit = 20,
    filters?: { status?: string; payment_intent_id?: string }
  ): Promise<PaginatedResponse<WebhookEvent>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await this.api.get<ApiResponse<PaginatedResponse<WebhookEvent>>>(
      `/webhooks/events?${params.toString()}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Failed to get webhook events');
  }

  async retryWebhookEvent(id: string): Promise<WebhookEvent> {
    const response = await this.api.post<ApiResponse<WebhookEvent>>(`/webhooks/events/${id}/retry`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Failed to retry webhook event');
  }

  // Merchant settings
  async updateMerchantSettings(settings: Partial<Merchant>): Promise<Merchant> {
    const response = await this.api.put<ApiResponse<Merchant>>('/merchant/settings', settings);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Failed to update settings');
  }

  async regenerateApiKey(): Promise<{ api_key: string }> {
    const response = await this.api.post<ApiResponse<{ api_key: string }>>('/merchant/regenerate-api-key');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Failed to regenerate API key');
  }
}

export const apiService = new ApiService();
export default apiService;
