// The signed-in account.
//
// The session is kept in the browser so a reload does not ask for the
// password again. The account itself lives in the API; the browser only keeps
// the token that stands for it.

import { useCallback, useEffect, useState } from 'react'
import {
  createAccount,
  endSession,
  fetchCurrentUser,
  setAuthToken,
  signIn as signInRequest,
} from './api'
import type { AuthUser, SignUpInput } from '../shared/auth'

const STORAGE_KEY = 'kiwix-collections:session:v1'

type StoredSession = {
  user: AuthUser
  token: string
}

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

type AuthState = {
  status: AuthStatus
  user: AuthUser | null
  token: string | null
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    if (!parsed?.user || !parsed.token) return null
    return { user: parsed.user as AuthUser, token: parsed.token }
  } catch {
    return null
  }
}

function writeStoredSession(session: StoredSession | null): void {
  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage is optional; the session still works for this visit.
  }
}

// The session is read while the first render is prepared, so the token is
// already in place when the app asks the API for the collections.
function initialAuthState(): AuthState {
  const stored = readStoredSession()
  if (!stored) {
    return { status: 'signed-out', user: null, token: null }
  }

  setAuthToken(stored.token)
  return { status: 'signed-in', user: stored.user, token: stored.token }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(initialAuthState)
  const [error, setError] = useState('')

  // The API is asked whether it still knows the stored token. The answer
  // arrives later, so the account stays signed in until then.
  useEffect(() => {
    if (!state.token) return

    const controller = new AbortController()
    fetchCurrentUser(controller.signal)
      .then((current) => {
        if (controller.signal.aborted) return
        if (current) return

        setAuthToken(null)
        writeStoredSession(null)
        setState({ status: 'signed-out', user: null, token: null })
      })
      .catch(() => {
        // The API is unreachable. The account stays signed in and the app
        // keeps working with the browser's own copy of the collections.
      })

    return () => controller.abort()
  }, [state.token])

  const signUp = useCallback(async (input: SignUpInput) => {
    setError('')
    const result = await createAccount(input)
    setAuthToken(result.token)
    writeStoredSession(result)
    setState({ status: 'signed-in', user: result.user, token: result.token })
    return result.user
  }, [])

  const signIn = useCallback(async (identifier: string, password: string) => {
    setError('')
    const result = await signInRequest(identifier, password)
    setAuthToken(result.token)
    writeStoredSession(result)
    setState({ status: 'signed-in', user: result.user, token: result.token })
    return result.user
  }, [])

  const signOut = useCallback(async () => {
    try {
      await endSession()
    } catch {
      // The session is closed on the browser side either way.
    }
    setAuthToken(null)
    writeStoredSession(null)
    setState({ status: 'signed-out', user: null, token: null })
  }, [])

  return { status: state.status, user: state.user, error, setError, signUp, signIn, signOut }
}
