import { Router, Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { walletAuthService } from '@/services/wallet-auth.service';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { authRateLimit } from '@/middleware/rate-limit.middleware';
import logger from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class WalletAuthRoutes {
  private router: Router;
  private authService: AuthService;
  private authMiddleware: AuthMiddleware;

  constructor(authService: AuthService, authMiddleware: AuthMiddleware) {
    this.router = Router();
    this.authService = authService;
    this.authMiddleware = authMiddleware;

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get supported wallets
    this.router.get(
      '/wallets',
      this.getSupportedWallets.bind(this)
    );

    // Generate authentication challenge
    this.router.post(
      '/challenge',
      authRateLimit,
      this.generateChallenge.bind(this)
    );

    // Verify wallet authentication
    this.router.post(
      '/verify',
      authRateLimit,
      this.verifyAuthentication.bind(this)
    );

    // Get wallet connection status
    this.router.get(
      '/status',
      this.authMiddleware.optionalAuth,
      this.getConnectionStatus.bind(this)
    );
  }

  private async getSupportedWallets(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      
      logger.info('Getting supported wallets', { requestId });

      const wallets = walletAuthService.getSupportedWallets();

      res.json({
        success: true,
        data: { wallets },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get supported wallets:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'WALLETS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve supported wallets',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  private async generateChallenge(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      const { address } = req.body;

      if (!address) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ADDRESS',
            message: 'Wallet address is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        });
        return;
      }

      // Validate address format
      if (!walletAuthService.validateAddress(address)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ADDRESS',
            message: 'Invalid wallet address format',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        });
        return;
      }

      logger.info('Generating wallet auth challenge', {
        requestId,
        address,
      });

      const challenge = walletAuthService.generateChallenge(address);

      res.json({
        success: true,
        data: { challenge },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to generate challenge:', {
        requestId: req.headers['x-request-id'],
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'CHALLENGE_GENERATION_FAILED',
          message: 'Failed to generate authentication challenge',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  private async verifyAuthentication(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      const { signature, address, challenge, merchantId } = req.body;

      if (!signature || !address || !challenge || !merchantId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Signature, address, challenge, and merchantId are required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        });
        return;
      }

      logger.info('Verifying wallet authentication', {
        requestId,
        address,
        merchantId,
      });

      // Verify the signature
      const isValid = walletAuthService.verifySignature(
        { signature, address, challenge },
        address
      );

      if (!isValid) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid wallet signature',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        });
        return;
      }

      // Create wallet session
      const token = await this.authService.authenticateWallet(
        { address, source: 'polkadot-js' }, // Default source
        merchantId
      );

      logger.info('Wallet authentication successful', {
        requestId,
        address,
        merchantId,
      });

      res.json({
        success: true,
        data: {
          token,
          address,
          merchantId,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to verify wallet authentication:', {
        requestId: req.headers['x-request-id'],
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_VERIFICATION_FAILED',
          message: 'Failed to verify wallet authentication',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  private async getConnectionStatus(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      
      if (!req.authPayload) {
        res.json({
          success: true,
          data: {
            connected: false,
            address: null,
            merchantId: null,
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        });
        return;
      }

      logger.info('Getting wallet connection status', {
        requestId,
        address: req.authPayload.walletAddress,
        merchantId: req.authPayload.merchantId,
      });

      res.json({
        success: true,
        data: {
          connected: true,
          address: req.authPayload.walletAddress,
          merchantId: req.authPayload.merchantId,
          type: req.authPayload.type,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get connection status:', {
        requestId: req.headers['x-request-id'],
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve connection status',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
