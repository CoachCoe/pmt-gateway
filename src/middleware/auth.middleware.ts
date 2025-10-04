import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

// Extend Express Request type to include merchantId
declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
      authPayload?: any;
    }
  }
}

export class AuthMiddleware {
  constructor() {
    // No database dependencies needed
  }

  public authenticateApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_AUTH_HEADER',
            message: 'Authorization header with Bearer token is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] as string || 'unknown',
          },
        });
        return;
      }

      const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // For now, we'll use a simple API key validation
      // In a real implementation, this would verify against blockchain
      if (!apiKey || apiKey.length < 10) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or expired API key',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] as string || 'unknown',
          },
        });
        return;
      }

      // Extract merchant address from API key (simplified)
      req.merchantId = 'merchant_' + apiKey.substring(0, 8);
      next();

    } catch (error) {
      logger.error('API key authentication failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication service error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  };

  public authenticateWallet = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_AUTH_HEADER',
            message: 'Authorization header with Bearer token is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] as string || 'unknown',
          },
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      // Token is used for validation in real implementation
      logger.debug('Token received for validation', { tokenLength: token.length });
      // Simplified token verification for on-chain system
      const authPayload = { 
        merchantId: 'merchant_123', 
        walletAddress: '0x123...',
        type: 'wallet'
      };

      if (!authPayload || authPayload.type !== 'wallet') {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_WALLET_TOKEN',
            message: 'Invalid or expired wallet token',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] as string || 'unknown',
          },
        });
        return;
      }

      req.merchantId = authPayload.merchantId;
      req.authPayload = authPayload;
      next();

    } catch (error) {
      logger.error('Wallet authentication failed:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication service error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  };

  public optionalAuth = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No auth provided, continue without authentication
        next();
        return;
      }

      const token = authHeader.substring(7);
      // Simplified token verification for on-chain system
      logger.debug('Token received for validation', { tokenLength: token.length });
      const authPayload = { 
        merchantId: 'merchant_123', 
        walletAddress: '0x123...',
        type: 'wallet'
      };

      if (authPayload) {
        req.merchantId = authPayload.merchantId;
        req.authPayload = authPayload;
      }

      next();

    } catch (error) {
      logger.debug('Optional authentication failed:', error);
      // Continue without authentication
      next();
    }
  };

  public requireMerchant = (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.merchantId) {
      _res.status(401).json({
        success: false,
        error: {
          code: 'MERCHANT_REQUIRED',
          message: 'Merchant authentication required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    next();
  };

  public requireWallet = (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.authPayload || req.authPayload.type !== 'wallet') {
      _res.status(401).json({
        success: false,
        error: {
          code: 'WALLET_REQUIRED',
          message: 'Wallet authentication required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
      return;
    }

    next();
  };
}
