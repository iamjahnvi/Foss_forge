import { describe, expect, it } from 'vitest'
import {
  normalizeEmail,
  normalizeKiwiId,
  suggestKiwiId,
  validateLoginInput,
  validateSignUpInput,
} from '../shared/auth'

describe('the kiwi id', () => {
  it('is compared in lower case without the spaces around it', () => {
    expect(normalizeKiwiId('  Ada  ')).toBe('ada')
    expect(normalizeEmail('  ADA@Example.ORG ')).toBe('ada@example.org')
  })

  it('accepts letters, digits and hyphens', () => {
    const result = validateSignUpInput({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      kiwiId: 'ada-lovelace-2',
      role: 'sender',
      password: 'analytical engine',
    })

    expect(result.valid).toBe(true)
  })

  it('refuses characters that would be confusing in a handle', () => {
    const result = validateSignUpInput({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      kiwiId: 'ada lovelace!',
      role: 'sender',
      password: 'analytical engine',
    })

    expect(result.valid).toBe(false)
  })

  it('refuses a kiwi id that is too short or too long', () => {
    const short = validateSignUpInput({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      kiwiId: 'ad',
      role: 'sender',
      password: 'analytical engine',
    })
    const long = validateSignUpInput({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      kiwiId: 'a'.repeat(25),
      role: 'sender',
      password: 'analytical engine',
    })

    expect(short.valid).toBe(false)
    expect(long.valid).toBe(false)
  })
})

describe('the sign up details', () => {
  it('asks for a name, an email address, a kiwi id, a role and a password', () => {
    const result = validateSignUpInput({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      kiwiId: 'ada',
      role: 'receiver',
      password: 'analytical engine',
    })

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.value.role).toBe('receiver')
      expect(result.value.email).toBe('ada@example.org')
    }
  })

  it('refuses an email address that is not one', () => {
    const result = validateSignUpInput({
      name: 'Ada Lovelace',
      email: 'ada at example dot org',
      kiwiId: 'ada',
      role: 'sender',
      password: 'analytical engine',
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.join(' ')).toContain('email')
    }
  })

  it('refuses a role that is not sender or receiver', () => {
    const result = validateSignUpInput({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      kiwiId: 'ada',
      role: 'bystander',
      password: 'analytical engine',
    })

    expect(result.valid).toBe(false)
  })

  it('refuses a password that is too short', () => {
    const result = validateSignUpInput({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      kiwiId: 'ada',
      role: 'sender',
      password: 'short',
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.join(' ')).toContain('password')
    }
  })
})

describe('the sign in details', () => {
  it('needs an identifier and a password', () => {
    expect(validateLoginInput({ identifier: 'ada', password: 'secret' }).valid).toBe(true)
    expect(validateLoginInput({ identifier: '', password: 'secret' }).valid).toBe(false)
    expect(validateLoginInput({ identifier: 'ada', password: '' }).valid).toBe(false)
  })
})

describe('the suggested kiwi id', () => {
  it('is taken from the email address', () => {
    expect(suggestKiwiId('ada.lovelace@example.org')).toBe('ada-lovelace')
  })

  it('is usable when the email address says nothing', () => {
    const suggestion = suggestKiwiId('@example.org')

    expect(suggestion.length).toBeGreaterThanOrEqual(3)
    expect(suggestion).toMatch(/^[a-z0-9](?:[a-z0-9-]{1,22})[a-z0-9]$/)
  })
})
