// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'
import { Root } from './Root'

vi.mock('./App', () => ({ default: () => <main aria-label="Collections app">The app</main> }))

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('the landing page', () => {
  it('opens with the hero and the illustration', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Your offline knowledge')
    expect(screen.getByText(/never uploaded, copied or rehosted/)).toBeTruthy()
    expect(screen.getByRole('img', { name: /QR code/ })).toBeTruthy()
  })

  it('shows the sharing section and keeps the walkthrough on its own page', () => {
    render(<HomePage />)

    expect(screen.getByRole('region', { name: 'Three ways to hand a collection over' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'What this app does not do' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'How a sender works' })).toBeNull()
  })

  it('has no sign in or account pages', () => {
    render(<HomePage />)

    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /create account/i })).toBeNull()
  })
})

describe('the How Kiwix works page', () => {
  it('is reached from the navbar and explains both sides', () => {
    render(<HomePage />)

    fireEvent.click(screen.getByRole('button', { name: 'How Kiwix works' }))

    expect(window.location.hash).toBe('#/how-kiwix-works')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('How Kiwix Collections works')
    expect(screen.getByRole('region', { name: 'How a sender works' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'How a receiver works' })).toBeTruthy()
    expect(screen.getByText('resources[].zimChecksum')).toBeTruthy()
    expect(screen.getByText('Present & verified')).toBeTruthy()
    expect(screen.queryByText(/Pick a role/)).toBeNull()
  })

  it('opens directly from its link and leads back home', () => {
    window.location.hash = '#/how-kiwix-works'
    render(<HomePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))

    expect(screen.getByRole('region', { name: 'Three ways to hand a collection over' })).toBeTruthy()
  })
})

describe('navigation to the app', () => {
  it('starts on the landing page', () => {
    render(<Root />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Your offline knowledge')
    expect(screen.queryByText('The app')).toBeNull()
  })

  it('opens the app from the call to action', async () => {
    render(<Root />)

    fireEvent.click(screen.getByRole('button', { name: /Get started/ }))

    expect(window.location.hash).toBe('#/app')
    expect(await screen.findByText('The app')).toBeTruthy()
  })

  it('opens the app from the navbar', async () => {
    render(<Root />)

    fireEvent.click(screen.getByRole('button', { name: 'Open the app' }))

    expect(await screen.findByText('The app')).toBeTruthy()
  })

  it('renders the app directly at #/app', () => {
    window.location.hash = '#/app'
    render(<Root />)

    expect(screen.getByText('The app')).toBeTruthy()
  })
})
