// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CollaboratorList } from '@/components/collaborators/CollaboratorList'
import type { Collaborator, PendingInvite } from '@/hooks/useCollaborators'

// ── hook mocks ────────────────────────────────────────────────────────────────

const mockRemoveMutateAsync = vi.fn()
const mockRestoreMutateAsync = vi.fn()
const mockPushToast = vi.fn()

vi.mock('@/hooks/useCollaborators', () => ({
  useCollaborators: vi.fn(),
  usePendingInvites: vi.fn(() => ({ data: [], isLoading: false })),
  useResendInvite: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCancelPendingInvite: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRemoveCollaborator: vi.fn(() => ({ mutateAsync: mockRemoveMutateAsync, isPending: false, error: null })),
  useRestoreCollaborator: vi.fn(() => ({ mutateAsync: mockRestoreMutateAsync, isPending: false })),
}))

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@/hooks/useUndoToast', () => ({
  useUndoToastStore: vi.fn(() => mockPushToast),
}))

// Stub child modals to simple text to avoid complex render deps
vi.mock('@/components/collaborators/InviteModal', () => ({
  InviteModal: ({ onClose }: { onClose: () => void }) =>
    <div data-testid="invite-modal"><button onClick={onClose}>Close modal</button></div>,
}))
vi.mock('@/components/collaborators/RemoveCollaboratorModal', () => ({
  RemoveCollaboratorModal: ({ onRemove, onClose, collaborator }: {
    onRemove: () => void
    onClose: () => void
    collaborator: Collaborator
  }) =>
    <div data-testid="remove-modal">
      <span>Remove {collaborator.display_name}</span>
      <button onClick={onRemove}>Confirm remove</button>
      <button onClick={onClose}>Cancel</button>
    </div>,
}))
vi.mock('@/components/collaborators/ChangeRoleModal', () => ({
  ChangeRoleModal: ({ onClose }: { onClose: () => void }) =>
    <div data-testid="change-role-modal"><button onClick={onClose}>Close</button></div>,
}))

import { useCollaborators, usePendingInvites } from '@/hooks/useCollaborators'
import { useCurrentUser } from '@/hooks/useCurrentUser'
const mockUseCollaborators = vi.mocked(useCollaborators)
const mockUsePendingInvites = vi.mocked(usePendingInvites)
const mockUseCurrentUser = vi.mocked(useCurrentUser)

// ── helpers ───────────────────────────────────────────────────────────────────

const MAIN_ARTIST: Collaborator = {
  id: 'c1',
  user_id: 'u1',
  is_main_artist: true,
  roles: ['main_artist'],
  status: 'active',
  invited_at: null,
  accepted_at: null,
  display_name: 'Alice Owner',
  full_name: null,
  pro_name: null,
  ipi_number: null,
  avatar_url: null,
}

const REGULAR_COLLAB: Collaborator = {
  id: 'c2',
  user_id: 'u2',
  is_main_artist: false,
  roles: ['producer'],
  status: 'active',
  invited_at: null,
  accepted_at: null,
  display_name: 'Bob Producer',
  full_name: null,
  pro_name: null,
  ipi_number: null,
  avatar_url: null,
}

const PENDING_INVITE: PendingInvite = {
  id: 'inv1',
  email: 'charlie@example.com',
  roles: ['mixing_engineer'],
  invite_token: 'tok123',
  expires_at: '2026-12-31T00:00:00Z',
  created_at: '2026-06-01T00:00:00Z',
}

function setupAsMainArtist(collabs: Collaborator[] = [MAIN_ARTIST, REGULAR_COLLAB]) {
  mockUseCollaborators.mockReturnValue({ data: collabs, isLoading: false } as ReturnType<typeof useCollaborators>)
  mockUseCurrentUser.mockReturnValue({ data: { id: 'u1' } } as ReturnType<typeof useCurrentUser>)
}

function setupAsCollaborator(collabs: Collaborator[] = [MAIN_ARTIST, REGULAR_COLLAB]) {
  mockUseCollaborators.mockReturnValue({ data: collabs, isLoading: false } as ReturnType<typeof useCollaborators>)
  mockUseCurrentUser.mockReturnValue({ data: { id: 'u2' } } as ReturnType<typeof useCurrentUser>)
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('CollaboratorList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePendingInvites.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof usePendingInvites>)
    mockRemoveMutateAsync.mockResolvedValue(undefined)
    mockRestoreMutateAsync.mockResolvedValue(undefined)
  })

  // ── loading state ──────────────────────────────────────────────────────────

  it('shows loading skeleton when data is loading', () => {
    mockUseCollaborators.mockReturnValue({ data: undefined, isLoading: true } as ReturnType<typeof useCollaborators>)
    mockUseCurrentUser.mockReturnValue({ data: undefined } as ReturnType<typeof useCurrentUser>)
    render(<CollaboratorList projectId="p1" />)
    // Loading skeleton renders two pulse divs — check no collaborator names
    expect(screen.queryByText('Alice Owner')).not.toBeInTheDocument()
  })

  // ── collaborator display ───────────────────────────────────────────────────

  it('renders collaborator display names', () => {
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText('Alice Owner')).toBeInTheDocument()
    expect(screen.getByText('Bob Producer')).toBeInTheDocument()
  })

  it('shows Owner badge for main artist', () => {
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText('Owner')).toBeInTheDocument()
  })

  it('shows role labels for collaborators', () => {
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText('Producer')).toBeInTheDocument()
  })

  it('shows member count', () => {
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText(/2 members/i)).toBeInTheDocument()
  })

  it('shows singular "member" for 1 collaborator', () => {
    mockUseCollaborators.mockReturnValue({ data: [MAIN_ARTIST], isLoading: false } as ReturnType<typeof useCollaborators>)
    mockUseCurrentUser.mockReturnValue({ data: { id: 'u1' } } as ReturnType<typeof useCurrentUser>)
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText(/^1 member$/i)).toBeInTheDocument()
  })

  it('shows empty state when no collaborators', () => {
    mockUseCollaborators.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useCollaborators>)
    mockUseCurrentUser.mockReturnValue({ data: { id: 'u1' } } as ReturnType<typeof useCurrentUser>)
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText(/no collaborators yet/i)).toBeInTheDocument()
  })

  it('shows "Unknown" when display_name is null', () => {
    const noname: Collaborator = { ...REGULAR_COLLAB, display_name: null }
    setupAsMainArtist([MAIN_ARTIST, noname])
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  // ── invite button (main artist only) ──────────────────────────────────────

  it('shows Invite button for main artist', () => {
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument()
  })

  it('does not show Invite button for regular collaborator', () => {
    setupAsCollaborator()
    render(<CollaboratorList projectId="p1" />)
    expect(screen.queryByRole('button', { name: /invite/i })).not.toBeInTheDocument()
  })

  it('opens InviteModal when Invite is clicked', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    await user.click(screen.getByRole('button', { name: /invite/i }))
    expect(screen.getByTestId('invite-modal')).toBeInTheDocument()
  })

  it('closes InviteModal when modal close is triggered', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    await user.click(screen.getByRole('button', { name: /invite/i }))
    await user.click(screen.getByRole('button', { name: /close modal/i }))
    await waitFor(() => {
      expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument()
    })
  })

  // ── remove flow ────────────────────────────────────────────────────────────

  it('shows dropdown menu with remove option for main artist viewing another collab', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    // Click the MoreHorizontal button — there should be one for Bob (not for Alice since she's main artist)
    const moreButtons = screen.getAllByRole('button').filter(b => !b.textContent)
    await user.click(moreButtons[0])
    expect(screen.getByText(/remove collaborator/i)).toBeInTheDocument()
  })

  it('opens RemoveCollaboratorModal when Remove is clicked', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    const moreButtons = screen.getAllByRole('button').filter(b => !b.textContent)
    await user.click(moreButtons[0])
    await user.click(screen.getByText(/remove collaborator/i))
    expect(screen.getByTestId('remove-modal')).toBeInTheDocument()
    expect(screen.getByText(/Remove Bob Producer/i)).toBeInTheDocument()
  })

  it('calls removeCollaborator.mutateAsync on confirmation', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    const moreButtons = screen.getAllByRole('button').filter(b => !b.textContent)
    await user.click(moreButtons[0])
    await user.click(screen.getByText(/remove collaborator/i))
    await user.click(screen.getByRole('button', { name: /confirm remove/i }))
    await waitFor(() => {
      expect(mockRemoveMutateAsync).toHaveBeenCalledWith({
        collaboratorId: 'c2',
        displayName: 'Bob Producer',
      })
    })
  })

  it('pushes an undo toast after removing collaborator', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    const moreButtons = screen.getAllByRole('button').filter(b => !b.textContent)
    await user.click(moreButtons[0])
    await user.click(screen.getByText(/remove collaborator/i))
    await user.click(screen.getByRole('button', { name: /confirm remove/i }))
    await waitFor(() => {
      expect(mockPushToast).toHaveBeenCalledWith(
        'Bob Producer removed',
        expect.any(Function),
      )
    })
  })

  it('calls restoreCollaborator when undo callback is invoked', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    const moreButtons = screen.getAllByRole('button').filter(b => !b.textContent)
    await user.click(moreButtons[0])
    await user.click(screen.getByText(/remove collaborator/i))
    await user.click(screen.getByRole('button', { name: /confirm remove/i }))
    await waitFor(() => expect(mockPushToast).toHaveBeenCalled())
    // Invoke the undo callback
    const undoCallback = mockPushToast.mock.calls[0][1]
    await undoCallback()
    expect(mockRestoreMutateAsync).toHaveBeenCalledWith('c2')
  })

  it('closes RemoveCollaboratorModal on cancel', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    const moreButtons = screen.getAllByRole('button').filter(b => !b.textContent)
    await user.click(moreButtons[0])
    await user.click(screen.getByText(/remove collaborator/i))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.queryByTestId('remove-modal')).not.toBeInTheDocument()
    })
  })

  // ── change roles flow ──────────────────────────────────────────────────────

  it('opens ChangeRoleModal when Change roles is clicked', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    const moreButtons = screen.getAllByRole('button').filter(b => !b.textContent)
    await user.click(moreButtons[0])
    await user.click(screen.getByText(/change roles/i))
    expect(screen.getByTestId('change-role-modal')).toBeInTheDocument()
  })

  it('closes ChangeRoleModal on close', async () => {
    const user = userEvent.setup()
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    const moreButtons = screen.getAllByRole('button').filter(b => !b.textContent)
    await user.click(moreButtons[0])
    await user.click(screen.getByText(/change roles/i))
    await user.click(screen.getByRole('button', { name: /^close$/i }))
    await waitFor(() => {
      expect(screen.queryByTestId('change-role-modal')).not.toBeInTheDocument()
    })
  })

  // ── pending invites ────────────────────────────────────────────────────────

  it('shows pending invite email', () => {
    setupAsMainArtist()
    mockUsePendingInvites.mockReturnValue({ data: [PENDING_INVITE], isLoading: false } as ReturnType<typeof usePendingInvites>)
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText('charlie@example.com')).toBeInTheDocument()
  })

  it('shows "Awaiting signup" section header when pending invites exist', () => {
    setupAsMainArtist()
    mockUsePendingInvites.mockReturnValue({ data: [PENDING_INVITE], isLoading: false } as ReturnType<typeof usePendingInvites>)
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText(/awaiting signup/i)).toBeInTheDocument()
  })

  it('shows pending count in member summary', () => {
    setupAsMainArtist()
    mockUsePendingInvites.mockReturnValue({ data: [PENDING_INVITE], isLoading: false } as ReturnType<typeof usePendingInvites>)
    render(<CollaboratorList projectId="p1" />)
    expect(screen.getByText(/1 pending/i)).toBeInTheDocument()
  })

  it('does not show pending section when no pending invites', () => {
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    expect(screen.queryByText(/awaiting signup/i)).not.toBeInTheDocument()
  })

  // ── main artist cannot see their own dropdown ──────────────────────────────

  it('does not show action menu for main artist row', () => {
    setupAsMainArtist()
    render(<CollaboratorList projectId="p1" />)
    // The main artist row should not have a MoreHorizontal menu
    // Only Bob's row should have one
    const allButtons = screen.getAllByRole('button')
    // Filter to icon-only buttons (no text content)
    const iconButtons = allButtons.filter(b => !b.textContent?.trim())
    // Should only be 1 (Bob's row), not 2
    expect(iconButtons).toHaveLength(1)
  })
})
