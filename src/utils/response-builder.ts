import { Response } from 'express';

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
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

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

/**
 * Response builder class for consistent API responses
 */
export class ResponseBuilder {
  private requestId: string;
  private traceId?: string | undefined;

  constructor(requestId: string, traceId?: string) {
    this.requestId = requestId;
    this.traceId = traceId || undefined;
  }

  /**
   * Create a successful response
   * @param data - The response data
   * @param statusCode - HTTP status code (default: 200)
   * @returns The response object
   */
  success<T>(data: T, _statusCode: number = 200): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: this.requestId,
        ...(this.traceId && { trace_id: this.traceId }),
      },
    };
  }

  /**
   * Create an error response
   * @param code - Error code
   * @param message - Error message
   * @param details - Additional error details
   * @param field - Field that caused the error
   * @param statusCode - HTTP status code (default: 400)
   * @returns The response object
   */
  error(
    code: string,
    message: string,
    details?: any,
    field?: string,
    _statusCode: number = 400
  ): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
        ...(field && { field }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: this.requestId,
        ...(this.traceId && { trace_id: this.traceId }),
      },
    };
  }

  /**
   * Create a paginated response
   * @param data - The response data array
   * @param pagination - Pagination metadata
   * @returns The paginated response object
   */
  paginated<T>(
    data: T[],
    pagination: PaginationMeta
  ): PaginatedResponse<T> {
    return {
      success: true,
      data,
      pagination,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: this.requestId,
        ...(this.traceId && { trace_id: this.traceId }),
      },
    };
  }

  /**
   * Create a created response (201)
   * @param data - The created resource data
   * @returns The response object
   */
  created<T>(data: T): ApiResponse<T> {
    return this.success(data, 201);
  }

  /**
   * Create a no content response (204)
   * @returns The response object
   */
  noContent(): ApiResponse {
    return {
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: this.requestId,
        ...(this.traceId && { trace_id: this.traceId }),
      },
    };
  }

  /**
   * Create a validation error response
   * @param message - Error message
   * @param field - Field that caused the error
   * @param details - Validation details
   * @returns The response object
   */
  validationError(message: string, field?: string, details?: any): ApiResponse {
    return this.error('VALIDATION_ERROR', message, details, field, 400);
  }

  /**
   * Create an authentication error response
   * @param message - Error message
   * @returns The response object
   */
  authenticationError(message: string = 'Authentication required'): ApiResponse {
    return this.error('AUTHENTICATION_ERROR', message, undefined, undefined, 401);
  }

  /**
   * Create an authorization error response
   * @param message - Error message
   * @returns The response object
   */
  authorizationError(message: string = 'Insufficient permissions'): ApiResponse {
    return this.error('AUTHORIZATION_ERROR', message, undefined, undefined, 403);
  }

  /**
   * Create a not found error response
   * @param message - Error message
   * @returns The response object
   */
  notFoundError(message: string = 'Resource not found'): ApiResponse {
    return this.error('NOT_FOUND', message, undefined, undefined, 404);
  }

  /**
   * Create a conflict error response
   * @param message - Error message
   * @returns The response object
   */
  conflictError(message: string = 'Resource conflict'): ApiResponse {
    return this.error('CONFLICT', message, undefined, undefined, 409);
  }

  /**
   * Create a rate limit error response
   * @param message - Error message
   * @returns The response object
   */
  rateLimitError(message: string = 'Rate limit exceeded'): ApiResponse {
    return this.error('RATE_LIMIT_EXCEEDED', message, undefined, undefined, 429);
  }

  /**
   * Create an internal server error response
   * @param message - Error message
   * @param details - Error details (only in development)
   * @returns The response object
   */
  internalError(message: string = 'Internal server error', details?: any): ApiResponse {
    return this.error('INTERNAL_ERROR', message, details, undefined, 500);
  }

  /**
   * Send a response using Express Response object
   * @param res - Express Response object
   * @param response - The response object
   * @param statusCode - HTTP status code
   */
  send(res: Response, response: ApiResponse, statusCode?: number): void {
    const httpStatus = statusCode || this.getStatusCodeFromResponse(response);
    res.status(httpStatus).json(response);
  }

  /**
   * Get HTTP status code from response object
   * @param response - The response object
   * @returns HTTP status code
   */
  private getStatusCodeFromResponse(response: ApiResponse): number {
    if (response.success) {
      return 200;
    }

    // Map error codes to status codes
    const errorCodeMap: Record<string, number> = {
      'VALIDATION_ERROR': 400,
      'AUTHENTICATION_ERROR': 401,
      'AUTHORIZATION_ERROR': 403,
      'NOT_FOUND': 404,
      'CONFLICT': 409,
      'RATE_LIMIT_EXCEEDED': 429,
      'INTERNAL_ERROR': 500,
    };

    return errorCodeMap[response.error?.code || 'INTERNAL_ERROR'] || 500;
  }
}

/**
 * Create a response builder instance
 * @param requestId - Request ID
 * @param traceId - Optional trace ID
 * @returns ResponseBuilder instance
 */
export function createResponseBuilder(requestId: string, traceId?: string): ResponseBuilder {
  return new ResponseBuilder(requestId, traceId);
}

/**
 * Create pagination metadata
 * @param page - Current page
 * @param limit - Items per page
 * @param total - Total items
 * @returns Pagination metadata
 */
export function createPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
