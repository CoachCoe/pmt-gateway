# 🔒 PMT Gateway Escrow Smart Contract Setup Guide

Complete guide to deploying and integrating the PMTEscrow smart contract with your payment gateway.

---

## 📋 **Prerequisites**

Before you begin, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Access to Kusama testnet funds ([faucet](https://faucet.polkadot.io/kusama))
- ✅ PostgreSQL and Redis running
- ✅ Basic understanding of Ethereum/EVM smart contracts

---

## 🚀 **Part 1: Deploy Smart Contract**

### **Step 1: Install Contract Dependencies**

```bash
cd contracts
npm install
```

### **Step 2: Configure Environment**

Create `.env` file in `contracts/` directory:

```bash
cp .env.example .env
```

Edit `contracts/.env`:

```bash
# Get test funds from https://faucet.polkadot.io/kusama
PRIVATE_KEY=your_private_key_here

# Kusama testnet RPC (update with actual URL when available)
KUSAMA_TESTNET_RPC=https://kusama-testnet-rpc.polkadot.io

# Platform configuration
PLATFORM_FEE_BPS=250              # 2.5% fee
PLATFORM_ADDRESS=0x...            # Your address to receive fees
```

### **Step 3: Compile Contract**

```bash
npm run compile
```

**Expected output:**
```
Compiled 1 Solidity file successfully
```

### **Step 4: Run Tests**

```bash
npm test
```

**Expected output:**
```
  PMTEscrow
    ✓ Should create payment (195ms)
    ✓ Should release payment (124ms)
    ✓ Should refund payment (118ms)
    ...

  55 passing (2s)
```

### **Step 5: Deploy to Testnet**

```bash
npm run deploy:testnet
```

**Expected output:**
```
Deploying PMTEscrow contract with account: 0x1234...
Account balance: 10.0 KSM

✅ PMTEscrow deployed to: 0xABCDEF1234567890...

📋 Deployment Info:
{
  "contractAddress": "0xABCDEF1234567890...",
  "platformFeeBps": "250",
  "owner": "0x1234..."
}

💾 Deployment info saved to: deployments/kusama-testnet-1234567890.json
```

**🎯 Save the contract address!** You'll need it for backend integration.

---

## 🔧 **Part 2: Backend Integration**

### **Step 1: Install Dependencies**

In the main project directory:

```bash
npm install ethers@^6.10.0
```

### **Step 2: Configure Environment**

Edit `.env` in project root:

```bash
# Enable escrow functionality
ESCROW_ENABLED=true

# Contract address from deployment
ESCROW_CONTRACT_ADDRESS=0xABCDEF1234567890...  # FROM STEP 5 ABOVE!

# Kusama RPC URL
KUSAMA_RPC_URL=https://kusama-testnet-rpc.polkadot.io

# Platform wallet (same as deployment wallet)
PLATFORM_PRIVATE_KEY=0x...

# Platform address (receives fees)
PLATFORM_ADDRESS=0x...

# Encryption key for Redis (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_32_byte_hex_key_here
```

### **Step 3: Update Database Schema**

Add escrow fields to Prisma schema:

```bash
npx prisma migrate dev --name add_escrow_fields
```

The migration is already included in `prisma/schema.prisma`:

```prisma
model PaymentIntent {
  // ... existing fields ...
  escrowPaymentId Int?     // Blockchain payment ID
  escrowTxHash    String?  // Transaction hash
  releaseMethod   ReleaseMethod @default(AUTO)
  releasedAt      DateTime?
}
```

### **Step 4: Initialize Escrow Service**

Update `src/index.ts` to initialize escrow:

```typescript
import { escrowService } from '@/services/escrow.service';

// In Application.start():
if (config.escrowEnabled) {
  await escrowService.initialize();
  logger.info('Escrow service initialized');
}
```

### **Step 5: Test Integration**

Create a test script `scripts/test-escrow.ts`:

```typescript
import { escrowService } from '../src/services/escrow.service';

async function main() {
  await escrowService.initialize();

  console.log('Creating test escrow payment...');

  const result = await escrowService.createEscrowPayment(
    '0xMERCHANT_ADDRESS',  // Replace with test merchant address
    '0.1',                 // 0.1 DOT
    24,                    // 24 hours
    'test-payment-123'
  );

  console.log('Escrow payment created!');
  console.log('Payment ID:', result.paymentId);
  console.log('Transaction Hash:', result.txHash);
  console.log('Platform Fee:', result.platformFee);
  console.log('Merchant Amount:', result.merchantAmount);

  // Get payment details
  const payment = await escrowService.getPayment(result.paymentId);
  console.log('Payment details:', payment);

  await escrowService.disconnect();
}

main().catch(console.error);
```

Run it:

```bash
npx tsx scripts/test-escrow.ts
```

---

## 💳 **Part 3: Payment Flow Integration**

### **Update Payment Service**

Modify `src/services/payment.service.ts` to use escrow:

```typescript
import { escrowService } from './escrow.service';
import { config } from '@/config';

public async createPaymentIntent(
  input: CreatePaymentIntentRequest,
  merchantId: string
): Promise<PaymentIntentResponse> {
  // ... existing validation ...

  let escrowPaymentId: number | null = null;
  let escrowTxHash: string | null = null;

  // Get merchant wallet address
  const merchant = await this.prisma.merchant.findUnique({
    where: { id: merchantId }
  });

  if (!merchant?.walletAddress) {
    throw new ValidationError('Merchant wallet address not configured');
  }

  // Create escrow payment if enabled
  if (config.escrowEnabled) {
    const escrow = await escrowService.createEscrowPayment(
      merchant.walletAddress,
      formatDOTAmount(cryptoAmount),
      config.paymentExpirationMinutes / 60, // Convert minutes to hours
      input.metadata?.orderId || `pi_${Date.now()}`
    );

    escrowPaymentId = escrow.paymentId;
    escrowTxHash = escrow.txHash;

    logger.info('Escrow payment created', {
      escrowPaymentId,
      escrowTxHash
    });
  }

  // Create payment intent in database
  const paymentIntent = await this.prisma.paymentIntent.create({
    data: {
      // ... existing fields ...
      escrowPaymentId,
      escrowTxHash,
      releaseMethod: 'AUTO',
    },
  });

  return this.formatPaymentIntentResponse(paymentIntent);
}
```

### **Add Release Endpoint**

Create `src/routes/escrow.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { escrowService } from '@/services/escrow.service';
import { AuthMiddleware } from '@/middleware/auth.middleware';

export class EscrowRoutes {
  private router: Router;

  constructor(private authMiddleware: AuthMiddleware) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Buyer confirms delivery
    this.router.post(
      '/payments/:id/confirm',
      this.authMiddleware.authenticateApiKey,
      this.confirmDelivery.bind(this)
    );

    // Merchant refunds payment
    this.router.post(
      '/payments/:id/refund',
      this.authMiddleware.authenticateApiKey,
      this.refundPayment.bind(this)
    );
  }

  private async confirmDelivery(req: Request, res: Response): Promise<void> {
    const paymentIntentId = req.params.id;

    const payment = await prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId }
    });

    if (!payment?.escrowPaymentId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Payment not in escrow' }
      });
    }

    // Release from escrow
    const txHash = await escrowService.releasePayment(payment.escrowPaymentId);

    // Update database
    await prisma.paymentIntent.update({
      where: { id: paymentIntentId },
      data: {
        status: 'SUCCEEDED',
        releasedAt: new Date(),
        releaseMethod: 'MANUAL'
      }
    });

    res.json({
      success: true,
      data: { txHash }
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
```

---

## 🤖 **Part 4: Auto-Release Cron Job**

Create `src/jobs/auto-release.job.ts`:

```typescript
import cron from 'node-cron';
import { PrismaClient, PaymentStatus } from '@prisma/client';
import { escrowService } from '@/services/escrow.service';
import logger from '@/utils/logger';

const prisma = new PrismaClient();

export const autoReleaseJob = {
  start: () => {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      try {
        logger.info('Running auto-release job');

        // Find expired payments pending release
        const expiredPayments = await prisma.paymentIntent.findMany({
          where: {
            status: PaymentStatus.PROCESSING,
            releaseMethod: 'AUTO',
            expiresAt: { lt: new Date() },
            escrowPaymentId: { not: null },
            releasedAt: null,
          },
          take: 50, // Process 50 at a time
        });

        if (expiredPayments.length === 0) {
          logger.debug('No payments to auto-release');
          return;
        }

        logger.info(`Auto-releasing ${expiredPayments.length} payments`);

        // Batch release for gas efficiency
        const paymentIds = expiredPayments.map(p => p.escrowPaymentId!);
        const txHash = await escrowService.batchReleaseExpired(paymentIds);

        // Update all as succeeded
        await prisma.paymentIntent.updateMany({
          where: {
            escrowPaymentId: { in: paymentIds }
          },
          data: {
            status: PaymentStatus.SUCCEEDED,
            releasedAt: new Date()
          }
        });

        logger.info(`Auto-released ${expiredPayments.length} payments`, { txHash });

      } catch (error) {
        logger.error('Auto-release job failed:', error);
      }
    });

    logger.info('Auto-release job started');
  },

  stop: () => {
    logger.info('Auto-release job stopped');
  }
};
```

Add to `src/index.ts`:

```typescript
import { autoReleaseJob } from '@/jobs/auto-release.job';

// In Application.start():
if (config.escrowEnabled) {
  autoReleaseJob.start();
}
```

---

## 🧪 **Part 5: Testing**

### **Test 1: Create Escrow Payment**

```bash
curl -X POST http://localhost:3000/api/v1/payment-intents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "usd",
    "crypto_currency": "dot"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "pi_123",
    "escrowPaymentId": 1,
    "escrowTxHash": "0xabc123...",
    "status": "REQUIRES_PAYMENT"
  }
}
```

### **Test 2: Check Contract Balance**

```bash
cd contracts
npx hardhat run scripts/interact.ts --network kusama-testnet
```

### **Test 3: Manually Release Payment**

```bash
curl -X POST http://localhost:3000/api/v1/escrow/payments/pi_123/confirm \
  -H "Authorization: Bearer BUYER_TOKEN"
```

---

## 📊 **Monitoring**

### **Watch Contract Events**

```typescript
// Add to your monitoring system
escrowService.contract.on('PaymentCreated', (paymentId, buyer, merchant, amount) => {
  console.log(`New escrow payment ${paymentId}: ${amount} from ${buyer} to ${merchant}`);
});

escrowService.contract.on('PaymentReleased', (paymentId, merchant, amount) => {
  console.log(`Payment ${paymentId} released: ${amount} to ${merchant}`);
});
```

### **Check Contract Balance**

```bash
cast balance $ESCROW_CONTRACT_ADDRESS --rpc-url $KUSAMA_RPC_URL
```

---

## 🔐 **Security Checklist**

Before going to production:

- [ ] **Audit smart contract** - Get professional audit
- [ ] **Use hardware wallet** - Don't use private keys in plain text
- [ ] **Set up monitoring** - Alert on all escrow events
- [ ] **Test thoroughly** - Complete integration tests on testnet
- [ ] **Multisig owner** - Transfer contract ownership to multisig
- [ ] **Encrypted secrets** - Use AWS Secrets Manager / HashiCorp Vault
- [ ] **Rate limiting** - Limit escrow creation rate
- [ ] **Gas monitoring** - Alert if gas prices spike
- [ ] **Balance alerts** - Alert if platform wallet balance low
- [ ] **Backup RPC** - Configure fallback RPC endpoints

---

## 🐛 **Troubleshooting**

### **"Escrow service not initialized"**

Make sure `ESCROW_ENABLED=true` in `.env` and contract address is set.

### **"insufficient funds for gas"**

Platform wallet needs KSM for gas. Check balance:

```bash
cast balance $PLATFORM_ADDRESS --rpc-url $KUSAMA_RPC_URL
```

### **"Contract not found"**

Verify contract address and network:

```bash
cast code $ESCROW_CONTRACT_ADDRESS --rpc-url $KUSAMA_RPC_URL
```

Should return bytecode, not "0x".

### **"Nonce too low"**

Clear nonce cache:

```bash
# Delete contract cache
rm -rf contracts/cache contracts/artifacts
npm run compile
```

---

## 📚 **Next Steps**

1. ✅ **Deploy to testnet** - Complete this guide
2. ⏭️ **Test extensively** - Run full payment flows
3. ⏭️ **Add dispute resolution** - Implement admin dispute UI
4. ⏭️ **Add payout batching** - Optimize merchant payouts
5. ⏭️ **Production deployment** - Deploy to Kusama mainnet
6. ⏭️ **Get audited** - Professional smart contract audit

---

## 🎉 **Success!**

You now have a production-ready escrow system integrated with your payment gateway!

**What you've built:**
- ✅ Secure escrow smart contract
- ✅ Backend integration with ethers.js
- ✅ Auto-release cron job
- ✅ Event monitoring
- ✅ Complete test suite

**Next:** Test the full payment flow end-to-end on testnet!

---

## 📞 **Need Help?**

- Smart Contract Issues: Check `contracts/README.md`
- Backend Integration: Check `src/services/escrow.service.ts`
- Testing: Run `npm test` in contracts directory

Good luck! 🚀
