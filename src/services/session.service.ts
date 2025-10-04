import logger from '@/utils/logger';

/**
 * In-memory session service for temporary session storage
 * 
 * This replaces database session storage for a fully on-chain system.
 * Sessions are stored in memory and will be lost on restart, but that's
 * acceptable since they're temporary and can be regenerated.
 */

export interface WalletSession {
  sessionToken: string;
  walletAddress: string;
  merchantId: string;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
}

export class SessionService {
  private sessions: Map<string, WalletSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval to remove expired sessions
    this.startCleanup();
  }

  /**
   * Create a new wallet session
   */
  async createSession(sessionData: Omit<WalletSession, 'createdAt' | 'lastActiveAt'>): Promise<WalletSession> {
    const session: WalletSession = {
      ...sessionData,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.sessions.set(session.sessionToken, session);
    
    logger.info('Wallet session created', {
      sessionToken: session.sessionToken,
      walletAddress: session.walletAddress,
      merchantId: session.merchantId,
      expiresAt: session.expiresAt,
    });

    return session;
  }

  /**
   * Get session by token
   */
  async getSession(sessionToken: string): Promise<WalletSession | null> {
    const session = this.sessions.get(sessionToken);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionToken);
      return null;
    }

    // Update last active time
    session.lastActiveAt = new Date();
    this.sessions.set(sessionToken, session);

    return session;
  }

  /**
   * Update session
   */
  async updateSession(sessionToken: string, updates: Partial<WalletSession>): Promise<WalletSession | null> {
    const session = this.sessions.get(sessionToken);
    
    if (!session) {
      return null;
    }

    const updatedSession = { ...session, ...updates, lastActiveAt: new Date() };
    this.sessions.set(sessionToken, updatedSession);

    return updatedSession;
  }

  /**
   * Delete session
   */
  async deleteSession(sessionToken: string): Promise<boolean> {
    const existed = this.sessions.has(sessionToken);
    this.sessions.delete(sessionToken);
    
    if (existed) {
      logger.info('Wallet session deleted', { sessionToken });
    }

    return existed;
  }

  /**
   * Get all sessions for a merchant
   */
  async getMerchantSessions(merchantId: string): Promise<WalletSession[]> {
    const sessions: WalletSession[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.merchantId === merchantId && new Date() <= session.expiresAt) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired sessions', { count: cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Start automatic cleanup of expired sessions
   */
  private startCleanup(): void {
    // Clean up every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get session statistics
   */
  getStats(): { totalSessions: number; activeSessions: number } {
    const now = new Date();
    let activeSessions = 0;

    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt) {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
    };
  }
}

// Export singleton instance
export const sessionService = new SessionService();