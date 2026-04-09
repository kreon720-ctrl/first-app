import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/auth/password'

describe('BE-02: Password Authentication', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash string', async () => {
      const hash = await hashPassword('password123')
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })

    it('should generate bcrypt hash with correct format ($2b$ prefix)', async () => {
      const hash = await hashPassword('password123')
      expect(hash).toMatch(/^\$2[ab]?\$\d+\$/)
    })

    it('should generate hash with salt rounds 12', async () => {
      const hash = await hashPassword('password123')
      // bcrypt hash format: $2b$XX$... where XX is the cost factor
      const costFactor = parseInt(hash.split('$')[2], 10)
      expect(costFactor).toBe(12)
    })

    it('should generate different hashes for same password (random salt)', async () => {
      const password = 'samePassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })

    it('should generate hash of correct length (60 characters)', async () => {
      const hash = await hashPassword('password123')
      expect(hash).toHaveLength(60)
    })

    it('should hash empty password', async () => {
      const hash = await hashPassword('')
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).toHaveLength(60)
    })

    it('should hash password with special characters', async () => {
      const password = 'P@$$w0rd!#$%^&*()'
      const hash = await hashPassword(password)
      expect(hash).toBeDefined()
      expect(hash).toHaveLength(60)
    })

    it('should hash password with unicode/emoji', async () => {
      const password = 'password🔐密码'
      const hash = await hashPassword(password)
      expect(hash).toBeDefined()
      expect(hash).toHaveLength(60)
    })

    it('should hash long password (100+ chars)', async () => {
      const password = 'a'.repeat(100)
      const hash = await hashPassword(password)
      expect(hash).toBeDefined()
      expect(hash).toHaveLength(60)
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correctPassword123'
      const hash = await hashPassword(password)
      const result = await verifyPassword(password, hash)

      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword('correctPassword123')
      const result = await verifyPassword('wrongPassword', hash)

      expect(result).toBe(false)
    })

    it('should return false for empty password against valid hash', async () => {
      const hash = await hashPassword('correctPassword123')
      const result = await verifyPassword('', hash)

      expect(result).toBe(false)
    })

    it('should return false for tampered hash', async () => {
      const password = 'password123'
      const hash = await hashPassword(password)
      const tamperedHash = hash.slice(0, -1) + (hash.slice(-1) === 'a' ? 'b' : 'a')

      const result = await verifyPassword(password, tamperedHash)
      expect(result).toBe(false)
    })

    it('should return false for completely invalid hash format', async () => {
      const result = await verifyPassword('password', 'not-a-bcrypt-hash')
      expect(result).toBe(false)
    })

    it('should handle case-sensitive passwords', async () => {
      const hash = await hashPassword('Password123')
      
      expect(await verifyPassword('Password123', hash)).toBe(true)
      expect(await verifyPassword('password123', hash)).toBe(false)
      expect(await verifyPassword('PASSWORD123', hash)).toBe(false)
    })
  })

  describe('Round-trip tests (hash → verify)', () => {
    it('should successfully verify a hashed password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      const result = await verifyPassword(password, hash)

      expect(result).toBe(true)
    })

    it('should work with various password types', async () => {
      const passwords = [
        'simple123',
        'P@$$w0rd',
        'long-password-with-many-characters-1234567890',
        'unicode密码123',
        'emoji🎉🔐🚀123',
      ]

      for (const password of passwords) {
        const hash = await hashPassword(password)
        const result = await verifyPassword(password, hash)
        expect(result).toBe(true)
      }
    })
  })

  describe('validatePasswordStrength', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('short1')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('비밀번호는 최소 8자 이상이어야 합니다.')
    })

    it('should reject 7-character password', () => {
      const result = validatePasswordStrength('Abcdef1')
      expect(result.valid).toBe(false)
    })

    it('should accept 8-character password with letter and number', () => {
      const result = validatePasswordStrength('Abcdef12')
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should reject password with no letters', () => {
      const result = validatePasswordStrength('12345678')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('비밀번호는 영문자와 숫자를 각각 최소 1자 포함해야 합니다.')
    })

    it('should reject password with no numbers', () => {
      const result = validatePasswordStrength('Abcdefgh')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('비밀번호는 영문자와 숫자를 각각 최소 1자 포함해야 합니다.')
    })

    it('should accept password with mixed case and numbers', () => {
      const result = validatePasswordStrength('MyP@ssw0rd')
      expect(result.valid).toBe(true)
    })

    it('should accept password with special characters', () => {
      const result = validatePasswordStrength('P@$$w0rd!')
      expect(result.valid).toBe(true)
    })

    it('should accept long simple password', () => {
      const result = validatePasswordStrength('abcdefghijklmnopqrstuvwxyz123')
      expect(result.valid).toBe(true)
    })

    it('should handle exactly 8 characters', () => {
      expect(validatePasswordStrength('Aaaaaaaa1').valid).toBe(true)
      expect(validatePasswordStrength('1111111a').valid).toBe(true)
    })

    it('should reject empty password', () => {
      const result = validatePasswordStrength('')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('비밀번호는 최소 8자 이상이어야 합니다.')
    })
  })

  describe('Edge cases', () => {
    it('should handle passwords with spaces', async () => {
      const password = 'my password 123'
      const hash = await hashPassword(password)
      const result = await verifyPassword(password, hash)
      expect(result).toBe(true)
    })

    it('should handle passwords with tabs and newlines', async () => {
      const password = 'pass\tword\n123'
      const hash = await hashPassword(password)
      const result = await verifyPassword(password, hash)
      expect(result).toBe(true)
    })

    it('should verify password with leading/trailing spaces', async () => {
      const password = '  password123  '
      const hash = await hashPassword(password)
      
      expect(await verifyPassword('  password123  ', hash)).toBe(true)
      expect(await verifyPassword('password123', hash)).toBe(false)
    })
  })
})
