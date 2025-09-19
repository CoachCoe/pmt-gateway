import { z } from 'zod';

// Supported currencies
export const supportedFiatCurrencies = ['usd', 'eur', 'gbp', 'jpy'] as const;
export const supportedCryptoCurrencies = ['dot', 'dot-stablecoin'] as const;

// Payment Intent Schemas
export const createPaymentIntentSchema = z.object({
  amount: z.number()
    .int('Amount must be an integer')
    .positive('Amount must be positive')
    .max(99999999, 'Amount too large'),
  
  currency: z.enum(supportedFiatCurrencies, {
    errorMap: () => ({ message: 'Unsupported currency' })
  }),
  
  crypto_currency: z.enum(supportedCryptoCurrencies)
    .optional()
    .default('dot'),
  
  metadata: z.record(z.any())
    .optional()
    .refine(
      (data) => data === undefined || Object.keys(data).length <= 20,
      'Metadata cannot have more than 20 keys'
    )
    .refine(
      (data) => data === undefined || JSON.stringify(data).length <= 1000,
      'Metadata too large'
    )
});

export const paymentIntentIdSchema = z.string()
  .min(1, 'Payment intent ID is required')
  .max(100, 'Payment intent ID too long');

// Webhook Schemas
export const webhookEventSchema = z.object({
  type: z.enum([
    'payment.succeeded',
    'payment.failed', 
    'payment.canceled',
    'payment.expired',
    'payment.processing'
  ]),
  
  payment_intent_id: z.string().min(1),
  
  data: z.object({
    payment_intent: z.object({
      id: z.string(),
      amount: z.number(),
      currency: z.string(),
      crypto_amount: z.string(),
      crypto_currency: z.string(),
      status: z.string(),
      wallet_address: z.string().optional(),
      transaction_hash: z.string().optional(),
      expires_at: z.string(),
      metadata: z.record(z.any()).optional(),
      created_at: z.string()
    })
  })
});

// Merchant Schemas
export const createMerchantSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long'),
  
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  
  webhook_url: z.string()
    .url('Invalid webhook URL')
    .optional()
});

export const updateMerchantSchema = createMerchantSchema.partial();

// API Key Schemas
export const apiKeySchema = z.string()
  .min(1, 'API key is required')
  .regex(/^pk_(test_|live_)[a-zA-Z0-9]{24}$/, 'Invalid API key format');

// Wallet Connection Schemas
export const walletConnectionSchema = z.object({
  address: z.string()
    .min(1, 'Wallet address is required')
    .max(100, 'Address too long'),
  
  source: z.string()
    .min(1, 'Wallet source is required')
    .max(50, 'Source too long'),
  
  name: z.string()
    .max(100, 'Name too long')
    .optional(),
  
  version: z.string()
    .max(20, 'Version too long')
    .optional()
});

// Price Update Schema
export const priceUpdateSchema = z.object({
  currency: z.enum(supportedFiatCurrencies),
  price: z.string()
    .min(1, 'Price is required')
    .regex(/^\d+\.?\d*$/, 'Invalid price format')
});

// Query Parameters
export const paginationSchema = z.object({
  page: z.coerce.number()
    .int()
    .min(1, 'Page must be at least 1')
    .default(1),
  
  limit: z.coerce.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20)
});

export const paymentIntentQuerySchema = paginationSchema.extend({
  status: z.enum(['REQUIRES_PAYMENT', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'EXPIRED'])
    .optional(),
  
  currency: z.enum(supportedFiatCurrencies)
    .optional(),
  
  start_date: z.coerce.date()
    .optional(),
  
  end_date: z.coerce.date()
    .optional()
});

// Error Response Schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  }),
  meta: z.object({
    timestamp: z.string(),
    request_id: z.string()
  })
});

// Success Response Schema
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.literal(true),
  data: dataSchema,
  meta: z.object({
    timestamp: z.string(),
    request_id: z.string()
  })
});

// Type exports
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type PaymentIntentIdInput = z.infer<typeof paymentIntentIdSchema>;
export type WebhookEventInput = z.infer<typeof webhookEventSchema>;
export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
export type ApiKeyInput = z.infer<typeof apiKeySchema>;
export type WalletConnectionInput = z.infer<typeof walletConnectionSchema>;
export type PriceUpdateInput = z.infer<typeof priceUpdateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type PaymentIntentQueryInput = z.infer<typeof paymentIntentQuerySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
