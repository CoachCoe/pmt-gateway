import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import logger from '@/utils/logger';

export const createRateLimit = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  const {
    windowMs = config.rateLimitWindowMs,
    max = config.rateLimitMaxRequests,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
  } = options || {};

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: 'unknown',
      },
    },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] as string || 'unknown',
        },
      });
    },
  });
};

// Specific rate limits for different endpoints
export const paymentIntentRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many payment intent requests, please try again later',
});

export const webhookRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 webhook requests per minute
  message: 'Too many webhook requests, please try again later',
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 auth requests per 15 minutes
  message: 'Too many authentication requests, please try again later',
});

// Stricter rate limits for sensitive auth operations
export const strictAuthRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 requests per 5 minutes
  message: 'Too many authentication attempts, please try again later',
});

export const challengeRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 challenge requests per minute
  message: 'Too many challenge requests, please try again later',
});

export const verifyRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 verification requests per minute
  message: 'Too many verification attempts, please try again later',
});

export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'Too many requests, please try again later',
});
