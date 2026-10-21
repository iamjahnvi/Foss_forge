import { describe, expect, it } from 'vitest'
import { validateManifestData } from './manifestValidation'

const validManifest = {
  schemaVersion: 1,
  id: 'collection-1',
  name: 'World history',
  description: 'A small collection.',
  createdAt: '2026-10-21T10:00:00Z',
  resources: [
    {
      id: 'resource-1',
      title: 'History encyclopedia',
      language: 'en',
      sizeBytes: 1024,
      sha256: 'a'.repeat(64),
    },
  ],
}

describe('backend manifest validation', () => {
  it('accepts a valid version 1 manifest', () => {
    expect(validateManifestData(validManifest)).toEqual({
      valid: true,
      manifest: validManifest,
    })
  })

  it('reports missing required fields', () => {
    const result = validateManifestData({ schemaVersion: 1 })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors.join('; ')).toContain('missing required field "id"')
      expect(result.errors.join('; ')).toContain('missing required field "resources"')
    }
  })

  it('rejects invalid field types', () => {
    const result = validateManifestData({ ...validManifest, name: 42 })

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.join('; ')).toContain('/name must be string')
  })

  it('rejects negative resource sizes', () => {
    const manifest = structuredClone(validManifest)
    manifest.resources[0].sizeBytes = -1
    const result = validateManifestData(manifest)

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.join('; ')).toContain('sizeBytes must be >= 0')
  })

  it('rejects malformed checksums', () => {
    const manifest = structuredClone(validManifest)
    manifest.resources[0].sha256 = 'not-a-checksum'
    const result = validateManifestData(manifest)

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.join('; ')).toContain('sha256 must match')
  })

  it('rejects unsupported schema versions', () => {
    const result = validateManifestData({ ...validManifest, schemaVersion: 2 })

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors[0]).toContain('supports version 1')
  })

  it('rejects duplicate resource IDs', () => {
    const manifest = {
      ...validManifest,
      resources: [...validManifest.resources, { ...validManifest.resources[0] }],
    }
    const result = validateManifestData(manifest)

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors[0]).toContain('duplicate resource ID "resource-1"')
  })

  it('rejects unknown fields at the collection and resource levels', () => {
    const withUnknownCollectionField = { ...validManifest, extra: true }
    const collectionResult = validateManifestData(withUnknownCollectionField)

    expect(collectionResult.valid).toBe(false)
    if (!collectionResult.valid) {
      expect(collectionResult.errors.join('; ')).toContain('must NOT have additional properties')
    }

    const withUnknownResourceField = {
      ...validManifest,
      resources: [{ ...validManifest.resources[0], extra: true }],
    }
    const resourceResult = validateManifestData(withUnknownResourceField)

    expect(resourceResult.valid).toBe(false)
    if (!resourceResult.valid) {
      expect(resourceResult.errors.join('; ')).toContain(
        '/resources/0 must NOT have additional properties',
      )
    }
  })
})
