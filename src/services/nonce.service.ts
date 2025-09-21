import { generateSecureNonce, constantTimeCompare } from '@/utils/crypto.utils';
import logger from '@/utils/logger';

export interface NonceData {
  nonce: string;
  challengeId: string;
  address?: string | undefined;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

export class NonceService {
  private nonces: Map<string, NonceData> = new Map();
  private readonly NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate a new nonce for authentication challenge
   * @param challengeId - Unique challenge identifier
   * @param address - Optional wallet address
   * @returns Generated nonce
   */
  generateNonce(challengeId: string, address?: string): string {
    const nonce = generateSecureNonce();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.NONCE_EXPIRY_MS);

    const nonceData: NonceData = {
      nonce,
      challengeId,
      address,
      createdAt: now,
      expiresAt,
      used: false,
    };

    this.nonces.set(nonce, nonceData);

    // Clean up expired nonces
    this.cleanupExpiredNonces();

    logger.debug('Generated nonce for challenge', {
      challengeId,
      address,
      nonce: nonce.substring(0, 8) + '...',
    });

    return nonce;
  }

  /**
   * Validate a nonce and mark it as used
   * @param nonce - Nonce to validate
   * @param challengeId - Expected challenge ID
   * @param address - Expected wallet address (optional)
   * @returns True if nonce is valid
   */
  validateAndConsumeNonce(nonce: string, challengeId: string, address?: string): boolean {
    const nonceData = this.nonces.get(nonce);

    if (!nonceData) {
      logger.warn('Nonce not found', { nonce: nonce.substring(0, 8) + '...' });
      return false;
    }

    // Check if nonce has expired
    if (new Date() > nonceData.expiresAt) {
      logger.warn('Nonce expired', {
        nonce: nonce.substring(0, 8) + '...',
        expiresAt: nonceData.expiresAt,
      });
      this.nonces.delete(nonce);
      return false;
    }

    // Check if nonce has already been used
    if (nonceData.used) {
      logger.warn('Nonce already used', { nonce: nonce.substring(0, 8) + '...' });
      return false;
    }

    // Validate challenge ID
    if (!constantTimeCompare(nonceData.challengeId, challengeId)) {
      logger.warn('Nonce challenge ID mismatch', {
        nonce: nonce.substring(0, 8) + '...',
        expected: challengeId,
        actual: nonceData.challengeId,
      });
      return false;
    }

    // Validate address if provided
    if (address && nonceData.address && !constantTimeCompare(nonceData.address, address)) {
      logger.warn('Nonce address mismatch', {
        nonce: nonce.substring(0, 8) + '...',
        expected: address,
        actual: nonceData.address,
      });
      return false;
    }

    // Mark nonce as used
    nonceData.used = true;
    this.nonces.set(nonce, nonceData);

    logger.debug('Nonce validated and consumed', {
      nonce: nonce.substring(0, 8) + '...',
      challengeId,
      address,
    });

    return true;
  }

  /**
   * Check if a nonce exists and is valid (without consuming it)
   * @param nonce - Nonce to check
   * @returns True if nonce exists and is valid
   */
  isValidNonce(nonce: string): boolean {
    const nonceData = this.nonces.get(nonce);

    if (!nonceData) {
      return false;
    }

    // Check if nonce has expired
    if (new Date() > nonceData.expiresAt) {
      this.nonces.delete(nonce);
      return false;
    }

    // Check if nonce has already been used
    if (nonceData.used) {
      return false;
    }

    return true;
  }

  /**
   * Get nonce data without consuming it
   * @param nonce - Nonce to retrieve
   * @returns Nonce data or null if not found
   */
  getNonceData(nonce: string): NonceData | null {
    const nonceData = this.nonces.get(nonce);

    if (!nonceData) {
      return null;
    }

    // Check if nonce has expired
    if (new Date() > nonceData.expiresAt) {
      this.nonces.delete(nonce);
      return null;
    }

    return nonceData;
  }

  /**
   * Clean up expired nonces
   */
  private cleanupExpiredNonces(): void {
    const now = new Date();
    const expiredNonces: string[] = [];

    for (const [nonce, data] of this.nonces.entries()) {
      if (now > data.expiresAt) {
        expiredNonces.push(nonce);
      }
    }

    for (const nonce of expiredNonces) {
      this.nonces.delete(nonce);
    }

    if (expiredNonces.length > 0) {
      logger.debug('Cleaned up expired nonces', { count: expiredNonces.length });
    }
  }

  /**
   * Get statistics about nonces
   * @returns Nonce statistics
   */
  getStats(): {
    total: number;
    active: number;
    used: number;
    expired: number;
  } {
    const now = new Date();
    let active = 0;
    let used = 0;
    let expired = 0;

    for (const data of this.nonces.values()) {
      if (now > data.expiresAt) {
        expired++;
      } else if (data.used) {
        used++;
      } else {
        active++;
      }
    }

    return {
      total: this.nonces.size,
      active,
      used,
      expired,
    };
  }

  /**
   * Clear all nonces (for testing)
   */
  clearAll(): void {
    this.nonces.clear();
    logger.debug('All nonces cleared');
  }
}

export const nonceService = new NonceService();
