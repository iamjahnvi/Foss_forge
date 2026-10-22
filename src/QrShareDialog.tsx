import { useEffect, useState } from 'react'
import { Download, QrCode, X } from 'lucide-react'
import { serializeManifest, type CollectionManifest } from './manifest'
import { manifestToQrDataUrl, manifestToQrSvgString, downloadQrPng } from './qrcode'

type Props = {
  open: boolean
  onClose: () => void
  manifest: CollectionManifest
  filename: string
  qrPayload?: string
}

type QrState = {
  key: string
  dataUrl: string | null
  svgString: string | null
  error: string
}

// The generated codes are tied to the manifest they were made from, so a
// collection that changed while the dialog was open never shows a stale code.
function useQrCodes(manifest: CollectionManifest, open: boolean, qrPayload?: string) {
  const key = `${manifest.id}:${manifest.name}:${manifest.resources.length}:${qrPayload ?? ''}`
  const [state, setState] = useState<QrState>({
    key: '',
    dataUrl: null,
    svgString: null,
    error: '',
  })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const json = qrPayload ?? serializeManifest(manifest)

    Promise.all([manifestToQrDataUrl(json), manifestToQrSvgString(json)])
      .then(([dataUrl, svgString]) => {
        if (cancelled) return
        setState({ key, dataUrl, svgString, error: '' })
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setState({
          key,
          dataUrl: null,
          svgString: null,
          error: cause instanceof Error ? cause.message : 'Could not generate a QR code.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [key, manifest, open, qrPayload])

  if (state.key !== key) {
    return { dataUrl: null, svgString: null, error: '' }
  }
  return { dataUrl: state.dataUrl, svgString: state.svgString, error: state.error }
}

export function QrShareDialog({ open, onClose, manifest, filename, qrPayload }: Props) {
  const [copied, setCopied] = useState(false)
  const { dataUrl, svgString, error } = useQrCodes(manifest, open, qrPayload)

  if (!open) return null

  const shareText = serializeManifest(manifest)
  const baseName = filename.replace(/\.json$/i, '')

  async function handleCopyJson() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable; the JSON is still shown for manual copy.
    }
  }

  function handleDownloadPng() {
    if (!dataUrl) return
    downloadQrPng(dataUrl, `${baseName}-qr.png`)
  }

  function handleDownloadSvg() {
    if (!svgString) return
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${baseName}-qr.svg`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-share-title"
      onClick={onClose}
    >
      <div
        className="m-auto w-full max-w-lg overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="qr-share-title" className="text-lg font-semibold">
              Share collection as a QR code
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {qrPayload
                ? 'This QR code opens the recipient-only transfer link. The recipient must sign in to their account to view and import it.'
                : 'The QR code encodes the full JSON manifest. Scanning it on another device lets that device import the collection directly.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-stone-100 hover:text-slate-900"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[160px_1fr] sm:p-6">
          <div className="flex items-center justify-center rounded-md border border-stone-200 bg-white p-3">
            {error ? (
              <p role="alert" className="max-w-[120px] text-center text-xs text-red-700">
                {error}
              </p>
            ) : dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR code for ${manifest.name}`}
                className="max-h-40 max-w-40"
              />
            ) : (
              <QrCode aria-hidden="true" size={40} className="animate-pulse text-slate-400" />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-slate-900">{manifest.name}</h3>
            <p className="text-xs text-slate-500">
              {manifest.resources.length}{' '}
              {manifest.resources.length === 1 ? 'resource' : 'resources'} · schema v
              {manifest.schemaVersion}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!dataUrl}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download aria-hidden="true" size={16} />
                Download PNG
              </button>
              <button
                type="button"
                onClick={handleDownloadSvg}
                disabled={!svgString}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download aria-hidden="true" size={16} />
                Download SVG
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100"
              >
                {copied ? 'Copied!' : 'Copy JSON to clipboard'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default QrShareDialog
