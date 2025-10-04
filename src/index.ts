import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from '@/config';
import logger from '@/utils/logger';
import { generalRateLimit } from '@/middleware/rate-limit.middleware';
import { 
  errorHandler, 
  notFoundHandler, 
  correlationIdMiddleware 
} from '@/middleware/error.middleware';

// Import on-chain services
import { merchantRegistryService } from '@/services/merchant-registry.service';
import { sessionService } from '@/services/session.service';
import { polkadotRealService as polkadotService } from '@/services/polkadot-real.service';
import { polkadotSSOService } from '@/services/polkadot-sso.service';
import { priceService } from '@/utils/price.utils';

// Import routes
import { WalletAuthRoutes } from '@/routes/wallet-auth';
import { Web3AuthRoutes } from '@/routes/web3-auth';

// Import middleware
import { AuthMiddleware } from '@/middleware/auth.middleware';

class Application {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Correlation ID middleware
    this.app.use(correlationIdMiddleware);

    // Request logging
    this.app.use((req, _res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id'],
      });
      next();
    });

    // Rate limiting
    this.app.use(generalRateLimit);

    // Polkadot SSO middleware
    try {
      const ssoMiddleware = polkadotSSOService.getMiddleware();
      this.app.use('/auth', ssoMiddleware);
      logger.info('Polkadot SSO middleware initialized');
    } catch (error) {
      logger.warn('Failed to initialize Polkadot SSO middleware, continuing without it:', error);
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: config.nodeEnv,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    });

    // Favicon
    this.app.get('/favicon.ico', (_req, res) => {
      res.status(204).end();
    });

    // API status endpoint
    this.app.get('/api/status', async (req, res) => {
      try {
        const [polkadotStatus, priceStatus] = await Promise.all([
          polkadotService.isApiReady(),
          !priceService.isPriceStale('usd'),
        ]);

        res.json({
          success: true,
          data: {
            polkadot: {
              connected: polkadotStatus,
            },
            price_oracle: {
              healthy: priceStatus,
              last_update: priceService.getLastUpdateTime().toISOString(),
            },
            blockchain: {
              connected: true, // Fully on-chain system
            },
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] as string || 'unknown',
          },
        });
      } catch (error) {
        logger.error('Status check failed:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'STATUS_CHECK_FAILED',
            message: 'Failed to check system status',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] as string || 'unknown',
          },
        });
      }
    });

    // Initialize on-chain services
    const authMiddleware = new AuthMiddleware();

    // API routes (simplified for on-chain system)
    this.app.use('/api/v1/wallet', new WalletAuthRoutes(
      authMiddleware
    ).getRouter());

    this.app.use('/api/v1/auth', new Web3AuthRoutes().getRouter());

    // 404 handler
    this.app.use('*', notFoundHandler);
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize on-chain services
      await merchantRegistryService.initialize();
      logger.info('Merchant registry service initialized');

      // Start Polkadot service
      await polkadotService.isApiReady();
      logger.info('Polkadot service initialized');

      // Start price service
      logger.info('Price service initialized');

      // Start server
      this.server = this.app.listen(config.port, () => {
        logger.info(`🚀 PMT Gateway started on port ${config.port}`, {
          environment: config.nodeEnv,
          port: config.port,
          mode: 'fully-on-chain',
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down application...');

    try {
      // Close server
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Stop session service cleanup
      sessionService.stopCleanup();
      logger.info('Session service stopped');

      // Disconnect from Polkadot
      await polkadotService.disconnect();
      logger.info('Disconnected from Polkadot');

      logger.info('Application shutdown complete');
      process.exit(0);

    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start application
const app = new Application();
app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export default app;
