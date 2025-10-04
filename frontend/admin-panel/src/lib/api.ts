const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

class API {
  private sessionToken: string | null = null;

  constructor() {
    const stored = localStorage.getItem('adminSessionToken');
    if (stored) {
      this.sessionToken = stored;
    }
  }

  setSessionToken(token: string | null) {
    this.sessionToken = token;
    if (token) {
      localStorage.setItem('adminSessionToken', token);
    } else {
      localStorage.removeItem('adminSessionToken');
    }
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async getNonce(address: string): Promise<string> {
    const result = await this.request(`/auth/nonce?address=${address}`);
    return result.nonce;
  }

  async verifySiwe(
    message: string,
    signature: string
  ): Promise<{ sessionToken: string; merchant: any; isNewMerchant: boolean }> {
    const result = await this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    });
    this.setSessionToken(result.data.sessionToken);
    return result.data;
  }

  async getSession(): Promise<any> {
    const result = await this.request('/auth/session');
    return result.data;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.setSessionToken(null);
  }

  // Platform Stats
  async getPlatformStats(): Promise<{
    totalMerchants: number;
    totalPayments: number;
    totalVolume: string;
    totalFees: string;
  }> {
    const result = await this.request('/admin/stats');
    return result.data;
  }

  // Merchants
  async getAllMerchants(params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    merchants: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const result = await this.request(`/admin/merchants?${query.toString()}`);
    return result.data;
  }

  // Payments (all merchants)
  async getAllPayments(params?: {
    page?: number;
    limit?: number;
    status?: string;
    merchantId?: string;
  }): Promise<{
    paymentIntents: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.merchantId) query.set('merchantId', params.merchantId);

    const result = await this.request(`/admin/payments?${query.toString()}`);
    return result.data;
  }

  // Fee Withdrawal
  async withdrawFees(amount: string): Promise<{ txHash: string }> {
    const result = await this.request('/admin/withdraw-fees', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return result.data;
  }

  async getPlatformBalance(): Promise<{ balance: string; balanceUSD: string }> {
    const result = await this.request('/admin/balance');
    return result.data;
  }
}

export const api = new API();
