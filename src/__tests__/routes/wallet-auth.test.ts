import request from 'supertest';
import express from 'express';
import { WalletAuthRoutes } from '@/routes/wallet-auth';
import { AuthService } from '@/services/auth.service';
import { TestHelpers } from '../utils/test-helpers';
import { PrismaClient } from '@prisma/client';

// Mock the auth middleware
jest.mock('@/middleware/auth.middleware', () => ({
  AuthMiddleware: jest.fn().mockImplementation(() => ({
    requireAuth: (req: any, _res: any, next: any) => {
      req.user = { merchantId: 'test-merchant-id' };
      next();
    },
    optionalAuth: (req: any, _res: any, next: any) => {
      req.user = { merchantId: 'test-merchant-id' };
      next();
    },
    authService: {} as any,
    authenticateApiKey: (req: any, _res: any, next: any) => {
      req.merchant = { id: 'test-merchant-id' };
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
    authenticateWallet: (req: any, _res: any, next: any) => {
      req.wallet = { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' };
      next();
    },
  })),
}));

describe('Wallet Auth Routes', () => {
  let app: express.Application;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await TestHelpers.getPrisma();
    const authService = new AuthService(prisma);
    
    // Create a proper mock auth middleware
    const authMiddleware = {
      optionalAuth: (_req: any, _res: any, next: any) => {
        // Mock optional auth - just call next
        next();
      },
      requireAuth: (_req: any, _res: any, next: any) => {
        next();
      },
      requireMerchant: (_req: any, _res: any, next: any) => {
        next();
      },
      requireWallet: (_req: any, _res: any, next: any) => {
        next();
      },
      authenticateApiKey: (_req: any, _res: any, next: any) => {
        next();
      },
      authenticateWallet: (_req: any, _res: any, next: any) => {
        next();
      }
    };
    
    const walletAuthRoutes = new WalletAuthRoutes(authService, authMiddleware as any);

    app = express();
    app.use(express.json());
    app.use('/api/v1/wallet', walletAuthRoutes.getRouter());
  });

  beforeEach(async () => {
    await TestHelpers.cleanupDatabase();
  });

  afterAll(async () => {
    await TestHelpers.closeDatabase();
  });

  describe('GET /api/v1/wallet/wallets', () => {
    it('should return supported wallets', async () => {
      const response = await request(app)
        .get('/api/v1/wallet/wallets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.wallets).toBeDefined();
      expect(Array.isArray(response.body.data.wallets)).toBe(true);
      expect(response.body.data.wallets.length).toBeGreaterThan(0);
    });

    it('should include wallet details', async () => {
      const response = await request(app)
        .get('/api/v1/wallet/wallets')
        .expect(200);

      const wallets = response.body.data.wallets;
      expect(wallets[0]).toHaveProperty('id');
      expect(wallets[0]).toHaveProperty('name');
      expect(wallets[0]).toHaveProperty('icon');
      expect(wallets[0]).toHaveProperty('downloadUrl');
    });
  });

  describe('GET /api/v1/wallet/chains', () => {
    it('should return supported chains', async () => {
      const response = await request(app)
        .get('/api/v1/wallet/chains')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chains).toBeDefined();
      expect(Array.isArray(response.body.data.chains)).toBe(true);
      expect(response.body.data.chains.length).toBeGreaterThan(0);
    });

    it('should include chain details', async () => {
      const response = await request(app)
        .get('/api/v1/wallet/chains')
        .expect(200);

      const chains = response.body.data.chains;
      expect(chains[0]).toHaveProperty('id');
      expect(chains[0]).toHaveProperty('name');
      expect(chains[0]).toHaveProperty('rpcUrl');
      expect(chains[0]).toHaveProperty('ss58Format');
      expect(chains[0]).toHaveProperty('decimals');
      expect(chains[0]).toHaveProperty('symbol');
    });
  });

  describe('POST /api/v1/wallet/challenge', () => {
    it('should generate a challenge for valid address', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const chainId = 'polkadot';

      const response = await request(app)
        .post('/api/v1/wallet/challenge')
        .send({ address, chainId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.challenge).toBeDefined();
      expect(response.body.data.challenge.message).toContain(address);
      expect(response.body.data.challenge.nonce).toBeDefined();
      expect(response.body.data.challenge.timestamp).toBeDefined();
    });

    it('should use default chainId when not provided', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

      const response = await request(app)
        .post('/api/v1/wallet/challenge')
        .send({ address })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.challenge).toBeDefined();
    });

    it('should return 400 for invalid address', async () => {
      const invalidAddress = 'invalid-address';

      const response = await request(app)
        .post('/api/v1/wallet/challenge')
        .send({ address: invalidAddress })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing address', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/challenge')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/wallet/verify', () => {
    it('should verify a valid signature', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const chainId = 'polkadot';
      const signature = '0x1234567890abcdef';
      const merchantId = 'test-merchant-id';

      // First generate a challenge
      const challengeResponse = await request(app)
        .post('/api/v1/wallet/challenge')
        .send({ address, chainId });

      const challenge = challengeResponse.body.data.challenge;

      const response = await request(app)
        .post('/api/v1/wallet/verify')
        .send({
          address,
          signature,
          challenge,
          merchantId,
          chainId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.address).toBe(address);
      expect(response.body.data.merchantId).toBe(merchantId);
    });

    it('should return 400 for invalid signature', async () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const chainId = 'polkadot';
      const invalidSignature = '0xinvalid';
      const merchantId = 'test-merchant-id';

      // First generate a challenge
      const challengeResponse = await request(app)
        .post('/api/v1/wallet/challenge')
        .send({ address, chainId });

      const challenge = challengeResponse.body.data.challenge;

      const response = await request(app)
        .post('/api/v1/wallet/verify')
        .send({
          address,
          signature: invalidSignature,
          challenge,
          merchantId,
          chainId,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/verify')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/wallet/status', () => {
    it('should return connection status', async () => {
      const response = await request(app)
        .get('/api/v1/wallet/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/v1/wallet/refresh', () => {
    it('should refresh a session', async () => {
      const sessionId = 'test-session-id';

      const response = await request(app)
        .post('/api/v1/wallet/refresh')
        .send({ sessionId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
    });

    it('should return 400 for missing sessionId', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/wallet/revoke', () => {
    it('should revoke a session', async () => {
      const sessionId = 'test-session-id';

      const response = await request(app)
        .post('/api/v1/wallet/revoke')
        .send({ sessionId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBeDefined();
    });

    it('should return 400 for missing sessionId', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/revoke')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});
