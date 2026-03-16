// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MusterResponseForm from './MusterResponseForm'

vi.mock('../lib/media', () => ({
  createVoiceRecorder: vi.fn().mockReturnValue({
    start: vi.fn().mockResolvedValue(false),
    stop: vi.fn(),
  }),
}))

describe('MusterResponseForm', () => {
  it('renders all 5 status option buttons', () => {
    render(<MusterResponseForm onSubmit={vi.fn()} />)
    expect(screen.getByText('Present')).toBeTruthy()
    expect(screen.getByText('Away')).toBeTruthy()
    expect(screen.getByText('Away (unplanned)')).toBeTruthy()
    expect(screen.getByText('Injured')).toBeTruthy()
    expect(screen.getByText('Need Help')).toBeTruthy()
  })

  it('submit button is disabled until a status is selected', () => {
    render(<MusterResponseForm onSubmit={vi.fn()} submitLabel="Submit Response" />)
    const submitBtn = screen.getByRole('button', { name: 'Submit Response' })
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('submit button becomes enabled after selecting a status', async () => {
    const user = userEvent.setup()
    render(<MusterResponseForm onSubmit={vi.fn()} submitLabel="Submit Response" />)
    await user.click(screen.getByText('Present'))
    const submitBtn = screen.getByRole('button', { name: 'Submit Response' })
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls onSubmit with selected status and optional location', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<MusterResponseForm onSubmit={onSubmit} submitLabel="Submit Response" />)
    await user.click(screen.getByText('Present'))
    await user.type(screen.getByPlaceholderText(/Location \(optional\)/), 'north gate')
    await user.click(screen.getByRole('button', { name: 'Submit Response' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        'present',
        expect.objectContaining({ location: 'north gate' })
      )
    )
  })

  it('omits undefined fields when location and note are empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<MusterResponseForm onSubmit={onSubmit} submitLabel="Submit Response" />)
    await user.click(screen.getByText('Injured'))
    await user.click(screen.getByRole('button', { name: 'Submit Response' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith('injured', { location: undefined, note: undefined, voiceNote: undefined })
    )
  })

  it('shows proxy name label when proxyName is provided', () => {
    render(<MusterResponseForm onSubmit={vi.fn()} proxyName="John Smith" />)
    expect(screen.getByText(/Responding on behalf of John Smith/)).toBeTruthy()
  })

  it('does not show proxy label when proxyName is not provided', () => {
    render(<MusterResponseForm onSubmit={vi.fn()} />)
    expect(screen.queryByText(/Responding on behalf of/)).toBeNull()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<MusterResponseForm onSubmit={vi.fn()} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('uses submitLabel for the submit button text', () => {
    render(<MusterResponseForm onSubmit={vi.fn()} submitLabel="Confirm Status" />)
    expect(screen.getByRole('button', { name: 'Confirm Status' })).toBeTruthy()
  })
})
