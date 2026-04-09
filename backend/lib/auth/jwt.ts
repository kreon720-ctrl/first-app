import jwt, { type SignOptions } from 'jsonwebtoken'
import { User } from '@/lib/db/queries/userQueries'

export type TokenType = 'access' | 'refresh'

export interface JwtPayload {
  userId: string
  email: string
  type: TokenType
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment variables')
}
const accessSecret: string = process.env.JWT_ACCESS_SECRET
const refreshSecret: string = process.env.JWT_REFRESH_SECRET
const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m'
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

/**
 * Generate Access Token for a user
 * - Expires in 15 minutes (configurable via JWT_ACCESS_EXPIRES_IN)
 * - Type claim: 'access'
 */
export function generateAccessToken(user: Pick<User, 'id' | 'email'>): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: 'access' as const,
    } as JwtPayload,
    accessSecret,
    { expiresIn: accessExpiresIn as SignOptions['expiresIn'] }
  )
}

/**
 * Generate Refresh Token for a user
 * - Expires in 7 days (configurable via JWT_REFRESH_EXPIRES_IN)
 * - Type claim: 'refresh'
 */
export function generateRefreshToken(user: Pick<User, 'id' | 'email'>): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: 'refresh' as const,
    } as JwtPayload,
    refreshSecret,
    { expiresIn: refreshExpiresIn as SignOptions['expiresIn'] }
  )
}

/**
 * Generate both Access and Refresh Tokens
 */
export function generateTokenPair(user: Pick<User, 'id' | 'email'>): TokenPair {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  }
}

/**
 * Verify and decode Access Token
 * @returns Decoded payload or null if invalid
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, accessSecret) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Verify and decode Refresh Token
 * @returns Decoded payload or null if invalid
 */
export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, refreshSecret) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}
