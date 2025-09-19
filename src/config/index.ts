import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env['PORT'] || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  
  // Database
  databaseUrl: process.env['DATABASE_URL'] || '',
  
  // Redis
  redisUrl: process.env['REDIS_URL'] || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env['JWT_SECRET'] || '',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
  
  // Polkadot
  polkadotRpcEndpoints: process.env['POLKADOT_RPC_ENDPOINTS']?.split(',') || [
    'wss://rpc.polkadot.io',
    'wss://polkadot.api.onfinality.io/public-ws'
  ],
  
  // Price Oracle
  coingeckoApiKey: process.env['COINGECKO_API_KEY'] || '',
  priceUpdateInterval: parseInt(process.env['PRICE_UPDATE_INTERVAL'] || '30000', 10),
  
  // Webhook
  webhookSecret: process.env['WEBHOOK_SECRET'] || '',
  
  // CORS
  corsOrigin: process.env['CORS_ORIGIN']?.split(',') || ['http://localhost:3000'],
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
  
  // Payment
  paymentExpirationMinutes: 5,
  maxRetryAttempts: 5,
  retryDelayMs: 1000,
  
  // Logging
  logLevel: process.env['LOG_LEVEL'] || 'info',
  logFormat: process.env['LOG_FORMAT'] || 'text',
  
  // Security
  bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] || '10', 10),
  sessionSecret: process.env['SESSION_SECRET'] || '',
  
  // Monitoring
  sentryDsn: process.env['SENTRY_DSN'] || '',
  healthCheckInterval: parseInt(process.env['HEALTH_CHECK_INTERVAL'] || '30000', 10),
  
  // Email
  smtpHost: process.env['SMTP_HOST'] || '',
  smtpPort: parseInt(process.env['SMTP_PORT'] || '587', 10),
  smtpUser: process.env['SMTP_USER'] || '',
  smtpPass: process.env['SMTP_PASS'] || '',
  fromEmail: process.env['FROM_EMAIL'] || '',
  
  // File Storage
  uploadMaxSize: parseInt(process.env['UPLOAD_MAX_SIZE'] || '10485760', 10),
  uploadAllowedTypes: process.env['UPLOAD_ALLOWED_TYPES']?.split(',') || ['image/jpeg', 'image/png'],
  
  // Feature Flags
  enableWebhooks: process.env['ENABLE_WEBHOOKS'] === 'true',
  enableAnalytics: process.env['ENABLE_ANALYTICS'] === 'true',
  enableDebugMode: process.env['ENABLE_DEBUG_MODE'] === 'true',
} as const;

export type Config = typeof config;
