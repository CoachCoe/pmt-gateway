/**
 * Application constants
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error Codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  MISSING_PARAMETERS: 'MISSING_PARAMETERS',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
  PAYMENT_ALREADY_CANCELED: 'PAYMENT_ALREADY_CANCELED',
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  REQUIRES_PAYMENT: 'REQUIRES_PAYMENT',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const;

// Supported Currencies
export const SUPPORTED_CURRENCIES = {
  FIAT: ['usd', 'eur', 'gbp', 'jpy'] as const,
  CRYPTO: ['dot', 'dot-stablecoin'] as const,
} as const;

// Supported Chains
export const SUPPORTED_CHAINS = {
  POLKADOT: 'polkadot',
  KUSAMA: 'kusama',
  WESTEND: 'westend',
} as const;

// Time Constants (in milliseconds)
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

// Payment Configuration
export const PAYMENT_CONFIG = {
  EXPIRATION_MINUTES: 5,
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_DELAY_MS: 1000,
  MAX_AMOUNT: 99999999,
  MIN_AMOUNT: 0.01,
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000,
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 20,
  },
  CHALLENGE: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 3,
  },
  VERIFY: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 5,
  },
  STRICT_AUTH: {
    WINDOW_MS: 5 * 60 * 1000, // 5 minutes
    MAX_REQUESTS: 5,
  },
  WEBHOOK: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 10,
  },
} as const;

// Session Configuration
export const SESSION_CONFIG = {
  EXPIRATION_HOURS: 24,
  REFRESH_EXPIRATION_DAYS: 7,
  CLEANUP_INTERVAL_HOURS: 1,
  MAX_CONCURRENT_SESSIONS: 5,
} as const;

// JWT Configuration
export const JWT_CONFIG = {
  ALGORITHM: 'HS256',
  ISSUER: 'pmt-gateway',
  AUDIENCE: 'pmt-gateway-users',
  EXPIRES_IN: '24h',
} as const;

// Validation Limits
export const VALIDATION_LIMITS = {
  STRING_MAX_LENGTH: 1000,
  EMAIL_MAX_LENGTH: 254,
  URL_MAX_LENGTH: 2048,
  OBJECT_MAX_PROPERTIES: 50,
  ARRAY_MAX_LENGTH: 100,
  OBJECT_MAX_DEPTH: 5,
  METADATA_MAX_KEYS: 20,
  METADATA_MAX_SIZE: 1000,
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  BCRYPT_ROUNDS: 10,
  TOKEN_LENGTH: 32,
  NONCE_LENGTH: 16,
  CHALLENGE_ID_LENGTH: 24,
  SESSION_ID_LENGTH: 32,
  SALT_LENGTH: 16,
  PBKDF2_ITERATIONS: 100000,
} as const;

// Logging Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

// Log Formats
export const LOG_FORMATS = {
  TEXT: 'text',
  JSON: 'json',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_WEBHOOKS: 'ENABLE_WEBHOOKS',
  ENABLE_ANALYTICS: 'ENABLE_ANALYTICS',
  ENABLE_DEBUG_MODE: 'ENABLE_DEBUG_MODE',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  HEALTH: '/health',
  PAYMENT_INTENTS: '/api/v1/payment-intents',
  WALLET_AUTH: '/api/v1/wallet',
  WEBHOOKS: '/api/v1/webhooks',
  AUTH: '/auth',
} as const;

// Database Tables
export const DATABASE_TABLES = {
  MERCHANTS: 'merchant',
  PAYMENT_INTENTS: 'paymentIntent',
  WEBHOOK_EVENTS: 'webhookEvent',
  PRICE_CACHE: 'priceCache',
} as const;

// Redis Keys
export const REDIS_KEYS = {
  SESSION_PREFIX: 'session:',
  TOKEN_PREFIX: 'token:',
  REFRESH_PREFIX: 'refresh:',
  RATE_LIMIT_PREFIX: 'rate_limit:',
  CACHE_PREFIX: 'cache:',
} as const;

// Webhook Events
export const WEBHOOK_EVENTS = {
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_CANCELED: 'payment.canceled',
  PAYMENT_EXPIRED: 'payment.expired',
} as const;

// Polkadot Configuration
export const POLKADOT_CONFIG = {
  DEFAULT_CHAIN: 'polkadot',
  RPC_ENDPOINTS: [
    'wss://rpc.polkadot.io',
    'wss://polkadot.api.onfinality.io/public-ws',
  ],
  SS58_FORMAT: 0,
  DECIMALS: 10,
  SYMBOL: 'DOT',
} as const;

// Kusama Configuration
export const KUSAMA_CONFIG = {
  RPC_ENDPOINT: 'wss://kusama-rpc.polkadot.io',
  SS58_FORMAT: 2,
  DECIMALS: 12,
  SYMBOL: 'KSM',
} as const;

// Westend Configuration
export const WESTEND_CONFIG = {
  RPC_ENDPOINT: 'wss://westend-rpc.polkadot.io',
  SS58_FORMAT: 42,
  DECIMALS: 12,
  SYMBOL: 'WND',
} as const;
