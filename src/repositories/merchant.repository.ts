import { PrismaClient, Merchant } from '@prisma/client';
import { BaseRepository, FindManyOptions } from './base.repository';

/**
 * Merchant repository interface
 */
export interface IMerchantRepository {
  findById(id: string): Promise<Merchant | null>;
  findByApiKey(apiKey: string): Promise<Merchant | null>;
  findByEmail(email: string): Promise<Merchant | null>;
  findMany(options?: FindManyOptions<Merchant>): Promise<{ data: Merchant[]; total: number }>;
  create(data: CreateMerchantData): Promise<Merchant>;
  update(id: string, data: UpdateMerchantData): Promise<Merchant | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  count(filters?: Partial<Merchant>): Promise<number>;
}

/**
 * Data for creating a new merchant
 */
export interface CreateMerchantData {
  name: string;
  email: string;
  apiKey: string;
  webhookUrl?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Data for updating a merchant
 */
export interface UpdateMerchantData {
  name?: string;
  email?: string;
  webhookUrl?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Merchant repository implementation
 */
export class MerchantRepository extends BaseRepository<Merchant, string> implements IMerchantRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'merchant');
  }

  /**
   * Find a merchant by API key
   * @param apiKey - The API key to search for
   * @returns The merchant or null if not found
   */
  async findByApiKey(apiKey: string): Promise<Merchant | null> {
    try {
      return await this.model.findUnique({
        where: { apiKey },
      });
    } catch (error) {
      throw new Error(`Failed to find merchant by API key: ${error}`);
    }
  }

  /**
   * Find a merchant by email
   * @param email - The email to search for
   * @returns The merchant or null if not found
   */
  async findByEmail(email: string): Promise<Merchant | null> {
    try {
      return await this.model.findUnique({
        where: { email },
      });
    } catch (error) {
      throw new Error(`Failed to find merchant by email: ${error}`);
    }
  }

  /**
   * Create a new merchant
   * @param data - The merchant data
   * @returns The created merchant
   */
  override async create(data: CreateMerchantData): Promise<Merchant> {
    try {
      return await this.model.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw new Error(`Failed to create merchant: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a merchant
   * @param id - The merchant ID
   * @param data - The updated data
   * @returns The updated merchant or null if not found
   */
  override async update(id: string, data: UpdateMerchantData): Promise<Merchant | null> {
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
      throw new Error(`Failed to update merchant: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find active merchants
   * @returns Array of active merchants
   */
  async findActive(): Promise<Merchant[]> {
    try {
      return await this.model.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new Error(`Failed to find active merchants: ${error}`);
    }
  }

  /**
   * Find merchants by name pattern
   * @param namePattern - The name pattern to search for
   * @returns Array of matching merchants
   */
  async findByNamePattern(namePattern: string): Promise<Merchant[]> {
    try {
      return await this.model.findMany({
        where: {
          name: {
            contains: namePattern,
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      throw new Error(`Failed to find merchants by name pattern: ${error}`);
    }
  }
}
