import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types/interfaces';
import { HttpStatus } from './api-error';

// Success response helper
export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = HttpStatus.OK
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
}

// Error response helper
export function sendError(
  res: Response,
  message: string,
  statusCode: number = HttpStatus.BAD_REQUEST,
  error?: string
): Response {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  };
  return res.status(statusCode).json(response);
}

// Paginated response helper
export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): Response {
  const totalPages = Math.ceil(total / limit);
  
  const response: PaginatedResponse<T> = {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };

  return res.status(HttpStatus.OK).json({
    success: true,
    message,
    ...response,
  });
}

// Parse pagination params from query
export function parsePagination(query: Record<string, unknown>): {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const sortBy = (query.sortBy as string) || 'createdAt';
  const sortOrder = (query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  return { page, limit, skip, sortBy, sortOrder };
}
