// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationBell } from '@/components/shared/NotificationBell'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

// ── hook mocks ────────────────────────────────────────────────────────────────

const mockMarkRead = vi.fn()
const mockMarkAllRead = vi.fn()

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useMarkNotificationRead: vi.fn(() => ({ mutate: mockMarkRead, isPending: false })),
  useMarkAllNotificationsRead: vi.fn(() => ({ mutate: mockMarkAllRead, isPending: false })),
}))

import { useNotifications } from '@/hooks/useNotifications'
const mockUseNotifications = vi.mocked(useNotifications)

// ── helpers ───────────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    user_id: 'u1',
    type: 'task_assigned',
    payload: { message: 'You were assigned a task', project_title: 'Album A' } as unknown as Notification['payload'],
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNotifications.mockReturnValue({ data: [], isLoading: false } as ReturnType<typeof useNotifications>)
  })

  // ── rendering ──────────────────────────────────────────────────────────────

  it('renders the bell button', () => {
    render(<NotificationBell userId="u1" />)
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
  })

  it('shows no badge when there are no notifications', () => {
    render(<NotificationBell userId="u1" />)
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
  })

  it('shows unread count badge when there are unread notifications', () => {
    mockUseNotifications.mockReturnValue({
      data: [makeNotification(), makeNotification({ id: 'n2' })],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    render(<NotificationBell userId="u1" />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('caps badge display at 9+ for 10+ unread', () => {
    const notifications = Array.from({ length: 10 }, (_, i) => makeNotification({ id: `n${i}` }))
    mockUseNotifications.mockReturnValue({ data: notifications, isLoading: false } as ReturnType<typeof useNotifications>)
    render(<NotificationBell userId="u1" />)
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('does not count already-read notifications in badge', () => {
    mockUseNotifications.mockReturnValue({
      data: [
        makeNotification({ id: 'n1', read_at: '2026-01-01T00:00:00Z' }),
        makeNotification({ id: 'n2' }),
      ],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    render(<NotificationBell userId="u1" />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  // ── dropdown open/close ────────────────────────────────────────────────────

  it('dropdown is hidden by default', () => {
    render(<NotificationBell userId="u1" />)
    expect(screen.queryByRole('heading', { name: /notifications/i })).not.toBeInTheDocument()
  })

  it('opens dropdown when bell button is clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument()
  })

  it('closes dropdown when X button is clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    const closeBtn = screen.getByRole('button', { name: '' })
    // close button is the X icon (no text) — find the one that closes
    const allButtons = screen.getAllByRole('button')
    const closeButton = allButtons.find(btn => btn !== screen.getByRole('button', { name: /notifications/i }) && !btn.textContent?.includes('read'))
    if (closeButton) await user.click(closeButton)
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /notifications/i })).not.toBeInTheDocument()
    })
  })

  it('shows empty state when no notifications', async () => {
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument()
  })

  // ── notification list ──────────────────────────────────────────────────────

  it('renders notification messages in dropdown', async () => {
    mockUseNotifications.mockReturnValue({
      data: [makeNotification({ payload: { message: 'Task assigned to you' } as unknown as Notification['payload'] })],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText('Task assigned to you')).toBeInTheDocument()
  })

  it('shows project title in notification item', async () => {
    mockUseNotifications.mockReturnValue({
      data: [makeNotification({
        payload: { message: 'You were tagged', project_title: 'My EP' } as unknown as Notification['payload'],
      })],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText('My EP')).toBeInTheDocument()
  })

  it('renders multiple notifications', async () => {
    mockUseNotifications.mockReturnValue({
      data: [
        makeNotification({ id: 'n1', payload: { message: 'First' } as unknown as Notification['payload'] }),
        makeNotification({ id: 'n2', payload: { message: 'Second' } as unknown as Notification['payload'] }),
        makeNotification({ id: 'n3', payload: { message: 'Third' } as unknown as Notification['payload'] }),
      ],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    expect(screen.getByText('Third')).toBeInTheDocument()
  })

  // ── mark read ──────────────────────────────────────────────────────────────

  it('calls markRead when an unread notification is clicked', async () => {
    mockUseNotifications.mockReturnValue({
      data: [makeNotification({ id: 'n1', payload: { message: 'Click me' } as unknown as Notification['payload'] })],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await user.click(screen.getByText('Click me'))
    expect(mockMarkRead).toHaveBeenCalledWith('n1')
  })

  it('does not call markRead when an already-read notification is clicked', async () => {
    mockUseNotifications.mockReturnValue({
      data: [makeNotification({ id: 'n1', read_at: '2026-01-01T00:00:00Z', payload: { message: 'Already read' } as unknown as Notification['payload'] })],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await user.click(screen.getByText('Already read'))
    expect(mockMarkRead).not.toHaveBeenCalled()
  })

  // ── mark all read ──────────────────────────────────────────────────────────

  it('shows "All read" button only when there are unread notifications', async () => {
    mockUseNotifications.mockReturnValue({
      data: [makeNotification()],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText(/all read/i)).toBeInTheDocument()
  })

  it('hides "All read" button when all notifications are read', async () => {
    mockUseNotifications.mockReturnValue({
      data: [makeNotification({ read_at: '2026-01-01T00:00:00Z' })],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.queryByText(/all read/i)).not.toBeInTheDocument()
  })

  it('calls markAllRead when "All read" button is clicked', async () => {
    mockUseNotifications.mockReturnValue({
      data: [makeNotification()],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await user.click(screen.getByText(/all read/i))
    expect(mockMarkAllRead).toHaveBeenCalled()
  })

  // ── notification types ─────────────────────────────────────────────────────

  it('falls back to type name when payload has no message', async () => {
    mockUseNotifications.mockReturnValue({
      data: [makeNotification({ type: 'track_status_changed', payload: {} as unknown as Notification['payload'] })],
      isLoading: false,
    } as ReturnType<typeof useNotifications>)
    const user = userEvent.setup()
    render(<NotificationBell userId="u1" />)
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText('track status changed')).toBeInTheDocument()
  })
})
