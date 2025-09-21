import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/config';
import logger from '@/utils/logger';
import { WalletConnection } from '@/types/api.types';

export interface AuthPayload {
  userId: string;
  merchantId: string;
  walletAddress: string;
  type: 'merchant' | 'wallet';
}

export class AuthService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public async createMerchant(
    name: string,
    email: string,
    webhookUrl?: string
  ): Promise<{ merchant: any; apiKey: string }> {
    try {
      // Check if merchant already exists
      const existingMerchant = await this.prisma.merchant.findUnique({
        where: { email },
      });

      if (existingMerchant) {
        throw new Error('Merchant with this email already exists');
      }

      // Generate API key
      const apiKey = this.generateApiKey();
      const apiKeyHash = await bcrypt.hash(apiKey, 12);

      // Create merchant
      const merchant = await this.prisma.merchant.create({
        data: {
          name,
          email,
          apiKeyHash,
          webhookUrl: webhookUrl || null,
        },
      });

      logger.info('Merchant created successfully', {
        merchantId: merchant.id,
        email: merchant.email,
      });

      return { merchant, apiKey };

    } catch (error) {
      logger.error('Failed to create merchant:', error);
      throw error;
    }
  }

  public async validateApiKey(apiKey: string): Promise<string | null> {
    try {
      // Extract merchant ID from API key
      const merchantId = this.extractMerchantIdFromApiKey(apiKey);
      if (!merchantId) {
        return null;
      }

      // Get merchant
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
      });

      if (!merchant || !merchant.isActive) {
        return null;
      }

      // Verify API key
      const isValid = await bcrypt.compare(apiKey, merchant.apiKeyHash);
      if (!isValid) {
        return null;
      }

      return merchantId;

    } catch (error) {
      logger.error('Failed to validate API key:', error);
      return null;
    }
  }

  public async authenticateWallet(
    walletConnection: WalletConnection,
    merchantId: string
  ): Promise<string> {
    try {
      // Validate wallet address format (basic validation)
      if (!this.isValidPolkadotAddress(walletConnection.address)) {
        throw new Error('Invalid wallet address format');
      }

      // Create JWT token for wallet session
      const payload: AuthPayload = {
        userId: walletConnection.address,
        merchantId,
        walletAddress: walletConnection.address,
        type: 'wallet',
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
        algorithm: 'HS256', // Explicitly specify algorithm
        issuer: 'pmt-gateway',
        audience: 'pmt-gateway-users',
      } as jwt.SignOptions);

      logger.info('Wallet authenticated successfully', {
        address: walletConnection.address,
        merchantId,
        source: walletConnection.source,
      });

      return token;

    } catch (error) {
      logger.error('Failed to authenticate wallet:', error);
      throw error;
    }
  }

  public async verifyToken(token: string): Promise<AuthPayload | null> {
    try {
      const payload = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'], // Explicitly specify allowed algorithms
        issuer: 'pmt-gateway',
        audience: 'pmt-gateway-users',
      }) as AuthPayload;
      return payload;
    } catch (error) {
      logger.debug('Token verification failed:', error);
      return null;
    }
  }

  public async updateMerchantWebhookUrl(
    merchantId: string,
    webhookUrl: string
  ): Promise<void> {
    try {
      await this.prisma.merchant.update({
        where: { id: merchantId },
        data: { webhookUrl: webhookUrl || null },
      });

      logger.info('Merchant webhook URL updated', {
        merchantId,
        webhookUrl,
      });

    } catch (error) {
      logger.error('Failed to update merchant webhook URL:', error);
      throw error;
    }
  }

  public async regenerateApiKey(merchantId: string): Promise<string> {
    try {
      const newApiKey = this.generateApiKey();
      const apiKeyHash = await bcrypt.hash(newApiKey, 12);

      await this.prisma.merchant.update({
        where: { id: merchantId },
        data: { apiKeyHash },
      });

      logger.info('API key regenerated', { merchantId });

      return newApiKey;

    } catch (error) {
      logger.error('Failed to regenerate API key:', error);
      throw error;
    }
  }

  public async getMerchantById(merchantId: string): Promise<any | null> {
    try {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          name: true,
          email: true,
          webhookUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return merchant;

    } catch (error) {
      logger.error('Failed to get merchant by ID:', error);
      throw error;
    }
  }

  public async deactivateMerchant(merchantId: string): Promise<void> {
    try {
      await this.prisma.merchant.update({
        where: { id: merchantId },
        data: { isActive: false },
      });

      logger.info('Merchant deactivated', { merchantId });

    } catch (error) {
      logger.error('Failed to deactivate merchant:', error);
      throw error;
    }
  }

  private generateApiKey(): string {
    const prefix = config.nodeEnv === 'production' ? 'pk_live_' : 'pk_test_';
    const randomPart = uuidv4().replace(/-/g, '').substring(0, 24);
    return `${prefix}${randomPart}`;
  }

  private extractMerchantIdFromApiKey(apiKey: string): string | null {
    try {
      // API key format: pk_test_<merchant_id> or pk_live_<merchant_id>
      const parts = apiKey.split('_');
      if (parts.length !== 3) {
        return null;
      }

      const [prefix, environment, merchantId] = parts as [string, string, string];
      if (prefix !== 'pk' || !['test', 'live'].includes(environment) || !merchantId) {
        return null;
      }

      return merchantId as string;

    } catch (error) {
      logger.debug('Failed to extract merchant ID from API key:', error);
      return null;
    }
  }

  private isValidPolkadotAddress(address: string): boolean {
    // Basic validation for Polkadot address format
    // In a real implementation, you'd use the Polkadot API to validate
    return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address);
  }

  public async getMerchantStats(merchantId: string): Promise<{
    totalPaymentIntents: number;
    successfulPayments: number;
    totalVolume: number;
    averagePaymentAmount: number;
  }> {
    try {
      const stats = await this.prisma.paymentIntent.aggregate({
        where: { merchantId },
        _count: { id: true },
        _sum: { amount: true },
        _avg: { amount: true },
      });

      const successfulStats = await this.prisma.paymentIntent.aggregate({
        where: {
          merchantId,
          status: 'SUCCEEDED',
        },
        _count: { id: true },
        _sum: { amount: true },
      });

      return {
        totalPaymentIntents: stats._count.id || 0,
        successfulPayments: successfulStats._count.id || 0,
        totalVolume: stats._sum.amount || 0,
        averagePaymentAmount: stats._avg.amount || 0,
      };

    } catch (error) {
      logger.error('Failed to get merchant stats:', error);
      throw error;
    }
  }
}
