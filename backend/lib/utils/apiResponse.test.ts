import { describe, it, expect } from 'vitest'
import {
  successResponse,
  createdResponse,
  errorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalError,
  validateRequiredFields,
} from '@/lib/utils/apiResponse'

describe('BE-03: API Response Helpers', () => {
  describe('successResponse', () => {
    it('should return 200 status with data', async () => {
      const data = { id: 1, name: 'test' }
      const response = successResponse(data)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual(data)
    })

    it('should return 200 with custom status', async () => {
      const response = successResponse({ message: 'OK' }, 202)

      expect(response.status).toBe(202)
    })

    it('should return default success message when no data provided', async () => {
      const response = successResponse()

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual({ message: 'Success' })
    })

    it('should handle null data', async () => {
      const response = successResponse(null as any)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual({ message: 'Success' })
    })

    it('should handle empty object data', async () => {
      const response = successResponse({})

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual({})
    })
  })

  describe('createdResponse', () => {
    it('should return 201 status with data', async () => {
      const data = { id: 'uuid-123', email: 'test@example.com' }
      const response = createdResponse(data)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json).toEqual(data)
    })

    it('should handle complex nested data', async () => {
      const data = {
        user: {
          id: '123',
          profile: { name: 'Test', age: 25 },
        },
        token: 'abc123',
      }
      const response = createdResponse(data)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json).toEqual(data)
    })
  })

  describe('errorResponse', () => {
    it('should return 400 status with error message', async () => {
      const response = errorResponse('Invalid input')

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json).toEqual({ error: 'Invalid input' })
    })

    it('should return custom status code', async () => {
      const response = errorResponse('Not found', 404)

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json).toEqual({ error: 'Not found' })
    })

    it('should handle Korean error messages', async () => {
      const response = errorResponse('잘못된 요청입니다')

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('잘못된 요청입니다')
    })
  })

  describe('badRequest', () => {
    it('should return 400 status', async () => {
      const response = badRequest('Bad request')

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json).toEqual({ error: 'Bad request' })
    })
  })

  describe('unauthorized', () => {
    it('should return 401 status with default message', async () => {
      const response = unauthorized()

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json).toEqual({ error: '인증이 필요합니다.' })
    })

    it('should return 401 with custom message', async () => {
      const response = unauthorized('토큰이 만료되었습니다')

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json).toEqual({ error: '토큰이 만료되었습니다' })
    })
  })

  describe('forbidden', () => {
    it('should return 403 status with default message', async () => {
      const response = forbidden()

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json).toEqual({ error: '접근 권한이 없습니다.' })
    })

    it('should return 403 with custom message', async () => {
      const response = forbidden('팀장만 이 작업을 수행할 수 있습니다.')

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json).toEqual({ error: '팀장만 이 작업을 수행할 수 있습니다.' })
    })
  })

  describe('notFound', () => {
    it('should return 404 status with default message', async () => {
      const response = notFound()

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json).toEqual({ error: '리소스를 찾을 수 없습니다.' })
    })

    it('should return 404 with custom message', async () => {
      const response = notFound('사용자를 찾을 수 없습니다.')

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json).toEqual({ error: '사용자를 찾을 수 없습니다.' })
    })
  })

  describe('conflict', () => {
    it('should return 409 status', async () => {
      const response = conflict('이미 사용 중인 이메일입니다.')

      expect(response.status).toBe(409)
      const json = await response.json()
      expect(json).toEqual({ error: '이미 사용 중인 이메일입니다.' })
    })
  })

  describe('internalError', () => {
    it('should return 500 status with default message', async () => {
      const response = internalError()

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json).toEqual({ error: '서버 내부 오류가 발생했습니다.' })
    })

    it('should return 500 with custom message', async () => {
      const response = internalError('Database connection failed')

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json).toEqual({ error: 'Database connection failed' })
    })
  })

  describe('validateRequiredFields', () => {
    it('should return error when required field is missing', () => {
      const body = { email: 'test@example.com' }
      const result = validateRequiredFields(body, ['email', 'name', 'password'])

      expect(result.error).toBeDefined()
      expect(result.error?.status).toBe(400)
    })

    it('should return error when field value is empty string', () => {
      const body = { email: 'test@example.com', name: '', password: 'pass123' }
      const result = validateRequiredFields(body, ['email', 'name', 'password'])

      expect(result.error).toBeDefined()
    })

    it('should return error when field value is undefined', () => {
      const body = { email: 'test@example.com', password: 'pass123' }
      const result = validateRequiredFields(body, ['email', 'name', 'password'])

      expect(result.error).toBeDefined()
    })

    it('should return empty error object when all fields present', () => {
      const body = { email: 'test@example.com', name: 'Test', password: 'pass123' }
      const result = validateRequiredFields(body, ['email', 'name', 'password'])

      expect(result.error).toBeUndefined()
    })

    it('should return error for first missing field', async () => {
      const body = { password: 'pass123' }
      const result = validateRequiredFields(body, ['email', 'name', 'password'])

      expect(result.error).toBeDefined()
      const json = await result.error!.json()
      expect(json.error).toContain('email')
    })

    it('should handle empty fields array', () => {
      const body = {}
      const result = validateRequiredFields(body, [])

      expect(result.error).toBeUndefined()
    })

    it('should handle numeric zero as missing field', () => {
      const body = { count: 0 }
      const result = validateRequiredFields(body, ['count'])

      // 0 is falsy, so it's treated as missing
      expect(result.error).toBeDefined()
    })
  })

  describe('Response format consistency', () => {
    it('should have consistent error response format', async () => {
      const responses = [
        badRequest('test'),
        unauthorized('test'),
        forbidden('test'),
        notFound('test'),
        conflict('test'),
        internalError('test'),
      ]

      for (const response of responses) {
        const json = await response.json()
        expect(json).toHaveProperty('error')
        expect(typeof json.error).toBe('string')
      }
    })

    it('should have consistent success response format', async () => {
      const response = successResponse({ data: 'test' })
      const json = await response.json()

      expect(json).toHaveProperty('data')
      expect(json.data).toBe('test')
    })
  })
})
