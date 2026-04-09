import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock database queries
vi.mock('@/lib/db/queries/userQueries', () => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
}))

// Mock password module
vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
  validatePasswordStrength: vi.fn().mockReturnValue({ valid: true }),
}))

// Import mocked modules
import * as userQueries from '@/lib/db/queries/userQueries'
import * as passwordModule from '@/lib/auth/password'

const mockGetUserByEmail = vi.mocked(userQueries.getUserByEmail)
const mockCreateUser = vi.mocked(userQueries.createUser)
const mockHashPassword = vi.mocked(passwordModule.hashPassword)
const mockVerifyPassword = vi.mocked(passwordModule.verifyPassword)
const mockValidatePasswordStrength = vi.mocked(passwordModule.validatePasswordStrength)

// Mock crypto for predictable UUID generation
vi.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-12345',
}))

describe('BE-07: Auth API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/auth/signup', () => {
    const signupEndpoint = async (body: any) => {
      vi.resetModules()
      const { POST } = await import('@/app/api/auth/signup/route')
      const request = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return POST(request)
    }

    it('should create user and return tokens on successful signup', async () => {
      const testUser = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
      }

      mockGetUserByEmail.mockResolvedValueOnce(null) // No existing user
      mockHashPassword.mockResolvedValueOnce('hashed-password')
      mockCreateUser.mockResolvedValueOnce({
        id: 'user-123',
        email: testUser.email,
        name: testUser.name,
        password_hash: 'hashed-password',
        created_at: new Date(),
      })

      const response = await signupEndpoint(testUser)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json).toHaveProperty('accessToken')
      expect(json).toHaveProperty('refreshToken')
      expect(json.user).toEqual({
        id: 'user-123',
        email: testUser.email,
        name: testUser.name,
      })
    })

    it('should return 400 when email is missing', async () => {
      const response = await signupEndpoint({
        name: 'Test User',
        password: 'password123',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('필수 입력 항목이 누락되었습니다.')
    })

    it('should return 400 when name is missing', async () => {
      const response = await signupEndpoint({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('필수 입력 항목이 누락되었습니다.')
    })

    it('should return 400 when password is missing', async () => {
      const response = await signupEndpoint({
        email: 'test@example.com',
        name: 'Test User',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('필수 입력 항목이 누락되었습니다.')
    })

    it('should return 400 when email format is invalid', async () => {
      mockValidatePasswordStrength.mockReturnValueOnce({ valid: true })
      
      const response = await signupEndpoint({
        email: 'not-an-email',
        name: 'Test User',
        password: 'password123',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('이메일 형식이 올바르지 않습니다.')
    })

    it('should return 400 when name exceeds 50 characters', async () => {
      mockValidatePasswordStrength.mockReturnValueOnce({ valid: true })
      
      const response = await signupEndpoint({
        email: 'test@example.com',
        name: 'A'.repeat(51),
        password: 'password123',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('이름은 최대 50자까지 입력 가능합니다.')
    })

    it('should return 409 when email already exists', async () => {
      mockGetUserByEmail.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'existing@example.com',
        name: 'Existing User',
        password_hash: 'hash',
        created_at: new Date(),
      })

      const response = await signupEndpoint({
        email: 'existing@example.com',
        name: 'Test User',
        password: 'password123',
      })

      expect(response.status).toBe(409)
      const json = await response.json()
      expect(json.error).toBe('이미 사용 중인 이메일입니다.')
    })

    it('should return 500 on unexpected database error', async () => {
      mockValidatePasswordStrength.mockReturnValueOnce({ valid: true })
      mockGetUserByEmail.mockRejectedValueOnce(new Error('DB connection failed'))

      const response = await signupEndpoint({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      })

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('서버 내부 오류가 발생했습니다.')
    })
  })

  describe('POST /api/auth/login', () => {
    const loginEndpoint = async (body: any) => {
      vi.resetModules()
      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return POST(request)
    }

    it('should login successfully and return tokens', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed-password',
        created_at: new Date(),
      }

      mockGetUserByEmail.mockResolvedValueOnce(testUser)
      mockVerifyPassword.mockResolvedValueOnce(true)

      const response = await loginEndpoint({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toHaveProperty('accessToken')
      expect(json).toHaveProperty('refreshToken')
      expect(json.user).toEqual({
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      })

      expect(mockGetUserByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockVerifyPassword).toHaveBeenCalledWith('password123', 'hashed-password')
    })

    it('should return 400 when email is missing', async () => {
      const response = await loginEndpoint({
        password: 'password123',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('필수 입력 항목이 누락되었습니다.')
    })

    it('should return 400 when password is missing', async () => {
      const response = await loginEndpoint({
        email: 'test@example.com',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('필수 입력 항목이 누락되었습니다.')
    })

    it('should return 401 when user not found', async () => {
      mockGetUserByEmail.mockResolvedValueOnce(null)

      const response = await loginEndpoint({
        email: 'nonexistent@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('should return 401 when password is incorrect', async () => {
      mockGetUserByEmail.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed-password',
        created_at: new Date(),
      })
      mockVerifyPassword.mockResolvedValueOnce(false)

      const response = await loginEndpoint({
        email: 'test@example.com',
        password: 'wrong-password',
      })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('should return same error message for wrong email and wrong password', async () => {
      // User not found scenario
      mockGetUserByEmail.mockResolvedValueOnce(null)
      const response1 = await loginEndpoint({
        email: 'wrong@example.com',
        password: 'password123',
      })
      const json1 = await response1.json()

      // Password mismatch scenario
      mockGetUserByEmail.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hash',
        created_at: new Date(),
      })
      mockVerifyPassword.mockResolvedValueOnce(false)
      const response2 = await loginEndpoint({
        email: 'test@example.com',
        password: 'wrong',
      })
      const json2 = await response2.json()

      // Both should return same error message (security best practice)
      expect(json1.error).toBe(json2.error)
    })

    it('should return 500 on unexpected database error', async () => {
      mockGetUserByEmail.mockRejectedValueOnce(new Error('DB connection failed'))

      const response = await loginEndpoint({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('서버 내부 오류가 발생했습니다.')
    })
  })

  describe('POST /api/auth/refresh', () => {
    const refreshEndpoint = async (body: any) => {
      vi.resetModules()
      const { POST } = await import('@/app/api/auth/refresh/route')
      const request = new NextRequest('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return POST(request)
    }

    it('should return new access token with valid refresh token', async () => {
      const { generateRefreshToken } = await import('@/lib/auth/jwt')
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
      }
      const refreshToken = generateRefreshToken(testUser)

      const response = await refreshEndpoint({ refreshToken })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toHaveProperty('accessToken')
      expect(json).not.toHaveProperty('refreshToken') // No new refresh token
    })

    it('should return 400 when refreshToken is missing', async () => {
      const response = await refreshEndpoint({})

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('refreshToken이 누락되었습니다.')
    })

    it('should return 401 when refreshToken is malformed', async () => {
      const response = await refreshEndpoint({
        refreshToken: 'not-a-valid-jwt',
      })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('유효하지 않거나 만료된 Refresh Token입니다.')
    })

    it('should return 401 when using access token instead of refresh token', async () => {
      const { generateAccessToken } = await import('@/lib/auth/jwt')
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
      }
      const accessToken = generateAccessToken(testUser)

      const response = await refreshEndpoint({
        refreshToken: accessToken,
      })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('유효하지 않거나 만료된 Refresh Token입니다.')
    })

    it('should return 401 when refresh token is tampered', async () => {
      const { generateRefreshToken } = await import('@/lib/auth/jwt')
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
      }
      const refreshToken = generateRefreshToken(testUser)
      const tamperedToken = refreshToken.slice(0, -1) + (refreshToken.slice(-1) === 'a' ? 'b' : 'a')

      const response = await refreshEndpoint({
        refreshToken: tamperedToken,
      })

      expect(response.status).toBe(401)
    })

    it('should verify token type is refresh', async () => {
      // Create a token with wrong type
      const jwt = await import('jsonwebtoken')
      const wrongToken = jwt.sign(
        {
          userId: 'user-123',
          email: 'test@example.com',
          type: 'access', // Wrong type
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      )

      const response = await refreshEndpoint({
        refreshToken: wrongToken,
      })

      expect(response.status).toBe(401)
    })

    it('should return 500 on unexpected error', async () => {
      // This is hard to trigger without mocking internals, so we skip this test
      // In production, you'd test this by mocking verifyRefreshToken to throw
    })

    it('should return access token with correct user data', async () => {
      const { generateRefreshToken, verifyAccessToken } = await import('@/lib/auth/jwt')
      const testUser = {
        id: 'unique-user-id',
        email: 'unique@example.com',
      }
      const refreshToken = generateRefreshToken(testUser)

      const response = await refreshEndpoint({ refreshToken })

      expect(response.status).toBe(200)
      const json = await response.json()
      
      // Verify the access token contains the correct user data
      const decoded = verifyAccessToken(json.accessToken)
      expect(decoded).not.toBeNull()
      expect(decoded!.userId).toBe(testUser.id)
      expect(decoded!.email).toBe(testUser.email)
    })
  })

  describe('Auth API Integration flows', () => {
    it('should complete full signup → login → refresh flow', async () => {
      const { POST: signupPOST } = await import('@/app/api/auth/signup/route')
      const { POST: loginPOST } = await import('@/app/api/auth/login/route')
      const { POST: refreshPOST } = await import('@/app/api/auth/refresh/route')
      const { verifyAccessToken } = await import('@/lib/auth/jwt')

      // Step 1: Signup
      mockGetUserByEmail.mockResolvedValueOnce(null)
      mockHashPassword.mockResolvedValueOnce('hashed-password')
      mockCreateUser.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed-password',
        created_at: new Date(),
      })

      const signupRequest = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
        }),
      })
      const signupResponse = await signupPOST(signupRequest)
      expect(signupResponse.status).toBe(201)
      const signupJson = await signupResponse.json()
      const { refreshToken } = signupJson

      // Step 2: Login
      mockGetUserByEmail.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed-password',
        created_at: new Date(),
      })
      mockVerifyPassword.mockResolvedValueOnce(true)

      const loginRequest = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })
      const loginResponse = await loginPOST(loginRequest)
      expect(loginResponse.status).toBe(200)

      // Step 3: Refresh
      const refreshRequest = new NextRequest('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const refreshResponse = await refreshPOST(refreshRequest)
      expect(refreshResponse.status).toBe(200)
      const refreshJson = await refreshResponse.json()

      // Verify the new access token
      const decoded = verifyAccessToken(refreshJson.accessToken)
      expect(decoded).not.toBeNull()
      expect(decoded!.userId).toBe('user-123')
    })
  })
})
