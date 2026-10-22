// The root decides what the visitor sees: the home page while nobody is
// signed in, the application once they are.

import App from './App'
import { HomePage } from './HomePage'
import { useAuth } from './useAuth'

export function Root() {
  const { status, user, error, signUp, signIn, signOut } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-sm text-slate-600">
        Checking your session…
      </div>
    )
  }

  if (status === 'signed-out' || !user) {
    return <HomePage error={error} onSignUp={signUp} onSignIn={signIn} />
  }

  return <App user={user} onSignOut={() => void signOut()} />
}

export default Root
