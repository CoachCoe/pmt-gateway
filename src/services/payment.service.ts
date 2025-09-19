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

export class PaymentService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

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

      // Convert fiat amount to DOT
      const cryptoAmount = priceService.convertFiatToDOT(
        input.amount, 
        input.currency
      );

      // Validate DOT amount
      if (!validateDOTAmount(cryptoAmount)) {
        throw new Error('Invalid DOT amount calculated');
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
        throw new Error('Payment intent cannot be canceled in current status');
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
      throw new Error('Amount must be positive');
    }

    if (input.amount > 99999999) {
      throw new Error('Amount too large');
    }

    // Validate currency
    const supportedCurrencies: SupportedFiatCurrency[] = ['usd', 'eur', 'gbp', 'jpy'];
    if (!supportedCurrencies.includes(input.currency as SupportedFiatCurrency)) {
      throw new Error('Unsupported currency');
    }

    // Validate crypto currency
    const supportedCryptoCurrencies: SupportedCryptoCurrency[] = ['dot', 'dot-stablecoin'];
    if (input.crypto_currency && !supportedCryptoCurrencies.includes(input.crypto_currency)) {
      throw new Error('Unsupported crypto currency');
    }

    // Validate metadata
    if (input.metadata) {
      if (Object.keys(input.metadata).length > 20) {
        throw new Error('Metadata cannot have more than 20 keys');
      }

      const metadataString = JSON.stringify(input.metadata);
      if (metadataString.length > 1000) {
        throw new Error('Metadata too large');
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
