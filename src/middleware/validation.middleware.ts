import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '@/utils/logger';

export class ValidationMiddleware {
  public validateBody = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const validationErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            value: (err as any).input,
          }));

          logger.warn('Request validation failed:', {
            errors: validationErrors,
            body: req.body,
          });

          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: {
                validation_errors: validationErrors,
              },
            },
            meta: {
              timestamp: new Date().toISOString(),
              request_id: req.headers['x-request-id'] as string || 'unknown',
            },
          });
          return;
        }

        logger.error('Validation middleware error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Internal validation error',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] as string || 'unknown',
          },
        });
      }
    };
  };

  public validateQuery = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        req.query = schema.parse(req.query);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const validationErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            value: (err as any).input,
          }));

          logger.warn('Query validation failed:', {
            errors: validationErrors,
            query: req.query,
          });

          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Query validation failed',
              details: {
                validation_errors: validationErrors,
              },
            },
            meta: {
              timestamp: new Date().toISOString(),
              request_id: req.headers['x-request-id'] as string || 'unknown',
            },
          });
          return;
        }

        logger.error('Query validation middleware error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Internal validation error',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] as string || 'unknown',
          },
        });
      }
    };
  };

  public validateParams = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        req.params = schema.parse(req.params);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const validationErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            value: (err as any).input,
          }));

          logger.warn('Params validation failed:', {
            errors: validationErrors,
            params: req.params,
          });

          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Parameter validation failed',
              details: {
                validation_errors: validationErrors,
              },
            },
            meta: {
              timestamp: new Date().toISOString(),
              request_id: req.headers['x-request-id'] as string || 'unknown',
            },
          });
          return;
        }

        logger.error('Params validation middleware error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Internal validation error',
          },
          meta: {
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] as string || 'unknown',
          },
        });
      }
    };
  };
}
