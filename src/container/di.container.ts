import { PrismaClient } from '@prisma/client';
import { config } from '@/config';

// Repositories
import { MerchantRepository, IMerchantRepository } from '@/repositories/merchant.repository';
import { PaymentIntentRepository, IPaymentIntentRepository } from '@/repositories/payment-intent.repository';

// Services
import { AuthService } from '@/services/auth.service';
import { PaymentService } from '@/services/payment.service';
import { WebhookService } from '@/services/webhook.service';
import { SessionService } from '@/services/session.service';
import { NonceService } from '@/services/nonce.service';
import { PolkadotSSOService } from '@/services/polkadot-sso.service';
import { WalletAuthService } from '@/services/wallet-auth.service';

// Middleware
import { AuthMiddleware } from '@/middleware/auth.middleware';

/**
 * Dependency injection container interface
 */
export interface IDIContainer {
  // Database
  prisma: PrismaClient;
  
  // Repositories
  merchantRepository: IMerchantRepository;
  paymentIntentRepository: IPaymentIntentRepository;
  
  // Services
  authService: AuthService;
  paymentService: PaymentService;
  webhookService: WebhookService;
  sessionService: SessionService;
  nonceService: NonceService;
  polkadotSSOService: PolkadotSSOService;
  walletAuthService: WalletAuthService;
  
  // Middleware
  authMiddleware: AuthMiddleware;
}

/**
 * Dependency injection container implementation
 */
export class DIContainer implements IDIContainer {
  // Database
  public readonly prisma: PrismaClient;
  
  // Repositories
  public readonly merchantRepository: IMerchantRepository;
  public readonly paymentIntentRepository: IPaymentIntentRepository;
  
  // Services
  public readonly authService: AuthService;
  public readonly paymentService: PaymentService;
  public readonly webhookService: WebhookService;
  public readonly sessionService: SessionService;
  public readonly nonceService: NonceService;
  public readonly polkadotSSOService: PolkadotSSOService;
  public readonly walletAuthService: WalletAuthService;
  
  // Middleware
  public readonly authMiddleware: AuthMiddleware;

  constructor() {
    // Initialize database connection
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.databaseUrl,
        },
      },
    });

    // Initialize repositories
    this.merchantRepository = new MerchantRepository(this.prisma);
    this.paymentIntentRepository = new PaymentIntentRepository(this.prisma);

    // Initialize services
    this.authService = new AuthService(this.prisma);
    this.paymentService = new PaymentService(this.prisma);
    this.webhookService = new WebhookService(this.prisma);
    this.sessionService = new SessionService();
    this.nonceService = new NonceService();
    this.polkadotSSOService = new PolkadotSSOService();
    this.walletAuthService = new WalletAuthService();

    // Initialize middleware
    this.authMiddleware = new AuthMiddleware(this.prisma);
  }

  /**
   * Initialize the container and establish database connection
   */
  async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the container and close database connection
   */
  async shutdown(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get a service by name (for dynamic access)
   * @param serviceName - The name of the service
   * @returns The service instance
   */
  getService<T>(serviceName: keyof IDIContainer): T {
    const service = (this as any)[serviceName];
    if (!service) {
      throw new Error(`Service '${serviceName}' not found in container`);
    }
    return service as T;
  }

  /**
   * Check if a service exists in the container
   * @param serviceName - The name of the service
   * @returns True if the service exists
   */
  hasService(serviceName: keyof IDIContainer): boolean {
    return (this as any)[serviceName] !== undefined;
  }
}

// Singleton instance
let containerInstance: DIContainer | null = null;

/**
 * Get the singleton container instance
 * @returns The container instance
 */
export function getContainer(): DIContainer {
  if (!containerInstance) {
    containerInstance = new DIContainer();
  }
  return containerInstance;
}

/**
 * Initialize the container
 * @returns The initialized container
 */
export async function initializeContainer(): Promise<DIContainer> {
  const container = getContainer();
  await container.initialize();
  return container;
}

/**
 * Shutdown the container
 */
export async function shutdownContainer(): Promise<void> {
  if (containerInstance) {
    await containerInstance.shutdown();
    containerInstance = null;
  }
}
