# 🚀 PMT Gateway - Deployment Guide

Complete guide to deploy your Kusama EVM payment gateway from development to production.

---

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Kusama testnet wallet with funds ([Get testnet KSM](https://faucet.polkadot.io/kusama))
- MetaMask or compatible EVM wallet

---

## 🔧 Step 1: Environment Configuration

### 1.1 Copy Environment Template

```bash
cp .env.example .env
```

### 1.2 Configure Database

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/pmt_gateway"
```

### 1.3 Configure Escrow Smart Contract

```bash
# .env

# Enable escrow features
ESCROW_ENABLED=true

# Will be filled after deployment (Step 2)
ESCROW_CONTRACT_ADDRESS=

# Kusama testnet RPC
KUSAMA_RPC_URL=https://kusama-testnet-rpc.polkadot.io

# Platform wallet (same as used for contract deployment)
PLATFORM_PRIVATE_KEY=0x...
PLATFORM_ADDRESS=0x...

# Generate a random 32-byte hex key for encryption
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### 1.4 Other Required Configuration

```bash
# API Keys
JWT_SECRET=$(openssl rand -hex 32)
API_KEY_SALT=$(openssl rand -hex 16)

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Webhook
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_TIMEOUT=10000

# Payment Settings
PAYMENT_EXPIRATION_MINUTES=5
```

---

## 🔐 Step 2: Deploy Smart Contract to Kusama Testnet

### 2.1 Install Contract Dependencies

```bash
cd contracts
npm install
```

### 2.2 Configure Contract Deployment

```bash
# contracts/.env
PRIVATE_KEY=0x...  # Your deployment wallet private key
PLATFORM_FEE_BPS=250  # 2.5% platform fee
PLATFORM_ADDRESS=0x...  # Where platform fees go
```

### 2.3 Compile Contract

```bash
npm run compile
```

### 2.4 Run Tests (Recommended)

```bash
npm test
```

Expected output: `✓ 55 passing (2s)`

### 2.5 Deploy to Kusama Testnet

```bash
npm run deploy:testnet
```

**Save the contract address!** You'll see output like:

```
PMTEscrow deployed to: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
Platform fee: 250 bps (2.5%)
Platform address: 0x...
```

### 2.6 Update Backend Environment

```bash
# Back to project root
cd ..

# Update .env with deployed contract address
echo "ESCROW_CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc454e4438f44e" >> .env
```

---

## 💾 Step 3: Database Setup

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Run Migrations

```bash
npx prisma migrate deploy
```

This adds all escrow fields:
- `Merchant.walletAddress`, `platformFeeBps`, `payoutSchedule`, `minPayoutAmount`
- `PaymentIntent.escrowPaymentId`, `escrowTxHash`, `releaseMethod`, `releasedAt`
- `Payout` table
- Required indexes

### 3.3 Generate Prisma Client

```bash
npx prisma generate
```

### 3.4 Verify Database

```bash
npx prisma studio
```

Opens browser UI to view database schema.

---

## 🏗️ Step 4: Create Test Merchant

### 4.1 Create Merchant Registration Script

```bash
# scripts/create-merchant.ts
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const apiKey = `pk_test_${crypto.randomBytes(24).toString('hex')}`;
  const apiKeyHash = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');

  const merchant = await prisma.merchant.create({
    data: {
      name: 'Test Merchant',
      email: 'merchant@example.com',
      apiKeyHash,
      webhookUrl: 'https://webhook.site/your-unique-url', // Get from webhook.site
      walletAddress: '0x...', // Your merchant payout wallet
      platformFeeBps: 250, // 2.5%
      payoutSchedule: 'WEEKLY',
      minPayoutAmount: '10.0',
    },
  });

  console.log('Merchant created!');
  console.log('ID:', merchant.id);
  console.log('API Key:', apiKey); // SAVE THIS!
  console.log('Wallet:', merchant.walletAddress);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
```

### 4.2 Run Script

```bash
npx tsx scripts/create-merchant.ts
```

**Save the API key!** You'll use it for testing.

---

## 🚀 Step 5: Start the Gateway

### 5.1 Build Application

```bash
npm run build
```

### 5.2 Start in Development Mode

```bash
npm run dev
```

You should see:

```
[INFO] Connected to database
[INFO] Polkadot service initialized
[INFO] Blockchain monitoring service started
[INFO] Escrow event monitoring started successfully
[INFO] Escrow cron service started
[INFO] Server started on port 3000
```

---

## 🧪 Step 6: Test End-to-End Payment Flow

### 6.1 Create Payment Intent

```bash
curl -X POST http://localhost:3000/api/v1/payment-intents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "usd",
    "crypto_currency": "dot",
    "metadata": {
      "order_id": "test-123"
    }
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "amount": 10000,
    "currency": "usd",
    "crypto_amount": "50.123456789012345678",
    "crypto_currency": "dot",
    "status": "REQUIRES_PAYMENT",
    "wallet_address": "0x742d35...", // Escrow contract address
    "expires_at": "2025-10-04T12:05:00.000Z",
    "created_at": "2025-10-04T12:00:00.000Z"
  }
}
```

### 6.2 Check Logs for Escrow Creation

```
[INFO] Escrow payment created on blockchain
  escrowPaymentId: 1
  escrowTxHash: 0xabc...
  merchantAmount: 48.8709677419...
  platformFee: 1.2525806451...
```

### 6.3 Simulate Buyer Payment (Using MetaMask)

**Option A: Use Contract Interaction Script**

```bash
# contracts/scripts/interact.ts
cd contracts
npx hardhat run scripts/interact.ts --network kusama-testnet
```

**Option B: Manual Transfer via MetaMask**

1. Open MetaMask
2. Send `crypto_amount` DOT to `wallet_address` (escrow contract)
3. Wait for transaction confirmation

### 6.4 Monitor Event Detection

Backend logs should show:

```
[INFO] Escrow PaymentCreated event detected
  paymentId: 1
  buyer: 0x...
  merchant: 0x...
  amount: 50.123456789012345678

[INFO] Payment intent updated from escrow event
  paymentIntentId: clxxx...
  escrowPaymentId: 1
```

### 6.5 Wait for Auto-Release (or Manual Confirmation)

**Option A: Wait 5 minutes** for auto-release cron job:

```
[INFO] Found 1 expired payments for auto-release
[INFO] Auto-releasing expired payment
[INFO] Escrow PaymentReleased event detected
[INFO] Payment released and marked as succeeded
```

**Option B: Manually confirm payment:**

```bash
curl -X POST http://localhost:3000/api/v1/payment-intents/clxxx.../confirm \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 6.6 Verify Payment Status

```bash
curl http://localhost:3000/api/v1/payment-intents/clxxx... \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Should show `"status": "SUCCEEDED"`

### 6.7 Check Webhook Delivery

Visit your webhook.site URL to see webhook events:
- `payment.processing` (when buyer sends payment)
- `payment.succeeded` (when released to merchant)

---

## 📊 Step 7: Monitor System Health

### 7.1 Health Check

```bash
curl http://localhost:3000/health
```

### 7.2 System Status

```bash
curl http://localhost:3000/api/status
```

Returns:

```json
{
  "success": true,
  "data": {
    "polkadot": { "connected": true },
    "price_oracle": { "healthy": true },
    "database": { "connected": true }
  }
}
```

### 7.3 Monitor Logs

```bash
# In development
npm run dev

# In production
pm2 logs pmt-gateway
```

---

## 🔄 Step 8: Test Other Flows

### 8.1 Test Refund Flow

```bash
# Create payment intent and get buyer to send payment
# Then refund before expiration:

curl -X POST http://localhost:3000/api/v1/payment-intents/clxxx.../refund \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Buyer should receive funds back to their wallet.

### 8.2 Test Payment Cancellation

```bash
# Cancel payment before buyer sends funds:

curl -X POST http://localhost:3000/api/v1/payment-intents/clxxx.../cancel \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 8.3 Test Batch Payouts

```bash
# Create multiple successful payments
# Wait for payout schedule (WEEKLY by default)
# Check payout records:

curl http://localhost:3000/api/v1/payment-intents \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🚢 Step 9: Production Deployment

### 9.1 Deploy Contract to Mainnet

```bash
cd contracts

# Update .env to use mainnet RPC
KUSAMA_RPC_URL=https://kusama-rpc.polkadot.io

# Deploy
npm run deploy:mainnet
```

### 9.2 Update Production Environment

```bash
# Production .env
NODE_ENV=production
ESCROW_CONTRACT_ADDRESS=0x...  # Mainnet contract
KUSAMA_RPC_URL=https://kusama-rpc.polkadot.io
DATABASE_URL=postgresql://...  # Production DB
```

### 9.3 Run Production Migrations

```bash
npx prisma migrate deploy
```

### 9.4 Start with Process Manager

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "pmt-gateway" -- start

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

### 9.5 Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name api.yourgateway.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 9.6 Enable HTTPS with Let's Encrypt

```bash
sudo certbot --nginx -d api.yourgateway.com
```

---

## 🔍 Troubleshooting

### Contract Deployment Fails

**Problem:** "Insufficient funds"
**Solution:** Get testnet funds from https://faucet.polkadot.io/kusama

**Problem:** "Network error"
**Solution:** Check RPC URL is correct and accessible

### Database Connection Fails

**Problem:** "Can't reach database server"
**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql $DATABASE_URL
```

### Blockchain Monitoring Not Working

**Problem:** "Polkadot API not ready"
**Solution:**
```bash
# Check RPC URL in .env
# Try alternative RPC: wss://kusama-rpc.polkadot.io
```

### Events Not Detected

**Problem:** "Payment created but status not updating"
**Solution:**
- Check escrow service initialized: Look for `"Escrow event monitoring started"`
- Verify contract address matches deployed contract
- Check transaction was sent to correct address (escrow contract, not merchant)

### Auto-Release Not Working

**Problem:** "Expired payments not releasing"
**Solution:**
- Check cron service started: `"Escrow cron service started"`
- Verify payment status is `PROCESSING` (payment received)
- Check `releaseMethod` is `AUTO`
- Look for errors in logs

---

## 📚 API Documentation

### Create Payment Intent

```
POST /api/v1/payment-intents
Authorization: Bearer YOUR_API_KEY

{
  "amount": 10000,  // Cents
  "currency": "usd",
  "crypto_currency": "dot",
  "metadata": {}
}
```

### Get Payment Intent

```
GET /api/v1/payment-intents/:id
Authorization: Bearer YOUR_API_KEY
```

### Confirm Payment (Manual Release)

```
POST /api/v1/payment-intents/:id/confirm
Authorization: Bearer YOUR_API_KEY
```

### Refund Payment

```
POST /api/v1/payment-intents/:id/refund
Authorization: Bearer YOUR_API_KEY
```

### Cancel Payment Intent

```
POST /api/v1/payment-intents/:id/cancel
Authorization: Bearer YOUR_API_KEY
```

---

## ✅ Production Checklist

- [ ] Smart contract deployed to mainnet
- [ ] Contract verified on block explorer
- [ ] Database backups configured
- [ ] SSL/HTTPS enabled
- [ ] Environment variables secured (use secrets manager)
- [ ] Monitoring & alerting setup (Sentry, DataDog, etc.)
- [ ] Log aggregation configured
- [ ] Rate limiting tested
- [ ] Webhook retries working
- [ ] Cron jobs running on schedule
- [ ] Disaster recovery plan documented
- [ ] Platform wallet funded with gas
- [ ] Test payments completed successfully

---

## 🎯 Next Steps After Deployment

1. **Merchant Dashboard** - Build UI for merchants to view payments and payouts
2. **Embeddable Widget** - Create checkout widget for marketplaces
3. **Multi-Currency Support** - Add more fiat currencies
4. **Analytics** - Payment volume, success rates, merchant insights
5. **Advanced Features** - Recurring payments, subscriptions, invoicing

---

## 📞 Support

- Smart Contract Issues: Review `contracts/README.md`
- Integration Questions: See `ESCROW_SETUP_GUIDE.md`
- API Reference: Check `API_DOCUMENTATION.md`

---

**You're all set! 🎉**

Your Kusama EVM payment gateway is now live and processing escrow payments!
