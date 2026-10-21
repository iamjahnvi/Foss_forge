// QR-code scanning for the receiving side of a shared collection.
//
// The share dialog encodes a whole manifest in a QR code. On the other device
// the code is read back with jsQR, which works on plain pixels: a frame of the
// camera, or a picture the user picked. The decoded text is a manifest, so it
// goes through the same validation and the same compatibility report as a
// manifest that was read from a file.

import type jsQR from 'jsqr'

export type QrImageData = {
  data: Uint8ClampedArray
  width: number
  height: number
}

// The decoder is only needed once somebody scans a code, so it is loaded on
// demand instead of weighing down the first paint.
let decoder: typeof jsQR | null = null

async function loadDecoder(): Promise<typeof jsQR> {
  if (!decoder) {
    const module = await import('jsqr')
    decoder = module.default
  }
  return decoder
}

// Reads a QR code out of raw pixels. Returns null when the pixels hold no
// readable code.
export async function decodeQrImageData(image: QrImageData): Promise<string | null> {
  if (image.width < 1 || image.height < 1) return null

  const decode = await loadDecoder()
  const result = decode(image.data, image.width, image.height, {
    inversionAttempts: 'attemptBoth',
  })

  return result?.data ?? null
}

// Reads a QR code out of a picture the user picked.
export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('This browser cannot read images.')
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

  return decodeQrImageData({
    data: imageData.data,
    width: imageData.width,
    height: imageData.height,
  })
}

// Reads a QR code out of the current frame of a video element.
export async function decodeQrFromVideo(video: HTMLVideoElement): Promise<string | null> {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return null

  context.drawImage(video, 0, 0, width, height)
  const imageData = context.getImageData(0, 0, width, height)

  return decodeQrImageData({
    data: imageData.data,
    width: imageData.width,
    height: imageData.height,
  })
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}
