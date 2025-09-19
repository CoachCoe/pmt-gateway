import { PaymentService } from '@/services/payment.service';
import { TestHelpers } from '../utils/test-helpers';
import { PrismaClient } from '@prisma/client';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let prisma: PrismaClient;
  let testMerchant: any;

  beforeAll(async () => {
    prisma = await TestHelpers.getPrisma();
    paymentService = new PaymentService(prisma);
  });

  beforeEach(async () => {
    await TestHelpers.cleanupDatabase();
    testMerchant = await TestHelpers.createTestMerchant();
  });

  afterAll(async () => {
    await TestHelpers.closeDatabase();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const paymentData = {
        amount: 2500,
        currency: 'USD',
        metadata: { orderId: 'test-order-123' },
      };

      const result = await paymentService.createPaymentIntent(paymentData, testMerchant.id);

      expect(result).toBeDefined();
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('REQUIRES_PAYMENT');
      expect(result.metadata).toEqual({ orderId: 'test-order-123' });
    });

    it('should calculate crypto amount correctly', async () => {
      const paymentData = {
        amount: 10000, // $100.00
        currency: 'USD',
      };

      const result = await paymentService.createPaymentIntent(paymentData, testMerchant.id);

      expect(result.crypto_amount).toBeDefined();
      expect(result.crypto_currency).toBe('DOT');
    });

    it('should set expiration time correctly', async () => {
      const paymentData = {
        amount: 2500,
        currency: 'USD',
      };

      const result = await paymentService.createPaymentIntent(paymentData, testMerchant.id);

      expect(result.expires_at).toBeDefined();
      expect(new Date(result.expires_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw error for invalid merchant', async () => {
      const paymentData = {
        amount: 2500,
        currency: 'USD',
      };

      await expect(paymentService.createPaymentIntent(paymentData, 'invalid-merchant-id'))
        .rejects.toThrow();
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve payment intent by ID', async () => {
      const paymentIntent = await TestHelpers.createTestPaymentIntent(testMerchant.id);

      const result = await paymentService.getPaymentIntent(paymentIntent.id, testMerchant.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(paymentIntent.id);
      expect(result!.amount).toBe(paymentIntent.amount);
    });

    it('should return null for non-existent payment intent', async () => {
      const result = await paymentService.getPaymentIntent('non-existent-id', testMerchant.id);
      expect(result).toBeNull();
    });
  });

  describe('updatePaymentIntentStatus', () => {
    it('should update payment intent status', async () => {
      const paymentIntent = await TestHelpers.createTestPaymentIntent(testMerchant.id);

      const result = await paymentService.updatePaymentIntentStatus(
        paymentIntent.id, 
        'SUCCEEDED', 
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 
        '0x1234567890abcdef'
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe('SUCCEEDED');
      expect(result?.transaction_hash).toBe('0x1234567890abcdef');
    });

    it('should throw error for non-existent payment intent', async () => {
      await expect(paymentService.updatePaymentIntentStatus('non-existent-id', 'SUCCEEDED')).rejects.toThrow();
    });
  });

  describe('listPaymentIntents', () => {
    beforeEach(async () => {
      // Create multiple payment intents for testing
      await TestHelpers.createTestPaymentIntent(testMerchant.id, {
        amount: 1000,
        status: 'REQUIRES_PAYMENT',
      });
      await TestHelpers.createTestPaymentIntent(testMerchant.id, {
        amount: 2000,
        status: 'SUCCEEDED',
      });
      await TestHelpers.createTestPaymentIntent(testMerchant.id, {
        amount: 3000,
        status: 'FAILED',
      });
    });

    it('should list payment intents with pagination', async () => {
      const result = await paymentService.getPaymentIntentsByMerchant(testMerchant.id, 1, 10);

      expect(result.paymentIntents).toHaveLength(3);
      expect(result.page).toBe(1);
      expect(result.total).toBe(3);
    });

    it('should filter by status', async () => {
      const result = await paymentService.getPaymentIntentsByMerchant(testMerchant.id, 1, 10, {
        status: 'SUCCEEDED',
      });

      expect(result.paymentIntents).toHaveLength(1);
      expect(result.paymentIntents[0]?.status).toBe('SUCCEEDED');
    });

    it('should filter by currency', async () => {
      const result = await paymentService.getPaymentIntentsByMerchant(testMerchant.id, 1, 10, {
        currency: 'USD',
      });

      expect(result.paymentIntents).toHaveLength(3);
      expect(result.paymentIntents.every((p: any) => p.currency === 'USD')).toBe(true);
    });
  });

  describe('cancelPaymentIntent', () => {
    it('should cancel a payment intent', async () => {
      const paymentIntent = await TestHelpers.createTestPaymentIntent(testMerchant.id);

      const result = await paymentService.cancelPaymentIntent(paymentIntent.id, testMerchant.id);

      expect(result).toBeDefined();
      expect(result!.status).toBe('CANCELED');
    });

    it('should throw error for non-existent payment intent', async () => {
      await expect(paymentService.cancelPaymentIntent('non-existent-id', testMerchant.id))
        .rejects.toThrow();
    });
  });
});
