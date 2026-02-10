import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, TokenPair } from '../types/interfaces';
import { GlobalRole } from '../types/enums';

// Generate access token
export function generateAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.jwt.accessSecret, options);
}

// Generate refresh token
export function generateRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.jwt.refreshSecret, options);
}

// Generate token pair
export function generateTokenPair(
  userId: string,
  email: string,
  globalRole: GlobalRole
): TokenPair {
  const payload: JwtPayload = { userId, email, globalRole };
  
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

// Verify access token
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
}

// Verify refresh token
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
}

// Decode token without verification (for debugging)
export function decodeToken(token: string): JwtPayload | null {
  const decoded = jwt.decode(token);
  return decoded as JwtPayload | null;
}

// Extract token from authorization header
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
