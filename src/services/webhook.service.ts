import { PrismaClient, WebhookStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import crypto from 'crypto';
import { config } from '@/config';
import logger from '@/utils/logger';
import { 
  PaymentIntentResponse, 
  WebhookEventType, 
  WebhookPayload 
} from '@/types/api.types';

export class WebhookService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public async createWebhookEvent(
    paymentIntentId: string,
    eventType: WebhookEventType,
    paymentIntent: PaymentIntentResponse
  ): Promise<string> {
    try {
      const webhookId = uuidv4();
      const payload: WebhookPayload = {
        id: webhookId,
        type: eventType,
        created: Math.floor(Date.now() / 1000),
        data: {
          payment_intent: paymentIntent,
        },
      };

      await this.prisma.webhookEvent.create({
        data: {
          id: webhookId,
          paymentIntentId,
          eventType,
          payload: payload as any,
          deliveryStatus: WebhookStatus.PENDING,
          retryCount: 0,
        },
      });

      logger.info('Webhook event created', {
        webhookId,
        paymentIntentId,
        eventType,
      });

      // Queue webhook for delivery
      await this.queueWebhookDelivery(webhookId);

      return webhookId;

    } catch (error) {
      logger.error('Failed to create webhook event:', error);
      throw error;
    }
  }

  private async queueWebhookDelivery(webhookId: string): Promise<void> {
    try {
      // In a real implementation, this would use a queue system like Bull
      // For now, we'll process webhooks immediately
      await this.processWebhookDelivery(webhookId);
    } catch (error) {
      logger.error('Failed to queue webhook delivery:', { webhookId, error });
    }
  }

  private async processWebhookDelivery(webhookId: string): Promise<void> {
    try {
      const webhookEvent = await this.prisma.webhookEvent.findUnique({
        where: { id: webhookId },
        include: {
          paymentIntent: {
            include: {
              merchant: true,
            },
          },
        },
      });

      if (!webhookEvent) {
        logger.error('Webhook event not found:', { webhookId });
        return;
      }

      const { paymentIntent } = webhookEvent;
      const merchant = paymentIntent.merchant;

      if (!merchant.webhookUrl) {
        logger.warn('No webhook URL configured for merchant:', { merchantId: merchant.id });
        await this.updateWebhookStatus(webhookId, WebhookStatus.FAILED);
        return;
      }

      // Update status to retrying
      await this.updateWebhookStatus(webhookId, WebhookStatus.RETRYING);

      // Prepare webhook payload
      const payload = webhookEvent.payload as unknown as WebhookPayload;
      const signature = this.generateWebhookSignature(payload);

      // Send webhook
      const response = await axios.post(merchant.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.type,
          'User-Agent': 'PMT-Gateway-Webhook/1.0',
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.status >= 200 && response.status < 300) {
        // Success
        await this.updateWebhookStatus(webhookId, WebhookStatus.DELIVERED);
        logger.info('Webhook delivered successfully', {
          webhookId,
          merchantId: merchant.id,
          status: response.status,
        });
      } else {
        // HTTP error
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      logger.error('Webhook delivery failed:', { webhookId, error });

      // Update retry count
      await this.incrementWebhookRetryCount(webhookId);

      // Check if we should retry
      const webhookEvent = await this.prisma.webhookEvent.findUnique({
        where: { id: webhookId },
      });

      if (webhookEvent && webhookEvent.retryCount < config.maxRetryAttempts) {
        // Schedule retry with exponential backoff
        const retryDelay = config.retryDelayMs * Math.pow(2, webhookEvent.retryCount);
        const nextRetryAt = new Date(Date.now() + retryDelay);

        await this.prisma.webhookEvent.update({
          where: { id: webhookId },
          data: {
            deliveryStatus: WebhookStatus.PENDING,
            nextRetryAt,
          },
        });

        logger.info('Webhook scheduled for retry', {
          webhookId,
          retryCount: webhookEvent.retryCount + 1,
          nextRetryAt,
        });

        // Schedule retry
        setTimeout(() => {
          this.processWebhookDelivery(webhookId);
        }, retryDelay);

      } else {
        // Max retries reached
        await this.updateWebhookStatus(webhookId, WebhookStatus.FAILED);
        logger.error('Webhook delivery failed after max retries', {
          webhookId,
          retryCount: webhookEvent?.retryCount || 0,
        });
      }
    }
  }

  private async updateWebhookStatus(
    webhookId: string,
    status: WebhookStatus
  ): Promise<void> {
    try {
      await this.prisma.webhookEvent.update({
        where: { id: webhookId },
        data: {
          deliveryStatus: status,
          deliveredAt: status === WebhookStatus.DELIVERED ? new Date() : null,
        },
      });
    } catch (error) {
      logger.error('Failed to update webhook status:', { webhookId, status, error });
    }
  }

  private async incrementWebhookRetryCount(webhookId: string): Promise<void> {
    try {
      await this.prisma.webhookEvent.update({
        where: { id: webhookId },
        data: {
          retryCount: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to increment webhook retry count:', { webhookId, error });
    }
  }

  private generateWebhookSignature(payload: WebhookPayload): string {
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(payloadString)
      .digest('hex');
    
    return `sha256=${signature}`;
  }

  public verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', config.webhookSecret)
        .update(payload)
        .digest('hex');
      
      const providedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Failed to verify webhook signature:', error);
      return false;
    }
  }

  public async getWebhookEvents(
    paymentIntentId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    webhookEvents: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const [webhookEvents, total] = await Promise.all([
        this.prisma.webhookEvent.findMany({
          where: { paymentIntentId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.webhookEvent.count({
          where: { paymentIntentId },
        }),
      ]);

      return {
        webhookEvents,
        total,
        page,
        limit,
      };

    } catch (error) {
      logger.error('Failed to get webhook events:', { paymentIntentId, error });
      throw error;
    }
  }

  public async retryFailedWebhooks(): Promise<number> {
    try {
      const failedWebhooks = await this.prisma.webhookEvent.findMany({
        where: {
          deliveryStatus: WebhookStatus.FAILED,
          retryCount: {
            lt: config.maxRetryAttempts,
          },
        },
        take: 100, // Process in batches
      });

      let retryCount = 0;

      for (const webhook of failedWebhooks) {
        try {
          await this.processWebhookDelivery(webhook.id);
          retryCount++;
        } catch (error) {
          logger.error('Failed to retry webhook:', { webhookId: webhook.id, error });
        }
      }

      if (retryCount > 0) {
        logger.info('Retried failed webhooks', { count: retryCount });
      }

      return retryCount;

    } catch (error) {
      logger.error('Failed to retry failed webhooks:', error);
      throw error;
    }
  }

  public async getWebhookStats(merchantId: string): Promise<{
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    retrying: number;
  }> {
    try {
      const stats = await this.prisma.webhookEvent.groupBy({
        by: ['deliveryStatus'],
        where: {
          paymentIntent: {
            merchantId,
          },
        },
        _count: {
          id: true,
        },
      });

      const result = {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        retrying: 0,
      };

      stats.forEach((stat) => {
        result.total += stat._count.id;
        result[stat.deliveryStatus.toLowerCase() as keyof typeof result] = stat._count.id;
      });

      return result;

    } catch (error) {
      logger.error('Failed to get webhook stats:', { merchantId, error });
      throw error;
    }
  }
}
