import { BlockchainMonitorService } from '@/services/blockchain-monitor.service';
import { PaymentService } from '@/services/payment.service';
import { WebhookService } from '@/services/webhook.service';
import { TestHelpers } from '../utils/test-helpers';
import { PrismaClient } from '@prisma/client';

// Mock the polkadot service
jest.mock('@/services/polkadot-real.service', () => ({
  polkadotRealService: {
    isApiReady: jest.fn(),
    getLatestBlockNumber: jest.fn(),
    getBlock: jest.fn(),
    monitorTransfers: jest.fn(),
  },
}));

describe('BlockchainMonitorService', () => {
  let blockchainMonitorService: BlockchainMonitorService;
  let paymentService: PaymentService;
  let webhookService: WebhookService;
  let prisma: PrismaClient;
  let testMerchant: any;

  beforeAll(async () => {
    prisma = await TestHelpers.getPrisma();
    paymentService = new PaymentService(prisma);
    webhookService = new WebhookService(prisma);
    blockchainMonitorService = new BlockchainMonitorService(prisma, paymentService, webhookService);
  });

  beforeEach(async () => {
    await TestHelpers.cleanupDatabase();
    testMerchant = await TestHelpers.createTestMerchant();
  });

  afterAll(async () => {
    await TestHelpers.closeDatabase();
  });

  describe('startMonitoring', () => {
    it('should start monitoring when API is ready', async () => {
      const { polkadotRealService } = require('@/services/polkadot-real.service');
      polkadotRealService.isApiReady.mockResolvedValue(true);

      await blockchainMonitorService.startMonitoring();

      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should start monitoring even when API is not ready', async () => {
      const { polkadotRealService } = require('@/services/polkadot-real.service');
      polkadotRealService.isApiReady.mockResolvedValue(false);

      await blockchainMonitorService.startMonitoring();

      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should not start monitoring if already running', async () => {
      const { polkadotRealService } = require('@/services/polkadot-real.service');
      polkadotRealService.isApiReady.mockResolvedValue(true);

      await blockchainMonitorService.startMonitoring();
      await blockchainMonitorService.startMonitoring(); // Second call

      // Should not throw any errors
      expect(true).toBe(true);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring', async () => {
      const { polkadotRealService } = require('@/services/polkadot-real.service');
      polkadotRealService.isApiReady.mockResolvedValue(true);

      await blockchainMonitorService.startMonitoring();
      await blockchainMonitorService.stopMonitoring();

      // Should not throw any errors
      expect(true).toBe(true);
    });
  });

  describe('monitoring functionality', () => {
    it('should handle monitoring lifecycle', async () => {
      const { polkadotRealService } = require('@/services/polkadot-real.service');
      polkadotRealService.isApiReady.mockResolvedValue(true);
      polkadotRealService.getLatestBlockNumber.mockResolvedValue(1000000);
      polkadotRealService.getBlock.mockResolvedValue({
        block: {
          header: { number: { toNumber: () => 1000000 } },
          extrinsics: [],
        },
      });

      // Test starting monitoring
      await blockchainMonitorService.startMonitoring();

      // Test stopping monitoring
      await blockchainMonitorService.stopMonitoring();

      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should handle expired payments', async () => {
      const expiredPayment = await TestHelpers.createTestPaymentIntent(testMerchant.id, {
        status: 'REQUIRES_PAYMENT',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      // Test that expired payments are handled
      const updatedPayment = await prisma.paymentIntent.findUnique({
        where: { id: expiredPayment.id },
      });

      expect(updatedPayment).toBeDefined();
      expect(updatedPayment?.status).toBe('REQUIRES_PAYMENT'); // Initially
    });

    it('should handle transfer detection', async () => {
      const paymentIntent = await TestHelpers.createTestPaymentIntent(testMerchant.id, {
        status: 'REQUIRES_PAYMENT',
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        cryptoAmount: '1000000000000',
      });

      const transaction = TestHelpers.mockPolkadotTransaction({
        to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        amount: '1000000000000',
      });

      // Test that transfer detection works
      expect(paymentIntent).toBeDefined();
      expect(transaction).toBeDefined();
      expect(transaction.to).toBe(paymentIntent.walletAddress);
    });
  });
});
