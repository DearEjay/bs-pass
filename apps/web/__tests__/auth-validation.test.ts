import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateLoginForm,
  validateSignupForm,
} from '@/lib/auth-validation'
import { formatTime } from '@/lib/utils'

// ── isValidEmail ──────────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('returns true for a standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
  })

  it('returns true for email with subdomain', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true)
  })

  it('returns true for email with plus alias', () => {
    expect(isValidEmail('user+filter@example.com')).toBe(true)
  })

  it('returns true for email with dots', () => {
    expect(isValidEmail('first.last@example.com')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })

  it('returns false for missing @', () => {
    expect(isValidEmail('userexample.com')).toBe(false)
  })

  it('returns false for missing domain', () => {
    expect(isValidEmail('user@')).toBe(false)
  })

  it('returns false for missing TLD', () => {
    expect(isValidEmail('user@example')).toBe(false)
  })

  it('returns false for spaces in email', () => {
    expect(isValidEmail('user name@example.com')).toBe(false)
  })

  it('trims surrounding whitespace before checking', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true)
  })

  it('returns false for double @', () => {
    expect(isValidEmail('user@@example.com')).toBe(false)
  })

  it('returns false for just @', () => {
    expect(isValidEmail('@')).toBe(false)
  })
})

// ── validateEmail ─────────────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('returns valid for good email', () => {
    expect(validateEmail('test@example.com')).toEqual({ valid: true })
  })

  it('returns invalid with error for empty email', () => {
    const result = validateEmail('')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns invalid with error for whitespace-only email', () => {
    const result = validateEmail('   ')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns invalid with error for malformed email', () => {
    const result = validateEmail('notanemail')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

// ── validatePassword ──────────────────────────────────────────────────────────

describe('validatePassword', () => {
  it('returns valid for a strong password', () => {
    expect(validatePassword('SuperSecret123!')).toEqual({ valid: true })
  })

  it('returns valid for exactly 8 characters', () => {
    expect(validatePassword('12345678')).toEqual({ valid: true })
  })

  it('returns invalid for empty password', () => {
    const result = validatePassword('')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns invalid for 7-character password', () => {
    const result = validatePassword('1234567')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('8')
  })

  it('returns valid for very long password (200 chars)', () => {
    expect(validatePassword('a'.repeat(200))).toEqual({ valid: true })
  })

  it('returns invalid for single space (length 1 < 8)', () => {
    const result = validatePassword(' ')
    expect(result.valid).toBe(false)
  })

  it('accepts passwords with special characters', () => {
    expect(validatePassword('p@ssw0rd!')).toEqual({ valid: true })
  })
})

// ── validateDisplayName ───────────────────────────────────────────────────────

describe('validateDisplayName', () => {
  it('returns valid for a normal name', () => {
    expect(validateDisplayName('Alice Johnson')).toEqual({ valid: true })
  })

  it('returns invalid for empty name', () => {
    const result = validateDisplayName('')
    expect(result.valid).toBe(false)
  })

  it('returns invalid for whitespace-only name', () => {
    const result = validateDisplayName('   ')
    expect(result.valid).toBe(false)
  })

  it('returns invalid for name exceeding 100 characters', () => {
    const result = validateDisplayName('a'.repeat(101))
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns valid for exactly 100 characters', () => {
    expect(validateDisplayName('a'.repeat(100))).toEqual({ valid: true })
  })

  it('returns valid for single character name', () => {
    expect(validateDisplayName('X')).toEqual({ valid: true })
  })
})

// ── validateLoginForm ─────────────────────────────────────────────────────────

describe('validateLoginForm', () => {
  it('returns valid for correct credentials format', () => {
    expect(validateLoginForm('user@example.com', 'password123')).toEqual({ valid: true })
  })

  it('fails on invalid email first', () => {
    const result = validateLoginForm('notanemail', 'password123')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('fails on short password', () => {
    const result = validateLoginForm('user@example.com', '123')
    expect(result.valid).toBe(false)
  })

  it('fails on empty email', () => {
    expect(validateLoginForm('', 'password123').valid).toBe(false)
  })

  it('fails on empty password', () => {
    expect(validateLoginForm('user@example.com', '').valid).toBe(false)
  })
})

// ── validateSignupForm ────────────────────────────────────────────────────────

describe('validateSignupForm', () => {
  it('returns valid for all correct fields', () => {
    expect(validateSignupForm('Alice', 'alice@example.com', 'password123')).toEqual({ valid: true })
  })

  it('fails when display name is empty', () => {
    const result = validateSignupForm('', 'alice@example.com', 'password123')
    expect(result.valid).toBe(false)
  })

  it('fails when email is invalid', () => {
    const result = validateSignupForm('Alice', 'notanemail', 'password123')
    expect(result.valid).toBe(false)
  })

  it('fails when password is too short', () => {
    const result = validateSignupForm('Alice', 'alice@example.com', '123')
    expect(result.valid).toBe(false)
  })

  it('validates in order: name → email → password', () => {
    // All three wrong — should fail on name first
    const result = validateSignupForm('', 'bad', 'short')
    expect(result.error).toMatch(/display name/i)
  })

  it('reports email error when name is ok but email is bad', () => {
    const result = validateSignupForm('Alice', 'notanemail', 'short')
    expect(result.error).toMatch(/email/i)
  })
})

// ── formatTime (lib/utils) ────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('formats 59 seconds as 0:59', () => {
    expect(formatTime(59)).toBe('0:59')
  })

  it('formats 60 seconds as 1:00', () => {
    expect(formatTime(60)).toBe('1:00')
  })

  it('formats 90 seconds as 1:30', () => {
    expect(formatTime(90)).toBe('1:30')
  })

  it('formats 3600 seconds (1 hour) as 60:00', () => {
    expect(formatTime(3600)).toBe('60:00')
  })

  it('pads seconds with leading zero', () => {
    expect(formatTime(65)).toBe('1:05')
  })

  it('formats 3 hours 25 min 7 sec correctly', () => {
    expect(formatTime(3 * 3600 + 25 * 60 + 7)).toBe('205:07')
  })

  it('truncates fractional seconds (floors)', () => {
    expect(formatTime(59.9)).toBe('0:59')
  })

  it('handles negative values by clamping to 0', () => {
    expect(formatTime(-5)).toBe('0:00')
  })

  it('formats 9 seconds as 0:09 (single digit padded)', () => {
    expect(formatTime(9)).toBe('0:09')
  })
})
