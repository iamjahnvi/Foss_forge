// The root decides which part of the site to show. The landing pages (home and
// "How Kiwix works") are the entry; the collections app lives at #/app.

import { useEffect, useState } from 'react'
import App from './App'
import { HomePage } from './HomePage'
import { SignupPage } from './SignupPage'

function readRoute(hash: string = window.location.hash): 'app' | 'signup' | 'home' {
  if (/^#\/app(\/|$)/.test(hash)) return 'app'
  if (/^#\/signup(\/|$)/.test(hash)) return 'signup'
  return 'home'
}

export function Root() {
  const [route, setRoute] = useState(() => readRoute())

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route === 'app') return <App />
  if (route === 'signup') {
    return <SignupPage onBack={() => { window.location.hash = '#/' }} onCreated={() => { window.location.hash = '#/app' }} />
  }
  return <HomePage />
}

export default Root
