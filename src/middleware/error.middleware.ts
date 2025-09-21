import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public field?: string | undefined;
  
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

// Standard error response format
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
  meta: {
    timestamp: string;
    request_id: string;
    trace_id?: string;
  };
}

// Error handler middleware
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const traceId = req.headers['x-trace-id'] as string;

  // Log error with context
  logger.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: req.headers,
    },
    requestId,
    traceId,
  });

  // Determine status code
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';

  // Don't expose internal errors in production
  const message = process.env['NODE_ENV'] === 'production' && statusCode >= 500
    ? 'An internal server error occurred'
    : error.message;

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(error instanceof ValidationError && { field: (error as any).field }),
      ...(process.env['NODE_ENV'] !== 'production' && { details: error.stack }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      ...(traceId && { trace_id: traceId }),
    },
  };

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };

  res.status(404).json(errorResponse);
};

// Request correlation ID middleware
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate correlation ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = require('uuid').v4() as string;
  }

  // Set response header
  res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
  
  next();
};
