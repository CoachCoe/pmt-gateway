# PMT Gateway API Documentation

## 📋 Overview

The PMT Gateway API provides a Stripe-like interface for Polkadot payments, enabling merchants to accept DOT and stablecoin payments with instant settlement.

**Base URL:** `https://api.pmt-gateway.com`  
**API Version:** `v1`  
**Authentication:** Bearer Token (JWT)

## 🔐 Authentication

### Getting Started

1. **Register a Merchant Account**
2. **Get your API Key** from the dashboard
3. **Include the API Key** in all requests

### API Key Usage

```bash
curl -H "Authorization: Bearer your_api_key_here" \
     https://api.pmt-gateway.com/api/v1/payment-intents
```

## 🚀 Quick Start

### 1. Create a Payment Intent

```javascript
const response = await fetch('https://api.pmt-gateway.com/api/v1/payment-intents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 2500,        // $25.00 in cents
    currency: 'USD',
    merchantId: 'merchant_123',
    metadata: {
      orderId: 'order_456',
      description: 'Premium subscription'
    }
  })
});

const paymentIntent = await response.json();
```

### 2. Get Payment Status

```javascript
const response = await fetch(`https://api.pmt-gateway.com/api/v1/payment-intents/${paymentIntent.id}`, {
  headers: {
    'Authorization': 'Bearer your_api_key_here'
  }
});

const status = await response.json();
```

## 📚 API Reference

### Payment Intents

#### Create Payment Intent

**POST** `/api/v1/payment-intents`

Creates a new payment intent for a specific amount.

**Request Body:**
```json
{
  "amount": 2500,
  "currency": "USD",
  "merchantId": "merchant_123",
  "metadata": {
    "orderId": "order_456",
    "description": "Premium subscription"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pi_1234567890",
    "amount": 2500,
    "currency": "USD",
    "cryptoAmount": "0.1",
    "cryptoCurrency": "DOT",
    "status": "REQUIRES_PAYMENT",
    "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "expiresAt": "2025-09-19T02:00:00.000Z",
    "createdAt": "2025-09-19T01:55:00.000Z",
    "metadata": {
      "orderId": "order_456",
      "description": "Premium subscription"
    }
  },
  "meta": {
    "timestamp": "2025-09-19T01:55:00.000Z",
    "request_id": "req_1234567890"
  }
}
```

#### Get Payment Intent

**GET** `/api/v1/payment-intents/{id}`

Retrieves a specific payment intent by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pi_1234567890",
    "amount": 2500,
    "currency": "USD",
    "cryptoAmount": "0.1",
    "cryptoCurrency": "DOT",
    "status": "SUCCEEDED",
    "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "transactionHash": "0x1234567890abcdef...",
    "expiresAt": "2025-09-19T02:00:00.000Z",
    "createdAt": "2025-09-19T01:55:00.000Z",
    "updatedAt": "2025-09-19T01:56:30.000Z"
  }
}
```

#### List Payment Intents

**GET** `/api/v1/payment-intents`

Retrieves a list of payment intents with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status
- `currency` (optional): Filter by currency
- `search` (optional): Search by ID or address

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "pi_1234567890",
        "amount": 2500,
        "currency": "USD",
        "status": "SUCCEEDED",
        "createdAt": "2025-09-19T01:55:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### Wallet Authentication

#### Get Supported Wallets

**GET** `/api/v1/wallet/wallets`

Returns a list of supported wallet types.

**Response:**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": "polkadot-js",
        "name": "Polkadot.js",
        "icon": "polkadot-js",
        "downloadUrl": "https://polkadot.js.org/extension/"
      },
      {
        "id": "talisman",
        "name": "Talisman",
        "icon": "talisman",
        "downloadUrl": "https://talisman.xyz/"
      }
    ]
  }
}
```

#### Get Supported Chains

**GET** `/api/v1/wallet/chains`

Returns a list of supported blockchain networks.

**Response:**
```json
{
  "success": true,
  "data": {
    "chains": [
      {
        "id": "polkadot",
        "name": "Polkadot",
        "rpcUrl": "wss://rpc.polkadot.io",
        "ss58Format": 0,
        "decimals": 10,
        "symbol": "DOT"
      },
      {
        "id": "kusama",
        "name": "Kusama",
        "rpcUrl": "wss://kusama-rpc.polkadot.io",
        "ss58Format": 2,
        "decimals": 12,
        "symbol": "KSM"
      }
    ]
  }
}
```

#### Generate Authentication Challenge

**POST** `/api/v1/wallet/challenge`

Generates a challenge for wallet authentication.

**Request Body:**
```json
{
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "chainId": "polkadot"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "challenge": {
      "message": "polkadot-auth.localhost wants you to sign in with your Polkadot account:\n5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY\n\nSign this message to authenticate with PMT Gateway\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: polkadot\nNonce: abc123\nIssued At: 2025-09-19T01:55:00.000Z\nExpiration Time: 2025-09-19T02:00:00.000Z\nRequest ID: req_1234567890\nResources:\n- http://localhost:3000/credentials\n- http://localhost:3000/profile",
      "nonce": "abc123",
      "timestamp": 1758245700000
    }
  }
}
```

#### Verify Wallet Authentication

**POST** `/api/v1/wallet/verify`

Verifies a wallet signature and creates an authentication session.

**Request Body:**
```json
{
  "signature": "0x1234567890abcdef...",
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "challenge": {
    "message": "polkadot-auth.localhost wants you to sign in...",
    "nonce": "abc123",
    "timestamp": 1758245700000
  },
  "merchantId": "merchant_123",
  "chainId": "polkadot"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "merchantId": "merchant_123",
    "sessionId": "sess_1234567890",
    "walletType": "polkadot-js"
  }
}
```

### Webhooks

#### Webhook Events

Webhooks are sent to your configured endpoint when payment events occur.

**Webhook URL:** Set in your merchant dashboard  
**Signature:** HMAC-SHA256 of the payload using your webhook secret

**Event Types:**
- `payment.created` - Payment intent created
- `payment.requires_payment` - Payment requires user action
- `payment.processing` - Payment is being processed
- `payment.succeeded` - Payment completed successfully
- `payment.failed` - Payment failed
- `payment.canceled` - Payment was canceled
- `payment.expired` - Payment expired

**Webhook Payload:**
```json
{
  "id": "evt_1234567890",
  "type": "payment.succeeded",
  "data": {
    "id": "pi_1234567890",
    "amount": 2500,
    "currency": "USD",
    "cryptoAmount": "0.1",
    "cryptoCurrency": "DOT",
    "status": "SUCCEEDED",
    "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "transactionHash": "0x1234567890abcdef...",
    "createdAt": "2025-09-19T01:55:00.000Z",
    "updatedAt": "2025-09-19T01:56:30.000Z"
  },
  "created": 1758245790000
}
```

**Signature Verification:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

## 📊 Status Codes

### Payment Intent Status

| Status | Description |
|--------|-------------|
| `REQUIRES_PAYMENT` | Payment intent created, waiting for user to send payment |
| `PROCESSING` | Payment detected, being processed |
| `SUCCEEDED` | Payment completed successfully |
| `FAILED` | Payment failed |
| `CANCELED` | Payment was canceled |
| `EXPIRED` | Payment expired |

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

## 🔧 Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "amount",
      "reason": "Must be a positive integer"
    }
  },
  "meta": {
    "timestamp": "2025-09-19T01:55:00.000Z",
    "request_id": "req_1234567890"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | Missing or invalid authentication |
| `PAYMENT_NOT_FOUND` | Payment intent not found |
| `INSUFFICIENT_FUNDS` | Insufficient balance for payment |
| `PAYMENT_EXPIRED` | Payment intent has expired |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Internal server error |

## 🧪 Testing

### Test Mode

Use the test environment for development and testing:

**Base URL:** `https://test-api.pmt-gateway.com`

### Test Data

- **Test DOT Address:** `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`
- **Test Amounts:** Use small amounts for testing
- **Test Webhooks:** Use ngrok or similar for local testing

### Example Test Flow

```javascript
// 1. Create payment intent
const paymentIntent = await createPaymentIntent({
  amount: 100, // $1.00
  currency: 'USD',
  merchantId: 'test_merchant'
});

// 2. Check status
const status = await getPaymentIntent(paymentIntent.id);

// 3. Simulate payment (in test mode)
await simulatePayment(paymentIntent.id, {
  transactionHash: '0x1234567890abcdef...',
  amount: '0.01' // 0.01 DOT
});
```

## 📱 SDKs

### JavaScript SDK

```bash
npm install @pmt-gateway/sdk
```

```javascript
import { PMTGateway } from '@pmt-gateway/sdk';

const gateway = new PMTGateway({
  apiKey: 'your_api_key_here',
  environment: 'production' // or 'test'
});

// Create payment intent
const payment = await gateway.paymentIntents.create({
  amount: 2500,
  currency: 'USD',
  merchantId: 'merchant_123'
});

// Check status
const status = await gateway.paymentIntents.retrieve(payment.id);
```

### React SDK

```bash
npm install @pmt-gateway/sdk-react
```

```jsx
import { PaymentWidget } from '@pmt-gateway/sdk-react';

function Checkout() {
  return (
    <PaymentWidget
      apiKey="your_api_key_here"
      amount={2500}
      currency="USD"
      onSuccess={(payment) => console.log('Payment succeeded:', payment)}
      onError={(error) => console.error('Payment failed:', error)}
    />
  );
}
```

## 🔒 Security

### Best Practices

1. **API Key Security**
   - Store API keys securely
   - Use environment variables
   - Rotate keys regularly
   - Never expose keys in client-side code

2. **Webhook Security**
   - Verify webhook signatures
   - Use HTTPS endpoints
   - Implement idempotency
   - Handle duplicate events

3. **Data Protection**
   - Encrypt sensitive data
   - Use secure connections
   - Implement proper logging
   - Regular security audits

### Rate Limiting

- **Default:** 100 requests per 15 minutes
- **Burst:** 10 requests per second
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 📞 Support

### Getting Help

- **Documentation:** [https://docs.pmt-gateway.com](https://docs.pmt-gateway.com)
- **Status Page:** [https://status.pmt-gateway.com](https://status.pmt-gateway.com)
- **Support Email:** support@pmt-gateway.com
- **Discord:** [https://discord.gg/pmt-gateway](https://discord.gg/pmt-gateway)

### API Status

Check our API status at [https://status.pmt-gateway.com](https://status.pmt-gateway.com) for real-time updates on service availability and performance.

---

**Last Updated:** September 19, 2025  
**API Version:** 1.0.0
