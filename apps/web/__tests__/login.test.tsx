// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/(auth)/login/page'

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockSignIn = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignIn },
  }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (_k: string) => null }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

// Writable location.href spy
const mockLocation = { href: '' }
Object.defineProperty(window, 'location', { value: mockLocation, writable: true })

// ── tests ─────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignIn.mockReset()
    mockLocation.href = ''
  })

  // ── rendering ──────────────────────────────────────────────────────────────

  it('renders the Sign in heading', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders email input', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders password input', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('renders a link to the signup page', () => {
    render(<LoginPage />)
    const link = screen.getByRole('link', { name: /sign up/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/signup')
  })

  it('does not show an error message on initial render', () => {
    render(<LoginPage />)
    // Error only appears after a failed submission — should not be visible initially
    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/wrong/i)).not.toBeInTheDocument()
  })

  // ── form interaction ───────────────────────────────────────────────────────

  it('updates email field on input', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'user@example.com')
    expect(emailInput).toHaveValue('user@example.com')
  })

  it('updates password field on input', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, 'mypassword')
    expect(passwordInput).toHaveValue('mypassword')
  })

  it('calls signInWithPassword with typed credentials', async () => {
    mockSignIn.mockResolvedValue({ error: null, data: { session: {} } })
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'testpass123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'testpass123',
      })
    })
  })

  // ── loading state ──────────────────────────────────────────────────────────

  it('shows "Signing in…" and disables button during submission', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {})) // never resolves
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    const btn = await screen.findByRole('button', { name: /signing in/i })
    expect(btn).toBeDisabled()
  })

  it('prevents double submission while loading', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    // Button is disabled — second click should not trigger another call
    const btn = await screen.findByRole('button', { name: /signing in/i })
    await user.click(btn)
    expect(mockSignIn).toHaveBeenCalledTimes(1)
  })

  // ── error state ─────────────────────────────────────────────────────────────

  it('displays server error message on auth failure', async () => {
    mockSignIn.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
      data: null,
    })
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'badpassword')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  it('re-enables submit button after auth failure', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Error' }, data: null })
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'badpassword')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^sign in$/i })).not.toBeDisabled()
    })
  })

  it('clears previous error message on new submission', async () => {
    mockSignIn
      .mockResolvedValueOnce({ error: { message: 'First error' }, data: null })
      .mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'badpassword')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => screen.getByText('First error'))
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })
  })

  it('displays caught exception message', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  // ── success redirect ───────────────────────────────────────────────────────

  it('redirects to /projects on successful login (default next)', async () => {
    mockSignIn.mockResolvedValue({ error: null, data: { session: { user: { id: 'u1' } } } })
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(mockLocation.href).toBe('/projects')
    })
  })
})
