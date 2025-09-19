# PMT Gateway JavaScript SDK

A modern JavaScript SDK for integrating Polkadot payments into your web applications. Built with TypeScript and supports both vanilla JavaScript and React.

## Features

- 🚀 **Easy Integration** - Simple API for creating payment intents and widgets
- 💳 **Multiple Wallets** - Support for Polkadot.js, Talisman, SubWallet, and Nova Wallet
- ⚡ **Real-time Updates** - Live payment status updates and webhooks
- 🎨 **Customizable UI** - Themed payment widgets that match your brand
- 📱 **React Support** - React components and hooks included
- 🔒 **Type Safe** - Full TypeScript support with comprehensive types
- 🌐 **Universal** - Works in browsers and Node.js environments

## Installation

```bash
npm install @pmt-gateway/sdk
```

## Quick Start

### 1. Initialize the SDK

```javascript
import { PMTGateway } from '@pmt-gateway/sdk';

const pmt = PMTGateway.create({
  publicKey: 'pk_test_your_api_key_here',
  environment: 'test', // or 'live'
  debug: true
});
```

### 2. Create a Payment Intent

```javascript
const paymentIntent = await pmt.createPaymentIntent({
  amount: 2500, // $25.00 in cents
  currency: 'usd',
  crypto_currency: 'dot',
  metadata: {
    order_id: 'order_123',
    customer_email: 'customer@example.com'
  }
});
```

### 3. Display Payment Widget

```javascript
const widget = pmt.createPaymentWidget({
  container: '#payment-widget',
  paymentIntent: paymentIntent,
  onSuccess: (event) => {
    console.log('Payment successful:', event);
  },
  onError: (error) => {
    console.error('Payment failed:', error);
  },
  theme: {
    primaryColor: '#6366f1',
    borderRadius: '8px'
  }
});
```

## React Integration

### Using the React Component

```jsx
import React from 'react';
import { ReactPaymentWidget } from '@pmt-gateway/sdk';

function PaymentPage() {
  const handleSuccess = (event) => {
    console.log('Payment successful:', event);
  };

  const handleError = (error) => {
    console.error('Payment failed:', error);
  };

  return (
    <ReactPaymentWidget
      paymentIntent={paymentIntent}
      onSuccess={handleSuccess}
      onError={handleError}
      theme={{
        primaryColor: '#6366f1',
        borderRadius: '8px'
      }}
    />
  );
}
```

### Using the Hook

```jsx
import React from 'react';
import { usePMTGateway } from '@pmt-gateway/sdk';

function PaymentForm() {
  const { createPaymentIntent, isLoading, error } = usePMTGateway({
    publicKey: 'pk_test_your_api_key_here',
    environment: 'test'
  });

  const handleSubmit = async (formData) => {
    try {
      const paymentIntent = await createPaymentIntent({
        amount: formData.amount,
        currency: 'usd',
        crypto_currency: 'dot'
      });
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
    </form>
  );
}
```

## API Reference

### PMTGateway

The main SDK class for managing payments and wallet connections.

#### Methods

- `createPaymentIntent(request)` - Create a new payment intent
- `getPaymentIntent(id)` - Retrieve a payment intent by ID
- `cancelPaymentIntent(id)` - Cancel a payment intent
- `getSupportedWallets()` - Get list of supported wallets
- `connectWallet(walletId)` - Connect to a specific wallet
- `authenticateWallet(merchantId)` - Authenticate wallet for merchant
- `createPaymentWidget(config)` - Create a payment widget

### PaymentWidget

A customizable payment widget for collecting payments.

#### Configuration

```typescript
interface PaymentWidgetConfig {
  container: string | HTMLElement;
  paymentIntent: string | PaymentIntent;
  onSuccess?: (event: PaymentEvent) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  theme?: PaymentWidgetTheme;
  locale?: string;
}
```

#### Theme Options

```typescript
interface PaymentWidgetTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}
```

## Supported Wallets

- **Polkadot.js** - Browser extension
- **Talisman** - Browser extension
- **SubWallet** - Browser extension
- **Nova Wallet** - Mobile app

## Error Handling

The SDK provides comprehensive error handling with specific error codes:

```javascript
try {
  const paymentIntent = await pmt.createPaymentIntent(request);
} catch (error) {
  if (error.code === 'PAYMENT_INTENT_CREATION_FAILED') {
    // Handle specific error
  }
  console.error('Error:', error.message);
}
```

## Development

### Building the SDK

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please contact us at support@pmtgateway.com or visit our documentation at https://docs.pmtgateway.com.
