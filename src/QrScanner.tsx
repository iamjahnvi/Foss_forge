import { useEffect, useRef, useState } from 'react'
import { Camera, Image as ImageIcon, Square } from 'lucide-react'
import { decodeQrFromImageFile, decodeQrFromVideo } from './qrDecoder'

type Props = {
  // Called with the text the QR code carries. The text is a manifest, so it is
  // validated and reported on like any other import.
  onDecoded: (text: string) => void
}

// The receiving half of a shared collection: read a QR code, either from the
// camera or from a picture the user picked, and hand its text back.
export function QrScanner({ onDecoded }: Props) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function stopCamera() {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsScanning(false)
  }

  useEffect(() => stopCamera, [])

  async function startCamera() {
    setError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot use the camera. Choose a picture of the QR code instead.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setIsScanning(true)

      const video = videoRef.current
      if (!video) {
        stopCamera()
        return
      }

      video.srcObject = stream
      await video.play()

      const scan = async () => {
        const text = await decodeQrFromVideo(video)
        if (text) {
          stopCamera()
          onDecoded(text)
          return
        }
        frameRef.current = window.requestAnimationFrame(scan)
      }
      frameRef.current = window.requestAnimationFrame(scan)
    } catch (cause) {
      stopCamera()
      setError(
        cause instanceof Error && cause.name === 'NotAllowedError'
          ? 'The camera permission was refused. Choose a picture of the QR code instead.'
          : 'The camera could not be started. Choose a picture of the QR code instead.',
      )
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    setError('')
    try {
      const text = await decodeQrFromImageFile(file)
      if (!text) {
        setError('No QR code was found in that picture.')
        return
      }
      onDecoded(text)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That picture could not be read.')
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-200 p-4">
      <h4 className="text-sm font-semibold">Import from a QR code</h4>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Scan the QR code of a shared collection. The manifest it carries is checked
        against the archives on this machine before anything is saved.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={isScanning ? stopCamera : startCamera}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          {isScanning ? (
            <Square aria-hidden="true" size={16} />
          ) : (
            <Camera aria-hidden="true" size={16} />
          )}
          {isScanning ? 'Stop the camera' : 'Scan with the camera'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label="Choose a picture of a QR code"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          <ImageIcon aria-hidden="true" size={16} />
          Choose a QR picture
        </button>
      </div>

      {isScanning && (
        <video
          ref={videoRef}
          aria-label="Camera preview"
          muted
          playsInline
          className="mt-3 max-h-64 w-full rounded-md border border-stone-200 bg-black"
        />
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export default QrScanner
