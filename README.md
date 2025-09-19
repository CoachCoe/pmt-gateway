# PMT Gateway

A production-ready web3 payment gateway built on Polkadot that enables instant DOT and stablecoin payments with web2-style integration simplicity. Built with enterprise-grade features including real-time blockchain monitoring, comprehensive API documentation, and production deployment guides.

## ✨ Features

- **🚀 Instant Settlement** - 6-second finality vs. 10+ minutes on other chains
- **💳 Web2 Familiarity** - Stripe-like API design and integration patterns
- **🔐 Simple Onboarding** - No crypto knowledge required for merchants
- **⚡ Low Friction UX** - One-click wallet connection with multiple wallet support
- **📊 Real-time Monitoring** - Automatic payment confirmation and webhook delivery
- **💰 Price Oracle Integration** - Real-time fiat to DOT conversion
- **🛡️ Production Ready** - Comprehensive security, monitoring, and deployment
- **📚 Complete Documentation** - Full API docs and deployment guides
- **🔧 Developer Tools** - SDKs, testing tools, and merchant dashboard

## 🏗️ Architecture

### Backend Services
- **API Gateway** - Express.js with TypeScript
- **Database** - PostgreSQL with Prisma ORM
- **Blockchain** - Real Polkadot RPC integration
- **Authentication** - JWT + Polkadot wallet signatures
- **Queue System** - Bull (Redis-based) for webhook delivery
- **Cache** - Redis for sessions and rate limiting
- **Monitoring** - Real-time blockchain transaction monitoring

### Frontend Applications
- **Merchant Dashboard** - React-based admin interface
- **JavaScript SDK** - Easy integration for developers
- **React Components** - Drop-in payment widgets

## 🚀 Quick Start

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
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001` and the dashboard at `http://localhost:3000`

## 📚 Documentation

- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Polkadot SSO Integration](POLKADOT_SSO_INTEGRATION.md)** - SSO system details

## 🔧 Tech Stack

- **Backend:** Node.js + TypeScript + Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Blockchain:** @polkadot/api with real RPC integration
- **Authentication:** JWT + Polkadot wallet signatures
- **Queue System:** Bull (Redis-based) for webhook delivery
- **Cache:** Redis for session management and rate limiting
- **Frontend:** React + TypeScript + Vite
- **UI Components:** Tailwind CSS + Headless UI

## 🛠️ Development

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
pmt-gateway/
├── src/                    # Backend source code
│   ├── services/          # Business logic services
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   ├── config/            # Configuration
│   └── index.ts           # Application entry point
├── frontend/
│   ├── dashboard/         # Merchant dashboard (React)
│   └── sdk/              # JavaScript SDK
├── prisma/               # Database schema and migrations
├── docs/                 # Documentation
└── tests/                # Test files
```

## 🔧 Configuration

### Environment Variables

See [env.production.example](env.production.example) for all available configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `POLKADOT_RPC_ENDPOINTS` - Comma-separated RPC endpoints
- `COINGECKO_API_KEY` - Price oracle API key
- `WEBHOOK_SECRET` - Webhook signature secret

## 🧪 Testing

### Test the API

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test payment intent creation
curl -X POST http://localhost:3001/api/v1/payment-intents \
  -H "Content-Type: application/json" \
  -d '{"amount": 2500, "currency": "USD", "merchantId": "test_merchant"}'
```

### Test the Dashboard

Visit `http://localhost:3000` to access the merchant dashboard.

## 🚀 Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production deployment instructions including:
- Environment setup
- Database configuration
- Process management with PM2
- Nginx configuration
- SSL certificates
- Monitoring setup

## 📖 API Reference

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete API documentation including:
- Authentication
- Payment Intents
- Wallet Integration
- Webhooks
- Error Handling
- SDKs

## License

MIT License - see LICENSE file for details