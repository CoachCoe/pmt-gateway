# 🚀 PMT Gateway: Production Roadmap for EVM Polkadot/Kusama

**Current Status:** 75% Complete
**Target:** 100% Production-Ready Web3 Payment Gateway
**Timeline:** 8-10 Weeks to Launch

---

## 📊 **What's Missing? (25%)**

| Feature | Current Status | Required For Launch |
|---------|---------------|---------------------|
| **Escrow Integration** | ✅ Contract ready | 🔨 Connect to payment flow |
| **EVM Wallet Support** | ⚠️ Placeholder | 🔨 MetaMask, WalletConnect |
| **Payment Widget** | ⚠️ Basic UI | 🔨 Real transactions |
| **Auto-Release Cron** | ❌ Not built | 🔨 Expired payment handling |
| **Merchant Payouts** | ❌ Not built | 🔨 Weekly batch payouts |
| **Dispute Resolution** | ❌ Not built | 🔨 Admin UI for disputes |
| **Production Config** | ⚠️ Testnet only | 🔨 Mainnet deployment |
| **Monitoring** | ⚠️ Basic logs | 🔨 Alerts & dashboards |

---

## 🎯 **PHASE 1: Core Payment Flow (Weeks 1-2)**

### **Week 1: Escrow Integration**

#### **Day 1-2: Update Payment Service**

**File:** `src/services/payment.service.ts`

Add escrow creation to payment intent:

```typescript
import { escrowService } from './escrow.service';

public async createPaymentIntent(
  input: CreatePaymentIntentRequest,
  merchantId: string
): Promise<PaymentIntentResponse> {
  // ... existing validation ...

  const merchant = await this.prisma.merchant.findUnique({
    where: { id: merchantId }
  });

  if (!merchant?.walletAddress) {
    throw new ValidationError('Merchant wallet address required for escrow');
  }

  // Convert fiat to DOT
  const cryptoAmount = priceService.convertFiatToDOT(
    input.amount,
    input.currency
  );

  let escrowPaymentId: number | null = null;
  let escrowTxHash: string | null = null;

  // Create escrow payment if enabled
  if (config.escrowEnabled) {
    try {
      const escrow = await escrowService.createEscrowPayment(
        merchant.walletAddress,
        formatDOTAmount(cryptoAmount),
        config.paymentExpirationMinutes / 60, // hours
        `pi_${Date.now()}_${merchantId}`
      );

      escrowPaymentId = escrow.paymentId;
      escrowTxHash = escrow.txHash;

      logger.info('Escrow payment created', {
        escrowPaymentId,
        escrowTxHash,
        merchantAmount: escrow.merchantAmount,
        platformFee: escrow.platformFee
      });

    } catch (error) {
      logger.error('Escrow creation failed:', error);
      throw new Error('Failed to create escrow payment');
    }
  }

  // Create payment intent with escrow info
  const paymentIntent = await this.prisma.paymentIntent.create({
    data: {
      amount: input.amount,
      currency: input.currency,
      cryptoAmount: formatDOTAmount(cryptoAmount),
      cryptoCurrency: input.crypto_currency || 'dot',
      status: PaymentStatus.REQUIRES_PAYMENT,
      expiresAt: new Date(Date.now() + config.paymentExpirationMinutes * 60 * 1000),
      metadata: input.metadata || {},
      merchantId,
      escrowPaymentId,
      escrowTxHash,
      releaseMethod: 'AUTO', // Auto-release after expiration
      walletAddress: config.escrowContractAddress, // Buyer sends here!
    },
  });

  return this.formatPaymentIntentResponse(paymentIntent);
}
```

**🎯 Deliverable:** Payment intents now create escrow automatically

---

#### **Day 3-4: Add Merchant Wallet Management**

**Update Prisma Schema:**

```prisma
model Merchant {
  id              String   @id @default(cuid())
  name            String
  email           String   @unique
  apiKeyHash      String
  webhookUrl      String?
  isActive        Boolean  @default(true)

  // NEW: Wallet configuration
  walletAddress   String?  @unique  // EVM address for payouts
  platformFeeBps  Int      @default(250) // Merchant-specific fee (2.5%)
  payoutSchedule  PayoutSchedule @default(WEEKLY)
  minPayoutAmount String   @default("10.0") // Min 10 DOT

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  paymentIntents  PaymentIntent[]
  payouts         Payout[]

  @@map("merchants")
}

enum PayoutSchedule {
  INSTANT   // Release immediately (higher gas)
  DAILY     // Once per day
  WEEKLY    // Once per week (default)
  MONTHLY   // Once per month
}

model Payout {
  id              String   @id @default(cuid())
  merchantId      String
  totalAmount     String   // Total DOT earned
  platformFee     String   // Fee deducted
  netAmount       String   // Amount sent to merchant
  status          PayoutStatus @default(PENDING)
  scheduledFor    DateTime
  processedAt     DateTime?
  txHash          String?
  paymentIntents  String[] // Array of payment IDs
  createdAt       DateTime @default(now())

  merchant        Merchant @relation(fields: [merchantId], references: [id])

  @@map("payouts")
}

enum PayoutStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

**Migration:**

```bash
npx prisma migrate dev --name add_merchant_wallet_and_payouts
```

**API Endpoint:** Add to merchant onboarding

```typescript
// POST /api/v1/merchants/:id/wallet
router.post('/:id/wallet', async (req, res) => {
  const { walletAddress } = req.body;

  // Validate EVM address
  if (!ethers.isAddress(walletAddress)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid EVM address' }
    });
  }

  await prisma.merchant.update({
    where: { id: req.params.id },
    data: { walletAddress }
  });

  res.json({ success: true });
});
```

**🎯 Deliverable:** Merchants can configure payout wallet

---

#### **Day 5-7: EVM Wallet Integration**

Since you're using **EVM on Kusama/Polkadot**, you need **MetaMask** support, not Polkadot.js!

**Update Widget for MetaMask:**

```typescript
// frontend/sdk/src/core/wallet-connector.ts (NEW FILE)
import { ethers } from 'ethers';

export class WalletConnector {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  async connectMetaMask(): Promise<{
    address: string;
    chainId: number;
    provider: ethers.BrowserProvider;
  }> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask not installed');
    }

    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    const address = await this.signer.getAddress();
    const network = await this.provider.getNetwork();

    return {
      address,
      chainId: Number(network.chainId),
      provider: this.provider
    };
  }

  async switchToKusamaEVM() {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const kusamaChainId = '0x2710'; // 10000 in hex (update with actual Kusama EVM chain ID)

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: kusamaChainId }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: kusamaChainId,
            chainName: 'Kusama EVM',
            nativeCurrency: {
              name: 'KSM',
              symbol: 'KSM',
              decimals: 18
            },
            rpcUrls: ['https://kusama-evm-rpc.polkadot.io'], // Update with actual
            blockExplorerUrls: ['https://kusama-evm-explorer.polkadot.io']
          }]
        });
      }
    }
  }

  async sendPayment(
    toAddress: string,
    amountInDOT: string
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const tx = await this.signer.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amountInDOT)
    });

    await tx.wait();
    return tx.hash;
  }

  async getBalance(): Promise<string> {
    if (!this.provider || !this.signer) {
      throw new Error('Wallet not connected');
    }

    const address = await this.signer.getAddress();
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }
}
```

**Update Payment Widget:**

```typescript
// frontend/sdk/src/components/payment-widget.ts

import { WalletConnector } from '../core/wallet-connector';

export class PaymentWidget {
  private walletConnector: WalletConnector;

  constructor(config: PaymentWidgetConfig, apiClient: APIClient) {
    // ... existing code ...
    this.walletConnector = new WalletConnector();
  }

  private async connectWallet(walletId: string): Promise<void> {
    try {
      this.state.currentStep = 'connect-wallet';
      this.render();

      if (walletId === 'metamask') {
        // Connect MetaMask
        const connection = await this.walletConnector.connectMetaMask();

        // Switch to Kusama EVM
        await this.walletConnector.switchToKusamaEVM();

        this.state.walletConnection = {
          address: connection.address,
          chainId: connection.chainId,
          name: 'MetaMask',
          source: 'metamask'
        };

        this.state.isConnected = true;
        this.state.currentStep = 'confirm-payment';
        this.render();
      }

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async processPayment(): Promise<void> {
    try {
      if (!this.state.paymentIntent || !this.state.walletConnection) {
        throw new Error('Missing payment intent or wallet');
      }

      this.state.currentStep = 'processing';
      this.render();

      // Send payment to escrow contract
      const txHash = await this.walletConnector.sendPayment(
        this.state.paymentIntent.wallet_address!, // Escrow contract address
        this.state.paymentIntent.crypto_amount
      );

      logger.info('Payment sent', { txHash });

      // Update payment intent with transaction
      await this.apiClient.updatePaymentIntent(
        this.state.paymentIntent.id,
        { transaction_hash: txHash }
      );

      // Poll for confirmation
      await this.waitForConfirmation(txHash);

      this.state.currentStep = 'success';
      this.render();

      this.emit('payment.succeeded', {
        type: 'payment.succeeded',
        paymentIntent: this.state.paymentIntent,
        transactionHash: txHash
      });

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async waitForConfirmation(txHash: string): Promise<void> {
    // Poll backend for payment confirmation
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec

      const payment = await this.apiClient.getPaymentIntent(
        this.state.paymentIntent!.id
      );

      if (payment.status === 'SUCCEEDED' || payment.status === 'PROCESSING') {
        return;
      }

      if (payment.status === 'FAILED') {
        throw new Error('Payment failed');
      }

      attempts++;
    }

    throw new Error('Payment confirmation timeout');
  }
}
```

**🎯 Deliverable:** Widget can connect MetaMask and send real payments

---

### **Week 2: Payment Monitoring & Auto-Release**

#### **Day 8-10: Blockchain Event Monitoring**

**Update Blockchain Monitor to Watch Escrow Contract:**

```typescript
// src/services/blockchain-monitor.service.ts

import { ethers } from 'ethers';
import { escrowService } from './escrow.service';

export class BlockchainMonitorService {
  private provider!: ethers.JsonRpcProvider;
  private escrowContract!: ethers.Contract;

  async startMonitoring(): Promise<void> {
    this.provider = new ethers.JsonRpcProvider(config.kusamaRpcUrl);

    // Load escrow contract for event listening
    this.escrowContract = new ethers.Contract(
      config.escrowContractAddress,
      PMTEscrowABI.abi,
      this.provider
    );

    // Listen for PaymentCreated events
    this.escrowContract.on(
      'PaymentCreated',
      async (paymentId, buyer, merchant, amount, platformFee, expiresAt, externalId) => {
        logger.info('Escrow PaymentCreated event', {
          paymentId: Number(paymentId),
          buyer,
          merchant,
          amount: ethers.formatEther(amount),
          externalId
        });

        // Update database
        await this.updatePaymentWithEscrowInfo(
          externalId,
          Number(paymentId),
          buyer
        );
      }
    );

    // Listen for PaymentReleased events
    this.escrowContract.on(
      'PaymentReleased',
      async (paymentId, merchant, amount, platformFee, releasedBy) => {
        logger.info('Escrow PaymentReleased event', {
          paymentId: Number(paymentId),
          merchant,
          amount: ethers.formatEther(amount)
        });

        // Update payment to SUCCEEDED
        await this.markPaymentAsSucceeded(Number(paymentId));
      }
    );

    // Listen for direct transfers to escrow contract (buyer payments)
    this.provider.on({
      address: config.escrowContractAddress,
      topics: [ethers.id('Transfer(address,address,uint256)')]
    }, async (log) => {
      const iface = new ethers.Interface([
        'event Transfer(address indexed from, address indexed to, uint256 value)'
      ]);

      try {
        const parsed = iface.parseLog(log);
        if (!parsed) return;

        const { from, to, value } = parsed.args;

        logger.info('Transfer to escrow contract detected', {
          from,
          to,
          amount: ethers.formatEther(value),
          txHash: log.transactionHash
        });

        // Match payment by amount and update status
        await this.matchAndUpdatePayment(
          ethers.formatEther(value),
          from,
          log.transactionHash
        );

      } catch (error) {
        logger.error('Error parsing transfer log:', error);
      }
    });

    logger.info('Blockchain monitoring started');
  }

  private async updatePaymentWithEscrowInfo(
    externalId: string,
    escrowPaymentId: number,
    buyerAddress: string
  ): Promise<void> {
    // Find payment by external ID (could be in metadata)
    const payment = await this.prisma.paymentIntent.findFirst({
      where: {
        OR: [
          { id: externalId },
          { metadata: { path: ['orderId'], equals: externalId } }
        ]
      }
    });

    if (payment) {
      await this.prisma.paymentIntent.update({
        where: { id: payment.id },
        data: {
          escrowPaymentId,
          walletAddress: buyerAddress,
          status: PaymentStatus.REQUIRES_PAYMENT
        }
      });
    }
  }

  private async matchAndUpdatePayment(
    amount: string,
    buyerAddress: string,
    txHash: string
  ): Promise<void> {
    // Find pending payment with matching amount
    const payment = await this.prisma.paymentIntent.findFirst({
      where: {
        cryptoAmount: amount,
        status: PaymentStatus.REQUIRES_PAYMENT,
        expiresAt: { gt: new Date() }
      }
    });

    if (payment) {
      await this.prisma.paymentIntent.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PROCESSING,
          walletAddress: buyerAddress,
          transactionHash: txHash
        }
      });

      // Send webhook
      await this.webhookService.createWebhookEvent(
        payment.id,
        'payment.processing',
        payment
      );

      logger.info('Payment matched and updated', {
        paymentId: payment.id,
        txHash
      });
    }
  }

  private async markPaymentAsSucceeded(escrowPaymentId: number): Promise<void> {
    const payment = await this.prisma.paymentIntent.findFirst({
      where: { escrowPaymentId }
    });

    if (payment && payment.status !== PaymentStatus.SUCCEEDED) {
      await this.prisma.paymentIntent.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          releasedAt: new Date()
        }
      });

      // Send success webhook
      await this.webhookService.createWebhookEvent(
        payment.id,
        'payment.succeeded',
        payment
      );

      logger.info('Payment marked as succeeded', {
        paymentId: payment.id,
        escrowPaymentId
      });
    }
  }
}
```

**🎯 Deliverable:** Real-time payment monitoring from blockchain events

---

#### **Day 11-14: Auto-Release Cron Job**

**File:** `src/jobs/auto-release.job.ts`

```typescript
import cron from 'node-cron';
import { PrismaClient, PaymentStatus } from '@prisma/client';
import { escrowService } from '@/services/escrow.service';
import { webhookService } from '@/services/webhook.service';
import logger from '@/utils/logger';

const prisma = new PrismaClient();

export const autoReleaseJob = {
  start: () => {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      try {
        logger.info('Starting auto-release job');

        // Find expired payments pending auto-release
        const expiredPayments = await prisma.paymentIntent.findMany({
          where: {
            status: PaymentStatus.PROCESSING,
            releaseMethod: 'AUTO',
            expiresAt: { lt: new Date() },
            escrowPaymentId: { not: null },
            releasedAt: null,
          },
          take: 50, // Batch of 50
        });

        if (expiredPayments.length === 0) {
          logger.debug('No payments to auto-release');
          return;
        }

        logger.info(`Auto-releasing ${expiredPayments.length} expired payments`);

        // Batch release on blockchain
        const paymentIds = expiredPayments
          .map(p => p.escrowPaymentId!)
          .filter(id => id !== null);

        const txHash = await escrowService.batchReleaseExpired(paymentIds);

        logger.info('Batch release transaction sent', {
          txHash,
          count: paymentIds.length
        });

        // Update all as succeeded (events will confirm)
        await prisma.paymentIntent.updateMany({
          where: {
            escrowPaymentId: { in: paymentIds }
          },
          data: {
            status: PaymentStatus.SUCCEEDED,
            releasedAt: new Date()
          }
        });

        // Send webhooks
        for (const payment of expiredPayments) {
          await webhookService.createWebhookEvent(
            payment.id,
            'payment.succeeded',
            payment
          );
        }

        logger.info(`Auto-released ${expiredPayments.length} payments`, { txHash });

      } catch (error) {
        logger.error('Auto-release job failed:', error);
      }
    });

    logger.info('Auto-release job scheduled (every 10 minutes)');
  },

  stop: () => {
    logger.info('Auto-release job stopped');
  }
};
```

**Add to `src/index.ts`:**

```typescript
import { autoReleaseJob } from '@/jobs/auto-release.job';

// In Application.start():
if (config.escrowEnabled) {
  await escrowService.initialize();
  autoReleaseJob.start();
  logger.info('Escrow system and auto-release initialized');
}
```

**🎯 Deliverable:** Automatic payment release every 10 minutes

---

## 🎯 **PHASE 2: Merchant Payouts (Week 3)**

### **Task 2.1: Build Payout Service**

```typescript
// src/services/payout.service.ts

import { PrismaClient, PaymentStatus, PayoutStatus } from '@prisma/client';
import { escrowService } from './escrow.service';
import { ethers } from 'ethers';
import logger from '@/utils/logger';

export class PayoutService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculate pending payout for a merchant
   */
  async calculatePayout(merchantId: string): Promise<{
    totalAmount: string;
    platformFee: string;
    netAmount: string;
    paymentCount: number;
    paymentIds: string[];
  }> {
    // Get all succeeded payments not yet paid out
    const payments = await this.prisma.paymentIntent.findMany({
      where: {
        merchantId,
        status: PaymentStatus.SUCCEEDED,
        releasedAt: { not: null },
        // Not already included in a payout
        NOT: {
          payouts: {
            some: {
              status: { in: ['COMPLETED', 'PROCESSING'] }
            }
          }
        }
      }
    });

    let totalAmount = 0;
    const paymentIds: string[] = [];

    for (const payment of payments) {
      const amount = parseFloat(payment.cryptoAmount);
      totalAmount += amount;
      paymentIds.push(payment.id);
    }

    // Platform already took fee in escrow, merchant gets full amount
    // But track it for reporting
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    const platformFee = (totalAmount * (merchant?.platformFeeBps || 250)) / 10000;
    const netAmount = totalAmount - platformFee;

    return {
      totalAmount: totalAmount.toFixed(10),
      platformFee: platformFee.toFixed(10),
      netAmount: netAmount.toFixed(10),
      paymentCount: payments.length,
      paymentIds
    };
  }

  /**
   * Create a payout for a merchant
   */
  async createPayout(merchantId: string): Promise<any> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant?.walletAddress) {
      throw new Error('Merchant wallet address not configured');
    }

    const calculation = await this.calculatePayout(merchantId);

    // Check minimum payout
    if (parseFloat(calculation.netAmount) < parseFloat(merchant.minPayoutAmount)) {
      throw new Error(
        `Amount ${calculation.netAmount} below minimum ${merchant.minPayoutAmount}`
      );
    }

    // Calculate scheduled date based on payout schedule
    const scheduledFor = this.calculateScheduledDate(merchant.payoutSchedule);

    // Create payout record
    const payout = await this.prisma.payout.create({
      data: {
        merchantId,
        totalAmount: calculation.totalAmount,
        platformFee: calculation.platformFee,
        netAmount: calculation.netAmount,
        paymentIntents: calculation.paymentIds,
        scheduledFor,
        status: 'PENDING'
      }
    });

    logger.info('Payout created', {
      payoutId: payout.id,
      merchantId,
      netAmount: calculation.netAmount,
      paymentCount: calculation.paymentCount
    });

    return payout;
  }

  /**
   * Process a pending payout (send funds)
   */
  async processPayout(payoutId: string): Promise<void> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { merchant: true }
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new Error(`Payout status is ${payout.status}, cannot process`);
    }

    if (!payout.merchant.walletAddress) {
      throw new Error('Merchant wallet address not set');
    }

    // Update to processing
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'PROCESSING' }
    });

    try {
      // Send payout transaction
      const provider = new ethers.JsonRpcProvider(config.kusamaRpcUrl);
      const wallet = new ethers.Wallet(config.platformPrivateKey!, provider);

      const tx = await wallet.sendTransaction({
        to: payout.merchant.walletAddress,
        value: ethers.parseEther(payout.netAmount)
      });

      await tx.wait();

      // Update payout as completed
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          txHash: tx.hash,
          processedAt: new Date()
        }
      });

      logger.info('Payout processed successfully', {
        payoutId,
        merchantId: payout.merchantId,
        amount: payout.netAmount,
        txHash: tx.hash
      });

    } catch (error) {
      // Mark as failed
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: { status: 'FAILED' }
      });

      logger.error('Payout processing failed', {
        payoutId,
        error
      });

      throw error;
    }
  }

  /**
   * Cron job to process scheduled payouts
   */
  async processScheduledPayouts(): Promise<number> {
    const pendingPayouts = await this.prisma.payout.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() }
      },
      take: 50
    });

    let processedCount = 0;

    for (const payout of pendingPayouts) {
      try {
        await this.processPayout(payout.id);
        processedCount++;
      } catch (error) {
        logger.error('Failed to process payout', {
          payoutId: payout.id,
          error
        });
      }
    }

    return processedCount;
  }

  private calculateScheduledDate(schedule: string): Date {
    const now = new Date();

    switch (schedule) {
      case 'INSTANT':
        return now;
      case 'DAILY':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
```

**Payout Cron Job:**

```typescript
// src/jobs/payout.job.ts
import cron from 'node-cron';
import { payoutService } from '@/services/payout.service';
import logger from '@/utils/logger';

export const payoutJob = {
  start: () => {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running payout job');
        const count = await payoutService.processScheduledPayouts();
        if (count > 0) {
          logger.info(`Processed ${count} payouts`);
        }
      } catch (error) {
        logger.error('Payout job failed:', error);
      }
    });

    logger.info('Payout job scheduled (hourly)');
  }
};
```

**🎯 Deliverable:** Automated weekly merchant payouts

---

## 🎯 **PHASE 3: Production Deployment (Weeks 4-5)**

### **Week 4: Testing & Security**

#### **Task 3.1: Comprehensive Integration Tests**

```bash
# Create integration test suite
mkdir -p src/__tests__/integration
```

```typescript
// src/__tests__/integration/payment-flow.test.ts

describe('Complete Payment Flow', () => {
  it('should process full escrow payment end-to-end', async () => {
    // 1. Create payment intent
    const payment = await createPaymentIntent({
      amount: 100.00,
      currency: 'usd'
    });
    expect(payment.escrowPaymentId).toBeDefined();

    // 2. Simulate buyer payment to escrow
    const txHash = await sendToEscrow(
      payment.walletAddress,
      payment.cryptoAmount
    );
    expect(txHash).toBeDefined();

    // 3. Wait for blockchain confirmation
    await waitForConfirmation(txHash);

    // 4. Verify payment status updated
    const updated = await getPaymentIntent(payment.id);
    expect(updated.status).toBe('PROCESSING');

    // 5. Auto-release after expiration
    await advanceTime(payment.expiresAt);
    await runAutoReleaseJob();

    // 6. Verify payment succeeded
    const final = await getPaymentIntent(payment.id);
    expect(final.status).toBe('SUCCEEDED');
    expect(final.releasedAt).toBeDefined();
  });
});
```

#### **Task 3.2: Load Testing**

```bash
npm install -D artillery
```

```yaml
# load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests/sec
    - duration: 120
      arrivalRate: 50  # Ramp to 50 req/sec

scenarios:
  - name: "Create payment intent"
    flow:
      - post:
          url: "/api/v1/payment-intents"
          headers:
            Authorization: "Bearer test_api_key"
          json:
            amount: 10000
            currency: "usd"
            crypto_currency: "dot"
```

Run: `artillery run load-test.yml`

#### **Task 3.3: Security Audit Prep**

1. **Code Review Checklist:**
   - [ ] All user inputs validated
   - [ ] No SQL injection vectors
   - [ ] No private keys in code
   - [ ] Rate limiting on all endpoints
   - [ ] Webhook signatures verified
   - [ ] Encryption for sensitive data

2. **Smart Contract Audit:**
   - [ ] Get professional audit (CertiK, OpenZeppelin, Trail of Bits)
   - [ ] Cost: $5k-15k
   - [ ] Timeline: 2-3 weeks

3. **Penetration Testing:**
   - [ ] Test API endpoints
   - [ ] Test widget XSS/CSRF
   - [ ] Test escrow contract exploits

**🎯 Deliverable:** Security audit completed, issues fixed

---

### **Week 5: Production Deployment**

#### **Task 3.4: Deploy to Kusama Mainnet**

```bash
# 1. Update .env for mainnet
KUSAMA_RPC_URL=https://kusama-rpc.polkadot.io
ESCROW_ENABLED=true

# 2. Deploy escrow contract
cd contracts
npm run deploy:mainnet

# 3. Verify on block explorer
npm run verify -- --network kusama <CONTRACT_ADDRESS> 250 <PLATFORM_ADDRESS>

# 4. Transfer contract ownership to multisig
# Use Gnosis Safe or Polkadot multisig
```

#### **Task 3.5: Infrastructure Setup**

**Monitoring:**
```bash
# Sentry for error tracking
npm install @sentry/node

# Datadog for metrics
npm install dd-trace

# Prometheus + Grafana
docker-compose up -d prometheus grafana
```

**Alerting:**
- Low platform wallet balance (< 10 KSM)
- Failed escrow releases
- High error rate
- Webhook delivery failures

**Backup:**
- Database backups every 6 hours
- Contract ABI + deployment info backed up
- Private keys in hardware wallet / AWS KMS

**🎯 Deliverable:** Production infrastructure live

---

## 🎯 **PHASE 4: Polish & Launch (Weeks 6-8)**

### **Week 6: Merchant Dashboard**

Build React dashboard for merchants:

```typescript
// Features needed:
// 1. Payment history with escrow status
// 2. Payout schedule & history
// 3. Wallet configuration
// 4. Analytics (revenue, fees, volume)
// 5. Webhook logs
// 6. Refund button
// 7. Transaction explorer links
```

### **Week 7: Customer Support Tools**

```typescript
// Admin panel features:
// 1. View all payments
// 2. Dispute resolution UI
// 3. Manual payout triggers
// 4. Refund processing
// 5. Merchant verification
// 6. Contract balance monitoring
```

### **Week 8: Documentation & Launch**

1. **API Documentation:**
   - Interactive API docs (Swagger/Redoc)
   - SDKs for popular frameworks
   - Code examples

2. **Integration Guides:**
   - Quick start (5 min)
   - WooCommerce plugin
   - Shopify app
   - React component library

3. **Launch Checklist:**
   - [ ] Smart contract audited ✅
   - [ ] Mainnet deployed ✅
   - [ ] Monitoring live ✅
   - [ ] Support team ready ✅
   - [ ] Documentation complete ✅
   - [ ] Marketing materials ready ✅

**🎯 Deliverable:** PUBLIC LAUNCH! 🚀

---

## 📊 **Final Checklist: Production-Ready**

### **Smart Contracts**
- [ ] Escrow contract audited by professionals
- [ ] Deployed to Kusama mainnet
- [ ] Ownership transferred to multisig
- [ ] Emergency pause tested
- [ ] Gas costs optimized

### **Backend**
- [ ] All payments use escrow
- [ ] Auto-release cron running
- [ ] Payout system automated
- [ ] Event monitoring active
- [ ] Webhooks working
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (Datadog)

### **Frontend**
- [ ] MetaMask integration working
- [ ] WalletConnect support
- [ ] QR codes for mobile
- [ ] Payment widget embeddable
- [ ] Merchant dashboard complete
- [ ] Mobile responsive

### **Operations**
- [ ] Database backups automated
- [ ] Secrets in KMS/Vault
- [ ] Platform wallet funded (100+ KSM)
- [ ] Alerts configured
- [ ] On-call rotation setup
- [ ] Incident response plan

### **Compliance**
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] AML/KYC procedures (if needed)
- [ ] Tax reporting (1099s, etc)

---

## 💰 **Estimated Costs**

| Item | Cost | Timeline |
|------|------|----------|
| **Smart Contract Audit** | $10k-15k | 2-3 weeks |
| **Infrastructure** | $500/mo | Ongoing |
| **Monitoring Tools** | $200/mo | Ongoing |
| **Gas Fees (testnet)** | Free | - |
| **Gas Fees (mainnet)** | $1k initial | Then revenue |
| **Development Time** | 8-10 weeks | - |

**Total Initial Investment:** ~$15k
**Monthly Operating Cost:** ~$700/mo

---

## 🎯 **Success Metrics**

**After 8 weeks, you'll have:**

✅ Fully functional escrow smart contract on Kusama
✅ MetaMask-enabled payment widget
✅ Automated merchant payouts
✅ Real-time blockchain monitoring
✅ Admin dispute resolution
✅ Production infrastructure
✅ Complete documentation
✅ **100% feature parity with basic Stripe for Web3!**

**Revenue Model:**
- 2.5% platform fee on all transactions
- Instant payment gateway (unlike 7-day ACH)
- Global, permissionless, 24/7

**Competitive Advantage:**
- ✅ EVM compatible (works with MetaMask!)
- ✅ Polkadot/Kusama fast finality (6 seconds vs 10+ minutes)
- ✅ Smart contract escrow (trustless)
- ✅ Lower fees than Ethereum L1

---

## 🚀 **Quick Start (This Week)**

```bash
# 1. Deploy escrow to Kusama testnet
cd contracts
npm install
npm test
npm run deploy:testnet

# 2. Update backend
npm install ethers@^6.10.0
# Configure .env with contract address

# 3. Test payment flow
npx tsx scripts/test-escrow.ts

# 4. Start building!
```

---

**You're 75% there. Let's finish this! 🎉**

Next immediate action: Deploy escrow to Kusama testnet and test the payment flow with MetaMask.

Want me to help you with any specific part? I can:
1. Build the MetaMask wallet connector
2. Create the auto-release cron job
3. Set up merchant payout system
4. Build the admin dashboard
5. Help with production deployment

Let me know what to tackle next!

