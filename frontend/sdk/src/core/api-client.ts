import { 
  PMTGatewayConfig, 
  CreatePaymentIntentRequest, 
  PaymentIntent, 
  ApiResponse,
  PMTGatewayError 
} from '../types';

export class APIClient {
  private config: PMTGatewayConfig;
  private baseUrl: string;

  constructor(config: PMTGatewayConfig) {
    this.config = config;
    this.baseUrl = config.apiUrl || this.getDefaultApiUrl();
  }

  private getDefaultApiUrl(): string {
    if (this.config.environment === 'live') {
      return 'https://api.pmtgateway.com';
    }
    return 'https://api-test.pmtgateway.com';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.publicKey}`,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new PMTGatewayError(
        data.error?.message || 'API request failed',
        data.error?.code || 'API_ERROR',
        data.error?.details
      );
    }

    return data;
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    const response = await this.request<PaymentIntent>('/api/v1/payment-intents', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.success || !response.data) {
      throw new PMTGatewayError(
        'Failed to create payment intent',
        'PAYMENT_INTENT_CREATION_FAILED'
      );
    }

    return response.data;
  }

  async getPaymentIntent(id: string): Promise<PaymentIntent> {
    const response = await this.request<PaymentIntent>(`/api/v1/payment-intents/${id}`);

    if (!response.success || !response.data) {
      throw new PMTGatewayError(
        'Payment intent not found',
        'PAYMENT_INTENT_NOT_FOUND'
      );
    }

    return response.data;
  }

  async cancelPaymentIntent(id: string): Promise<PaymentIntent> {
    const response = await this.request<PaymentIntent>(`/api/v1/payment-intents/${id}/cancel`, {
      method: 'POST',
    });

    if (!response.success || !response.data) {
      throw new PMTGatewayError(
        'Failed to cancel payment intent',
        'PAYMENT_INTENT_CANCELATION_FAILED'
      );
    }

    return response.data;
  }

  async getSupportedWallets(): Promise<Array<{ id: string; name: string; icon: string; downloadUrl: string }>> {
    const response = await this.request<{ wallets: Array<{ id: string; name: string; icon: string; downloadUrl: string }> }>('/api/v1/wallet/wallets');

    if (!response.success || !response.data) {
      throw new PMTGatewayError(
        'Failed to get supported wallets',
        'WALLETS_RETRIEVAL_FAILED'
      );
    }

    return response.data.wallets;
  }

  async generateAuthChallenge(address: string, chainId: string = 'polkadot'): Promise<{ challenge: { message: string; nonce: string; timestamp: number } }> {
    const response = await this.request<{ challenge: { message: string; nonce: string; timestamp: number } }>('/api/v1/wallet/challenge', {
      method: 'POST',
      body: JSON.stringify({ address, chainId }),
    });

    if (!response.success || !response.data) {
      throw new PMTGatewayError(
        'Failed to generate auth challenge',
        'CHALLENGE_GENERATION_FAILED'
      );
    }

    return response.data;
  }

  async getSupportedChains(): Promise<Array<{ id: string; name: string; rpcUrl: string; ss58Format: number; decimals: number; symbol: string }>> {
    const response = await this.request<{ chains: Array<{ id: string; name: string; rpcUrl: string; ss58Format: number; decimals: number; symbol: string }> }>('/api/v1/wallet/chains');

    if (!response.success || !response.data) {
      throw new PMTGatewayError(
        'Failed to get supported chains',
        'CHAINS_RETRIEVAL_FAILED'
      );
    }

    return response.data.chains;
  }

  async verifyWalletAuth(data: {
    signature: string;
    address: string;
    challenge: { message: string; nonce: string; timestamp: number };
    merchantId: string;
    chainId?: string;
  }): Promise<{ token: string; address: string; merchantId: string; sessionId?: string; walletType?: string }> {
    const response = await this.request<{ token: string; address: string; merchantId: string; sessionId?: string; walletType?: string }>('/api/v1/wallet/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.success || !response.data) {
      throw new PMTGatewayError(
        'Failed to verify wallet authentication',
        'AUTHENTICATION_VERIFICATION_FAILED'
      );
    }

    return response.data;
  }

  async getConnectionStatus(): Promise<{ connected: boolean; address?: string; merchantId?: string; type?: string }> {
    const response = await this.request<{ connected: boolean; address?: string; merchantId?: string; type?: string }>('/api/v1/wallet/status');

    if (!response.success || !response.data) {
      throw new PMTGatewayError(
        'Failed to get connection status',
        'STATUS_RETRIEVAL_FAILED'
      );
    }

    return response.data;
  }
}
