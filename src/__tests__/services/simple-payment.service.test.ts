import { PaymentService } from '@/services/payment.service';

// Mock Prisma
const mockPrismaClient = {
  paymentIntent: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  merchant: {
    findUnique: jest.fn(),
  },
};


// Mock price service
jest.mock('@/utils/price.utils', () => ({
  priceService: {
    convertFiatToDOT: jest.fn().mockReturnValue('0.1'),
  },
  validateDOTAmount: jest.fn().mockReturnValue(true),
  formatDOTAmount: jest.fn().mockReturnValue('0.1'),
}));

// Mock PaymentStatus enum
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
  PaymentStatus: {
    REQUIRES_PAYMENT: 'REQUIRES_PAYMENT',
    PROCESSING: 'PROCESSING',
    SUCCEEDED: 'SUCCEEDED',
    FAILED: 'FAILED',
    CANCELED: 'CANCELED',
    EXPIRED: 'EXPIRED',
  },
}));

describe('PaymentService - Simple Tests', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService(mockPrismaClient as any);
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const paymentData = {
        amount: 2500,
        currency: 'usd',
        metadata: { orderId: 'test-order-123' },
      };

      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 2500,
        currency: 'usd',
        crypto_amount: '0.1',
        crypto_currency: 'DOT',
        status: 'REQUIRES_PAYMENT',
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
        metadata: { orderId: 'test-order-123' },
        created_at: new Date(),
        updated_at: new Date(),
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        transactionHash: null,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.merchant.findUnique.mockResolvedValue({
        id: 'merchant_123',
        name: 'Test Merchant',
        email: 'test@example.com',
        apiKeyHash: 'hash',
        webhookUrl: 'https://example.com/webhook',
        isActive: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockPrismaClient.paymentIntent.create.mockResolvedValue(mockPaymentIntent);

      const result = await paymentService.createPaymentIntent(paymentData, 'merchant_123');

      expect(result).toBeDefined();
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe('usd');
      expect(result.status).toBe('REQUIRES_PAYMENT');
      expect(mockPrismaClient.paymentIntent.create).toHaveBeenCalled();
    });

    it('should throw error for invalid merchant', async () => {
      const paymentData = {
        amount: 2500,
        currency: 'usd',
      };

      mockPrismaClient.merchant.findUnique.mockResolvedValue(null);

      await expect(paymentService.createPaymentIntent(paymentData, 'invalid-merchant'))
        .rejects.toThrow();
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve payment intent by ID', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 2500,
        currency: 'usd',
        status: 'REQUIRES_PAYMENT',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.paymentIntent.findFirst.mockResolvedValue(mockPaymentIntent);

      const result = await paymentService.getPaymentIntent('pi_123', 'merchant_123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('pi_123');
      expect(result!.amount).toBe(2500);
    });

    it('should return null for non-existent payment intent', async () => {
      mockPrismaClient.paymentIntent.findFirst.mockResolvedValue(null);

      const result = await paymentService.getPaymentIntent('non-existent-id', 'merchant_123');

      expect(result).toBeNull();
    });
  });
});
