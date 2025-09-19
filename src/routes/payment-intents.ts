import { Router, Request, Response } from 'express';
import { PaymentService } from '@/services/payment.service';
import { WebhookService } from '@/services/webhook.service';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { ValidationMiddleware } from '@/middleware/validation.middleware';
import { 
  createPaymentIntentSchema, 
  paymentIntentIdSchema,
  paymentIntentQuerySchema 
} from '@/utils/validation.schemas';
import { 
  paymentIntentRateLimit,
  generalRateLimit 
} from '@/middleware/rate-limit.middleware';
import logger from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class PaymentIntentRoutes {
  private router: Router;
  private paymentService: PaymentService;
  private webhookService: WebhookService;
  private authMiddleware: AuthMiddleware;
  private validationMiddleware: ValidationMiddleware;

  constructor(
    paymentService: PaymentService,
    webhookService: WebhookService,
    authMiddleware: AuthMiddleware
  ) {
    this.router = Router();
    this.paymentService = paymentService;
    this.webhookService = webhookService;
    this.authMiddleware = authMiddleware;
    this.validationMiddleware = new ValidationMiddleware();

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Create payment intent
    this.router.post(
      '/',
      generalRateLimit,
      this.authMiddleware.authenticateApiKey,
      this.validationMiddleware.validateBody(createPaymentIntentSchema),
      this.createPaymentIntent.bind(this)
    );

    // Get payment intent by ID
    this.router.get(
      '/:id',
      generalRateLimit,
      this.authMiddleware.authenticateApiKey,
      this.validationMiddleware.validateParams(paymentIntentIdSchema),
      this.getPaymentIntent.bind(this)
    );

    // Get payment intents with pagination and filters
    this.router.get(
      '/',
      generalRateLimit,
      this.authMiddleware.authenticateApiKey,
      this.validationMiddleware.validateQuery(paymentIntentQuerySchema),
      this.getPaymentIntents.bind(this)
    );

    // Cancel payment intent
    this.router.post(
      '/:id/cancel',
      paymentIntentRateLimit,
      this.authMiddleware.authenticateApiKey,
      this.validationMiddleware.validateParams(paymentIntentIdSchema),
      this.cancelPaymentIntent.bind(this)
    );

    // Get payment intent by transaction hash (for webhook processing)
    this.router.get(
      '/transaction/:hash',
      generalRateLimit,
      this.authMiddleware.authenticateApiKey,
      this.getPaymentIntentByTransactionHash.bind(this)
    );
  }

  private async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      
      logger.info('Creating payment intent', {
        requestId,
        merchantId: req.merchantId,
        amount: req.body.amount,
        currency: req.body.currency,
      });

      const paymentIntent = await this.paymentService.createPaymentIntent(
        req.body,
        req.merchantId!
      );

      // Send webhook for payment intent created
      await this.webhookService.createWebhookEvent(
        paymentIntent.id,
        'payment.processing',
        paymentIntent
      );

      res.status(201).json({
        success: true,
        data: paymentIntent,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to create payment intent:', {
        requestId: req.headers['x-request-id'],
        merchantId: req.merchantId,
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_INTENT_CREATION_FAILED',
          message: 'Failed to create payment intent',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  private async getPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      const id = req.params['id'] as string;

      logger.info('Getting payment intent', {
        requestId,
        merchantId: req.merchantId,
        paymentIntentId: id,
      });

      const paymentIntent = await this.paymentService.getPaymentIntent(
        id as string,
        req.merchantId!
      );

      if (!paymentIntent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PAYMENT_INTENT_NOT_FOUND',
            message: 'Payment intent not found',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: paymentIntent,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get payment intent:', {
        requestId: req.headers['x-request-id'],
        merchantId: req.merchantId,
        paymentIntentId: req.params['id'],
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_INTENT_RETRIEVAL_FAILED',
          message: 'Failed to retrieve payment intent',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  private async getPaymentIntents(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      const { page, limit, status, currency, start_date, end_date } = req.query;

      logger.info('Getting payment intents', {
        requestId,
        merchantId: req.merchantId,
        page,
        limit,
        filters: { status, currency, start_date, end_date },
      });

      const result = await this.paymentService.getPaymentIntentsByMerchant(
        req.merchantId!,
        Number(page),
        Number(limit),
        {
          status: status as any,
          currency: currency as string,
          startDate: start_date ? new Date(start_date as string) : undefined,
          endDate: end_date ? new Date(end_date as string) : undefined,
        } as any
      );

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get payment intents:', {
        requestId: req.headers['x-request-id'],
        merchantId: req.merchantId,
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_INTENTS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve payment intents',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  private async cancelPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      const id = req.params['id'] as string;

      logger.info('Canceling payment intent', {
        requestId,
        merchantId: req.merchantId,
        paymentIntentId: id,
      });

      const paymentIntent = await this.paymentService.cancelPaymentIntent(
        id as string,
        req.merchantId!
      );

      if (!paymentIntent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PAYMENT_INTENT_NOT_FOUND',
            message: 'Payment intent not found',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        });
        return;
      }

      // Send webhook for payment canceled
      await this.webhookService.createWebhookEvent(
        paymentIntent.id,
        'payment.canceled',
        paymentIntent
      );

      res.json({
        success: true,
        data: paymentIntent,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to cancel payment intent:', {
        requestId: req.headers['x-request-id'],
        merchantId: req.merchantId,
        paymentIntentId: req.params['id'],
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_INTENT_CANCELATION_FAILED',
          message: 'Failed to cancel payment intent',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    }
  }

  private async getPaymentIntentByTransactionHash(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      const hash = req.params['hash'] as string;

      logger.info('Getting payment intent by transaction hash', {
        requestId,
        merchantId: req.merchantId,
        transactionHash: hash,
      });

      const paymentIntent = await this.paymentService.getPaymentIntentByTransactionHash(hash as string);

      if (!paymentIntent) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PAYMENT_INTENT_NOT_FOUND',
            message: 'Payment intent not found for transaction hash',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: paymentIntent,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get payment intent by transaction hash:', {
        requestId: req.headers['x-request-id'],
        merchantId: req.merchantId,
        transactionHash: req.params['hash'],
        error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_INTENT_RETRIEVAL_FAILED',
          message: 'Failed to retrieve payment intent by transaction hash',
          details: error instanceof Error ? error.message : 'Unknown error',
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
