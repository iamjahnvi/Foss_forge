// The home page.
//
// Before anybody signs in, the app has to explain what it is for. There are
// two sides to it: a sender curates collections of offline resources and
// shares them, a receiver takes a collection and checks it against the
// archives on their own machine. The page explains both, and then asks which
// one the visitor is.

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  BookOpen,
  Boxes,
  Check,
  Download,
  QrCode,
  ScanLine,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { Reveal } from './Reveal'
import heroIllustration from './assets/hero-offline-library.svg'

// The landing part of the site has two pages; the app itself lives at #/app. They are addressed by the
// URL hash, so the browser back button and direct links work without a router.
export type HomeRoute = 'home' | 'how-kiwix-works'

function readHomeRoute(hash: string = window.location.hash): HomeRoute {
  const value = hash.replace(/^#\/?/, '')
  return value === 'how-kiwix-works' ? value : 'home'
}

const SENDER_STEPS = [
  {
    title: 'Open the app',
    body: 'Create your account, then keep collections in this browser. Nothing about your archives is uploaded.',
  },
  {
    title: 'Scan the archives you already own',
    body: 'The browser reads the header of every ZIM file you pick and records the archive identity, format version, article count, size and language. The files never leave your machine.',
  },
  {
    title: 'Build a collection',
    body: 'Name it, describe it, and add the archives to it. The order of the resources is the order a reader is expected to work through them in.',
  },
  {
    title: 'Share the manifest',
    body: 'Export it as a JSON file, or as a QR code that carries the whole manifest. A collection travels as metadata; the archives stay where they are.',
  },
]

const RECEIVER_STEPS = [
  {
    title: 'Open the app',
    body: 'Use your account on the receiving machine. The archive check runs in the browser against files already on that device.',
  },
  {
    title: 'Take the manifest',
    body: 'Import the JSON file, scan the QR code with the camera, or pick a picture of one. The manifest is parsed and validated before anything is saved.',
  },
  {
    title: 'Check archives on this device',
    body: 'Choose the ZIM files you already have from the collection editor. Their metadata is used for the compatibility report; the archives stay on this device.',
  },
  {
    title: 'Read the compatibility report',
    body: 'Every resource is matched by ZIM identity, then by format version, then by the checksum inside the archive. You see exactly which archives you have, which are missing, and which do not match.',
  },
]

const MANIFEST_ROWS = [
  ['id, name, description, createdAt', 'Which collection this is, and when it was made.'],
  ['resources[].id, title, language', 'What the resource is and which language it is in.'],
  ['Archive identity', 'Used internally to match the archive without displaying its identifier.'],
  ['resources[].zimVersion', 'The ZIM format version of the archive, for example 6.1.'],
  ['resources[].zimChecksum', 'The checksum stored inside the archive, used to prove a local copy is the same file.'],
  ['resources[].filename, sizeBytes, sourceUrl', 'A hint of what to look for and where the archive came from.'],
]

const REPORT_STATES = [
  ['Present & verified', 'The archive is on this machine and its checksum agrees with the manifest.'],
  ['Missing', 'No archive on this machine has the ZIM identity the manifest describes.'],
  ['Different version', 'The archive is here, but in another ZIM format version.'],
  ['Integrity mismatch', 'The archive is here, but its checksum differs, so it is not the same file.'],
  ['Unknown / incompatible', 'The resource records no ZIM identity, or the archive uses a format the app does not know.'],
]


export function HomePage() {
  const [route, setRoute] = useState<HomeRoute>(() => readHomeRoute())

  useEffect(() => {
    const onHashChange = () => setRoute(readHomeRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function openApp() {
    window.location.hash = '#/app'
    window.scrollTo?.(0, 0)
  }

  function startSignup() {
    window.location.hash = '#/signup'
    window.scrollTo?.(0, 0)
  }

  function startLogin() {
    window.location.hash = '#/login'
    window.scrollTo?.(0, 0)
  }

  function go(next: HomeRoute) {
    const hash = next === 'home' ? '#/' : `#/${next}`
    if (window.location.hash !== hash) window.location.hash = hash
    setRoute(next)
    window.scrollTo?.(0, 0)
  }

  const header = (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <a
          href="#/"
          onClick={(event) => {
            event.preventDefault()
            go('home')
          }}
          className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          <span className="flex size-10 items-center justify-center rounded-md bg-emerald-800 text-white">
            <BookOpen aria-hidden="true" size={22} />
          </span>
          <span className="text-lg font-semibold tracking-tight">Kiwix Collections</span>
        </a>
        <nav aria-label="Main" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => go('how-kiwix-works')}
            aria-current={route === 'how-kiwix-works' ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${route === 'how-kiwix-works' ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-stone-100'}`}
          >
            How Kiwix works
          </button>
          <button
            type="button"
            onClick={startSignup}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Create account
          </button>
        </nav>
      </div>
    </header>
  )

  const footer = (
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-6 text-sm text-slate-500 sm:px-8">
          Kiwix Collections · a project manifest for offline knowledge resources.
        </div>
      </footer>
  )

  if (route === 'how-kiwix-works') {
    return (
      <div className="min-h-screen bg-stone-50 text-slate-900">
        {header}
        <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
          <button
            type="button"
            onClick={() => go('home')}
            className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-emerald-800 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Back to home
          </button>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">How Kiwix Collections works</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            Two sides, one small manifest: a sender curates a collection, a receiver checks it
            against the archives on their own machine.
          </p>

        <section aria-labelledby="what-title" className="mt-14">
          <h2 id="what-title" className="text-xl font-semibold tracking-tight">
            What a collection actually is
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Boxes,
                title: 'Metadata, not files',
                body: 'A collection holds the description of each archive: its identity, its title, its language, its size. Nothing is uploaded.',
              },
              {
                icon: Download,
                title: 'A portable manifest',
                body: 'The whole collection is one small JSON file, or one QR code. It can be emailed, put on a USB stick, or handed over directly.',
              },
              {
                icon: ShieldCheck,
                title: 'Checked, not assumed',
                body: 'A receiver is told which archives they have, which are missing and which do not match — matched by the archive itself, never by its filename.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border border-stone-200 bg-white p-5">
                <Icon aria-hidden="true" size={22} className="text-emerald-800" />
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="sender-title" className="mt-14">
          <p className="text-sm font-medium text-emerald-800">Side one</p>
          <h2 id="sender-title" className="mt-1 text-xl font-semibold tracking-tight">
            How a sender works
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            The sender is the curator. They own the archives, or they know which ones to
            recommend, and they turn that into a collection somebody else can use.
          </p>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {SENDER_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-lg border border-stone-200 bg-white p-5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="mt-1.5 block text-sm leading-6 text-slate-600">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="receiver-title" className="mt-14">
          <p className="text-sm font-medium text-emerald-800">Side two</p>
          <h2 id="receiver-title" className="mt-1 text-xl font-semibold tracking-tight">
            How a receiver works
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            The receiver is the reader. They already own some of the archives, and they want
            to know what a shared collection asks of them before they start.
          </p>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {RECEIVER_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-lg border border-stone-200 bg-white p-5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="mt-1.5 block text-sm leading-6 text-slate-600">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="travel-title" className="mt-14">
          <h2 id="travel-title" className="text-xl font-semibold tracking-tight">
            What travels between the two
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            One JSON manifest, written to a schema both sides validate. It carries the
            identity of every archive, which is what makes the check on the other side
            possible.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Field</th>
                  <th scope="col" className="px-4 py-3 font-medium">What it says</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {MANIFEST_ROWS.map(([field, meaning]) => (
                  <tr key={field}>
                    <td className="px-4 py-3 align-top font-mono text-xs text-emerald-900">{field}</td>
                    <td className="px-4 py-3 align-top leading-6 text-slate-600">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="report-title" className="mt-14">
          <h2 id="report-title" className="text-xl font-semibold tracking-tight">
            The compatibility report
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            The receiver sees one of five states for every resource in the collection.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {REPORT_STATES.map(([state, meaning]) => (
              <li key={state} className="flex items-start gap-2.5 rounded-lg border border-stone-200 bg-white p-4">
                <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-emerald-700" />
                <span>
                  <span className="block text-sm font-semibold">{state}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{meaning}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="start-title" className="mt-14 rounded-lg border border-stone-200 bg-white p-6 sm:p-8">
          <h2 id="start-title" className="text-xl font-semibold tracking-tight">
            Start on one side
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openApp}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Start curating a collection
              <ArrowRight aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              onClick={openApp}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Import a shared collection
            </button>
          </div>
        </section>
        </main>
        {footer}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <div className="relative flex min-h-svh flex-col overflow-hidden bg-gradient-to-b from-white via-emerald-50/60 to-stone-50">
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-32 size-[34rem] rounded-full bg-emerald-200/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-teal-100/60 blur-3xl" />
        <div className="relative z-10">{header}</div>
        <div className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-16">
          <section aria-labelledby="hero-title">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-800 shadow-sm backdrop-blur">
                <span className="size-1.5 rounded-full bg-emerald-600" />
                Portable collections of offline knowledge
              </p>
              <h1 id="hero-title" className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
                Your offline knowledge,{' '}
                <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                  organized and shareable.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Organize ZIM archives into portable collections. Share a manifest or QR code so
                others can check what they have. Your files stay on your device.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startSignup}
                  className="group inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-800 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-900 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                >
                  Get started
                  <ArrowRight aria-hidden="true" size={18} className="transition group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={startLogin}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-stone-300 bg-white/80 px-6 py-3 text-sm font-semibold shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                >
                  Login
                </button>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
                Create an account with email. Your ZIM files stay on your machine.
              </p>
            </Reveal>
          </section>
          <Reveal delay={150} className="mx-auto w-full max-w-xl">
            <img
              src={heroIllustration}
              alt="ZIM archives on a laptop shared to a phone through a QR code, fully offline"
              className="hero-float w-full drop-shadow-2xl"
              width={560}
              height={480}
            />
          </Reveal>
        </div>
        <a
          href="#transfer-title"
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('transfer-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className="relative mx-auto mb-6 hidden items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-slate-500 hover:text-emerald-800 sm:inline-flex"
        >
          Scroll to see how it travels
          <ChevronDown aria-hidden="true" size={16} className="animate-bounce motion-reduce:animate-none" />
        </a>
      </div>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section aria-labelledby="transfer-title" className="scroll-mt-8 pt-20">
          <Reveal>
            <p className="text-sm font-semibold tracking-wide text-emerald-700 uppercase">Sharing</p>
            <h2 id="transfer-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Three ways to hand a collection over
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              A collection is only metadata, so it moves the way any small file does — online or not.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { icon: Download, title: 'A JSON file', body: 'Export it and send it however you like: email, USB stick, a shared folder, Bluetooth.' },
              { icon: QrCode, title: 'A QR code', body: 'The whole manifest fits in one code. The other device scans it and imports the collection.' },
              { icon: ScanLine, title: 'A camera', body: 'The receiver scans the code, or picks a picture of it, and the manifest is checked before it is saved.' },
            ].map(({ icon: Icon, title, body }, index) => (
              <Reveal key={title} delay={index * 120}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-stone-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5">
                  <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-0 transition group-hover:opacity-100" />
                  <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
                  <span className="mt-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-800 ring-1 ring-emerald-200/60">
                    <Icon aria-hidden="true" size={24} />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section aria-labelledby="honest-title" className="mt-24">
          <Reveal>
            <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-100 p-8 shadow-sm sm:p-10">
              <h2 id="honest-title" className="text-2xl font-semibold tracking-tight">
                What this app does not do
              </h2>
              <ul className="mt-6 grid gap-5 text-sm leading-6 text-slate-600 md:grid-cols-3">
                <li className="flex gap-3">
                  <Upload aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>
                    It does not upload, host, mirror or rehost a single ZIM file. The manifest is the
                    only thing that is shared.
                  </span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>
                    It does not match archives by their filename. A file called
                    <code className="mx-1 rounded bg-stone-200 px-1 py-0.5 text-xs">wikipedia_en_all.zim</code>
                    can hold a different snapshot, so the ZIM identity is what counts.
                  </span>
                </li>
                <li className="flex gap-3">
                  <BookOpen aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>The manifest format is this project&apos;s own. It is not an official Kiwix standard.</span>
                </li>
              </ul>
            </div>
          </Reveal>
        </section>
      </main>

      {footer}
    </div>
  )
}

export default HomePage
