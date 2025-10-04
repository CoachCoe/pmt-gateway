import logger from '@/utils/logger';

/**
 * In-memory payment cache service
 * 
 * This caches payment data for performance while the source of truth
 * remains on the blockchain. Cache can be rebuilt from blockchain events.
 */

export interface CachedPayment {
  id: string;
  escrowPaymentId: number;
  merchantAddress: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  transactionHash?: string;
  expiresAt: Date;
}

export class PaymentCacheService {
  private payments: Map<string, CachedPayment> = new Map();
  private paymentsByEscrowId: Map<number, string> = new Map();

  /**
   * Cache a payment
   */
  async cachePayment(payment: CachedPayment): Promise<void> {
    this.payments.set(payment.id, payment);
    this.paymentsByEscrowId.set(payment.escrowPaymentId, payment.id);
    
    logger.debug('Payment cached', {
      id: payment.id,
      escrowPaymentId: payment.escrowPaymentId,
      status: payment.status,
    });
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<CachedPayment | null> {
    return this.payments.get(paymentId) || null;
  }

  /**
   * Get payment by escrow ID
   */
  async getPaymentByEscrowId(escrowPaymentId: number): Promise<CachedPayment | null> {
    const paymentId = this.paymentsByEscrowId.get(escrowPaymentId);
    if (!paymentId) {
      return null;
    }
    return this.payments.get(paymentId) || null;
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId: string, status: string, transactionHash?: string): Promise<boolean> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return false;
    }

    payment.status = status;
    payment.updatedAt = new Date();
    if (transactionHash) {
      payment.transactionHash = transactionHash;
    }

    this.payments.set(paymentId, payment);
    
    logger.debug('Payment status updated in cache', {
      id: paymentId,
      status,
      transactionHash,
    });

    return true;
  }

  /**
   * Get payments for a merchant
   */
  async getMerchantPayments(merchantAddress: string, limit: number = 50, offset: number = 0): Promise<CachedPayment[]> {
    const merchantPayments: CachedPayment[] = [];
    
    for (const payment of this.payments.values()) {
      if (payment.merchantAddress.toLowerCase() === merchantAddress.toLowerCase()) {
        merchantPayments.push(payment);
      }
    }

    // Sort by creation date (newest first)
    merchantPayments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    return merchantPayments.slice(offset, offset + limit);
  }

  /**
   * Get payments by status
   */
  async getPaymentsByStatus(status: string): Promise<CachedPayment[]> {
    const payments: CachedPayment[] = [];
    
    for (const payment of this.payments.values()) {
      if (payment.status === status) {
        payments.push(payment);
      }
    }

    return payments;
  }

  /**
   * Get expired payments
   */
  async getExpiredPayments(): Promise<CachedPayment[]> {
    const now = new Date();
    const expiredPayments: CachedPayment[] = [];
    
    for (const payment of this.payments.values()) {
      if (now > payment.expiresAt && payment.status === 'REQUIRES_PAYMENT') {
        expiredPayments.push(payment);
      }
    }

    return expiredPayments;
  }

  /**
   * Remove payment from cache
   */
  async removePayment(paymentId: string): Promise<boolean> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return false;
    }

    this.payments.delete(paymentId);
    this.paymentsByEscrowId.delete(payment.escrowPaymentId);
    
    logger.debug('Payment removed from cache', { id: paymentId });
    return true;
  }

  /**
   * Clear all cached payments
   */
  async clearCache(): Promise<void> {
    this.payments.clear();
    this.paymentsByEscrowId.clear();
    
    logger.info('Payment cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalPayments: number; statusCounts: Record<string, number> } {
    const statusCounts: Record<string, number> = {};
    
    for (const payment of this.payments.values()) {
      statusCounts[payment.status] = (statusCounts[payment.status] || 0) + 1;
    }

    return {
      totalPayments: this.payments.size,
      statusCounts,
    };
  }

  /**
   * Rebuild cache from blockchain events (placeholder)
   * In a real implementation, this would scan blockchain events
   */
  async rebuildFromBlockchain(): Promise<void> {
    logger.info('Rebuilding payment cache from blockchain events...');
    
    // This would scan blockchain events and rebuild the cache
    // For now, we'll just log that it would happen
    
    logger.info('Payment cache rebuild completed');
  }
}

// Export singleton instance
export const paymentCacheService = new PaymentCacheService();
