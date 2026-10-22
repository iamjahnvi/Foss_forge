import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Eye, KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import type { AccountProfile, AccountRole } from '../shared/account'
import { saveAccountProfile } from './account'

type Props = {
  onBack: () => void
  onCreated: () => void
}

type SignupResult = { user: AccountProfile }

export function SignupPage({ onBack, onCreated }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<AccountRole>('sender')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<AccountProfile | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await response.json() as SignupResult | { error?: string }
      if (!response.ok || !('user' in data)) {
        setError('error' in data && data.error ? data.error : 'Your account could not be created. Please try again.')
        return
      }
      saveAccountProfile(data.user)
      setCreated(data.user)
    } catch {
      setError('Could not reach the signup service. Start the API server and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-svh bg-gradient-to-br from-stone-50 via-emerald-50/70 to-teal-50 text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="#/" onClick={(event) => { event.preventDefault(); onBack() }} className="flex items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-sm"><BookOpen size={21} aria-hidden="true" /></span>
          <span className="font-semibold tracking-tight">Kiwix Collections</span>
        </a>
        <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-white/70 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700">
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-10 pt-3 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:pt-10">
        <section className="flex flex-col justify-center py-5 lg:py-12">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800 shadow-sm">
            <span className="size-1.5 rounded-full bg-emerald-600" /> Get started
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Create your Kiwix account.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
            Choose how you’ll use collections. We’ll generate your unique Kiwix ID when you join.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-slate-700">
            <li className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><UserRound size={16} /></span>Share collections with a Kiwix ID made for you</li>
            <li className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><ShieldCheck size={16} /></span>Your password is protected with bcrypt hashing</li>
            <li className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><KeyRound size={16} /></span>No Google sign-in; use your email and password</li>
          </ul>
          <div className="mt-9 rounded-xl border border-emerald-100 bg-white/65 p-4 text-sm leading-6 text-slate-600">
            Collections contain resource details only. Your ZIM archives remain on your device.
          </div>
        </section>

        <section className="rounded-2xl border border-white bg-white/90 p-5 shadow-xl shadow-emerald-950/5 backdrop-blur sm:p-8 lg:p-9">
          {created ? (
            <div className="flex min-h-[420px] flex-col justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><ShieldCheck size={24} /></span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">You’re all set, {created.name.split(' ')[0]}.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Your account is ready. Keep your Kiwix ID handy when sharing a collection.</p>
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-800">Your Kiwix ID</span>
                <span className="mt-1 block text-xl font-semibold tracking-wide text-emerald-950">{created.kiwiId}</span>
              </div>
              <button type="button" onClick={onCreated} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                Continue to collections <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-sm font-semibold text-emerald-800">Create account</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Your details</h2>
                <p className="mt-1 text-sm text-slate-500">A Kiwix ID will be generated after signup.</p>
              </div>
              {error && <p role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">{error}</p>}
              <form onSubmit={(event) => void submit(event)} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <input autoComplete="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-200 bg-stone-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email address
                  <input autoComplete="email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-200 bg-stone-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  I’m here to
                  <select value={role} onChange={(event) => setRole(event.target.value as AccountRole)} className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-200 bg-stone-50/70 px-4 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10">
                    <option value="sender">Send collections</option>
                    <option value="recipient">Receive collections</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Password
                  <span className="relative mt-1.5 block">
                    <input autoComplete="new-password" type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="min-h-12 w-full rounded-lg border border-slate-200 bg-stone-50/70 px-4 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10" />
                    <button type="button" aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-emerald-800"><Eye size={18} aria-hidden="true" /></button>
                  </span>
                  <span className="mt-1 block text-xs font-normal text-slate-500">Use 8–72 characters.</span>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Confirm password
                  <input autoComplete="new-password" type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" className="mt-1.5 min-h-12 w-full rounded-lg border border-slate-200 bg-stone-50/70 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10" />
                </label>
                <button type="submit" disabled={busy} className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60">
                  {busy ? 'Creating your account…' : 'Create account'} <ArrowRight size={17} aria-hidden="true" />
                </button>
              </form>
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">No Google sign-in. Your password is hashed on the server and never returned to your browser.</p>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
