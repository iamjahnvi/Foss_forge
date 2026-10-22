// @vitest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'
import { getAuthToken } from './api'

const account = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.org',
  kiwiId: 'ada',
  role: 'sender' as const,
  createdAt: '2026-10-21T09:00:00Z',
}

const STORAGE_KEY = 'kiwix-collections:session:v1'

function storedSession(token = 'token-1') {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ user: account, token }),
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the session', () => {
  it('starts signed out when the browser remembers nobody', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })),
    )

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    expect(result.current.user).toBeNull()
  })

  it('keeps the account in the browser after a sign up', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ user: account, token: 'token-1' }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('signed-out'))

    await act(async () => {
      await result.current.signUp({
        name: 'Ada Lovelace',
        email: 'ada@example.org',
        kiwiId: 'ada',
        role: 'sender',
        password: 'analytical engine',
      })
    })

    expect(result.current.status).toBe('signed-in')
    expect(result.current.user?.kiwiId).toBe('ada')
    expect(getAuthToken()).toBe('token-1')
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('token-1')
  })

  it('signs the person back in on the next visit', async () => {
    storedSession('token-1')
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ user: account }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.status).toBe('signed-in'))
    expect(result.current.user?.kiwiId).toBe('ada')
    expect(getAuthToken()).toBe('token-1')
  })

  it('forgets the session when the API does not know the token', async () => {
    storedSession('token-that-is-gone')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'no' }), { status: 401 })),
    )

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(getAuthToken()).toBeNull()
  })

  it('closes the session on sign out', async () => {
    storedSession('token-1')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ user: account }), { status: 200 })),
    )

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('signed-in'))

    await act(async () => {
      await result.current.signOut()
    })

    expect(result.current.status).toBe('signed-out')
    expect(result.current.user).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(getAuthToken()).toBeNull()
  })
})
