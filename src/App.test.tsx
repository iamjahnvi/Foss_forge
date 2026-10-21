// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ZIM_HEADER_SIZE, ZIM_MAGIC } from './zim'

beforeAll(() => {
  // jsdom does not implement the modal dialog methods.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function close() {
      this.open = false
    }
  }
})

// A synthetic ZIM archive: an 80-byte header followed by a 16-byte checksum.
function buildZimFile(name: string, uuid: string): File {
  const buffer = new ArrayBuffer(ZIM_HEADER_SIZE + 16)
  const view = new DataView(buffer)
  view.setUint32(0, ZIM_MAGIC, true)
  view.setUint16(4, 5, true)
  view.setUint16(6, 1, true)
  const hex = uuid.replace(/-/g, '')
  for (let i = 0; i < 16; i += 1) {
    view.setUint8(8 + i, Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16))
  }
  view.setUint32(24, 42, true)
  view.setUint32(28, 7, true)
  view.setBigUint64(56, BigInt(ZIM_HEADER_SIZE), true)
  return new File([buffer], name)
}

function mockApi(collections: unknown[] = []) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      return new Response(JSON.stringify({ collections }), { status: 200 })
    }
    return new Response(JSON.stringify({ collections }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function createCollection(name: string) {
  fireEvent.click(screen.getAllByRole('button', { name: 'Create collection' })[0])
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: name } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }))
  await waitFor(() => expect(screen.getByText(name)).toBeTruthy())
}

beforeEach(() => {
  window.localStorage.clear()
  mockApi([])
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('collections', () => {
  it('creates a collection and lists it', async () => {
    render(<App />)

    await createCollection('World history')

    expect(screen.getByText('0 resources')).toBeTruthy()
  })

  it('opens a collection and adds a resource by hand', async () => {
    render(<App />)

    await createCollection('World history')
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))

    fireEvent.change(screen.getByLabelText('Resource title'), {
      target: { value: 'Wikipedia' },
    })
    fireEvent.change(screen.getByLabelText('Resource language'), { target: { value: 'en' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add resource' }))

    await waitFor(() => expect(screen.getByDisplayValue('Wikipedia')).toBeTruthy())
    expect(screen.getByText(/1 resource · created/)).toBeTruthy()
  })

  it('sends the collection list to the API', async () => {
    const fetchMock = mockApi([])
    render(<App />)

    await createCollection('World history')

    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
      expect(put).toBeTruthy()
      const body = JSON.parse(String((put?.[1] as RequestInit).body)) as {
        collections: { name: string }[]
      }
      expect(body.collections[0].name).toBe('World history')
    })
  })

  it('shares a collection as a QR code', async () => {
    render(<App />)

    await createCollection('World history')
    fireEvent.click(screen.getByRole('button', { name: 'Share QR' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Share collection as a QR code')).toBeTruthy()
    expect(within(dialog).getByText(/"schemaVersion": 1/)).toBeTruthy()
  })
})

describe('local inventory', () => {
  it('scans a ZIM archive and lists it', async () => {
    render(<App />)

    await createCollection('Offline set')
    fireEvent.click(screen.getByRole('button', { name: 'Local Inventory' }))

    const file = buildZimFile('wikipedia_en_all.zim', '01234567-89ab-cdef-0123-456789abcdef')
    fireEvent.change(screen.getByLabelText('Choose ZIM archives to scan'), {
      target: { files: [file] },
    })

    await waitFor(() => expect(screen.getByText('wikipedia_en_all')).toBeTruthy())
    expect(screen.getByText('1 archive added to the local inventory.')).toBeTruthy()
    expect(screen.getByText('01234567-89ab-cdef-0123-456789abcdef')).toBeTruthy()
  })

  it('adds a scanned archive to a collection', async () => {
    render(<App />)

    await createCollection('Offline set')
    fireEvent.click(screen.getByRole('button', { name: 'Local Inventory' }))

    const file = buildZimFile('wikipedia_en_all.zim', '01234567-89ab-cdef-0123-456789abcdef')
    fireEvent.change(screen.getByLabelText('Choose ZIM archives to scan'), {
      target: { files: [file] },
    })
    await waitFor(() => expect(screen.getByText('wikipedia_en_all')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Add to collection' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Already added' })).toBeTruthy(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Collections' }))
    await waitFor(() => expect(screen.getByText('1 resource')).toBeTruthy())
  })
})
