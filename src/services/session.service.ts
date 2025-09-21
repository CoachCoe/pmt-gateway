import Redis from 'ioredis';
import { config } from '@/config';
import logger from '@/utils/logger';
import { 
  generateSecureSessionId, 
  generateSecureAccessToken, 
  generateSecureRefreshToken 
} from '@/utils/crypto.utils';

export interface SessionData {
  sessionId: string;
  userId?: string;
  address?: string;
  merchantId?: string;
  walletType?: string;
  chainId?: string;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
  metadata?: Record<string, any>;
}

export interface SessionToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export class SessionService {
  private redis: Redis;
  private sessionPrefix = 'session:';
  private tokenPrefix = 'token:';
  private refreshPrefix = 'refresh:';

  constructor() {
    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis for session storage');
    });
  }

  async createSession(data: Partial<SessionData>): Promise<SessionData> {
    const sessionId = generateSecureSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const session: SessionData = {
      sessionId,
      createdAt: now,
      expiresAt,
      lastAccessedAt: now,
      ...data,
    };

    const key = `${this.sessionPrefix}${sessionId}`;
    await this.redis.setex(
      key,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
      JSON.stringify(session)
    );

    logger.info('Session created', { sessionId, userId: data.userId, address: data.address });
    return session;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const key = `${this.sessionPrefix}${sessionId}`;
      const sessionData = await this.redis.get(key);
      
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData) as SessionData;
      
      // Update last accessed time
      session.lastAccessedAt = new Date();
      await this.redis.setex(
        key,
        Math.floor((session.expiresAt.getTime() - new Date().getTime()) / 1000),
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      logger.error('Failed to get session:', { sessionId, error });
      return null;
    }
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<SessionData | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      const updatedSession = { ...session, ...updates, lastAccessedAt: new Date() };
      const key = `${this.sessionPrefix}${sessionId}`;
      
      await this.redis.setex(
        key,
        Math.floor((updatedSession.expiresAt.getTime() - new Date().getTime()) / 1000),
        JSON.stringify(updatedSession)
      );

      logger.info('Session updated', { sessionId, updates: Object.keys(updates) });
      return updatedSession;
    } catch (error) {
      logger.error('Failed to update session:', { sessionId, error });
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const key = `${this.sessionPrefix}${sessionId}`;
      const result = await this.redis.del(key);
      
      // Also delete associated tokens
      await this.deleteSessionTokens(sessionId);
      
      logger.info('Session deleted', { sessionId });
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete session:', { sessionId, error });
      return false;
    }
  }

  async createSessionTokens(sessionId: string): Promise<SessionToken> {
    const accessToken = generateSecureAccessToken();
    const refreshToken = generateSecureRefreshToken();
    const expiresIn = 3600; // 1 hour

    // Store access token
    const accessKey = `${this.tokenPrefix}${accessToken}`;
    await this.redis.setex(accessKey, expiresIn, sessionId);

    // Store refresh token (longer expiry)
    const refreshKey = `${this.refreshPrefix}${refreshToken}`;
    await this.redis.setex(refreshKey, 7 * 24 * 60 * 60, sessionId); // 7 days

    // Store token mapping for cleanup
    const tokenMappingKey = `${this.sessionPrefix}${sessionId}:tokens`;
    await this.redis.sadd(tokenMappingKey, accessToken, refreshToken);
    await this.redis.expire(tokenMappingKey, 7 * 24 * 60 * 60);

    logger.info('Session tokens created', { sessionId, accessToken: accessToken.substring(0, 8) + '...' });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  async validateAccessToken(accessToken: string): Promise<string | null> {
    try {
      const key = `${this.tokenPrefix}${accessToken}`;
      const sessionId = await this.redis.get(key);
      return sessionId;
    } catch (error) {
      logger.error('Failed to validate access token:', { error });
      return null;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<SessionToken | null> {
    try {
      const refreshKey = `${this.refreshPrefix}${refreshToken}`;
      const sessionId = await this.redis.get(refreshKey);
      
      if (!sessionId) {
        return null;
      }

      // Verify session still exists
      const session = await this.getSession(sessionId);
      if (!session) {
        await this.redis.del(refreshKey);
        return null;
      }

      // Create new tokens
      const newTokens = await this.createSessionTokens(sessionId);
      
      // Delete old refresh token
      await this.redis.del(refreshKey);

      logger.info('Access token refreshed', { sessionId });
      return newTokens;
    } catch (error) {
      logger.error('Failed to refresh access token:', { error });
      return null;
    }
  }

  async revokeSessionTokens(sessionId: string): Promise<boolean> {
    try {
      const tokenMappingKey = `${this.sessionPrefix}${sessionId}:tokens`;
      const tokens = await this.redis.smembers(tokenMappingKey);
      
      if (tokens.length > 0) {
        const accessTokens = tokens.filter(token => !token.startsWith('refresh:'));
        const refreshTokens = tokens.filter(token => token.startsWith('refresh:'));
        
        // Delete access tokens
        if (accessTokens.length > 0) {
          const accessKeys = accessTokens.map(token => `${this.tokenPrefix}${token}`);
          await this.redis.del(...accessKeys);
        }
        
        // Delete refresh tokens
        if (refreshTokens.length > 0) {
          const refreshKeys = refreshTokens.map(token => `${this.refreshPrefix}${token}`);
          await this.redis.del(...refreshKeys);
        }
      }

      // Delete token mapping
      await this.redis.del(tokenMappingKey);

      logger.info('Session tokens revoked', { sessionId });
      return true;
    } catch (error) {
      logger.error('Failed to revoke session tokens:', { sessionId, error });
      return false;
    }
  }

  private async deleteSessionTokens(sessionId: string): Promise<void> {
    await this.revokeSessionTokens(sessionId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const pattern = `${this.sessionPrefix}*`;
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        if (key.endsWith(':tokens')) {
          continue; // Skip token mapping keys
        }

        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as SessionData;
          if (new Date() > session.expiresAt) {
            const sessionId = key.replace(this.sessionPrefix, '');
            await this.deleteSession(sessionId);
            cleanedCount++;
          }
        }
      }

      logger.info('Expired sessions cleaned up', { count: cleanedCount });
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    try {
      const pattern = `${this.sessionPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      let totalSessions = 0;
      let activeSessions = 0;
      let expiredSessions = 0;
      const now = new Date();

      for (const key of keys) {
        if (key.endsWith(':tokens')) {
          continue; // Skip token mapping keys
        }

        totalSessions++;
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as SessionData;
          if (now > session.expiresAt) {
            expiredSessions++;
          } else {
            activeSessions++;
          }
        }
      }

      return {
        totalSessions,
        activeSessions,
        expiredSessions,
      };
    } catch (error) {
      logger.error('Failed to get session stats:', error);
      return { totalSessions: 0, activeSessions: 0, expiredSessions: 0 };
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
    logger.info('Redis session service disconnected');
  }
}

export const sessionService = new SessionService();
