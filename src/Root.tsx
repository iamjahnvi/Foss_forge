// The root decides which part of the site to show. The landing pages (home and
// "How Kiwix works") are the entry; the collections app lives at #/app.

import { useEffect, useState } from 'react'
import App from './App'
import { HomePage } from './HomePage'
import { SignupPage } from './SignupPage'

function readRoute(hash: string = window.location.hash): 'app' | 'signup' | 'login' | 'home' | `receive:${string}` {
  const transfer = /^#\/receive\/([\w-]+)$/.exec(hash)
  if (transfer) return `receive:${transfer[1]}`
  if (/^#\/app(\/|$)/.test(hash)) return 'app'
  if (/^#\/signup(\/|$)/.test(hash)) return 'signup'
  if (/^#\/login(\/|$)/.test(hash)) return 'login'
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
  if (route.startsWith('receive:')) return <App transferId={route.slice('receive:'.length)} />
  if (route === 'signup' || route === 'login') {
    return <SignupPage mode={route} onBack={() => { window.location.hash = '#/' }} onCreated={() => {
      const transferId = window.localStorage.getItem('kiwix-collections:pending-transfer')
      if (transferId) {
        window.localStorage.removeItem('kiwix-collections:pending-transfer')
        window.location.hash = `#/receive/${transferId}`
      } else window.location.hash = '#/app'
    }} />
  }
  return <HomePage />
}

export default Root
