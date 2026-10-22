// The home page.
//
// Before anybody signs in, the app has to explain what it is for. There are
// two sides to it: a sender curates collections of offline resources and
// shares them, a receiver takes a collection and checks it against the
// archives on their own machine. The page explains both, and then asks which
// one the visitor is.

import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  Download,
  QrCode,
  ScanLine,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { AuthDialog } from './AuthDialog'
import type { AuthUser, SignUpInput } from '../shared/auth'

type Props = {
  error: string
  onSignUp: (input: SignUpInput) => Promise<AuthUser>
  onSignIn: (identifier: string, password: string) => Promise<AuthUser>
}

type DialogMode = 'signup' | 'login' | null

const SENDER_STEPS = [
  {
    title: 'Create a sender account',
    body: 'Your name, an email address and a kiwi id — a short handle the other side sees when you share a collection.',
  },
  {
    title: 'Scan the archives you already own',
    body: 'The browser reads the header of every ZIM file you pick and records its identity: the UUID, the format version, the article count, the size and the language. The files never leave your machine.',
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
    title: 'Create a receiver account',
    body: 'The same details as a sender, and the same kiwi id idea — it tells the sender who they are sharing with.',
  },
  {
    title: 'Take the manifest',
    body: 'Import the JSON file, scan the QR code with the camera, or pick a picture of one. The manifest is parsed and validated before anything is saved.',
  },
  {
    title: 'Build your local inventory',
    body: 'Scan the ZIM files you already have. This is the list of archives that the compatibility report is checked against.',
  },
  {
    title: 'Read the compatibility report',
    body: 'Every resource is matched by ZIM identity, then by format version, then by the checksum inside the archive. You see exactly which archives you have, which are missing, and which do not match.',
  },
]

const MANIFEST_ROWS = [
  ['id, name, description, createdAt', 'Which collection this is, and when it was made.'],
  ['resources[].id, title, language', 'What the resource is and which language it is in.'],
  ['resources[].zimUuid', 'The identity of the archive, taken from the ZIM header.'],
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

export function HomePage({ error, onSignUp, onSignIn }: Props) {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [dialogError, setDialogError] = useState('')

  async function handleSignUp(input: SignUpInput): Promise<AuthUser> {
    setDialogError('')
    try {
      return await onSignUp(input)
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'The account could not be created.')
      throw cause
    }
  }

  async function handleSignIn(identifier: string, password: string): Promise<AuthUser> {
    setDialogError('')
    try {
      return await onSignIn(identifier, password)
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'The sign in did not work.')
      throw cause
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-emerald-800 text-white">
              <BookOpen aria-hidden="true" size={22} />
            </span>
            <span className="text-lg font-semibold tracking-tight">Kiwix Collections</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDialogMode('login')}
              className="inline-flex min-h-11 items-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setDialogMode('signup')}
              className="inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Create account
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="max-w-3xl">
          <p className="text-sm font-medium text-emerald-800">Portable collections of offline knowledge</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your offline knowledge, organized and shareable.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Kiwix Collections describes the offline resources you care about — the ZIM archives
            of Wikipedia, textbooks, journals — in a small, portable manifest. One person curates
            a collection; another takes it and finds out exactly which of the archives they
            already have. The archives themselves are never uploaded, copied or rehosted.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDialogMode('signup')}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Create your account
              <ArrowRight aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              onClick={() => setDialogMode('login')}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              I already have an account
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Creating an account asks one question: are you here to send collections, or to
            receive them? You can still do both later.
          </p>
        </section>

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
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Pick a role when you create your account. A sender builds and shares collections; a
            receiver imports them and checks them against their own library.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDialogMode('signup')}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Create a sender account
              <ArrowRight aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              onClick={() => setDialogMode('signup')}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Create a receiver account
            </button>
          </div>
        </section>

        <section aria-labelledby="transfer-title" className="mt-14">
          <h2 id="transfer-title" className="text-xl font-semibold tracking-tight">
            Three ways to hand a collection over
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Download, title: 'A JSON file', body: 'Export it and send it however you like: email, USB stick, a shared folder, Bluetooth.' },
              { icon: QrCode, title: 'A QR code', body: 'The whole manifest fits in one code. The other device scans it and imports the collection.' },
              { icon: ScanLine, title: 'A camera', body: 'The receiver scans the code, or picks a picture of it, and the manifest is checked before it is saved.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border border-stone-200 bg-white p-5">
                <Icon aria-hidden="true" size={22} className="text-emerald-800" />
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="honest-title" className="mt-14">
          <h2 id="honest-title" className="text-xl font-semibold tracking-tight">
            What this app does not do
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
            <li className="flex gap-2.5">
              <Upload aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-slate-400" />
              It does not upload, host, mirror or rehost a single ZIM file. The manifest is the
              only thing that is shared.
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-slate-400" />
              It does not match archives by their filename. A file called
              <code className="mx-1 rounded bg-stone-200 px-1 py-0.5 text-xs">wikipedia_en_all.zim</code>
              can hold a different snapshot, so the ZIM identity is what counts.
            </li>
            <li className="flex gap-2.5">
              <BookOpen aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-slate-400" />
              The manifest format is this project&apos;s own. It is not an official Kiwix standard.
            </li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-6 text-sm text-slate-500 sm:px-8">
          Kiwix Collections · a project manifest for offline knowledge resources.
        </div>
      </footer>

      <AuthDialog
        key={dialogMode ?? 'closed'}
        mode={dialogMode}
        error={dialogError || error}
        onClose={() => {
          setDialogMode(null)
          setDialogError('')
        }}
        onSignUp={handleSignUp}
        onSignIn={handleSignIn}
      />
    </div>
  )
}

export default HomePage
