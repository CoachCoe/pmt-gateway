import { 
  PaymentWidgetConfig, 
  PaymentIntent, 
  WidgetState, 
  PaymentEventHandler,
  PMTGatewayError 
} from '../types';
import { APIClient } from '../core/api-client';
import { WalletAuthService } from '../core/wallet-auth';

export class PaymentWidget {
  private config: PaymentWidgetConfig;
  private apiClient: APIClient;
  private walletAuth: WalletAuthService;
  private container: HTMLElement;
  private state: WidgetState;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(config: PaymentWidgetConfig, apiClient: APIClient) {
    this.config = config;
    this.apiClient = apiClient;
    this.walletAuth = new WalletAuthService(apiClient);
    
    // Get container element
    this.container = typeof config.container === 'string' 
      ? document.querySelector(config.container) as HTMLElement
      : config.container;

    if (!this.container) {
      throw new PMTGatewayError(
        'Container element not found',
        'CONTAINER_NOT_FOUND'
      );
    }

    // Initialize state
    this.state = {
      isLoading: true,
      isConnected: false,
      currentStep: 'select-wallet',
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.render();
      
      // Load payment intent if ID provided
      if (typeof this.config.paymentIntent === 'string') {
        this.state.paymentIntent = await this.apiClient.getPaymentIntent(this.config.paymentIntent);
      } else {
        this.state.paymentIntent = this.config.paymentIntent;
      }

      this.state.isLoading = false;
      this.render();

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private render(): void {
    const theme = this.config.theme || {};
    
    this.container.innerHTML = `
      <div class="pmt-widget" style="
        font-family: ${theme.fontFamily || 'system-ui, -apple-system, sans-serif'};
        background: ${theme.backgroundColor || '#ffffff'};
        border-radius: ${theme.borderRadius || '8px'};
        padding: 24px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        max-width: 400px;
        margin: 0 auto;
      ">
        ${this.renderContent()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderContent(): string {
    if (this.state.isLoading) {
      return this.renderLoading();
    }

    if (this.state.error) {
      return this.renderError();
    }

    switch (this.state.currentStep) {
      case 'select-wallet':
        return this.renderWalletSelection();
      case 'connect-wallet':
        return this.renderWalletConnection();
      case 'confirm-payment':
        return this.renderPaymentConfirmation();
      case 'processing':
        return this.renderProcessing();
      case 'success':
        return this.renderSuccess();
      case 'error':
        return this.renderError();
      default:
        return this.renderWalletSelection();
    }
  }

  private renderLoading(): string {
    return `
      <div class="pmt-loading" style="text-align: center; padding: 40px;">
        <div style="
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid ${this.config.theme?.primaryColor || '#6366f1'};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        "></div>
        <p style="color: ${this.config.theme?.textColor || '#374151'}; margin: 0;">Loading payment...</p>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
  }

  private renderError(): string {
    return `
      <div class="pmt-error" style="text-align: center; padding: 20px;">
        <div style="
          width: 48px;
          height: 48px;
          background: #fee2e2;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        ">
          <span style="font-size: 24px; color: #dc2626;">⚠️</span>
        </div>
        <h3 style="color: ${this.config.theme?.textColor || '#374151'}; margin: 0 0 8px;">Payment Error</h3>
        <p style="color: #6b7280; margin: 0 0 16px;">${this.state.error}</p>
        <button class="pmt-retry-btn" style="
          background: ${this.config.theme?.primaryColor || '#6366f1'};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Try Again</button>
      </div>
    `;
  }

  private renderWalletSelection(): string {
    return `
      <div class="pmt-wallet-selection">
        <h3 style="color: ${this.config.theme?.textColor || '#374151'}; margin: 0 0 16px; text-align: center;">
          Connect Your Wallet
        </h3>
        <p style="color: #6b7280; margin: 0 0 24px; text-align: center; font-size: 14px;">
          Choose a wallet to pay with DOT
        </p>
        <div class="pmt-wallet-list" id="wallet-list">
          <!-- Wallets will be loaded here -->
        </div>
      </div>
    `;
  }

  private renderWalletConnection(): string {
    return `
      <div class="pmt-wallet-connection" style="text-align: center;">
        <h3 style="color: ${this.config.theme?.textColor || '#374151'}; margin: 0 0 16px;">
          Connect to ${this.state.walletConnection?.name || 'Wallet'}
        </h3>
        <p style="color: #6b7280; margin: 0 0 24px; font-size: 14px;">
          Please approve the connection in your wallet
        </p>
        <div style="
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid ${this.config.theme?.primaryColor || '#6366f1'};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        "></div>
      </div>
    `;
  }

  private renderPaymentConfirmation(): string {
    if (!this.state.paymentIntent) return '';

    const { paymentIntent } = this.state;
    const amount = (paymentIntent.amount / 100).toFixed(2);
    const cryptoAmount = parseFloat(paymentIntent.crypto_amount).toFixed(4);

    return `
      <div class="pmt-payment-confirmation">
        <h3 style="color: ${this.config.theme?.textColor || '#374151'}; margin: 0 0 16px; text-align: center;">
          Confirm Payment
        </h3>
        
        <div style="
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          margin: 0 0 24px;
        ">
          <div style="display: flex; justify-content: space-between; margin: 0 0 8px;">
            <span style="color: #6b7280; font-size: 14px;">Amount:</span>
            <span style="color: ${this.config.theme?.textColor || '#374151'}; font-weight: 500;">
              ${amount} ${paymentIntent.currency.toUpperCase()}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 0 0 8px;">
            <span style="color: #6b7280; font-size: 14px;">DOT Amount:</span>
            <span style="color: ${this.config.theme?.textColor || '#374151'}; font-weight: 500;">
              ${cryptoAmount} DOT
            </span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280; font-size: 14px;">Wallet:</span>
            <span style="color: ${this.config.theme?.textColor || '#374151'}; font-size: 14px;">
              ${this.state.walletConnection?.address?.slice(0, 8)}...${this.state.walletConnection?.address?.slice(-8)}
            </span>
          </div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="pmt-cancel-btn" style="
            flex: 1;
            background: #f3f4f6;
            color: #374151;
            border: none;
            padding: 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Cancel</button>
          <button class="pmt-confirm-btn" style="
            flex: 1;
            background: ${this.config.theme?.primaryColor || '#6366f1'};
            color: white;
            border: none;
            padding: 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Confirm Payment</button>
        </div>
      </div>
    `;
  }

  private renderProcessing(): string {
    return `
      <div class="pmt-processing" style="text-align: center;">
        <div style="
          width: 48px;
          height: 48px;
          background: #dbeafe;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        ">
          <div style="
            width: 24px;
            height: 24px;
            border: 2px solid #3b82f6;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
        </div>
        <h3 style="color: ${this.config.theme?.textColor || '#374151'}; margin: 0 0 8px;">
          Processing Payment
        </h3>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          Please wait while we confirm your transaction...
        </p>
      </div>
    `;
  }

  private renderSuccess(): string {
    return `
      <div class="pmt-success" style="text-align: center;">
        <div style="
          width: 48px;
          height: 48px;
          background: #d1fae5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        ">
          <span style="font-size: 24px; color: #059669;">✓</span>
        </div>
        <h3 style="color: ${this.config.theme?.textColor || '#374151'}; margin: 0 0 8px;">
          Payment Successful!
        </h3>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          Your payment has been confirmed on the blockchain.
        </p>
      </div>
    `;
  }

  private async attachEventListeners(): Promise<void> {
    // Wallet selection
    const walletList = this.container.querySelector('#wallet-list');
    if (walletList) {
      await this.loadWallets();
    }

    // Retry button
    const retryBtn = this.container.querySelector('.pmt-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.state.error = undefined;
        this.state.currentStep = 'select-wallet';
        this.render();
      });
    }

    // Cancel button
    const cancelBtn = this.container.querySelector('.pmt-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.config.onCancel?.();
      });
    }

    // Confirm button
    const confirmBtn = this.container.querySelector('.pmt-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.processPayment();
      });
    }
  }

  private async loadWallets(): Promise<void> {
    try {
      const wallets = await this.walletAuth.getSupportedWallets();
      const walletList = this.container.querySelector('#wallet-list');
      
      if (walletList) {
        walletList.innerHTML = wallets.map(wallet => `
          <button class="pmt-wallet-btn" data-wallet-id="${wallet.id}" style="
            width: 100%;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin: 0 0 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s;
          " onmouseover="this.style.borderColor='${this.config.theme?.primaryColor || '#6366f1'}'" onmouseout="this.style.borderColor='#e5e7eb'">
            <div style="
              width: 32px;
              height: 32px;
              background: #f3f4f6;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            ">${this.getWalletIcon(wallet.id)}</div>
            <div style="text-align: left; flex: 1;">
              <div style="font-weight: 500; color: ${this.config.theme?.textColor || '#374151'}; margin: 0 0 2px;">
                ${wallet.name}
              </div>
              <div style="font-size: 12px; color: #6b7280;">
                Click to connect
              </div>
            </div>
          </button>
        `).join('');

        // Add click listeners
        walletList.querySelectorAll('.pmt-wallet-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const walletId = (e.currentTarget as HTMLElement).dataset.walletId;
            if (walletId) {
              this.connectWallet(walletId);
            }
          });
        });
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private getWalletIcon(walletId: string): string {
    const icons: Record<string, string> = {
      'polkadot-js': '🔗',
      'talisman': '⚡',
      'subwallet': '🔷',
      'nova-wallet': '📱',
    };
    return icons[walletId] || '💳';
  }

  private async connectWallet(walletId: string): Promise<void> {
    try {
      this.state.currentStep = 'connect-wallet';
      this.render();

      const connection = await this.walletAuth.connectWallet(walletId);
      this.state.walletConnection = connection;
      this.state.isConnected = true;
      this.state.currentStep = 'confirm-payment';
      this.render();

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async processPayment(): Promise<void> {
    try {
      this.state.currentStep = 'processing';
      this.render();

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      this.state.currentStep = 'success';
      this.render();

      // Emit success event
      if (this.state.paymentIntent) {
        this.emit('payment.succeeded', {
          type: 'payment.succeeded',
          paymentIntent: this.state.paymentIntent,
        });
      }

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleError(error: Error): void {
    this.state.error = error.message;
    this.state.currentStep = 'error';
    this.render();

    this.config.onError?.(error);
  }

  // Event system
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Public methods
  destroy(): void {
    this.container.innerHTML = '';
    this.eventHandlers.clear();
  }

  getState(): WidgetState {
    return { ...this.state };
  }
}
