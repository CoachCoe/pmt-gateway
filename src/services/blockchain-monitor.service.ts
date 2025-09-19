import { PrismaClient, PaymentStatus } from '@prisma/client';
import { polkadotService } from './polkadot-simple.service';
import { PaymentService } from './payment.service';
import { WebhookService } from './webhook.service';
import logger from '@/utils/logger';
import { PolkadotTransaction } from '@/types/api.types';

export class BlockchainMonitorService {
  private prisma: PrismaClient;
  private paymentService: PaymentService;
  private webhookService: WebhookService;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    prisma: PrismaClient,
    paymentService: PaymentService,
    webhookService: WebhookService
  ) {
    this.prisma = prisma;
    this.paymentService = paymentService;
    this.webhookService = webhookService;
  }

  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Blockchain monitoring is already running');
      return;
    }

    try {
      // Check if Polkadot API is ready
      const isReady = await polkadotService.isApiReady();
      if (!isReady) {
        throw new Error('Polkadot API is not ready');
      }

      this.isMonitoring = true;
      logger.info('Starting blockchain monitoring service');

      // Start monitoring for pending payments
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.processPendingPayments();
        } catch (error) {
          logger.error('Error in blockchain monitoring:', error);
        }
      }, 10000); // Check every 10 seconds

      // Process expired payments
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.processExpiredPayments();
        } catch (error) {
          logger.error('Error processing expired payments:', error);
        }
      }, 60000); // Check every minute

      logger.info('Blockchain monitoring service started');

    } catch (error) {
      logger.error('Failed to start blockchain monitoring:', error);
      throw error;
    }
  }

  public async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Blockchain monitoring service stopped');
  }

  private async processPendingPayments(): Promise<void> {
    try {
      // Get all pending payment intents
      const pendingPayments = await this.prisma.paymentIntent.findMany({
        where: {
          status: PaymentStatus.REQUIRES_PAYMENT,
          walletAddress: {
            not: null,
          },
        },
        take: 100, // Process in batches
      });

      if (pendingPayments.length === 0) {
        return;
      }

      logger.debug(`Processing ${pendingPayments.length} pending payments`);

      // Group payments by wallet address for efficient monitoring
      const paymentsByAddress = new Map<string, typeof pendingPayments>();
      
      for (const payment of pendingPayments) {
        if (payment.walletAddress) {
          if (!paymentsByAddress.has(payment.walletAddress)) {
            paymentsByAddress.set(payment.walletAddress, []);
          }
          paymentsByAddress.get(payment.walletAddress)!.push(payment);
        }
      }

      // Monitor each address for incoming transactions
      for (const [address, payments] of paymentsByAddress) {
        try {
          await this.monitorAddressForPayments(address, payments);
        } catch (error) {
          logger.error(`Error monitoring address ${address}:`, error);
        }
      }

    } catch (error) {
      logger.error('Error processing pending payments:', error);
    }
  }

  private async monitorAddressForPayments(
    address: string,
    payments: any[]
  ): Promise<void> {
    try {
      // Get the latest block number
      const latestBlock = await polkadotService.getLatestBlockNumber();
      
      // Check recent blocks for transactions to this address
      const blocksToCheck = Math.min(10, latestBlock); // Check last 10 blocks
      
      for (let blockNumber = latestBlock - blocksToCheck; blockNumber <= latestBlock; blockNumber++) {
        try {
          const block = await polkadotService.getBlock(blockNumber);
          await this.checkBlockForPayments(block, address, payments);
        } catch (error) {
          logger.debug(`Error checking block ${blockNumber}:`, error);
        }
      }

    } catch (error) {
      logger.error(`Error monitoring address ${address}:`, error);
    }
  }

  private async checkBlockForPayments(
    block: any,
    address: string,
    payments: any[]
  ): Promise<void> {
    try {
      if (!block || !block.block || !block.block.extrinsics) {
        return;
      }

      // Check each extrinsic in the block
      for (const extrinsic of block.block.extrinsics) {
        try {
          // Look for balance transfer events
          if (extrinsic.events) {
            for (const event of extrinsic.events) {
              if (event.event && event.event.section === 'balances' && event.event.method === 'Transfer') {
                const [from, to, amount] = event.event.data;
                
                if (to.toString() === address) {
                  const transferAmount = amount.toString();
                  
                  // Check if this matches any of our pending payments
                  for (const payment of payments) {
                    if (payment.cryptoAmount === transferAmount && payment.status === PaymentStatus.REQUIRES_PAYMENT) {
                      await this.handlePaymentConfirmation(payment, {
                        hash: extrinsic.hash?.toString() || 'unknown',
                        from: from.toString(),
                        to: to.toString(),
                        amount: transferAmount,
                        blockNumber: block.block.header.number.toNumber(),
                        timestamp: Date.now(),
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.debug('Error processing extrinsic:', error);
        }
      }

    } catch (error) {
      logger.error('Error checking block for payments:', error);
    }
  }

  private async handlePaymentConfirmation(
    payment: any,
    transaction: PolkadotTransaction
  ): Promise<void> {
    try {
      logger.info('Payment confirmation detected', {
        paymentId: payment.id,
        transactionHash: transaction.hash,
        amount: transaction.amount,
        from: transaction.from,
        to: transaction.to,
      });

      // Update payment status
      const updatedPayment = await this.paymentService.updatePaymentIntentStatus(
        payment.id,
        PaymentStatus.PROCESSING,
        payment.walletAddress,
        transaction.hash
      );

      if (!updatedPayment) {
        logger.error('Failed to update payment status', { paymentId: payment.id });
        return;
      }

      // Wait for finality (6 seconds for Polkadot)
      setTimeout(async () => {
        try {
          // Update to succeeded status
          const finalPayment = await this.paymentService.updatePaymentIntentStatus(
            payment.id,
            PaymentStatus.SUCCEEDED,
            payment.walletAddress,
            transaction.hash
          );

          if (finalPayment) {
            // Send success webhook
            await this.webhookService.createWebhookEvent(
              payment.id,
              'payment.succeeded',
              finalPayment
            );

            logger.info('Payment confirmed and webhook sent', {
              paymentId: payment.id,
              transactionHash: transaction.hash,
            });
          }
        } catch (error) {
          logger.error('Error finalizing payment:', {
            paymentId: payment.id,
            error,
          });
        }
      }, 6000); // 6 seconds for Polkadot finality

    } catch (error) {
      logger.error('Error handling payment confirmation:', {
        paymentId: payment.id,
        error,
      });
    }
  }

  private async processExpiredPayments(): Promise<void> {
    try {
      const expiredCount = await this.paymentService.processExpiredPaymentIntents();
      
      if (expiredCount > 0) {
        logger.info(`Processed ${expiredCount} expired payment intents`);
      }

    } catch (error) {
      logger.error('Error processing expired payments:', error);
    }
  }

  public async getMonitoringStatus(): Promise<{
    isMonitoring: boolean;
    lastCheck: Date;
    pendingPayments: number;
  }> {
    try {
      const pendingCount = await this.prisma.paymentIntent.count({
        where: {
          status: PaymentStatus.REQUIRES_PAYMENT,
        },
      });

      return {
        isMonitoring: this.isMonitoring,
        lastCheck: new Date(),
        pendingPayments: pendingCount,
      };

    } catch (error) {
      logger.error('Error getting monitoring status:', error);
      throw error;
    }
  }
}
