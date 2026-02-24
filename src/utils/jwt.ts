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

// Generate invitation token
export function generateInvitationToken(email: string, organizationId?: string): string {
  const payload = { email, organizationId, type: 'invitation' };
  const options: SignOptions = {
    expiresIn: '24h',
  };
  return jwt.sign(payload, env.jwt.accessSecret, options);
}

// Verify access token
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
}

// Verify refresh token
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
}

// Verify invitation token
export function verifyInvitationToken(token: string): { email: string, organizationId?: string } {
  const decoded = jwt.verify(token, env.jwt.accessSecret) as any;
  if (decoded.type !== 'invitation') {
    throw new Error('Invalid token type');
  }
  return { email: decoded.email, organizationId: decoded.organizationId };
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
