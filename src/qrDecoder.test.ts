// Test evidence for the receiving side of a shared collection: a QR code that
// the share dialog produced is read back and turned into a manifest again.

import { describe, expect, it } from 'vitest'
import { parseManifest, serializeManifest, type CollectionManifest } from './manifest'
import { decodeQrImageData } from './qrDecoder'
import { manifestToQrModuleMatrix } from './qrcode'

const manifest: CollectionManifest = {
  schemaVersion: 2,
  id: 'collection-1',
  name: 'World history',
  description: 'A shared collection.',
  createdAt: '2026-10-21T10:00:00Z',
  resources: [
    {
      id: 'resource-1',
      title: 'History encyclopedia',
      language: 'en',
      zimUuid: '01234567-89ab-cdef-0123-456789abcdef',
      zimVersion: '6.1',
      zimChecksum: 'a'.repeat(32),
    },
  ],
}

// Paints a QR module matrix on a white canvas, the way the share dialog does,
// so the scanner has real pixels to read.
function matrixToImageData(
  matrix: { size: number; data: Uint8Array },
  scale = 4,
  margin = 4,
): { data: Uint8ClampedArray; width: number; height: number } {
  const dimension = (matrix.size + margin * 2) * scale
  const data = new Uint8ClampedArray(dimension * dimension * 4).fill(255)

  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      if (!matrix.data[row * matrix.size + column]) continue
      for (let y = 0; y < scale; y += 1) {
        for (let x = 0; x < scale; x += 1) {
          const pixelX = (column + margin) * scale + x
          const pixelY = (row + margin) * scale + y
          const offset = (pixelY * dimension + pixelX) * 4
          data[offset] = 0
          data[offset + 1] = 0
          data[offset + 2] = 0
        }
      }
    }
  }

  return { data, width: dimension, height: dimension }
}

describe('QR scanning', () => {
  it('reads back the manifest a shared QR code carries', async () => {
    const json = serializeManifest(manifest)
    const image = matrixToImageData(manifestToQrModuleMatrix(json))

    const decoded = await decodeQrImageData(image)

    expect(decoded).toBe(json)
  })

  it('reads back a manifest that a receiver can import', async () => {
    const json = serializeManifest(manifest)
    const image = matrixToImageData(manifestToQrModuleMatrix(json))

    const decoded = await decodeQrImageData(image)

    expect(decoded).not.toBeNull()
    expect(parseManifest(decoded as string)).toEqual(manifest)
  })

  it('returns null for an image that holds no QR code', async () => {
    const blank = new Uint8ClampedArray(64 * 64 * 4).fill(255)

    expect(await decodeQrImageData({ data: blank, width: 64, height: 64 })).toBeNull()
  })

  it('returns null for an empty image', async () => {
    expect(await decodeQrImageData({ data: new Uint8ClampedArray(), width: 0, height: 0 })).toBeNull()
  })

  it('reads a code that carries something other than a manifest', async () => {
    const image = matrixToImageData(manifestToQrModuleMatrix('https://example.test/collection'))

    expect(await decodeQrImageData(image)).toBe('https://example.test/collection')
  })
})
