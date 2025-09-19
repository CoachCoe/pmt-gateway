# PMT Gateway

A web3 payment gateway built on Polkadot that enables instant DOT and DOT stablecoin payments with web2-style integration simplicity. The MVP focuses on core payment processing with familiar developer experience similar to Stripe.

## Features

- **Instant Settlement** - 6-second finality vs. 10+ minutes on other chains
- **Web2 Familiarity** - Stripe-like API design and integration patterns
- **Simple Onboarding** - No crypto knowledge required for merchants
- **Low Friction UX** - One-click wallet connection with multiple wallet support
- **Real-time Monitoring** - Automatic payment confirmation and webhook delivery
- **Price Oracle Integration** - Real-time fiat to DOT conversion

## Tech Stack

- **Backend:** Node.js + TypeScript + Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Blockchain Integration:** @polkadot/api
- **Authentication:** JWT-based with wallet signature verification
- **Queue System:** Bull (Redis-based) for webhook delivery
- **Cache:** Redis for session management and rate limiting

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+
- Polkadot RPC access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pmt-gateway
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## API Endpoints

### Payment Intents

- `POST /api/v1/payment-intents` - Create a payment intent
- `GET /api/v1/payment-intents/:id` - Get payment intent details
- `GET /api/v1/payment-intents` - List payment intents with pagination
- `POST /api/v1/payment-intents/:id/cancel` - Cancel a payment intent

### Wallet Authentication

- `GET /api/v1/wallet/wallets` - Get supported wallets
- `POST /api/v1/wallet/challenge` - Generate authentication challenge
- `POST /api/v1/wallet/verify` - Verify wallet signature
- `GET /api/v1/wallet/status` - Get connection status

### System

- `GET /health` - Health check
- `GET /api/status` - System status

## Example Usage

### Create a Payment Intent

```bash
curl -X POST http://localhost:3000/api/v1/payment-intents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pk_test_your_api_key" \
  -d '{
    "amount": 2500,
    "currency": "usd",
    "crypto_currency": "dot",
    "metadata": {
      "order_id": "order_123",
      "customer_email": "user@example.com"
    }
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "pi_1234567890",
    "amount": 2500,
    "currency": "usd",
    "crypto_amount": "15.75",
    "crypto_currency": "dot",
    "status": "REQUIRES_PAYMENT",
    "expires_at": "2025-09-18T15:30:00Z",
    "metadata": {
      "order_id": "order_123",
      "customer_email": "user@example.com"
    },
    "created_at": "2025-09-18T15:25:00Z"
  }
}
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

### Project Structure

```
src/
├── services/           # Business logic services
├── routes/            # API route handlers
├── middleware/        # Express middleware
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
├── config/            # Configuration
└── index.ts           # Application entry point
```

## Configuration

Key environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `POLKADOT_RPC_ENDPOINTS` - Comma-separated RPC endpoints
- `COINGECKO_API_KEY` - Price oracle API key
- `WEBHOOK_SECRET` - Webhook signature secret

## License

MIT License - see LICENSE file for details