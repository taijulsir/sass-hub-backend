import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/interfaces';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import { ApiError } from '../utils/api-error';
import { GlobalRole } from '../types/enums';

// Authentication middleware - verifies JWT token
export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw ApiError.unauthorized('No token provided');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Invalid or expired token'));
    }
  }
}

// Optional authentication - doesn't fail if no token
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }
    
    next();
  } catch {
    // Continue without user context
    next();
  }
}

// Require specific global role
export function requireGlobalRole(...roles: GlobalRole[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.globalRole)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
}

// Require super admin
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  return requireGlobalRole(GlobalRole.SUPER_ADMIN)(req, res, next);
}
