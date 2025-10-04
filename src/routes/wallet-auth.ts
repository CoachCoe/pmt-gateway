import { Router, Request, Response } from 'express';
import { walletAuthService } from '@/services/wallet-auth.service';
import { polkadotSSOService } from '@/services/polkadot-sso.service';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { 
  challengeRateLimit, 
  verifyRateLimit, 
  strictAuthRateLimit 
} from '@/middleware/rate-limit.middleware';
import { 
  sanitizeBody, 
  sanitizeFields, 
  sanitizePolkadotAddress, 
  sanitizeSignature 
} from '@/middleware/sanitization.middleware';
import { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  asyncHandler 
} from '@/middleware/error.middleware';
import logger from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class WalletAuthRoutes {
  private router: Router;
  private authMiddleware: AuthMiddleware;

  constructor(authMiddleware: AuthMiddleware) {
    this.router = Router();
    this.authMiddleware = authMiddleware;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get supported wallets
    this.router.get(
      '/wallets',
      this.getSupportedWallets.bind(this)
    );

    // Get supported chains
    this.router.get(
      '/chains',
      this.getSupportedChains.bind(this)
    );

    // Generate authentication challenge
    this.router.post(
      '/challenge',
      challengeRateLimit,
      sanitizeBody,
      sanitizeFields(['address', 'chainId']),
      asyncHandler(this.generateChallenge.bind(this))
    );

    // Verify wallet authentication
    this.router.post(
      '/verify',
      verifyRateLimit,
      sanitizeBody,
      sanitizeFields(['signature', 'address', 'merchantId', 'chainId']),
      asyncHandler(this.verifyAuthentication.bind(this))
    );

    // Get wallet connection status
    this.router.get(
      '/status',
      this.authMiddleware.optionalAuth,
      this.getConnectionStatus.bind(this)
    );

    // Refresh session
    this.router.post(
      '/refresh',
      strictAuthRateLimit,
      sanitizeBody,
      sanitizeFields(['sessionId']),
      asyncHandler(this.refreshSession.bind(this))
    );

    // Revoke session
    this.router.post(
      '/revoke',
      strictAuthRateLimit,
      sanitizeBody,
      sanitizeFields(['sessionId']),
      asyncHandler(this.revokeSession.bind(this))
    );
  }

  private async getSupportedWallets(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();

      const wallets = [
        {
          id: 'polkadot-js',
          name: 'Polkadot.js',
          description: 'Official Polkadot browser extension',
          icon: 'https://polkadot.js.org/img/polkadot-logo.svg',
          supportedChains: ['polkadot', 'kusama', 'westend'],
        },
        {
          id: 'talisman',
          name: 'Talisman',
          description: 'Talisman wallet for Polkadot ecosystem',
          icon: 'https://talisman.xyz/logo.svg',
          supportedChains: ['polkadot', 'kusama', 'westend'],
        },
        {
          id: 'subwallet',
          name: 'SubWallet',
          description: 'SubWallet browser extension',
          icon: 'https://subwallet.app/logo.svg',
          supportedChains: ['polkadot', 'kusama', 'westend'],
        },
      ];

      res.json({
        success: true,
        data: { wallets },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get supported wallets:', {
        requestId: req.headers['x-request-id'],
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'WALLETS_FETCH_FAILED',
          message: 'Failed to get supported wallets',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  private async getSupportedChains(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();

      const chains = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          description: 'Polkadot mainnet',
          rpcEndpoint: 'wss://rpc.polkadot.io',
          explorerUrl: 'https://polkadot.js.org/apps',
          nativeCurrency: {
            name: 'DOT',
            symbol: 'DOT',
            decimals: 10,
          },
        },
        {
          id: 'kusama',
          name: 'Kusama',
          description: 'Kusama canary network',
          rpcEndpoint: 'wss://kusama-rpc.polkadot.io',
          explorerUrl: 'https://polkadot.js.org/apps?rpc=wss%3A%2F%2Fkusama-rpc.polkadot.io',
          nativeCurrency: {
            name: 'KSM',
            symbol: 'KSM',
            decimals: 12,
          },
        },
        {
          id: 'westend',
          name: 'Westend',
          description: 'Westend testnet',
          rpcEndpoint: 'wss://westend-rpc.polkadot.io',
          explorerUrl: 'https://polkadot.js.org/apps?rpc=wss%3A%2F%2Fwestend-rpc.polkadot.io',
          nativeCurrency: {
            name: 'WND',
            symbol: 'WND',
            decimals: 12,
          },
        },
      ];

      res.json({
        success: true,
        data: { chains },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get supported chains:', {
        requestId: req.headers['x-request-id'],
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'CHAINS_FETCH_FAILED',
          message: 'Failed to get supported chains',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  private async generateChallenge(req: Request, res: Response): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const { address, chainId = 'polkadot' } = req.body;

    if (!address) {
      throw new ValidationError('Wallet address is required', 'address');
    }

    // Validate and sanitize address
    const sanitizedAddress = sanitizePolkadotAddress(address);
    
    // Validate address format using service
    if (!walletAuthService.validateAddress(sanitizedAddress)) {
      throw new ValidationError('Invalid wallet address format', 'address');
    }

    logger.info('Generating wallet auth challenge', {
      requestId,
      address: sanitizedAddress,
      chainId,
    });

    const challenge = await walletAuthService.generateChallenge(sanitizedAddress, chainId);

    res.json({
      success: true,
      data: { challenge },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    });
  }

  private async verifyAuthentication(req: Request, res: Response): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const { signature, address, challenge, merchantId, chainId = 'polkadot' } = req.body;

    if (!signature || !address || !challenge || !merchantId) {
      throw new ValidationError('Signature, address, challenge, and merchantId are required');
    }

    // Validate and sanitize inputs
    const sanitizedAddress = sanitizePolkadotAddress(address);
    const sanitizedSignature = sanitizeSignature(signature);
    
    // Validate address format using service
    if (!walletAuthService.validateAddress(sanitizedAddress)) {
      throw new ValidationError('Invalid wallet address format', 'address');
    }

    logger.info('Verifying wallet authentication', {
      requestId,
      address: sanitizedAddress,
      merchantId,
      chainId,
    });

    // Verify the signature using enhanced SSO integration
    const verificationResult = await walletAuthService.verifySignature(
      { signature: sanitizedSignature, address: sanitizedAddress, challenge },
      sanitizedAddress,
      chainId
    );

    if (!verificationResult.valid) {
      throw new AuthenticationError('Invalid wallet signature');
    }

    // Create wallet session with SSO integration
    let sessionId = verificationResult.sessionId;
    if (!sessionId) {
      // Create session manually if not provided by SSO
      const session = await polkadotSSOService.createSession(
        sanitizedAddress,
        chainId,
        verificationResult.walletType || 'unknown'
      );
      sessionId = session.sessionId;
    }

    // Create wallet session token
    // Simplified authentication for on-chain system
    const token = 'mock_jwt_token_' + Date.now();

    logger.info('Wallet authentication successful', {
      requestId,
      address: sanitizedAddress,
      merchantId,
      sessionId,
      walletType: verificationResult.walletType,
    });

    res.json({
      success: true,
      data: {
        token,
        address: sanitizedAddress,
        merchantId,
        sessionId,
        walletType: verificationResult.walletType,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    });
  }

  private async getConnectionStatus(req: Request, res: Response): Promise<void> {
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
  }

  private async refreshSession(req: Request, res: Response): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new ValidationError('Session ID is required', 'sessionId');
    }

    logger.info('Refreshing wallet session', {
      requestId,
      sessionId,
    });

    try {
      const newSession = await polkadotSSOService.refreshSession(sessionId);
      
      if (!newSession) {
        throw new NotFoundError('Session not found or expired');
      }

      res.json({
        success: true,
        data: {
          sessionId: newSession.sessionId,
          accessToken: newSession.accessToken,
          expiresAt: newSession.expiresAt,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to refresh session:', {
        requestId,
        sessionId,
        error,
      });

      throw error;
    }
  }

  private async revokeSession(req: Request, res: Response): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new ValidationError('Session ID is required', 'sessionId');
    }

    logger.info('Revoking wallet session', {
      requestId,
      sessionId,
    });

    try {
      await polkadotSSOService.revokeSession(sessionId);

      res.json({
        success: true,
        data: { revoked: true },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to revoke session:', {
        requestId,
        sessionId,
        error,
      });

      throw error;
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}