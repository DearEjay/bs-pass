// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SecuritySection } from '@/components/profile/SecuritySection'

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockUpdateEmailMutateAsync = vi.fn()
const mockUpdatePasswordMutateAsync = vi.fn()
const mockSignOutMutate = vi.fn()

vi.mock('@/hooks/useProfile', () => ({
  useUpdateEmail: vi.fn(() => ({
    mutateAsync: mockUpdateEmailMutateAsync,
    isPending: false,
    error: null,
  })),
  useUpdatePassword: vi.fn(() => ({
    mutateAsync: mockUpdatePasswordMutateAsync,
    isPending: false,
    error: null,
  })),
  useSignOut: vi.fn(() => ({
    mutate: mockSignOutMutate,
    isPending: false,
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// ── tests ─────────────────────────────────────────────────────────────────────

describe('SecuritySection — Sign out', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Sign out button', () => {
    render(<SecuritySection email="user@example.com" />)
    expect(screen.getByRole('button', { name: /^sign out$/i })).toBeInTheDocument()
  })

  it('calls signOut.mutate when Sign out is clicked', async () => {
    const user = userEvent.setup()
    render(<SecuritySection email="user@example.com" />)
    await user.click(screen.getByRole('button', { name: /^sign out$/i }))
    expect(mockSignOutMutate).toHaveBeenCalledTimes(1)
  })

  it('shows description text for sign out', () => {
    render(<SecuritySection email="user@example.com" />)
    expect(screen.getByText(/sign out of your account on this device/i)).toBeInTheDocument()
  })
})

describe('SecuritySection — Email change', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows current email address', () => {
    render(<SecuritySection email="alice@example.com" />)
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('clicking Change email reveals the email input', async () => {
    const user = userEvent.setup()
    render(<SecuritySection email="alice@example.com" />)
    await user.click(screen.getByRole('button', { name: /change email/i }))
    expect(screen.getByPlaceholderText(/new email address/i)).toBeInTheDocument()
  })

  it('Cancel button hides the email form', async () => {
    const user = userEvent.setup()
    render(<SecuritySection email="alice@example.com" />)
    await user.click(screen.getByRole('button', { name: /change email/i }))
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/new email address/i)).not.toBeInTheDocument()
    })
  })

  it('submits new email and shows confirmation message', async () => {
    mockUpdateEmailMutateAsync.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<SecuritySection email="alice@example.com" />)
    await user.click(screen.getByRole('button', { name: /change email/i }))
    await user.type(screen.getByPlaceholderText(/new email address/i), 'newalice@example.com')
    await user.click(screen.getByRole('button', { name: /send confirmation/i }))
    await waitFor(() => {
      expect(mockUpdateEmailMutateAsync).toHaveBeenCalledWith('newalice@example.com')
    })
    await waitFor(() => {
      expect(screen.getByText(/confirmation email sent/i)).toBeInTheDocument()
    })
  })

  it('"Send again" resets confirmation state', async () => {
    mockUpdateEmailMutateAsync.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<SecuritySection email="alice@example.com" />)
    await user.click(screen.getByRole('button', { name: /change email/i }))
    await user.type(screen.getByPlaceholderText(/new email address/i), 'newalice@example.com')
    await user.click(screen.getByRole('button', { name: /send confirmation/i }))
    await waitFor(() => screen.getByText(/confirmation email sent/i))
    await user.click(screen.getByText(/send again/i))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /change email/i })).toBeInTheDocument()
    })
  })
})

describe('SecuritySection — Password change', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders new password and confirm password fields', () => {
    render(<SecuritySection email="user@example.com" />)
    expect(screen.getByPlaceholderText(/^new password$/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/confirm new password/i)).toBeInTheDocument()
  })

  it('shows mismatch error when passwords differ', async () => {
    const user = userEvent.setup()
    render(<SecuritySection email="user@example.com" />)
    await user.type(screen.getByPlaceholderText(/^new password$/i), 'password123')
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'different123')
    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument()
  })

  it('Update password button is disabled when passwords differ', async () => {
    const user = userEvent.setup()
    render(<SecuritySection email="user@example.com" />)
    await user.type(screen.getByPlaceholderText(/^new password$/i), 'password123')
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'wrongpass')
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()
  })

  it('Update password button is disabled when password is less than 8 chars', async () => {
    const user = userEvent.setup()
    render(<SecuritySection email="user@example.com" />)
    await user.type(screen.getByPlaceholderText(/^new password$/i), 'short')
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'short')
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()
  })

  it('calls updatePassword.mutateAsync when passwords match', async () => {
    mockUpdatePasswordMutateAsync.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<SecuritySection email="user@example.com" />)
    await user.type(screen.getByPlaceholderText(/^new password$/i), 'newpassword123')
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /update password/i }))
    await waitFor(() => {
      expect(mockUpdatePasswordMutateAsync).toHaveBeenCalledWith('newpassword123')
    })
  })

  it('shows success message after password update', async () => {
    mockUpdatePasswordMutateAsync.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<SecuritySection email="user@example.com" />)
    await user.type(screen.getByPlaceholderText(/^new password$/i), 'newpassword123')
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /update password/i }))
    await waitFor(() => {
      expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument()
    })
  })

  it('toggles password visibility with eye button', async () => {
    const user = userEvent.setup()
    render(<SecuritySection email="user@example.com" />)
    const passwordInput = screen.getByPlaceholderText(/^new password$/i)
    expect(passwordInput).toHaveAttribute('type', 'password')
    // The eye toggle button — there's one eye icon button near the password field
    const allButtons = screen.getAllByRole('button')
    const eyeButton = allButtons.find(b => !b.textContent?.trim() && b.closest('div')?.querySelector('input[type="password"]'))
    if (eyeButton) {
      await user.click(eyeButton)
      expect(passwordInput).toHaveAttribute('type', 'text')
    }
  })
})
