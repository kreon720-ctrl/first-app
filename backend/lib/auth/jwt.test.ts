import { describe, it, expect, beforeAll } from 'vitest'
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractBearerToken,
  JwtPayload,
} from '@/lib/auth/jwt'
import jwt from 'jsonwebtoken'

// Test user mock
const testUser = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'test@example.com',
}

describe('BE-01: JWT Authentication', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(testUser)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // header.payload.signature
    })

    it('should include correct userId and email in payload', () => {
      const token = generateAccessToken(testUser)
      const decoded = jwt.decode(token) as JwtPayload

      expect(decoded.userId).toBe(testUser.id)
      expect(decoded.email).toBe(testUser.email)
      expect(decoded.type).toBe('access')
    })

    it('should have approximately 15 minutes expiry (900 seconds)', () => {
      const token = generateAccessToken(testUser)
      const decoded = jwt.decode(token) as jwt.JwtPayload

      const iat = decoded.iat!
      const exp = decoded.exp!
      const diffSeconds = exp - iat

      // Should be approximately 900 seconds (15 minutes)
      // Allow 10 second tolerance
      expect(diffSeconds).toBeGreaterThan(890)
      expect(diffSeconds).toBeLessThan(910)
    })

    it('should set type claim to "access"', () => {
      const token = generateAccessToken(testUser)
      const decoded = jwt.decode(token) as JwtPayload

      expect(decoded.type).toBe('access')
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateRefreshToken(testUser)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should include correct userId and email in payload', () => {
      const token = generateRefreshToken(testUser)
      const decoded = jwt.decode(token) as JwtPayload

      expect(decoded.userId).toBe(testUser.id)
      expect(decoded.email).toBe(testUser.email)
      expect(decoded.type).toBe('refresh')
    })

    it('should have approximately 7 days expiry (604800 seconds)', () => {
      const token = generateRefreshToken(testUser)
      const decoded = jwt.decode(token) as jwt.JwtPayload

      const iat = decoded.iat!
      const exp = decoded.exp!
      const diffSeconds = exp - iat

      // Should be approximately 604800 seconds (7 days)
      // Allow 60 second tolerance
      expect(diffSeconds).toBeGreaterThan(604740)
      expect(diffSeconds).toBeLessThan(604860)
    })

    it('should set type claim to "refresh"', () => {
      const token = generateRefreshToken(testUser)
      const decoded = jwt.decode(token) as JwtPayload

      expect(decoded.type).toBe('refresh')
    })
  })

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const { accessToken, refreshToken } = generateTokenPair(testUser)

      expect(accessToken).toBeDefined()
      expect(refreshToken).toBeDefined()
      expect(typeof accessToken).toBe('string')
      expect(typeof refreshToken).toBe('string')
    })

    it('should generate tokens with different secrets', () => {
      const { accessToken, refreshToken } = generateTokenPair(testUser)

      expect(accessToken).not.toBe(refreshToken)

      const accessDecoded = jwt.decode(accessToken) as JwtPayload
      const refreshDecoded = jwt.decode(refreshToken) as JwtPayload

      expect(accessDecoded.type).toBe('access')
      expect(refreshDecoded.type).toBe('refresh')
    })
  })

  describe('verifyAccessToken', () => {
    it('should return payload for valid token', () => {
      const token = generateAccessToken(testUser)
      const result = verifyAccessToken(token)

      expect(result).not.toBeNull()
      expect(result!.userId).toBe(testUser.id)
      expect(result!.email).toBe(testUser.email)
      expect(result!.type).toBe('access')
    })

    it('should return null for expired token', () => {
      // Create a token that expires immediately
      const token = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          type: 'access',
        },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '0s' }
      )

      const result = verifyAccessToken(token)
      expect(result).toBeNull()
    })

    it('should return null for tampered token', () => {
      const token = generateAccessToken(testUser)
      const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a')

      const result = verifyAccessToken(tampered)
      expect(result).toBeNull()
    })

    it('should return null for token signed with refresh secret', () => {
      // Create access token but sign with refresh secret (wrong secret)
      const wrongToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          type: 'access',
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '15m' }
      )

      const result = verifyAccessToken(wrongToken)
      expect(result).toBeNull()
    })

    it('should return null for refresh token', () => {
      const refreshToken = generateRefreshToken(testUser)
      const result = verifyAccessToken(refreshToken)

      // Should fail because refresh token uses different secret
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = verifyAccessToken('')
      expect(result).toBeNull()
    })

    it('should return null for malformed token', () => {
      const result = verifyAccessToken('not-a-jwt-token')
      expect(result).toBeNull()
    })
  })

  describe('verifyRefreshToken', () => {
    it('should return payload for valid token', () => {
      const token = generateRefreshToken(testUser)
      const result = verifyRefreshToken(token)

      expect(result).not.toBeNull()
      expect(result!.userId).toBe(testUser.id)
      expect(result!.email).toBe(testUser.email)
      expect(result!.type).toBe('refresh')
    })

    it('should return null for expired token', () => {
      const token = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          type: 'refresh',
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '0s' }
      )

      const result = verifyRefreshToken(token)
      expect(result).toBeNull()
    })

    it('should return null for tampered token', () => {
      const token = generateRefreshToken(testUser)
      const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a')

      const result = verifyRefreshToken(tampered)
      expect(result).toBeNull()
    })

    it('should return null for token signed with access secret', () => {
      const wrongToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          type: 'refresh',
        },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '7d' }
      )

      const result = verifyRefreshToken(wrongToken)
      expect(result).toBeNull()
    })

    it('should return null for access token', () => {
      const accessToken = generateAccessToken(testUser)
      const result = verifyRefreshToken(accessToken)

      // Should fail because access token uses different secret
      expect(result).toBeNull()
    })
  })

  describe('Token type separation (security)', () => {
    it('should not allow using access token as refresh token', () => {
      const accessToken = generateAccessToken(testUser)
      const result = verifyRefreshToken(accessToken)

      expect(result).toBeNull()
    })

    it('should not allow using refresh token as access token', () => {
      const refreshToken = generateRefreshToken(testUser)
      const result = verifyAccessToken(refreshToken)

      expect(result).toBeNull()
    })
  })

  describe('extractBearerToken', () => {
    it('should extract token from valid Authorization header', () => {
      const header = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token'
      const result = extractBearerToken(header)

      expect(result).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token')
    })

    it('should return null for null header', () => {
      const result = extractBearerToken(null)
      expect(result).toBeNull()
    })

    it('should return null for empty header', () => {
      const result = extractBearerToken('')
      expect(result).toBeNull()
    })

    it('should return null for header without Bearer prefix', () => {
      const result = extractBearerToken('eyJhbGciOiJIUzI1NiJ9.test.token')
      expect(result).toBeNull()
    })

    it('should return null for Basic auth header', () => {
      const result = extractBearerToken('Basic dXNlcjpwYXNz')
      expect(result).toBeNull()
    })

    it('should return null for "Bearer" without token', () => {
      const result = extractBearerToken('Bearer ')
      expect(result).toBe('') // Slices after "Bearer "
    })
  })

  describe('Round-trip tests (generate → verify)', () => {
    it('should successfully verify a generated access token', () => {
      const token = generateAccessToken(testUser)
      const payload = verifyAccessToken(token)

      expect(payload).toBeDefined()
      expect(payload!.userId).toBe(testUser.id)
      expect(payload!.email).toBe(testUser.email)
      expect(payload!.type).toBe('access')
      expect(payload).toHaveProperty('iat')
      expect(payload).toHaveProperty('exp')
    })

    it('should successfully verify a generated refresh token', () => {
      const token = generateRefreshToken(testUser)
      const payload = verifyRefreshToken(token)

      expect(payload).toBeDefined()
      expect(payload!.userId).toBe(testUser.id)
      expect(payload!.email).toBe(testUser.email)
      expect(payload!.type).toBe('refresh')
      expect(payload).toHaveProperty('iat')
      expect(payload).toHaveProperty('exp')
    })
  })

  describe('Edge cases', () => {
    it('should handle user with empty email', () => {
      const userWithEmptyEmail = { id: 'test-id', email: '' }
      const token = generateAccessToken(userWithEmptyEmail)
      const payload = verifyAccessToken(token)

      expect(payload).not.toBeNull()
      expect(payload!.email).toBe('')
    })

    it('should handle different user IDs', () => {
      const users = [
        { id: 'user-1', email: 'user1@test.com' },
        { id: 'user-2', email: 'user2@test.com' },
        { id: 'uuid-format-id', email: 'user3@test.com' },
      ]

      users.forEach((user) => {
        const token = generateAccessToken(user)
        const payload = verifyAccessToken(token)

        expect(payload!.userId).toBe(user.id)
        expect(payload!.email).toBe(user.email)
      })
    })
  })
})
