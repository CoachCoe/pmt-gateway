import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { config } from '@/config';
import logger from '@/utils/logger';
import { generalRateLimit } from '@/middleware/rate-limit.middleware';

// Import services
import { PaymentService } from '@/services/payment.service';
import { WebhookService } from '@/services/webhook.service';
import { AuthService } from '@/services/auth.service';
import { BlockchainMonitorService } from '@/services/blockchain-monitor.service';
import { polkadotService } from '@/services/polkadot-simple.service';
import { priceService } from '@/utils/price.utils';

// Import routes
import { PaymentIntentRoutes } from '@/routes/payment-intents';
import { WalletAuthRoutes } from '@/routes/wallet-auth';

// Import middleware
import { AuthMiddleware } from '@/middleware/auth.middleware';

class Application {
  private app: express.Application;
  private prisma: PrismaClient;
  private server: any;
  private blockchainMonitorService!: BlockchainMonitorService;

  constructor() {
    this.app = express();
    this.prisma = new PrismaClient();
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
          scriptSrc: ["'self'"],
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

    // Request ID middleware
    this.app.use((req, res, next) => {
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = require('uuid').v4() as string;
      }
      res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
      next();
    });

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
            database: {
              connected: true, // Prisma will throw if not connected
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

    // Initialize services
    const paymentService = new PaymentService(this.prisma);
    const webhookService = new WebhookService(this.prisma);
    const authService = new AuthService(this.prisma);
    const authMiddleware = new AuthMiddleware(this.prisma);
    const blockchainMonitorService = new BlockchainMonitorService(
      this.prisma,
      paymentService,
      webhookService
    );

    // Store services for use in start method
    this.blockchainMonitorService = blockchainMonitorService;

    // API routes
    this.app.use('/api/v1/payment-intents', new PaymentIntentRoutes(
      paymentService,
      webhookService,
      authMiddleware
    ).getRouter());

    this.app.use('/api/v1/wallet', new WalletAuthRoutes(
      authService,
      authMiddleware
    ).getRouter());

    // 404 handler
    this.app.use('*', (req, _res) => {
      _res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id'],
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.prisma.$connect();
      logger.info('Connected to database');

      // Start Polkadot service
      await polkadotService.isApiReady();
      logger.info('Polkadot service initialized');

      // Start price service
      logger.info('Price service initialized');

      // Start blockchain monitoring
      await this.blockchainMonitorService.startMonitoring();
      logger.info('Blockchain monitoring service started');

      // Start server
      this.server = this.app.listen(config.port, () => {
        logger.info(`Server started on port ${config.port}`, {
          environment: config.nodeEnv,
          port: config.port,
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

      // Stop blockchain monitoring
      await this.blockchainMonitorService.stopMonitoring();
      logger.info('Blockchain monitoring service stopped');

      // Disconnect from Polkadot
      await polkadotService.disconnect();
      logger.info('Disconnected from Polkadot');

      // Disconnect from database
      await this.prisma.$disconnect();
      logger.info('Disconnected from database');

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
