// The root decides which part of the site to show. The landing pages (home and
// "How Kiwix works") are the entry; the collections app lives at #/app.

import { useEffect, useState } from 'react'
import App from './App'
import { HomePage } from './HomePage'

function isAppRoute(hash: string = window.location.hash): boolean {
  return /^#\/app(\/|$)/.test(hash)
}

export function Root() {
  const [showApp, setShowApp] = useState(() => isAppRoute())

  useEffect(() => {
    const onHashChange = () => setShowApp(isAppRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return showApp ? <App /> : <HomePage />
}

export default Root
