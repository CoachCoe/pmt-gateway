import { v4 as uuidv4 } from 'uuid';

// Mock Prisma client for tests
const mockPrisma = {
  merchant: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  paymentIntent: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  webhookEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  priceCache: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $disconnect: jest.fn(),
};

export class TestHelpers {
  private static prisma: any = mockPrisma;

  static async getPrisma(): Promise<any> {
    return this.prisma;
  }

  static async cleanupDatabase(): Promise<void> {
    const prisma = await this.getPrisma();
    
    // Reset all mocks
    Object.values(prisma).forEach((model: any) => {
      if (typeof model === 'object' && model !== null) {
        Object.values(model).forEach((method: any) => {
          if (typeof method === 'function' && method.mockReset) {
            method.mockReset();
          }
        });
      }
    });
  }

  static async createTestMerchant(overrides: Partial<any> = {}) {
    const prisma = await this.getPrisma();
    
    const merchantData = {
      id: uuidv4(),
      name: 'Test Merchant',
      email: 'test@example.com',
      apiKeyHash: 'test-hash',
      webhookUrl: 'https://example.com/webhook',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
    
    prisma.merchant.create.mockResolvedValue(merchantData);
    return merchantData;
  }

  static async createTestPaymentIntent(merchantId: string, overrides: Partial<any> = {}) {
    const prisma = await this.getPrisma();
    
    const paymentIntentData = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
    
    prisma.paymentIntent.create.mockResolvedValue(paymentIntentData);
    return paymentIntentData;
  }

  static async createTestWebhookEvent(paymentIntentId: string, overrides: Partial<any> = {}) {
    const prisma = await this.getPrisma();
    
    const webhookEventData = {
      id: uuidv4(),
      paymentIntentId,
      eventType: 'payment.created',
      payload: { test: true },
      deliveryStatus: 'PENDING',
      retryCount: 0,
      createdAt: new Date(),
      ...overrides,
    };
    
    prisma.webhookEvent.create.mockResolvedValue(webhookEventData);
    return webhookEventData;
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
