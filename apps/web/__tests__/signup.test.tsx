// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/(auth)/signup/page'

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockSignUp = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signUp: mockSignUp },
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

const mockLocation = { href: '', origin: 'http://localhost:3000' }
Object.defineProperty(window, 'location', { value: mockLocation, writable: true })

// ── helpers ───────────────────────────────────────────────────────────────────

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, name = 'Alice', email = 'alice@example.com', password = 'password123') {
  await user.type(screen.getByLabelText(/display name/i), name)
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/password/i), password)
  await user.click(screen.getByRole('button', { name: /^create account$/i }))
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('SignupPage', () => {
  beforeEach(() => {
    mockSignUp.mockReset()
    mockLocation.href = ''
  })

  // ── rendering ──────────────────────────────────────────────────────────────

  it('renders Create account heading', () => {
    render(<SignupPage />)
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders display name input', () => {
    render(<SignupPage />)
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
  })

  it('renders email input', () => {
    render(<SignupPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders password input', () => {
    render(<SignupPage />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the Create account button', () => {
    render(<SignupPage />)
    expect(screen.getByRole('button', { name: /^create account$/i })).toBeInTheDocument()
  })

  it('renders a Sign in link back to login', () => {
    render(<SignupPage />)
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('does not show error on initial render', () => {
    render(<SignupPage />)
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
  })

  // ── form interaction ───────────────────────────────────────────────────────

  it('updates each field on input', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)
    await user.type(screen.getByLabelText(/display name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'mypassword')
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Alice')
    expect(screen.getByLabelText(/email/i)).toHaveValue('alice@example.com')
    expect(screen.getByLabelText(/password/i)).toHaveValue('mypassword')
  })

  it('calls signUp with correct payload', async () => {
    mockSignUp.mockResolvedValue({ error: null, data: {} })
    const user = userEvent.setup()
    render(<SignupPage />)
    await fillAndSubmit(user)
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'password123',
        options: {
          data: { full_name: 'Alice' },
          emailRedirectTo: expect.stringContaining('/api/auth/callback'),
        },
      })
    })
  })

  it('redirectTo URL contains the next path', async () => {
    mockSignUp.mockResolvedValue({ error: null, data: {} })
    const user = userEvent.setup()
    render(<SignupPage />)
    await fillAndSubmit(user)
    await waitFor(() => {
      const callArgs = mockSignUp.mock.calls[0][0]
      // URL-encoded: /projects → %2Fprojects in the query string
      expect(callArgs.options.emailRedirectTo).toMatch(/projects/)
    })
  })

  // ── loading state ──────────────────────────────────────────────────────────

  it('shows "Creating account…" and disables button while pending', async () => {
    mockSignUp.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<SignupPage />)
    await fillAndSubmit(user)
    const btn = await screen.findByRole('button', { name: /creating account/i })
    expect(btn).toBeDisabled()
  })

  it('prevents double submission while loading', async () => {
    mockSignUp.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<SignupPage />)
    await fillAndSubmit(user)
    const btn = await screen.findByRole('button', { name: /creating account/i })
    await user.click(btn)
    expect(mockSignUp).toHaveBeenCalledTimes(1)
  })

  // ── error state ─────────────────────────────────────────────────────────────

  it('displays error message on sign-up failure', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'User already registered' },
      data: null,
    })
    const user = userEvent.setup()
    render(<SignupPage />)
    await fillAndSubmit(user)
    await waitFor(() => {
      expect(screen.getByText('User already registered')).toBeInTheDocument()
    })
  })

  it('re-enables button after failure', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Conflict' }, data: null })
    const user = userEvent.setup()
    render(<SignupPage />)
    await fillAndSubmit(user)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^create account$/i })).not.toBeDisabled()
    })
  })

  it('clears previous error on re-submit', async () => {
    mockSignUp
      .mockResolvedValueOnce({ error: { message: 'First error' }, data: null })
      .mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<SignupPage />)
    await fillAndSubmit(user)
    await waitFor(() => screen.getByText('First error'))
    await user.click(screen.getByRole('button', { name: /^create account$/i }))
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })
  })

  // ── success redirect ───────────────────────────────────────────────────────

  it('redirects to /projects on successful sign-up', async () => {
    mockSignUp.mockResolvedValue({ error: null, data: {} })
    const user = userEvent.setup()
    render(<SignupPage />)
    await fillAndSubmit(user)
    await waitFor(() => {
      expect(mockLocation.href).toBe('/projects')
    })
  })

  // ── field ordering ─────────────────────────────────────────────────────────

  it('display name input comes before email in tab order', () => {
    render(<SignupPage />)
    const nameInput = screen.getByLabelText(/display name/i)
    const emailInput = screen.getByLabelText(/email/i)
    // compareDocumentPosition: 4 means nameInput is before emailInput
    expect(nameInput.compareDocumentPosition(emailInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
