// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InvitePage from '@/app/invite/[token]/page'

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockRpc = vi.fn()
const mockPush = vi.fn()

// Mutable state for the accept-invite hook so we can adjust error per-test
const acceptInviteState = {
  mutateAsync: vi.fn(),
  isPending: false,
  error: null as Error | null,
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  }),
}))

vi.mock('@/hooks/useCollaborators', () => ({
  useAcceptInvite: vi.fn(() => ({ ...acceptInviteState })),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'test-token-abc' }),
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}))

// ── helpers ───────────────────────────────────────────────────────────────────

const INVITE_DETAILS = {
  source: 'registered' as const,
  project_title: 'My Album',
  project_id: 'p1',
  roles: ['producer'],
  expires_at: '2026-12-31T00:00:00Z',
}

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'user@example.com' } } })
}

function setupAnonymousUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } })
}

function setupValidInvite() {
  mockRpc.mockResolvedValue({ data: INVITE_DETAILS, error: null })
}

function setupNotFoundInvite() {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } })
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('InvitePage — loading state', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows no heading while data is loading', () => {
    mockGetUser.mockImplementation(() => new Promise(() => {}))
    mockRpc.mockImplementation(() => new Promise(() => {}))
    render(<InvitePage />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})

describe('InvitePage — invite not found', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAnonymousUser()
    setupNotFoundInvite()
  })

  it('shows "Invite not found" heading', async () => {
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /invite not found/i })).toBeInTheDocument()
    })
  })

  it('explains the invite is expired or already accepted', async () => {
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByText(/expired|already been accepted|doesn't exist/i)).toBeInTheDocument()
    })
  })

  it('shows a Go to app link pointing to /login', async () => {
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /go to app/i })).toHaveAttribute('href', '/login')
    })
  })
})

describe('InvitePage — unauthenticated user', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAnonymousUser()
    setupValidInvite()
  })

  it('shows project title', async () => {
    render(<InvitePage />)
    await waitFor(() => expect(screen.getByText('My Album')).toBeInTheDocument())
  })

  it('shows role labels', async () => {
    render(<InvitePage />)
    await waitFor(() => expect(screen.getByText('Producer')).toBeInTheDocument())
  })

  it('shows "You\'ve been invited" heading', async () => {
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /you've been invited/i })).toBeInTheDocument()
    })
  })

  it('Create account link includes the next param', async () => {
    render(<InvitePage />)
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /create account/i })
      expect(link).toHaveAttribute('href', '/signup?next=/invite/test-token-abc')
    })
  })

  it('Sign in link includes the next param', async () => {
    render(<InvitePage />)
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /^sign in$/i })
      expect(link).toHaveAttribute('href', '/login?next=/invite/test-token-abc')
    })
  })

  it('does not show Accept invitation button when unauthenticated', async () => {
    render(<InvitePage />)
    await waitFor(() => screen.getByText('My Album'))
    expect(screen.queryByRole('button', { name: /accept invitation/i })).not.toBeInTheDocument()
  })

  it('shows "Create a free account" prompt for pending-source invites', async () => {
    mockRpc.mockResolvedValue({ data: { ...INVITE_DETAILS, source: 'pending' }, error: null })
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByText(/create a free account to accept/i)).toBeInTheDocument()
    })
  })

  it('shows "Sign in to accept" prompt for registered-user invites', async () => {
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByText(/sign in to accept this invitation/i)).toBeInTheDocument()
    })
  })

  it('falls back to "Collaborator" when roles array is empty', async () => {
    mockRpc.mockResolvedValue({ data: { ...INVITE_DETAILS, roles: [] }, error: null })
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByText('Collaborator')).toBeInTheDocument()
    })
  })
})

describe('InvitePage — authenticated user', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    acceptInviteState.mutateAsync = vi.fn()
    acceptInviteState.isPending = false
    acceptInviteState.error = null
    setupAuthenticatedUser()
    setupValidInvite()
  })

  it('shows "Signed in as" with user email', async () => {
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByText(/signed in as/i)).toBeInTheDocument()
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })
  })

  it('shows Accept invitation button', async () => {
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument()
    })
  })

  it('does not show login/signup links when authenticated', async () => {
    render(<InvitePage />)
    await waitFor(() => screen.getByRole('button', { name: /accept invitation/i }))
    expect(screen.queryByRole('link', { name: /create account/i })).not.toBeInTheDocument()
  })

  it('calls acceptInvite.mutateAsync with the token on click', async () => {
    acceptInviteState.mutateAsync = vi.fn().mockResolvedValue({ projectId: 'p1' })
    const user = userEvent.setup()
    render(<InvitePage />)
    await waitFor(() => screen.getByRole('button', { name: /accept invitation/i }))
    await user.click(screen.getByRole('button', { name: /accept invitation/i }))
    await waitFor(() => {
      expect(acceptInviteState.mutateAsync).toHaveBeenCalledWith({ token: 'test-token-abc' })
    })
  })

  it('shows success "You\'re in!" heading after acceptance', async () => {
    acceptInviteState.mutateAsync = vi.fn().mockResolvedValue({ projectId: 'p1' })
    const user = userEvent.setup()
    render(<InvitePage />)
    await waitFor(() => screen.getByRole('button', { name: /accept invitation/i }))
    await user.click(screen.getByRole('button', { name: /accept invitation/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /you're in/i })).toBeInTheDocument()
    })
  })

  it('shows project name in success message', async () => {
    acceptInviteState.mutateAsync = vi.fn().mockResolvedValue({ projectId: 'p1' })
    const user = userEvent.setup()
    render(<InvitePage />)
    await waitFor(() => screen.getByRole('button', { name: /accept invitation/i }))
    await user.click(screen.getByRole('button', { name: /accept invitation/i }))
    await waitFor(() => {
      expect(screen.getByText(/My Album/)).toBeInTheDocument()
    })
  })

  it('redirects to project collaborators page after 1500ms', async () => {
    acceptInviteState.mutateAsync = vi.fn().mockResolvedValue({ projectId: 'p1' })
    const user = userEvent.setup()
    render(<InvitePage />)
    await waitFor(() => screen.getByRole('button', { name: /accept invitation/i }))
    await user.click(screen.getByRole('button', { name: /accept invitation/i }))
    await waitFor(() => screen.getByRole('heading', { name: /you're in/i }))
    // Wait for the 1500ms redirect timer to fire (with real timers, 2s timeout)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/projects/p1/collaborators')
    }, { timeout: 2500 })
  })

  it('shows error message when acceptInvite.error is set', async () => {
    acceptInviteState.error = new Error('Invite already accepted')
    render(<InvitePage />)
    await waitFor(() => {
      expect(screen.getByText('Invite already accepted')).toBeInTheDocument()
    })
  })

  it('stays on invitation page (no success state) when acceptance fails', async () => {
    acceptInviteState.mutateAsync = vi.fn().mockRejectedValue(new Error('Token expired'))
    const user = userEvent.setup()
    render(<InvitePage />)
    await waitFor(() => screen.getByRole('button', { name: /accept invitation/i }))
    await user.click(screen.getByRole('button', { name: /accept invitation/i }))
    await waitFor(() => expect(acceptInviteState.mutateAsync).toHaveBeenCalled())
    // Success heading must NOT appear — still showing the invitation form
    expect(screen.queryByRole('heading', { name: /you're in/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument()
  })
})
