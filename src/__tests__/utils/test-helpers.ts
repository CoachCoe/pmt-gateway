import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export class TestHelpers {
  private static prisma: PrismaClient | null = null;

  static async getPrisma(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env['DATABASE_URL'] || 'postgresql://test:test@localhost:5432/pmt_gateway_test',
          },
        },
      });
    }
    return this.prisma;
  }

  static async cleanupDatabase(): Promise<void> {
    const prisma = await this.getPrisma();
    
    // Delete in reverse order of dependencies
    await prisma.webhookEvent.deleteMany();
    await prisma.paymentIntent.deleteMany();
    await prisma.merchant.deleteMany();
    await prisma.priceCache.deleteMany();
  }

  static async createTestMerchant(overrides: Partial<any> = {}) {
    const prisma = await this.getPrisma();
    
    return await prisma.merchant.create({
      data: {
        id: uuidv4(),
        name: 'Test Merchant',
        email: 'test@example.com',
        apiKeyHash: 'test-hash',
        webhookUrl: 'https://example.com/webhook',
        isActive: true,
        ...overrides,
      },
    });
  }

  static async createTestPaymentIntent(merchantId: string, overrides: Partial<any> = {}) {
    const prisma = await this.getPrisma();
    
    return await prisma.paymentIntent.create({
      data: {
        id: uuidv4(),
        amount: 2500, // $25.00
        currency: 'USD',
        cryptoAmount: '0.1',
        cryptoCurrency: 'DOT',
        status: 'REQUIRES_PAYMENT',
        walletAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        metadata: { test: true },
        merchantId,
        ...overrides,
      },
    });
  }

  static async createTestWebhookEvent(paymentIntentId: string, overrides: Partial<any> = {}) {
    const prisma = await this.getPrisma();
    
    return await prisma.webhookEvent.create({
      data: {
        id: uuidv4(),
        paymentIntentId,
        eventType: 'payment.created',
        payload: { test: true },
        deliveryStatus: 'PENDING',
        retryCount: 0,
        ...overrides,
      },
    });
  }

  static generateMockJWT(payload: any = {}) {
    // Simple mock JWT for testing
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = Buffer.from('mock-signature').toString('base64url');
    
    return `${header}.${body}.${signature}`;
  }

  static mockPolkadotTransaction(overrides: Partial<any> = {}) {
    return {
      hash: '0x1234567890abcdef',
      from: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      to: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      amount: '1000000000000', // 1 DOT in smallest unit
      blockNumber: 1000000,
      timestamp: Date.now(),
      ...overrides,
    };
  }

  static async closeDatabase(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }
}

export const mockRequest = (overrides: any = {}) => ({
  headers: {},
  body: {},
  params: {},
  query: {},
  ...overrides,
});

export const mockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
};

export const mockNext = jest.fn();
