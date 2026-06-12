// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteModal } from '@/components/collaborators/InviteModal'
import { RemoveCollaboratorModal } from '@/components/collaborators/RemoveCollaboratorModal'
import type { Collaborator } from '@/hooks/useCollaborators'

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockInviteMutateAsync = vi.fn()
const mockInviteIsPending = { current: false }

vi.mock('@/hooks/useCollaborators', () => ({
  useInviteCollaborator: vi.fn(() => ({
    mutateAsync: mockInviteMutateAsync,
    isPending: mockInviteIsPending.current,
    error: null,
  })),
}))

// ── helpers ───────────────────────────────────────────────────────────────────

const mockOnClose = vi.fn()

const COLLAB: Collaborator = {
  id: 'c1',
  user_id: 'u1',
  is_main_artist: false,
  roles: ['producer'],
  status: 'active',
  invited_at: null,
  accepted_at: null,
  display_name: 'Bob Producer',
  avatar_url: null,
}

// ═══════════════════════════════════════════════════════════════════════════════
// InviteModal
// ═══════════════════════════════════════════════════════════════════════════════

describe('InviteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInviteIsPending.current = false
  })

  // ── rendering ──────────────────────────────────────────────────────────────

  it('renders the heading', () => {
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    expect(screen.getByRole('heading', { name: /invite collaborator/i })).toBeInTheDocument()
  })

  it('renders email input', () => {
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    expect(screen.getByPlaceholderText(/collaborator@example.com/i)).toBeInTheDocument()
  })

  it('renders all 15 role buttons', () => {
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    expect(screen.getByText('Producer')).toBeInTheDocument()
    expect(screen.getByText('Mixing Engineer')).toBeInTheDocument()
    expect(screen.getByText('Songwriter')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(15)
  })

  it('renders Send invitation button', () => {
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument()
  })

  it('renders Cancel button', () => {
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows "Select at least one role" prompt by default', () => {
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    expect(screen.getByText(/select at least one role/i)).toBeInTheDocument()
  })

  // ── validation — button disabled ───────────────────────────────────────────

  it('Send invitation button is disabled when email is empty', () => {
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    expect(screen.getByRole('button', { name: /send invitation/i })).toBeDisabled()
  })

  it('Send invitation button is disabled when roles are empty', async () => {
    const user = userEvent.setup()
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    await user.type(screen.getByPlaceholderText(/collaborator@example.com/i), 'bob@example.com')
    expect(screen.getByRole('button', { name: /send invitation/i })).toBeDisabled()
  })

  it('Send invitation button is enabled when email and role are provided', async () => {
    const user = userEvent.setup()
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    await user.type(screen.getByPlaceholderText(/collaborator@example.com/i), 'bob@example.com')
    await user.click(screen.getByText('Producer'))
    expect(screen.getByRole('button', { name: /send invitation/i })).not.toBeDisabled()
  })

  // ── role selection ─────────────────────────────────────────────────────────

  it('toggles a role on click', async () => {
    const user = userEvent.setup()
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    const producerBtn = screen.getByRole('button', { name: 'Producer' })
    await user.click(producerBtn)
    // After selection, the "Select at least one role" hint disappears
    expect(screen.queryByText(/select at least one role/i)).not.toBeInTheDocument()
  })

  it('deselects a role on second click', async () => {
    const user = userEvent.setup()
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    await user.click(screen.getByRole('button', { name: 'Producer' }))
    await user.click(screen.getByRole('button', { name: 'Producer' }))
    // Role hint reappears
    expect(screen.getByText(/select at least one role/i)).toBeInTheDocument()
  })

  it('allows selecting multiple roles', async () => {
    const user = userEvent.setup()
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    await user.click(screen.getByRole('button', { name: 'Producer' }))
    await user.click(screen.getByRole('button', { name: 'Songwriter' }))
    // Both selected — hint gone
    expect(screen.queryByText(/select at least one role/i)).not.toBeInTheDocument()
  })

  // ── submission ─────────────────────────────────────────────────────────────

  it('calls mutateAsync with email and selected roles', async () => {
    mockInviteMutateAsync.mockResolvedValue({})
    const user = userEvent.setup()
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    await user.type(screen.getByPlaceholderText(/collaborator@example.com/i), 'bob@example.com')
    await user.click(screen.getByRole('button', { name: 'Producer' }))
    await user.click(screen.getByRole('button', { name: /send invitation/i }))
    await waitFor(() => {
      expect(mockInviteMutateAsync).toHaveBeenCalledWith({
        email: 'bob@example.com',
        roles: ['producer'],
      })
    })
  })

  it('trims whitespace from email before sending', async () => {
    mockInviteMutateAsync.mockResolvedValue({})
    const user = userEvent.setup()
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    await user.type(screen.getByPlaceholderText(/collaborator@example.com/i), '  bob@example.com  ')
    await user.click(screen.getByRole('button', { name: 'Producer' }))
    await user.click(screen.getByRole('button', { name: /send invitation/i }))
    await waitFor(() => {
      expect(mockInviteMutateAsync).toHaveBeenCalledWith({
        email: 'bob@example.com',
        roles: ['producer'],
      })
    })
  })

  it('calls onClose after successful submission', async () => {
    mockInviteMutateAsync.mockResolvedValue({})
    const user = userEvent.setup()
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    await user.type(screen.getByPlaceholderText(/collaborator@example.com/i), 'bob@example.com')
    await user.click(screen.getByRole('button', { name: 'Producer' }))
    await user.click(screen.getByRole('button', { name: /send invitation/i }))
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled())
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<InviteModal projectId="p1" onClose={mockOnClose} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// RemoveCollaboratorModal
// ═══════════════════════════════════════════════════════════════════════════════

describe('RemoveCollaboratorModal', () => {
  const mockOnRemove = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Remove collaborator heading', () => {
    render(
      <RemoveCollaboratorModal
        collaborator={COLLAB}
        isPending={false}
        error={null}
        onRemove={mockOnRemove}
        onClose={mockOnClose}
      />
    )
    expect(screen.getByRole('heading', { name: /remove collaborator/i })).toBeInTheDocument()
  })

  it('shows the collaborator display name', () => {
    render(
      <RemoveCollaboratorModal
        collaborator={COLLAB}
        isPending={false}
        error={null}
        onRemove={mockOnRemove}
        onClose={mockOnClose}
      />
    )
    expect(screen.getByText('Bob Producer')).toBeInTheDocument()
  })

  it('falls back to "this collaborator" when display_name is null', () => {
    render(
      <RemoveCollaboratorModal
        collaborator={{ ...COLLAB, display_name: null }}
        isPending={false}
        error={null}
        onRemove={mockOnRemove}
        onClose={mockOnClose}
      />
    )
    expect(screen.getByText('this collaborator')).toBeInTheDocument()
  })

  it('shows consequences warning bullets', () => {
    render(
      <RemoveCollaboratorModal
        collaborator={COLLAB}
        isPending={false}
        error={null}
        onRemove={mockOnRemove}
        onClose={mockOnClose}
      />
    )
    expect(screen.getByText(/tasks will be unassigned/i)).toBeInTheDocument()
    expect(screen.getByText(/pending split signatures will be voided/i)).toBeInTheDocument()
    expect(screen.getByText(/lose access to this project/i)).toBeInTheDocument()
  })

  it('calls onRemove when Remove button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <RemoveCollaboratorModal
        collaborator={COLLAB}
        isPending={false}
        error={null}
        onRemove={mockOnRemove}
        onClose={mockOnClose}
      />
    )
    await user.click(screen.getByRole('button', { name: /^remove$/i }))
    expect(mockOnRemove).toHaveBeenCalled()
  })

  it('shows "Removing…" and disables Remove button when isPending', () => {
    render(
      <RemoveCollaboratorModal
        collaborator={COLLAB}
        isPending={true}
        error={null}
        onRemove={mockOnRemove}
        onClose={mockOnClose}
      />
    )
    const btn = screen.getByRole('button', { name: /removing/i })
    expect(btn).toBeDisabled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(
      <RemoveCollaboratorModal
        collaborator={COLLAB}
        isPending={false}
        error={null}
        onRemove={mockOnRemove}
        onClose={mockOnClose}
      />
    )
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('displays error message when error prop is set', () => {
    render(
      <RemoveCollaboratorModal
        collaborator={COLLAB}
        isPending={false}
        error={new Error('Failed to remove')}
        onRemove={mockOnRemove}
        onClose={mockOnClose}
      />
    )
    expect(screen.getByText('Failed to remove')).toBeInTheDocument()
  })

  it('does not call onRemove when button is disabled (isPending)', async () => {
    const user = userEvent.setup()
    render(
      <RemoveCollaboratorModal
        collaborator={COLLAB}
        isPending={true}
        error={null}
        onRemove={mockOnRemove}
        onClose={mockOnClose}
      />
    )
    const btn = screen.getByRole('button', { name: /removing/i })
    await user.click(btn)
    expect(mockOnRemove).not.toHaveBeenCalled()
  })
})
