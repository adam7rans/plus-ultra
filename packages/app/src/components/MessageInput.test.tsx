// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageInput from './MessageInput'

vi.mock('../lib/media', () => ({
  createVoiceRecorder: vi.fn(() => ({
    start: vi.fn().mockResolvedValue(false),
    stop: vi.fn(),
  })),
  compressPhoto: vi.fn().mockResolvedValue({ base64: 'data', mimeType: 'image/jpeg' }),
}))

describe('MessageInput', () => {
  it('renders textarea with placeholder', () => {
    render(<MessageInput onSendText={vi.fn()} onSendVoice={vi.fn()} onSendPhoto={vi.fn()} />)
    expect(screen.getByPlaceholderText('Message tribe...')).toBeTruthy()
  })

  it('shows send button (↑) when text is entered', async () => {
    const user = userEvent.setup()
    render(
      <MessageInput
        onSendText={vi.fn().mockResolvedValue(undefined)}
        onSendVoice={vi.fn()}
        onSendPhoto={vi.fn()}
      />
    )
    const textarea = screen.getByPlaceholderText('Message tribe...')
    await user.type(textarea, 'hello')
    expect(screen.getByRole('button', { name: '↑' })).toBeTruthy()
  })

  it('calls onSendText with trimmed text on button click', async () => {
    const user = userEvent.setup()
    const onSendText = vi.fn().mockResolvedValue(undefined)
    render(
      <MessageInput
        onSendText={onSendText}
        onSendVoice={vi.fn()}
        onSendPhoto={vi.fn()}
      />
    )
    const textarea = screen.getByPlaceholderText('Message tribe...')
    await user.type(textarea, '  hello world  ')
    await user.click(screen.getByRole('button', { name: '↑' }))
    await waitFor(() => expect(onSendText).toHaveBeenCalledWith('hello world'))
  })

  it('clears textarea after sending', async () => {
    const user = userEvent.setup()
    const onSendText = vi.fn().mockResolvedValue(undefined)
    render(
      <MessageInput
        onSendText={onSendText}
        onSendVoice={vi.fn()}
        onSendPhoto={vi.fn()}
      />
    )
    const textarea = screen.getByPlaceholderText('Message tribe...')
    await user.type(textarea, 'hello')
    await user.click(screen.getByRole('button', { name: '↑' }))
    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(''))
  })

  it('sends on Enter key', async () => {
    const user = userEvent.setup()
    const onSendText = vi.fn().mockResolvedValue(undefined)
    render(
      <MessageInput
        onSendText={onSendText}
        onSendVoice={vi.fn()}
        onSendPhoto={vi.fn()}
      />
    )
    const textarea = screen.getByPlaceholderText('Message tribe...')
    await user.type(textarea, 'ping')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(onSendText).toHaveBeenCalledWith('ping'))
  })

  it('does not send on Shift+Enter', async () => {
    const user = userEvent.setup()
    const onSendText = vi.fn().mockResolvedValue(undefined)
    render(
      <MessageInput
        onSendText={onSendText}
        onSendVoice={vi.fn()}
        onSendPhoto={vi.fn()}
      />
    )
    const textarea = screen.getByPlaceholderText('Message tribe...')
    await user.type(textarea, 'line one')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSendText).not.toHaveBeenCalled()
  })

  it('disables textarea when disabled prop is set', () => {
    render(
      <MessageInput
        onSendText={vi.fn()}
        onSendVoice={vi.fn()}
        onSendPhoto={vi.fn()}
        disabled={true}
      />
    )
    const textarea = screen.getByPlaceholderText('Message tribe...')
    expect((textarea as HTMLTextAreaElement).disabled).toBe(true)
  })
})
