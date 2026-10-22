import { useState } from 'react'
import { X } from 'lucide-react'
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  suggestKiwiId,
  type AuthUser,
  type SignUpInput,
  type UserRole,
} from '../shared/auth'

type Props = {
  mode: 'signup' | 'login' | null
  error: string
  onClose: () => void
  onSignUp: (input: SignUpInput) => Promise<AuthUser>
  onSignIn: (identifier: string, password: string) => Promise<AuthUser>
}

type SignUpForm = {
  name: string
  email: string
  kiwiId: string
  role: UserRole
  password: string
}

const emptyForm: SignUpForm = {
  name: '',
  email: '',
  kiwiId: '',
  role: 'sender',
  password: '',
}

// The sign up and the sign in form live in one dialog, so the visitor can
// switch between them without losing what they typed. The dialog is given a
// fresh key every time it opens, so it starts from a clean form.
export function AuthDialog({ mode, error, onClose, onSignUp, onSignIn }: Props) {
  const [tab, setTab] = useState<'signup' | 'login'>(mode ?? 'signup')
  const [form, setForm] = useState<SignUpForm>(emptyForm)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  if (!mode) return null

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError('')

    if (!form.name.trim()) {
      setLocalError('Enter your name.')
      return
    }
    if (!form.email.trim()) {
      setLocalError('Enter your email address.')
      return
    }
    if (!form.kiwiId.trim()) {
      setLocalError('Choose a kiwi id.')
      return
    }
    if (form.password.length < 8) {
      setLocalError('Use a password of at least 8 characters.')
      return
    }

    setIsBusy(true)
    try {
      await onSignUp({
        name: form.name.trim(),
        email: form.email.trim(),
        kiwiId: form.kiwiId.trim(),
        role: form.role,
        password: form.password,
      })
    } catch {
      setIsBusy(false)
    }
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError('')

    if (!identifier.trim()) {
      setLocalError('Enter your kiwi id or your email address.')
      return
    }
    if (!password) {
      setLocalError('Enter your password.')
      return
    }

    setIsBusy(true)
    try {
      await onSignIn(identifier.trim(), password)
    } catch {
      setIsBusy(false)
    }
  }

  const message = localError || error

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      onClick={onClose}
    >
      <div
        className="m-auto w-full max-w-lg overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="auth-title" className="text-lg font-semibold">
              {tab === 'signup' ? 'Create your account' : 'Sign in'}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {tab === 'signup'
                ? 'Your kiwi id is the name the other side of a shared collection sees.'
                : 'Use your kiwi id or your email address.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="flex border-b border-stone-200 px-5 sm:px-6">
          {(['signup', 'login'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value)
                setLocalError('')
              }}
              className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${
                tab === value
                  ? 'border-emerald-800 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {value === 'signup' ? 'Sign up' : 'Sign in'}
            </button>
          ))}
        </div>

        {tab === 'signup' ? (
          <form onSubmit={handleSignUp} className="px-5 py-5 sm:px-6">
            <label htmlFor="auth-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="auth-name"
              autoFocus
              required
              maxLength={80}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1.5 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />

            <label htmlFor="auth-email" className="mt-4 block text-sm font-medium">
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              maxLength={254}
              value={form.email}
              onChange={(event) => {
                const email = event.target.value
                setForm((current) => ({
                  ...current,
                  email,
                  kiwiId: current.kiwiId || suggestKiwiId(email),
                }))
              }}
              className="mt-1.5 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />

            <label htmlFor="auth-kiwi-id" className="mt-4 block text-sm font-medium">
              Kiwi id
            </label>
            <input
              id="auth-kiwi-id"
              required
              maxLength={24}
              value={form.kiwiId}
              onChange={(event) =>
                setForm({ ...form, kiwiId: event.target.value.toLowerCase().replace(/\s+/g, '-') })
              }
              placeholder="your-kiwi-id"
              className="mt-1.5 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              3 to 24 characters: lowercase letters, digits and hyphens. It has to be unique.
            </p>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium">What are you here for?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(['sender', 'receiver'] as const).map((role) => (
                  <label
                    key={role}
                    className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 ${
                      form.role === role
                        ? 'border-emerald-800 bg-emerald-50'
                        : 'border-stone-300 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        aria-label={ROLE_LABELS[role]}
                        checked={form.role === role}
                        onChange={() => setForm({ ...form, role })}
                        className="size-4 accent-emerald-800"
                      />
                      <span className="text-sm font-semibold">{ROLE_LABELS[role]}</span>
                    </span>
                    <span className="text-xs leading-5 text-slate-600">{ROLE_DESCRIPTIONS[role]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label htmlFor="auth-password" className="mt-4 block text-sm font-medium">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={8}
              maxLength={200}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="mt-1.5 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />

            {message && (
              <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                {message}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="min-h-11 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:opacity-60"
              >
                {isBusy ? 'Creating the account…' : 'Create account'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignIn} className="px-5 py-5 sm:px-6">
            <label htmlFor="auth-identifier" className="block text-sm font-medium">
              Kiwi id or email address
            </label>
            <input
              id="auth-identifier"
              autoFocus
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />

            <label htmlFor="auth-login-password" className="mt-4 block text-sm font-medium">
              Password
            </label>
            <input
              id="auth-login-password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />

            {message && (
              <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                {message}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="min-h-11 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:opacity-60"
              >
                {isBusy ? 'Signing in…' : 'Sign in to your account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default AuthDialog
