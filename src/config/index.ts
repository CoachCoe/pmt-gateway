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
} as const;

export type Config = typeof config;
