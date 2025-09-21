import { PrismaClient, PaymentStatus } from '@prisma/client';
import { config } from '@/config';
import logger from '@/utils/logger';
import { priceService, validateDOTAmount, formatDOTAmount } from '@/utils/price.utils';
import { 
  CreatePaymentIntentRequest, 
  PaymentIntentResponse, 
  SupportedFiatCurrency,
  SupportedCryptoCurrency 
} from '@/types/api.types';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError 
} from '@/middleware/error.middleware';

/**
 * Service for managing payment intents and processing payments
 * 
 * This service handles the complete payment lifecycle including:
 * - Creating payment intents with fiat to crypto conversion
 * - Validating payment data and merchant permissions
 * - Managing payment status updates
 * - Retrieving payment history and statistics
 * 
 * @example
 * ```typescript
 * const paymentService = new PaymentService(prisma);
 * 
 * // Create a new payment intent
 * const payment = await paymentService.createPaymentIntent({
 *   merchantId: 'merchant-123',
 *   amount: 100.00,
 *   currency: 'usd',
 *   crypto_currency: 'dot'
 * });
 * 
 * // Update payment status
 * await paymentService.updatePaymentIntentStatus(payment.id, 'SUCCEEDED');
 * ```
 */
export class PaymentService {
  private prisma: PrismaClient;

  /**
   * Creates a new PaymentService instance
   * @param prisma - Prisma client instance for database operations
   */
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Creates a new payment intent with fiat to crypto conversion
   * 
   * This method handles the complete payment intent creation process:
   * 1. Validates merchant exists and is active
   * 2. Converts fiat amount to crypto using current exchange rates
   * 3. Validates the converted amount meets minimum requirements
   * 4. Sets expiration time (default: 5 minutes)
   * 5. Stores the payment intent in the database
   * 
   * @param input - Payment intent creation data
   * @param merchantId - ID of the merchant creating the payment intent
   * @returns Promise resolving to the created payment intent response
   * @throws {NotFoundError} When merchant is not found
   * @throws {ValidationError} When input validation fails
   * 
   * @example
   * ```typescript
   * const payment = await paymentService.createPaymentIntent({
   *   merchantId: 'merchant-123',
   *   amount: 100.00,
   *   currency: 'usd',
   *   crypto_currency: 'dot',
   *   metadata: { orderId: 'order-456' }
   * }, 'merchant-123');
   * ```
   */
  public async createPaymentIntent(
    input: CreatePaymentIntentRequest,
    merchantId: string
  ): Promise<PaymentIntentResponse> {
    try {
      logger.info('Creating payment intent', { 
        amount: input.amount, 
        currency: input.currency,
        merchantId 
      });

      // Validate input
      this.validatePaymentIntentInput(input);

      // Validate merchant exists
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId }
      });

      if (!merchant) {
        throw new NotFoundError('Merchant not found');
      }

      // Convert fiat amount to DOT
      const cryptoAmount = priceService.convertFiatToDOT(
        input.amount, 
        input.currency
      );

      // Validate DOT amount
      if (!validateDOTAmount(cryptoAmount)) {
        throw new ValidationError('Invalid DOT amount calculated');
      }

      // Set expiration time (5 minutes from now)
      const expiresAt = new Date(Date.now() + config.paymentExpirationMinutes * 60 * 1000);

      // Create payment intent in database
      const paymentIntent = await this.prisma.paymentIntent.create({
        data: {
          amount: input.amount,
          currency: input.currency,
          cryptoAmount: formatDOTAmount(cryptoAmount),
          cryptoCurrency: input.crypto_currency || 'dot',
          status: PaymentStatus.REQUIRES_PAYMENT,
          expiresAt,
          metadata: input.metadata || {},
          merchantId,
        },
      });

      logger.info('Payment intent created successfully', { 
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        cryptoAmount: paymentIntent.cryptoAmount
      });

      return this.formatPaymentIntentResponse(paymentIntent);

    } catch (error) {
      logger.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  public async getPaymentIntent(
    id: string,
    merchantId: string
  ): Promise<PaymentIntentResponse | null> {
    try {
      const paymentIntent = await this.prisma.paymentIntent.findFirst({
        where: {
          id,
          merchantId,
        },
      });

      if (!paymentIntent) {
        return null;
      }

      return this.formatPaymentIntentResponse(paymentIntent);

    } catch (error) {
      logger.error('Failed to get payment intent:', { id, error });
      throw error;
    }
  }

  public async updatePaymentIntentStatus(
    id: string,
    status: PaymentStatus,
    walletAddress?: string,
    transactionHash?: string
  ): Promise<PaymentIntentResponse | null> {
    try {
      const paymentIntent = await this.prisma.paymentIntent.update({
        where: { id },
        data: {
          status,
          walletAddress: walletAddress || null,
          transactionHash: transactionHash || null,
        },
      });

      logger.info('Payment intent status updated', {
        id,
        status,
        walletAddress,
        transactionHash
      });

      return this.formatPaymentIntentResponse(paymentIntent);

    } catch (error) {
      logger.error('Failed to update payment intent status:', { id, status, error });
      throw error;
    }
  }

  public async getPaymentIntentsByMerchant(
    merchantId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: PaymentStatus;
      currency?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    paymentIntents: PaymentIntentResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const where: any = { merchantId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.currency) {
        where.currency = filters.currency;
      }

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      const [paymentIntents, total] = await Promise.all([
        this.prisma.paymentIntent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.paymentIntent.count({ where }),
      ]);

      return {
        paymentIntents: paymentIntents.map(this.formatPaymentIntentResponse),
        total,
        page,
        limit,
      };

    } catch (error) {
      logger.error('Failed to get payment intents by merchant:', { merchantId, error });
      throw error;
    }
  }

  public async cancelPaymentIntent(
    id: string,
    merchantId: string
  ): Promise<PaymentIntentResponse | null> {
    try {
      const paymentIntent = await this.prisma.paymentIntent.findFirst({
        where: { id, merchantId },
      });

      if (!paymentIntent) {
        return null;
      }

      if (paymentIntent.status !== PaymentStatus.REQUIRES_PAYMENT) {
        throw new ConflictError('Payment intent cannot be canceled in current status');
      }

      const updatedPaymentIntent = await this.prisma.paymentIntent.update({
        where: { id },
        data: { status: PaymentStatus.CANCELED },
      });

      logger.info('Payment intent canceled', { id, merchantId });

      return this.formatPaymentIntentResponse(updatedPaymentIntent);

    } catch (error) {
      logger.error('Failed to cancel payment intent:', { id, merchantId, error });
      throw error;
    }
  }

  public async processExpiredPaymentIntents(): Promise<number> {
    try {
      const expiredPaymentIntents = await this.prisma.paymentIntent.updateMany({
        where: {
          status: PaymentStatus.REQUIRES_PAYMENT,
          expiresAt: {
            lt: new Date(),
          },
        },
        data: {
          status: PaymentStatus.EXPIRED,
        },
      });

      if (expiredPaymentIntents.count > 0) {
        logger.info('Processed expired payment intents', {
          count: expiredPaymentIntents.count
        });
      }

      return expiredPaymentIntents.count;

    } catch (error) {
      logger.error('Failed to process expired payment intents:', error);
      throw error;
    }
  }

  public async getPaymentIntentByTransactionHash(
    transactionHash: string
  ): Promise<PaymentIntentResponse | null> {
    try {
      const paymentIntent = await this.prisma.paymentIntent.findFirst({
        where: { transactionHash },
      });

      if (!paymentIntent) {
        return null;
      }

      return this.formatPaymentIntentResponse(paymentIntent);

    } catch (error) {
      logger.error('Failed to get payment intent by transaction hash:', { transactionHash, error });
      throw error;
    }
  }

  private validatePaymentIntentInput(input: CreatePaymentIntentRequest): void {
    // Validate amount
    if (input.amount <= 0) {
      throw new ValidationError('Amount must be positive', 'amount');
    }

    if (input.amount > 99999999) {
      throw new ValidationError('Amount too large', 'amount');
    }

    // Validate currency
    const supportedCurrencies: SupportedFiatCurrency[] = ['usd', 'eur', 'gbp', 'jpy'];
    if (!supportedCurrencies.includes(input.currency as SupportedFiatCurrency)) {
      throw new ValidationError('Unsupported currency', 'currency');
    }

    // Validate crypto currency
    const supportedCryptoCurrencies: SupportedCryptoCurrency[] = ['dot', 'dot-stablecoin'];
    if (input.crypto_currency && !supportedCryptoCurrencies.includes(input.crypto_currency)) {
      throw new ValidationError('Unsupported crypto currency', 'crypto_currency');
    }

    // Validate metadata
    if (input.metadata) {
      if (Object.keys(input.metadata).length > 20) {
        throw new ValidationError('Metadata cannot have more than 20 keys', 'metadata');
      }

      const metadataString = JSON.stringify(input.metadata);
      if (metadataString.length > 1000) {
        throw new ValidationError('Metadata too large', 'metadata');
      }
    }
  }

  private formatPaymentIntentResponse(paymentIntent: any): PaymentIntentResponse {
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      crypto_amount: paymentIntent.cryptoAmount,
      crypto_currency: paymentIntent.cryptoCurrency,
      status: paymentIntent.status,
      wallet_address: paymentIntent.walletAddress,
      transaction_hash: paymentIntent.transactionHash,
      expires_at: paymentIntent.expiresAt.toISOString(),
      metadata: paymentIntent.metadata,
      created_at: paymentIntent.createdAt.toISOString(),
    };
  }
}
