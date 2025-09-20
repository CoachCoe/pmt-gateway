import request from 'supertest';
import express from 'express';
import { PaymentIntentRoutes } from '@/routes/payment-intents';
import { PaymentService } from '@/services/payment.service';
import { WebhookService } from '@/services/webhook.service';
import { TestHelpers } from '../utils/test-helpers';
import { PrismaClient } from '@prisma/client';

// Mock the auth middleware
jest.mock('@/middleware/auth.middleware', () => ({
  AuthMiddleware: jest.fn().mockImplementation(() => ({
    requireAuth: (req: any, _res: any, next: any) => {
      req.user = { merchantId: 'test-merchant-id' };
      next();
    },
  })),
}));

describe('Payment Intent Routes', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let testMerchant: any;

  beforeAll(async () => {
    prisma = await TestHelpers.getPrisma();
    const paymentService = new PaymentService(prisma);
    const webhookService = new WebhookService(prisma);
    
    const authMiddleware = {
      requireAuth: (req: any, _res: any, next: any) => {
        req.user = { id: 'test-merchant-id', type: 'merchant' };
        next();
      },
      optionalAuth: (req: any, _res: any, next: any) => {
        req.user = { id: 'test-merchant-id', type: 'merchant' };
        next();
      },
      requireMerchant: (req: any, _res: any, next: any) => {
        req.merchant = { id: 'test-merchant-id' };
        next();
      },
      requireWallet: (req: any, _res: any, next: any) => {
        req.wallet = { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' };
        next();
      },
      authenticateApiKey: (req: any, _res: any, next: any) => {
        req.merchant = { id: 'test-merchant-id' };
        next();
      },
      authenticateWallet: (req: any, _res: any, next: any) => {
        req.wallet = { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' };
        next();
      }
    } as any;

    const paymentIntentRoutes = new PaymentIntentRoutes(
      paymentService,
      webhookService,
      authMiddleware
    );

    app = express();
    app.use(express.json());
    app.use('/api/v1/payment-intents', paymentIntentRoutes.getRouter());
  });

  beforeEach(async () => {
    await TestHelpers.cleanupDatabase();
    testMerchant = await TestHelpers.createTestMerchant();
  });

  afterAll(async () => {
    await TestHelpers.closeDatabase();
  });

  describe('POST /api/v1/payment-intents', () => {
    it('should create a payment intent successfully', async () => {
      const paymentData = {
        amount: 2500,
        currency: 'USD',
        merchantId: testMerchant.id,
        metadata: { orderId: 'test-order-123' },
      };

      const response = await request(app)
        .post('/api/v1/payment-intents')
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(2500);
      expect(response.body.data.currency).toBe('USD');
      expect(response.body.data.status).toBe('REQUIRES_PAYMENT');
    });

    it('should return 400 for invalid payment data', async () => {
      const invalidData = {
        amount: -100, // Invalid negative amount
        currency: 'USD',
        merchantId: testMerchant.id,
      };

      const response = await request(app)
        .post('/api/v1/payment-intents')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        currency: 'USD',
        merchantId: testMerchant.id,
      };

      const response = await request(app)
        .post('/api/v1/payment-intents')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/payment-intents/:id', () => {
    it('should retrieve a payment intent by ID', async () => {
      const paymentIntent = await TestHelpers.createTestPaymentIntent(testMerchant.id);

      const response = await request(app)
        .get(`/api/v1/payment-intents/${paymentIntent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(paymentIntent.id);
      expect(response.body.data.amount).toBe(paymentIntent.amount);
    });

    it('should return 404 for non-existent payment intent', async () => {
      const response = await request(app)
        .get('/api/v1/payment-intents/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('GET /api/v1/payment-intents', () => {
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
      const response = await request(app)
        .get('/api/v1/payment-intents')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(3);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.total).toBe(3);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/payment-intents')
        .query({ status: 'SUCCEEDED' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.payments[0].status).toBe('SUCCEEDED');
    });

    it('should filter by currency', async () => {
      const response = await request(app)
        .get('/api/v1/payment-intents')
        .query({ currency: 'USD' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(3);
      expect(response.body.data.payments.every((p: any) => p.currency === 'USD')).toBe(true);
    });

    it('should search by ID', async () => {
      const paymentIntent = await TestHelpers.createTestPaymentIntent(testMerchant.id);

      const response = await request(app)
        .get('/api/v1/payment-intents')
        .query({ search: paymentIntent.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.payments[0].id).toBe(paymentIntent.id);
    });
  });

  describe('POST /api/v1/payment-intents/:id/cancel', () => {
    it('should cancel a payment intent', async () => {
      const paymentIntent = await TestHelpers.createTestPaymentIntent(testMerchant.id);

      const response = await request(app)
        .post(`/api/v1/payment-intents/${paymentIntent.id}/cancel`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CANCELED');
    });

    it('should return 404 for non-existent payment intent', async () => {
      const response = await request(app)
        .post('/api/v1/payment-intents/non-existent-id/cancel')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_NOT_FOUND');
    });

    it('should return 400 for already canceled payment intent', async () => {
      const paymentIntent = await TestHelpers.createTestPaymentIntent(testMerchant.id, {
        status: 'CANCELED',
      });

      const response = await request(app)
        .post(`/api/v1/payment-intents/${paymentIntent.id}/cancel`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_ALREADY_CANCELED');
    });
  });
});
