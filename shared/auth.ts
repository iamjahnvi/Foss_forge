// Accounts for Kiwix Collections.
//
// A person signs up with a name, an email address, a password and a role:
// whether they send collections or receive them, because the two sides do
// different work. The kiwi id — the short handle that identifies them on the
// other side of a shared collection — is not chosen by the person: the server
// generates it at random and stores it with the account, so nobody can take a
// handle that is already in use.

import { Ajv } from 'ajv'
import authSchema from './auth.schema.json' with { type: 'json' }

export const USER_ROLES = ['sender', 'receiver'] as const

export type UserRole = (typeof USER_ROLES)[number]

export type AuthUser = {
  id: string
  name: string
  email: string
  kiwiId: string
  role: UserRole
  createdAt: string
}

export type SignUpInput = {
  name: string
  email: string
  role: UserRole
  password: string
}

export type LoginInput = {
  identifier: string
  password: string
}

export type AuthResult = {
  user: AuthUser
  token: string
}

export const ROLE_LABELS: Record<UserRole, string> = {
  sender: 'Sender',
  receiver: 'Receiver',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  sender: 'You curate collections of offline resources and share them.',
  receiver: 'You receive collections from other people and check them against your own library.',
}

const ajv = new Ajv({ allErrors: true })

const validateSignUp = ajv.compile<SignUpInput>(authSchema)

const FIELD_MESSAGES: Record<string, string> = {
  '/name': 'Enter your name.',
  '/email': 'Enter a valid email address.',
  '/role': 'Choose whether you send collections or receive them.',
  '/password': 'Use a password of at least 8 characters.',
}

// The kiwi id is a handle, so it is compared the same way everywhere: lower
// case, without the spaces around it.
export function normalizeKiwiId(kiwiId: string): string {
  return kiwiId.trim().toLowerCase()
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeSignUpInput(input: SignUpInput): SignUpInput {
  return {
    ...input,
    name: input.name.trim(),
    email: normalizeEmail(input.email),
  }
}

export type SignUpValidationResult =
  | { valid: true; value: SignUpInput }
  | { valid: false; errors: string[] }

export function validateSignUpInput(data: unknown): SignUpValidationResult {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['The account details could not be read.'] }
  }

  if (!validateSignUp(data)) {
    const errors = (validateSignUp.errors ?? []).map((error) => {
      const field = error.instancePath || ''
      const message = FIELD_MESSAGES[field]
      if (message) return message
      if (error.keyword === 'required') {
        return FIELD_MESSAGES[field] ?? `${field || 'A field'} is required.`
      }
      return `${field || 'A field'} is invalid.`
    })
    return { valid: false, errors: [...new Set(errors)] }
  }

  return { valid: true, value: normalizeSignUpInput(data as SignUpInput) }
}

export type LoginValidationResult =
  | { valid: true; value: LoginInput }
  | { valid: false; errors: string[] }

export function validateLoginInput(data: unknown): LoginValidationResult {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['The sign in details could not be read.'] }
  }

  const identifier = (data as LoginInput).identifier
  const password = (data as LoginInput).password
  const errors: string[] = []

  if (typeof identifier !== 'string' || !identifier.trim()) {
    errors.push('Enter your kiwi id or your email address.')
  }
  if (typeof password !== 'string' || !password) {
    errors.push('Enter your password.')
  }

  if (errors.length > 0) return { valid: false, errors }
  return {
    valid: true,
    value: { identifier: identifier.trim(), password },
  }
}

// A kiwi id is shown to the other side of a shared collection, so it is kept
// short and readable. The letters that are easy to mix up are left out.
const KIWI_ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const KIWI_ID_LENGTH = 8

// The kiwi id is generated at random instead of being chosen, so one person
// cannot take a handle that somebody else already has. The server checks that
// the id is free and asks for another one when it is not.
export function generateKiwiId(random: () => number = Math.random): string {
  let id = 'kiwi-'
  for (let index = 0; index < KIWI_ID_LENGTH; index += 1) {
    const position = Math.floor(random() * KIWI_ID_ALPHABET.length)
    id += KIWI_ID_ALPHABET[position] ?? 'x'
  }
  return id
}
