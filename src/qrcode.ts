// QR-code sharing for Kiwix Collections manifests.
//
// This is a client-side-only app with no backend, so the most useful sharing
// mechanism is a QR code that *contains* the manifest itself. A second device
// can scan it, recover the JSON, and import the collection directly. The QR
// module wraps the `qrcode` package and keeps the canvas creation in a
// dependency-free component so it can be tested in isolation.

import QRCode from 'qrcode'

export type QrDataUrlOptions = {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
  scale?: number
}

// The raw module matrix of an encoded QR code: one entry per module, 1 for a
// dark module and 0 for a light one. The sharing side paints it on a canvas,
// and the tests use it to build an image that the scanner can read back.
export type QrModuleMatrix = {
  size: number
  data: Uint8Array
}

export function manifestToQrModuleMatrix(
  json: string,
  options: QrDataUrlOptions = {},
): QrModuleMatrix {
  const qr = QRCode.create(json, {
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
  })

  return { size: qr.modules.size, data: qr.modules.data }
}

export async function manifestToQrDataUrl(
  json: string,
  options: QrDataUrlOptions = {},
): Promise<string> {
  return QRCode.toDataURL(json, {
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    margin: options.margin ?? 2,
    scale: options.scale ?? 4,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })
}

export async function manifestToQrSvgString(
  json: string,
  options: QrDataUrlOptions = {},
): Promise<string> {
  return QRCode.toString(json, {
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
    margin: options.margin ?? 2,
    type: 'svg',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })
}

export function dataUrlToPngBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const match = /^data:(.*?);base64,(.*)$/s.exec(dataUrl)
    if (!match) {
      reject(new Error('QR data URL is not a base64 image.'))
      return
    }
    try {
      const binary = atob(match[2])
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }
      resolve(new Blob([bytes], { type: match[1] || 'image/png' }))
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

export function downloadQrPng(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
}