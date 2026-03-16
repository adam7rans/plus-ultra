// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AlertOverlay from './AlertOverlay'
import type { TribeAlert } from '../lib/notifications'

vi.mock('../lib/notifications', () => ({
  ALERT_META: {
    emergency:        { label: 'Emergency',        icon: '🚨', color: 'bg-red-700' },
    perimeter_breach: { label: 'Perimeter Breach', icon: '🔴', color: 'bg-red-800' },
    medical:          { label: 'Medical',          icon: '🏥', color: 'bg-red-600' },
    rally_point:      { label: 'Rally Point',      icon: '📍', color: 'bg-orange-700' },
    all_clear:        { label: 'All Clear',        icon: '✅', color: 'bg-green-700' },
    bug_out:          { label: 'Bug Out',          icon: '🚗', color: 'bg-orange-800' },
  },
}))

function makeAlert(overrides: Partial<TribeAlert> = {}): TribeAlert {
  return {
    id: 'alert-1',
    tribeId: 'tribe-1',
    alertType: 'emergency',
    message: '',
    senderPub: 'pubkey-1',
    senderName: 'Alice',
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('AlertOverlay', () => {
  it('renders the alert type label', () => {
    render(<AlertOverlay alert={makeAlert()} onDismiss={vi.fn()} />)
    expect(screen.getByText('Emergency')).toBeTruthy()
  })

  it('renders the alert icon', () => {
    render(<AlertOverlay alert={makeAlert()} onDismiss={vi.fn()} />)
    expect(screen.getByText('🚨')).toBeTruthy()
  })

  it('renders the alert message when provided', () => {
    render(
      <AlertOverlay
        alert={makeAlert({ message: 'Come to the main hall' })}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getByText('Come to the main hall')).toBeTruthy()
  })

  it('does not render message paragraph when message is empty', () => {
    render(<AlertOverlay alert={makeAlert({ message: '' })} onDismiss={vi.fn()} />)
    expect(screen.queryByText('Come to the main hall')).toBeNull()
  })

  it('renders the sender name', () => {
    render(<AlertOverlay alert={makeAlert({ senderName: 'Bob' })} onDismiss={vi.fn()} />)
    expect(screen.getByText(/From Bob/)).toBeTruthy()
  })

  it('calls onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<AlertOverlay alert={makeAlert()} onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders different alert types correctly', () => {
    render(<AlertOverlay alert={makeAlert({ alertType: 'all_clear' })} onDismiss={vi.fn()} />)
    expect(screen.getByText('All Clear')).toBeTruthy()
    expect(screen.getByText('✅')).toBeTruthy()
  })

  it('renders bug_out alert type', () => {
    render(<AlertOverlay alert={makeAlert({ alertType: 'bug_out' })} onDismiss={vi.fn()} />)
    expect(screen.getByText('Bug Out')).toBeTruthy()
  })
})
