// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'
import type { AuthUser, SignUpInput } from '../shared/auth'

const account: AuthUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.org',
  kiwiId: 'ada',
  role: 'sender',
  createdAt: '2026-10-21T09:00:00Z',
}

afterEach(() => {
  cleanup()
})

describe('the home page', () => {
  it('explains what the project is', () => {
    render(<HomePage error="" onSignUp={vi.fn()} onSignIn={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      'Your offline knowledge',
    )
    expect(screen.getByText(/never uploaded, copied or rehosted/)).toBeTruthy()
  })

  it('explains how a sender works', () => {
    render(<HomePage error="" onSignUp={vi.fn()} onSignIn={vi.fn()} />)

    const section = screen.getByRole('region', { name: 'How a sender works' })
    expect(within(section).getByText('Scan the archives you already own')).toBeTruthy()
    expect(within(section).getByText('Share the manifest')).toBeTruthy()
  })

  it('explains how a receiver works', () => {
    render(<HomePage error="" onSignUp={vi.fn()} onSignIn={vi.fn()} />)

    const section = screen.getByRole('region', { name: 'How a receiver works' })
    expect(within(section).getByText('Take the manifest')).toBeTruthy()
    expect(within(section).getByText('Read the compatibility report')).toBeTruthy()
  })

  it('says what the manifest carries and what the report says', () => {
    render(<HomePage error="" onSignUp={vi.fn()} onSignIn={vi.fn()} />)

    expect(screen.getByText('resources[].zimChecksum')).toBeTruthy()
    expect(screen.getByText('Present & verified')).toBeTruthy()
    expect(screen.getByText('Different version')).toBeTruthy()
  })

  it('opens the sign up dialog and asks for a role', async () => {
    render(<HomePage error="" onSignUp={vi.fn()} onSignIn={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0])

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Name')).toBeTruthy()
    expect(within(dialog).getByLabelText('Email address')).toBeTruthy()
    expect(within(dialog).getByLabelText('Kiwi id')).toBeTruthy()
    expect(within(dialog).getByLabelText('Password')).toBeTruthy()
    expect(within(dialog).getByLabelText('Sender')).toBeTruthy()
    expect(within(dialog).getByLabelText('Receiver')).toBeTruthy()
  })

  it('sends the account details, including the chosen role', async () => {
    const onSignUp = vi.fn(async (_input: SignUpInput) => account)
    render(<HomePage error="" onSignUp={onSignUp} onSignIn={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0])
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'Ada Lovelace' },
    })
    fireEvent.change(within(dialog).getByLabelText('Email address'), {
      target: { value: 'ada@example.org' },
    })
    fireEvent.change(within(dialog).getByLabelText('Kiwi id'), {
      target: { value: 'ada' },
    })
    fireEvent.click(within(dialog).getByLabelText('Receiver'))
    fireEvent.change(within(dialog).getByLabelText('Password'), {
      target: { value: 'analytical engine' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(onSignUp).toHaveBeenCalledTimes(1))
    expect(onSignUp.mock.calls[0][0]).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      kiwiId: 'ada',
      role: 'receiver',
      password: 'analytical engine',
    })
  })

  it('signs in with a kiwi id or an email address', async () => {
    const onSignIn = vi.fn(async (_identifier: string, _password: string) => account)
    render(<HomePage error="" onSignUp={vi.fn()} onSignIn={onSignIn} />)

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText('Kiwi id or email address'), {
      target: { value: 'ada' },
    })
    fireEvent.change(within(dialog).getByLabelText('Password'), {
      target: { value: 'analytical engine' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign in to your account' }))

    await waitFor(() => expect(onSignIn).toHaveBeenCalledTimes(1))
    expect(onSignIn.mock.calls[0]).toEqual(['ada', 'analytical engine'])
  })

  it('shows the reason the server refused the account', async () => {
    const onSignUp = vi.fn(async (_input: SignUpInput) => {
      throw new Error('This kiwi id is already taken.')
    })
    render(<HomePage error="" onSignUp={onSignUp} onSignIn={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0])
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Ada' } })
    fireEvent.change(within(dialog).getByLabelText('Email address'), {
      target: { value: 'ada@example.org' },
    })
    fireEvent.change(within(dialog).getByLabelText('Kiwi id'), { target: { value: 'ada' } })
    fireEvent.change(within(dialog).getByLabelText('Password'), {
      target: { value: 'analytical engine' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('This kiwi id is already taken.'),
    )
  })
})
