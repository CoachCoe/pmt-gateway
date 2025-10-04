/**
 * PMT Payment Widget - Embeddable Checkout
 *
 * Drop-in payment widget for marketplaces.
 * Usage: <script src="pmt-widget.js"></script>
 *        PMTWidget.init({ merchantId: '...', amount: 100, currency: 'usd' })
 */

import { ethers } from 'ethers';

interface PaymentConfig {
  merchantId: string;
  amount: number;
  currency: string;
  cryptoCurrency?: string;
  apiUrl?: string;
  onSuccess?: (payment: any) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  theme?: 'light' | 'dark';
  customStyles?: Record<string, string>;
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  crypto_amount: string;
  crypto_currency: string;
  wallet_address: string;
  expires_at: string;
  status: string;
}

export class PMTWidget {
  private config: PaymentConfig;
  private modal: HTMLElement | null = null;
  private paymentIntent: PaymentIntent | null = null;
  private statusCheckInterval: number | null = null;

  constructor(config: PaymentConfig) {
    this.config = {
      apiUrl: 'http://localhost:3000/api/v1',
      cryptoCurrency: 'dot',
      theme: 'light',
      ...config,
    };
  }

  /**
   * Initialize and show payment widget
   */
  async init(): Promise<void> {
    try {
      // Create payment intent
      this.paymentIntent = await this.createPaymentIntent();

      // Show modal
      this.showModal();

      // Start checking payment status
      this.startStatusCheck();

    } catch (error) {
      console.error('Failed to initialize payment widget:', error);
      this.config.onError?.(error as Error);
    }
  }

  /**
   * Create payment intent via API
   */
  private async createPaymentIntent(): Promise<PaymentIntent> {
    const response = await fetch(`${this.config.apiUrl}/payment-intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.merchantId}`,
      },
      body: JSON.stringify({
        amount: this.config.amount,
        currency: this.config.currency,
        crypto_currency: this.config.cryptoCurrency,
        metadata: {
          widget: true,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Show payment modal
   */
  private showModal(): void {
    if (!this.paymentIntent) return;

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'pmt-payment-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      animation: fadeIn 0.3s ease;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'pmt-payment-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease;
      ${this.config.theme === 'dark' ? 'background: #1a1a1a; color: white;' : ''}
    `;

    modal.innerHTML = this.getModalHTML();

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    this.modal = modal;

    // Add event listeners
    this.attachEventListeners();

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
  }

  /**
   * Get modal HTML
   */
  private getModalHTML(): string {
    if (!this.paymentIntent) return '';

    const isDark = this.config.theme === 'dark';
    const textColor = isDark ? '#ffffff' : '#000000';
    const mutedColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#374151' : '#e5e7eb';

    return `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .pmt-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid ${borderColor};
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      </style>

      <!-- Header -->
      <div style="padding: 24px; border-bottom: 1px solid ${borderColor};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: ${textColor};">
            Complete Payment
          </h2>
          <button id="pmt-close-btn" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: ${mutedColor};
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
          " onmouseover="this.style.background='${isDark ? '#374151' : '#f3f4f6'}'" onmouseout="this.style.background='none'">
            ✕
          </button>
        </div>
      </div>

      <!-- Payment Details -->
      <div style="padding: 24px;">
        <!-- Amount -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 48px; font-weight: 700; color: ${textColor};">
            $${(this.paymentIntent.amount / 100).toFixed(2)}
          </div>
          <div style="font-size: 14px; color: ${mutedColor}; margin-top: 8px;">
            ${this.paymentIntent.crypto_amount} ${this.paymentIntent.crypto_currency.toUpperCase()}
          </div>
        </div>

        <!-- Payment Address -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; font-size: 14px; font-weight: 600; color: ${textColor}; margin-bottom: 8px;">
            Send ${this.paymentIntent.crypto_currency.toUpperCase()} to:
          </label>
          <div style="
            background: ${isDark ? '#111827' : '#f9fafb'};
            border: 1px solid ${borderColor};
            border-radius: 8px;
            padding: 12px;
            font-family: monospace;
            font-size: 12px;
            color: ${textColor};
            word-break: break-all;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <span>${this.paymentIntent.wallet_address}</span>
            <button id="pmt-copy-btn" style="
              background: #3b82f6;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              margin-left: 8px;
              white-space: nowrap;
            ">
              Copy
            </button>
          </div>
        </div>

        <!-- QR Code -->
        <div style="text-align: center; margin-bottom: 24px;">
          <div id="pmt-qr-code" style="
            background: white;
            padding: 16px;
            border-radius: 12px;
            display: inline-block;
            border: 1px solid ${borderColor};
          "></div>
          <p style="font-size: 12px; color: ${mutedColor}; margin-top: 12px;">
            Scan with your crypto wallet
          </p>
        </div>

        <!-- Status -->
        <div id="pmt-status" style="
          background: ${isDark ? '#1e3a8a' : '#dbeafe'};
          border: 1px solid ${isDark ? '#1e40af' : '#93c5fd'};
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        ">
          <div class="pmt-spinner"></div>
          <p style="margin: 12px 0 0 0; font-size: 14px; color: ${isDark ? '#93c5fd' : '#1e40af'};">
            Waiting for payment...
          </p>
        </div>

        <!-- Expiration -->
        <div style="text-align: center; margin-top: 16px;">
          <p style="font-size: 12px; color: ${mutedColor};">
            Expires in <span id="pmt-countdown">5:00</span>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="
        padding: 16px 24px;
        border-top: 1px solid ${borderColor};
        text-align: center;
      ">
        <p style="font-size: 12px; color: ${mutedColor}; margin: 0;">
          Powered by <strong>PMT Gateway</strong>
        </p>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('pmt-close-btn');
    closeBtn?.addEventListener('click', () => this.close());

    // Copy button
    const copyBtn = document.getElementById('pmt-copy-btn');
    copyBtn?.addEventListener('click', () => this.copyAddress());

    // Generate QR code
    this.generateQRCode();

    // Start countdown
    this.startCountdown();
  }

  /**
   * Copy wallet address to clipboard
   */
  private copyAddress(): void {
    if (!this.paymentIntent) return;

    navigator.clipboard.writeText(this.paymentIntent.wallet_address);

    const btn = document.getElementById('pmt-copy-btn');
    if (btn) {
      btn.textContent = '✓ Copied';
      setTimeout(() => {
        btn.textContent = 'Copy';
      }, 2000);
    }
  }

  /**
   * Generate QR code
   */
  private generateQRCode(): void {
    if (!this.paymentIntent) return;

    const container = document.getElementById('pmt-qr-code');
    if (!container) return;

    // Create payment URI
    const paymentUri = `ethereum:${this.paymentIntent.wallet_address}?value=${ethers.parseEther(this.paymentIntent.crypto_amount)}`;

    // Generate QR code using canvas
    const canvas = document.createElement('canvas');
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Simple QR code placeholder (in production, use qrcode library)
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', size / 2, size / 2);
      ctx.fillText('(Install qrcode.js)', size / 2, size / 2 + 20);
    }

    container.appendChild(canvas);
  }

  /**
   * Start countdown timer
   */
  private startCountdown(): void {
    if (!this.paymentIntent) return;

    const expiresAt = new Date(this.paymentIntent.expires_at).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      const countdownEl = document.getElementById('pmt-countdown');
      if (countdownEl) {
        countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }

      if (remaining === 0) {
        this.onExpired();
      }
    };

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  /**
   * Start checking payment status
   */
  private startStatusCheck(): void {
    if (!this.paymentIntent) return;

    this.statusCheckInterval = window.setInterval(async () => {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/payment-intents/${this.paymentIntent!.id}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.merchantId}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const status = data.data.status;

          if (status === 'PROCESSING' || status === 'SUCCEEDED') {
            this.onSuccess(data.data);
          } else if (status === 'FAILED') {
            this.onError(new Error('Payment failed'));
          }
        }
      } catch (error) {
        console.error('Status check failed:', error);
      }
    }, 3000); // Check every 3 seconds
  }

  /**
   * Handle successful payment
   */
  private onSuccess(payment: any): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    const statusEl = document.getElementById('pmt-status');
    if (statusEl) {
      statusEl.style.background = this.config.theme === 'dark' ? '#065f46' : '#d1fae5';
      statusEl.style.borderColor = this.config.theme === 'dark' ? '#059669' : '#6ee7b7';
      statusEl.innerHTML = `
        <div style="font-size: 48px;">✓</div>
        <p style="margin: 12px 0 0 0; font-size: 14px; color: ${this.config.theme === 'dark' ? '#6ee7b7' : '#059669'};">
          Payment received!
        </p>
      `;
    }

    this.config.onSuccess?.(payment);

    // Auto-close after 3 seconds
    setTimeout(() => this.close(), 3000);
  }

  /**
   * Handle payment error
   */
  private onError(error: Error): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    const statusEl = document.getElementById('pmt-status');
    if (statusEl) {
      statusEl.style.background = this.config.theme === 'dark' ? '#7f1d1d' : '#fee2e2';
      statusEl.style.borderColor = this.config.theme === 'dark' ? '#991b1b' : '#fca5a5';
      statusEl.innerHTML = `
        <div style="font-size: 48px;">✕</div>
        <p style="margin: 12px 0 0 0; font-size: 14px; color: ${this.config.theme === 'dark' ? '#fca5a5' : '#991b1b'};">
          Payment failed
        </p>
      `;
    }

    this.config.onError?.(error);
  }

  /**
   * Handle payment expiration
   */
  private onExpired(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    const statusEl = document.getElementById('pmt-status');
    if (statusEl) {
      statusEl.style.background = this.config.theme === 'dark' ? '#7c2d12' : '#fed7aa';
      statusEl.style.borderColor = this.config.theme === 'dark' ? '#9a3412' : '#fdba74';
      statusEl.innerHTML = `
        <div style="font-size: 48px;">⏰</div>
        <p style="margin: 12px 0 0 0; font-size: 14px; color: ${this.config.theme === 'dark' ? '#fdba74' : '#9a3412'};">
          Payment expired
        </p>
      `;
    }

    this.config.onError?.(new Error('Payment expired'));
  }

  /**
   * Close modal
   */
  close(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    const overlay = document.getElementById('pmt-payment-overlay');
    if (overlay) {
      overlay.remove();
    }

    this.modal = null;
    this.config.onClose?.();
  }

  /**
   * Static factory method
   */
  static create(config: PaymentConfig): PMTWidget {
    return new PMTWidget(config);
  }
}

// Export for global usage
if (typeof window !== 'undefined') {
  (window as any).PMTWidget = PMTWidget;
}

export default PMTWidget;
