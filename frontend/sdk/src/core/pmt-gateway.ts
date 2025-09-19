import { 
  PMTGatewayConfig, 
  CreatePaymentIntentRequest, 
  PaymentIntent, 
  PaymentWidgetConfig,
  PaymentEventHandler 
} from '../types';
import { APIClient } from './api-client';
import { WalletAuthService } from './wallet-auth';
import { PaymentWidget } from '../components/payment-widget';

export class PMTGateway {
  private config: PMTGatewayConfig;
  private apiClient: APIClient;
  private walletAuth: WalletAuthService;

  constructor(config: PMTGatewayConfig) {
    this.config = config;
    this.apiClient = new APIClient(config);
    this.walletAuth = new WalletAuthService(this.apiClient);
  }

  // Payment Intent Management
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    return this.apiClient.createPaymentIntent(request);
  }

  async getPaymentIntent(id: string): Promise<PaymentIntent> {
    return this.apiClient.getPaymentIntent(id);
  }

  async cancelPaymentIntent(id: string): Promise<PaymentIntent> {
    return this.apiClient.cancelPaymentIntent(id);
  }

  // Wallet Management
  async getSupportedWallets() {
    return this.walletAuth.getSupportedWallets();
  }

  async getSupportedChains() {
    return this.walletAuth.getSupportedChains();
  }

  async connectWallet(walletId: string) {
    return this.walletAuth.connectWallet(walletId);
  }

  async authenticateWallet(merchantId: string, chainId: string = 'polkadot'): Promise<string> {
    return this.walletAuth.authenticateWallet(merchantId, chainId);
  }

  getCurrentConnection() {
    return this.walletAuth.getCurrentConnection();
  }

  disconnectWallet(): void {
    this.walletAuth.disconnect();
  }

  // Widget Creation
  createPaymentWidget(config: PaymentWidgetConfig): PaymentWidget {
    return new PaymentWidget(config, this.apiClient);
  }

  // Static factory method for easy initialization
  static create(config: PMTGatewayConfig): PMTGateway {
    return new PMTGateway(config);
  }

  // Utility methods
  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  formatDOTAmount(amount: string): string {
    const num = parseFloat(amount);
    return num.toFixed(4);
  }

  // Event handling
  on(event: string, handler: Function): void {
    // Global event handling can be implemented here
    console.log(`Global event listener added for: ${event}`);
  }

  off(event: string, handler: Function): void {
    // Global event handling can be implemented here
    console.log(`Global event listener removed for: ${event}`);
  }
}
