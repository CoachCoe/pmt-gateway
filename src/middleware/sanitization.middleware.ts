import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './error.middleware';

// Sanitize string input
export const sanitizeString = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  
  // Remove potentially dangerous characters
  let sanitized = input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    throw new ValidationError(`Input too long, maximum ${maxLength} characters`);
  }
  
  return sanitized;
};

// Sanitize email
export const sanitizeEmail = (email: string): string => {
  const sanitized = sanitizeString(email, 254);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new ValidationError('Invalid email format');
  }
  
  return sanitized.toLowerCase();
};

// Sanitize URL
export const sanitizeUrl = (url: string): string => {
  const sanitized = sanitizeString(url, 2048);
  
  try {
    const parsedUrl = new URL(sanitized);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new ValidationError('Invalid URL protocol');
    }
    
    return parsedUrl.toString();
  } catch {
    throw new ValidationError('Invalid URL format');
  }
};

// Sanitize JSON object
export const sanitizeObject = (obj: any, maxDepth: number = 5, currentDepth: number = 0): any => {
  if (currentDepth > maxDepth) {
    throw new ValidationError('Object nesting too deep');
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number') {
    if (!isFinite(obj)) {
      throw new ValidationError('Invalid number');
    }
    return obj;
  }
  
  if (typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    if (obj.length > 100) {
      throw new ValidationError('Array too large');
    }
    return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    const keys = Object.keys(obj);
    
    if (keys.length > 50) {
      throw new ValidationError('Object has too many properties');
    }
    
    for (const key of keys) {
      const sanitizedKey = sanitizeString(key, 100);
      sanitized[sanitizedKey] = sanitizeObject(obj[key], maxDepth, currentDepth + 1);
    }
    
    return sanitized;
  }
  
  throw new ValidationError('Unsupported data type');
};

// Sanitize request body
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Sanitize query parameters
export const sanitizeQuery = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Sanitize specific fields
export const sanitizeFields = (fields: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      for (const field of fields) {
        if (req.body && req.body[field]) {
          if (field === 'email') {
            req.body[field] = sanitizeEmail(req.body[field]);
          } else if (field === 'url' || field.includes('url') || field.includes('Url')) {
            req.body[field] = sanitizeUrl(req.body[field]);
          } else if (typeof req.body[field] === 'string') {
            req.body[field] = sanitizeString(req.body[field]);
          }
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validate and sanitize Polkadot address
export const sanitizePolkadotAddress = (address: string): string => {
  const sanitized = sanitizeString(address, 100);
  
  // Basic Polkadot address validation
  const addressRegex = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/;
  if (!addressRegex.test(sanitized)) {
    throw new ValidationError('Invalid Polkadot address format');
  }
  
  return sanitized;
};

// Validate and sanitize signature
export const sanitizeSignature = (signature: string): string => {
  const sanitized = sanitizeString(signature, 200);
  
  // Basic hex signature validation
  const hexRegex = /^0x[0-9a-fA-F]+$/;
  if (!hexRegex.test(sanitized)) {
    throw new ValidationError('Invalid signature format');
  }
  
  return sanitized;
};
