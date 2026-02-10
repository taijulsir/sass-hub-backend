// Custom API Error class
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(400, message, true, code);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message, true, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message, true, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message, true, 'NOT_FOUND');
  }

  static conflict(message: string, code?: string): ApiError {
    return new ApiError(409, message, true, code);
  }

  static tooManyRequests(message = 'Too many requests'): ApiError {
    return new ApiError(429, message, true, 'TOO_MANY_REQUESTS');
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, false, 'INTERNAL_ERROR');
  }
}

// HTTP Status codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
