import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/api-error';

// Validation middleware factory
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validatedData = schema.parse(data);
      req[source] = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        next(ApiError.badRequest(message, 'VALIDATION_ERROR'));
      } else {
        next(error);
      }
    }
  };
}

// Validate body
export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

// Validate query params
export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}

// Validate route params
export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}
