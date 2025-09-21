import { PrismaClient, PaymentIntent, PaymentStatus } from '@prisma/client';
import { BaseRepository, FindManyOptions } from './base.repository';

/**
 * Payment intent repository interface
 */
export interface IPaymentIntentRepository {
  findById(id: string): Promise<PaymentIntent | null>;
  findByTransactionHash(transactionHash: string): Promise<PaymentIntent | null>;
  findByMerchantId(merchantId: string, options?: FindManyOptions<PaymentIntent>): Promise<{ data: PaymentIntent[]; total: number }>;
  findMany(options?: FindManyOptions<PaymentIntent>): Promise<{ data: PaymentIntent[]; total: number }>;
  createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent>;
  updatePaymentIntent(id: string, data: UpdatePaymentIntentData): Promise<PaymentIntent | null>;
  updateStatus(id: string, status: PaymentStatus): Promise<PaymentIntent | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  count(filters?: Partial<PaymentIntent>): Promise<number>;
  findExpired(): Promise<PaymentIntent[]>;
  findByStatus(status: PaymentStatus, options?: FindManyOptions<PaymentIntent>): Promise<{ data: PaymentIntent[]; total: number }>;
}

/**
 * Data for creating a new payment intent
 */
export interface CreatePaymentIntentData {
  merchantId: string;
  amount: number;
  currency: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  status: PaymentStatus;
  expiresAt: Date;
  transactionHash?: string;
  metadata?: Record<string, any>;
}

/**
 * Data for updating a payment intent
 */
export interface UpdatePaymentIntentData {
  status?: PaymentStatus;
  transactionHash?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment intent repository implementation
 */
export class PaymentIntentRepository extends BaseRepository<PaymentIntent, string> implements IPaymentIntentRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'paymentIntent');
  }

  /**
   * Find a payment intent by transaction hash
   * @param transactionHash - The transaction hash to search for
   * @returns The payment intent or null if not found
   */
  async findByTransactionHash(transactionHash: string): Promise<PaymentIntent | null> {
    try {
      return await this.model.findUnique({
        where: { transactionHash },
      });
    } catch (error) {
      throw new Error(`Failed to find payment intent by transaction hash: ${error}`);
    }
  }

  /**
   * Find payment intents by merchant ID
   * @param merchantId - The merchant ID
   * @param options - Query options
   * @returns Array of payment intents and total count
   */
  async findByMerchantId(merchantId: string, options: FindManyOptions<PaymentIntent> = {}): Promise<{ data: PaymentIntent[]; total: number }> {
    try {
      const where = {
        ...options.where,
        merchantId,
      };

      const [data, total] = await Promise.all([
        this.model.findMany({
          where: where as any,
          skip: options.skip,
          take: options.take,
          orderBy: options.orderBy as any,
          select: options.select,
          include: options.include,
        }),
        this.model.count({
          where: where as any,
        }),
      ]);

      return { data, total };
    } catch (error) {
      throw new Error(`Failed to find payment intents by merchant ID: ${error}`);
    }
  }

  /**
   * Create a new payment intent
   * @param data - The payment intent data
   * @returns The created payment intent
   */
  async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
    try {
      return await this.model.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a payment intent
   * @param id - The payment intent ID
   * @param data - The updated data
   * @returns The updated payment intent or null if not found
   */
  async updatePaymentIntent(id: string, data: UpdatePaymentIntentData): Promise<PaymentIntent | null> {
    try {
      return await this.model.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null; // Record not found
      }
      throw new Error(`Failed to update payment intent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update payment intent status
   * @param id - The payment intent ID
   * @param status - The new status
   * @returns The updated payment intent or null if not found
   */
  async updateStatus(id: string, status: PaymentStatus): Promise<PaymentIntent | null> {
    try {
      return await this.model.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null; // Record not found
      }
      throw new Error(`Failed to update payment intent status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find expired payment intents
   * @returns Array of expired payment intents
   */
  async findExpired(): Promise<PaymentIntent[]> {
    try {
      const now = new Date();
      return await this.model.findMany({
        where: {
          status: PaymentStatus.REQUIRES_PAYMENT,
          expiresAt: {
            lt: now,
          },
        },
        orderBy: { expiresAt: 'asc' },
      });
    } catch (error) {
      throw new Error(`Failed to find expired payment intents: ${error}`);
    }
  }

  /**
   * Find payment intents by status
   * @param status - The payment status
   * @param options - Query options
   * @returns Array of payment intents and total count
   */
  async findByStatus(status: PaymentStatus, options: FindManyOptions<PaymentIntent> = {}): Promise<{ data: PaymentIntent[]; total: number }> {
    try {
      const where = {
        ...options.where,
        status,
      };

      const [data, total] = await Promise.all([
        this.model.findMany({
          where: where as any,
          skip: options.skip,
          take: options.take,
          orderBy: options.orderBy as any,
          select: options.select,
          include: options.include,
        }),
        this.model.count({
          where: where as any,
        }),
      ]);

      return { data, total };
    } catch (error) {
      throw new Error(`Failed to find payment intents by status: ${error}`);
    }
  }

  /**
   * Find payment intents by currency
   * @param currency - The currency to search for
   * @param options - Query options
   * @returns Array of payment intents and total count
   */
  async findByCurrency(currency: string, options: FindManyOptions<PaymentIntent> = {}): Promise<{ data: PaymentIntent[]; total: number }> {
    try {
      const where = {
        ...options.where,
        currency,
      };

      const [data, total] = await Promise.all([
        this.model.findMany({
          where: where as any,
          skip: options.skip,
          take: options.take,
          orderBy: options.orderBy as any,
          select: options.select,
          include: options.include,
        }),
        this.model.count({
          where: where as any,
        }),
      ]);

      return { data, total };
    } catch (error) {
      throw new Error(`Failed to find payment intents by currency: ${error}`);
    }
  }
}
