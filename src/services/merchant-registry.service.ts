import { ethers } from 'ethers';
import logger from '@/utils/logger';
import { config } from '@/config';

/**
 * Merchant Registry Service
 *
 * Reads merchant preferences directly from blockchain instead of database.
 * This makes the system fully decentralized - no database needed for merchant data!
 *
 * All merchant settings are stored on-chain in the PMTMerchantRegistry contract.
 */

const MERCHANT_REGISTRY_ABI = [
  // Read functions
  'function getMerchant(address) view returns (tuple(address walletAddress, string name, string metadata, uint16 customFeeBps, uint8 schedule, uint256 minPayoutAmount, bool isActive, uint256 createdAt, uint256 updatedAt))',
  'function getMerchantStats(address) view returns (tuple(uint256 totalPayments, uint256 totalVolume, uint256 successfulPayments, uint256 refundedPayments, uint256 lastPaymentAt))',
  'function getPlatformFee(address) view returns (uint16)',
  'function isRegistered(address) view returns (bool)',
  'function getMerchantCount() view returns (uint256)',
  'function getAllMerchants() view returns (address[])',
  'function verifyWebhook(address, string) view returns (bool)',
  'function verifyApiKey(address, string) view returns (bool)',

  // Write functions
  'function registerMerchant(string name, string metadata, uint8 schedule, uint256 minPayoutAmount)',
  'function updateProfile(string name, string metadata)',
  'function updatePayoutPreferences(uint8 schedule, uint256 minPayoutAmount)',
  'function updateWebhook(bytes32 webhookHash)',
  'function updateApiKey(bytes32 apiKeyHash)',
  'function deactivate()',
  'function reactivate()',

  // Events
  'event MerchantRegistered(address indexed merchantAddress, string name, uint256 timestamp)',
  'event MerchantUpdated(address indexed merchantAddress, string name, uint256 timestamp)',
  'event PayoutPreferencesUpdated(address indexed merchantAddress, uint8 schedule, uint256 minPayoutAmount)',
];

export enum PayoutSchedule {
  INSTANT = 0,
  DAILY = 1,
  WEEKLY = 2,
  MONTHLY = 3,
}

export interface MerchantProfile {
  walletAddress: string;
  name: string;
  metadata: string;  // IPFS hash
  customFeeBps: number;
  schedule: PayoutSchedule;
  minPayoutAmount: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantStats {
  totalPayments: number;
  totalVolume: string;
  successfulPayments: number;
  refundedPayments: number;
  lastPaymentAt: Date | null;
}

export class MerchantRegistryService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private wallet: ethers.Wallet;
  private initialized = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.kusamaRpcUrl);
    this.wallet = new ethers.Wallet(config.platformPrivateKey, this.provider);
    this.contract = new ethers.Contract(
      config.merchantRegistryAddress || '',
      MERCHANT_REGISTRY_ABI,
      this.wallet
    );
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!config.merchantRegistryAddress) {
      throw new Error('Merchant registry contract address not configured');
    }

    try {
      // Verify contract is accessible
      if (this.contract) {
        await (this.contract as any)['getMerchantCount']();
      }
      this.initialized = true;
      logger.info('Merchant registry service initialized', {
        contractAddress: config.merchantRegistryAddress,
      });
    } catch (error) {
      logger.error('Failed to initialize merchant registry service:', error);
      throw error;
    }
  }

  /**
   * Get merchant profile from blockchain
   *
   * @param walletAddress - Merchant wallet address
   * @returns Merchant profile or null if not registered
   */
  async getMerchant(walletAddress: string): Promise<MerchantProfile | null> {
    this.ensureInitialized();

    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      const isRegistered = await (this.contract as any)['isRegistered'](walletAddress);
      if (!isRegistered) {
        return null;
      }

      const profile = await (this.contract as any)['getMerchant'](walletAddress);

      return {
        walletAddress: profile.walletAddress,
        name: profile.name,
        metadata: profile.metadata,
        customFeeBps: Number(profile.customFeeBps),
        schedule: Number(profile.schedule) as PayoutSchedule,
        minPayoutAmount: ethers.formatEther(profile.minPayoutAmount),
        isActive: profile.isActive,
        createdAt: new Date(Number(profile.createdAt) * 1000),
        updatedAt: new Date(Number(profile.updatedAt) * 1000),
      };
    } catch (error) {
      logger.error('Failed to get merchant from blockchain:', {
        walletAddress,
        error,
      });
      throw error;
    }
  }

  /**
   * Get merchant stats from blockchain
   *
   * @param walletAddress - Merchant wallet address
   * @returns Merchant stats
   */
  async getMerchantStats(walletAddress: string): Promise<MerchantStats | null> {
    this.ensureInitialized();

    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      const isRegistered = await (this.contract as any)['isRegistered'](walletAddress);
      if (!isRegistered) {
        return null;
      }

      const stats = await (this.contract as any)['getMerchantStats'](walletAddress);

      return {
        totalPayments: Number(stats.totalPayments),
        totalVolume: ethers.formatEther(stats.totalVolume),
        successfulPayments: Number(stats.successfulPayments),
        refundedPayments: Number(stats.refundedPayments),
        lastPaymentAt: stats.lastPaymentAt > 0
          ? new Date(Number(stats.lastPaymentAt) * 1000)
          : null,
      };
    } catch (error) {
      logger.error('Failed to get merchant stats from blockchain:', {
        walletAddress,
        error,
      });
      throw error;
    }
  }

  /**
   * Verify API key against blockchain hash
   *
   * @param walletAddress - Merchant wallet address
   * @param apiKey - API key to verify
   * @returns True if API key matches on-chain hash
   */
  async verifyApiKey(walletAddress: string, apiKey: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      return await (this.contract as any)['verifyApiKey'](walletAddress, apiKey);
    } catch (error) {
      logger.error('Failed to verify API key on blockchain:', {
        walletAddress,
        error,
      });
      return false;
    }
  }

  /**
   * Verify webhook URL against blockchain hash
   *
   * @param walletAddress - Merchant wallet address
   * @param webhookUrl - Webhook URL to verify
   * @returns True if webhook matches on-chain hash
   */
  async verifyWebhook(
    walletAddress: string,
    webhookUrl: string
  ): Promise<boolean> {
    this.ensureInitialized();

    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      return await (this.contract as any)['verifyWebhook'](walletAddress, webhookUrl);
    } catch (error) {
      logger.error('Failed to verify webhook on blockchain:', {
        walletAddress,
        error,
      });
      return false;
    }
  }

  /**
   * Get platform fee for merchant from blockchain
   *
   * @param walletAddress - Merchant wallet address
   * @returns Platform fee in basis points
   */
  async getPlatformFee(walletAddress: string): Promise<number> {
    this.ensureInitialized();

    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      const feeBps = await (this.contract as any)['getPlatformFee'](walletAddress);
      return Number(feeBps);
    } catch (error) {
      logger.error('Failed to get platform fee from blockchain:', {
        walletAddress,
        error,
      });
      throw error;
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'MerchantRegistryService not initialized. Call initialize() first.'
      );
    }
  }
}

// Export singleton instance
export const merchantRegistryService = new MerchantRegistryService();
