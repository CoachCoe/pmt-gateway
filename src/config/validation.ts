import { z } from 'zod';

// Environment variable validation schema
export const envSchema = z.object({
  // Server configuration
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database configuration
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  TEST_DATABASE_URL: z.string().optional(),
  
  // Redis configuration
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // JWT configuration - CRITICAL SECURITY
  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .regex(/^[A-Za-z0-9+/=]+$/, 'JWT_SECRET must be base64 compatible'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // Polkadot configuration
  POLKADOT_RPC_ENDPOINTS: z.string().optional(),
  
  // Price Oracle configuration
  COINGECKO_API_KEY: z.string().optional(),
  PRICE_UPDATE_INTERVAL: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  
  // Webhook configuration
  WEBHOOK_SECRET: z.string().min(16, 'WEBHOOK_SECRET must be at least 16 characters'),
  
  // CORS configuration
  CORS_ORIGIN: z.string().optional(),
  
  // Rate limiting configuration
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('100'),
  
  // Security configuration
  BCRYPT_ROUNDS: z.string().regex(/^\d+$/).transform(Number).default('10'),
  SESSION_SECRET: z.string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .regex(/^[A-Za-z0-9+/=]+$/, 'SESSION_SECRET must be base64 compatible'),
  
  // Logging configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['text', 'json']).default('text'),
  
  // Monitoring configuration
  SENTRY_DSN: z.string().url().optional(),
  HEALTH_CHECK_INTERVAL: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  
  // Email configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // File storage configuration
  UPLOAD_MAX_SIZE: z.string().regex(/^\d+$/).transform(Number).default('10485760'),
  UPLOAD_ALLOWED_TYPES: z.string().optional(),
  
  // Feature flags
  ENABLE_WEBHOOKS: z.string().transform(val => val === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
  ENABLE_DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
});

// Validate environment variables
export function validateEnvironment() {
  try {
    // Skip strict validation in test environment
    if (process.env['NODE_ENV'] === 'test') {
      return {
        PORT: Number(process.env['PORT']) || 3000,
        NODE_ENV: 'test' as const,
        DATABASE_URL: process.env['DATABASE_URL'] || 'file:./test.db',
        REDIS_URL: process.env['REDIS_URL'] || 'redis://localhost:6379',
        JWT_SECRET: process.env['JWT_SECRET'] || generateSecureJWTSecret(),
        JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN'] || '24h',
        BCRYPT_ROUNDS: Number(process.env['BCRYPT_ROUNDS']) || 10,
        SESSION_SECRET: process.env['SESSION_SECRET'] || generateSecureSessionSecret(),
      };
    }
    
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

// Generate secure JWT secret if not provided
export function generateSecureJWTSecret(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(64).toString('base64');
}

// Generate secure session secret if not provided
export function generateSecureSessionSecret(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(64).toString('base64');
}
