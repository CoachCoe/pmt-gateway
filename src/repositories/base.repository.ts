import { PrismaClient } from '@prisma/client';

/**
 * Base repository interface defining common CRUD operations
 * @template T - The entity type
 * @template K - The primary key type
 */
export interface IBaseRepository<T, K> {
  /**
   * Find an entity by its primary key
   * @param id - The primary key
   * @returns The entity or null if not found
   */
  findById(id: K): Promise<T | null>;

  /**
   * Find all entities with optional filtering and pagination
   * @param options - Query options including filters, pagination, and sorting
   * @returns Array of entities and total count
   */
  findMany(options?: FindManyOptions<T>): Promise<{ data: T[]; total: number }>;

  /**
   * Create a new entity
   * @param data - The entity data
   * @returns The created entity
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Update an entity by its primary key
   * @param id - The primary key
   * @param data - The updated data
   * @returns The updated entity or null if not found
   */
  update(id: K, data: Partial<T>): Promise<T | null>;

  /**
   * Delete an entity by its primary key
   * @param id - The primary key
   * @returns True if deleted, false if not found
   */
  delete(id: K): Promise<boolean>;

  /**
   * Check if an entity exists by its primary key
   * @param id - The primary key
   * @returns True if exists, false otherwise
   */
  exists(id: K): Promise<boolean>;

  /**
   * Count entities with optional filtering
   * @param filters - Optional filters
   * @returns The count of matching entities
   */
  count(filters?: Partial<T>): Promise<number>;
}

/**
 * Options for findMany operations
 */
export interface FindManyOptions<T> {
  /** Filter criteria */
  where?: Partial<T>;
  /** Number of records to skip */
  skip?: number;
  /** Number of records to take */
  take?: number;
  /** Sort criteria */
  orderBy?: Record<string, 'asc' | 'desc'>;
  /** Fields to include in the result */
  select?: Record<string, boolean>;
  /** Relations to include */
  include?: Record<string, boolean>;
}

/**
 * Pagination result interface
 */
export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Base repository implementation providing common CRUD operations
 * @template T - The entity type
 * @template K - The primary key type
 */
export abstract class BaseRepository<T, K> implements IBaseRepository<T, K> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  /**
   * Get the Prisma model instance
   */
  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * Find an entity by its primary key
   */
  async findById(id: K): Promise<T | null> {
    try {
      return await this.model.findUnique({
        where: { id } as any,
      });
    } catch (error) {
      throw new Error(`Failed to find ${this.modelName} by ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find all entities with optional filtering and pagination
   */
  async findMany(options: FindManyOptions<T> = {}): Promise<{ data: T[]; total: number }> {
    try {
      const { where, skip, take, orderBy, select, include } = options;

      const [data, total] = await Promise.all([
        this.model.findMany({
          where: where as any,
          skip,
          take,
          orderBy: orderBy as any,
          select,
          include,
        }),
        this.model.count({
          where: where as any,
        }),
      ]);

      return { data, total };
    } catch (error) {
      throw new Error(`Failed to find ${this.modelName} records: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new entity
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      return await this.model.create({
        data: data as any,
      });
    } catch (error) {
      throw new Error(`Failed to create ${this.modelName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update an entity by its primary key
   */
  async update(id: K, data: Partial<T>): Promise<T | null> {
    try {
      return await this.model.update({
        where: { id } as any,
        data: data as any,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null; // Record not found
      }
      throw new Error(`Failed to update ${this.modelName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete an entity by its primary key
   */
  async delete(id: K): Promise<boolean> {
    try {
      await this.model.delete({
        where: { id } as any,
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        return false; // Record not found
      }
      throw new Error(`Failed to delete ${this.modelName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if an entity exists by its primary key
   */
  async exists(id: K): Promise<boolean> {
    try {
      const count = await this.model.count({
        where: { id } as any,
      });
      return count > 0;
    } catch (error) {
      throw new Error(`Failed to check if ${this.modelName} exists: ${error}`);
    }
  }

  /**
   * Count entities with optional filtering
   */
  async count(filters: Partial<T> = {}): Promise<number> {
    try {
      return await this.model.count({
        where: filters as any,
      });
    } catch (error) {
      throw new Error(`Failed to count ${this.modelName} records: ${error}`);
    }
  }

  /**
   * Find entities with pagination
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    options: Omit<FindManyOptions<T>, 'skip' | 'take'> = {}
  ): Promise<PaginationResult<T>> {
    const skip = (page - 1) * limit;
    const { data, total } = await this.findMany({
      ...options,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
