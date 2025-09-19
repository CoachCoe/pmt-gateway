// Main SDK exports
export { PMTGateway } from './core/pmt-gateway';
export { PaymentWidget } from './components/payment-widget';
export { APIClient } from './core/api-client';
export { WalletAuthService } from './core/wallet-auth';

// Type exports
export type {
  PMTGatewayConfig,
  PaymentIntent,
  PaymentStatus,
  CreatePaymentIntentRequest,
  WalletConnection,
  WalletAuthChallenge,
  SupportedWallet,
  PaymentEvent,
  PaymentEventHandler,
  PaymentWidgetConfig,
  PaymentWidgetTheme,
  ApiResponse,
  WidgetState,
} from './types';

// Error exports
export { PMTGatewayError } from './types';

// React components will be available in a separate package
// @pmt-gateway/sdk-react
