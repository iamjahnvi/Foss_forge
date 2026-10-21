import { describe, expect, it } from 'vitest'
import { createCollection } from './collections'

describe('createCollection', () => {
  it('trims the collection name and description', () => {
    expect(createCollection('  World history  ', '  A reading list  ', 'collection-1')).toEqual({
      id: 'collection-1',
      name: 'World history',
      description: 'A reading list',
      createdAt: expect.any(String),
      resources: [],
    })
  })

  it('rejects a name containing only whitespace', () => {
    expect(() => createCollection('   ', '')).toThrow('A collection name is required.')
  })
})
