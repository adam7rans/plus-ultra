// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import QrDisplay from './QrDisplay'

const toCanvasMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('qrcode', () => ({
  default: { toCanvas: toCanvasMock },
}))

describe('QrDisplay', () => {
  it('renders a canvas element', () => {
    render(<QrDisplay value="https://example.com" />)
    expect(document.querySelector('canvas')).toBeTruthy()
  })

  it('calls onShown after QRCode renders', async () => {
    const onShown = vi.fn()
    render(<QrDisplay value="https://example.com" onShown={onShown} />)
    await waitFor(() => expect(onShown).toHaveBeenCalledTimes(1))
  })

  it('passes value and options to QRCode.toCanvas', async () => {
    toCanvasMock.mockClear()
    render(<QrDisplay value="tribe-invite-abc" />)
    await waitFor(() =>
      expect(toCanvasMock).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        'tribe-invite-abc',
        expect.objectContaining({ width: 280 })
      )
    )
  })

  it('shows error message when QRCode.toCanvas rejects', async () => {
    toCanvasMock.mockRejectedValueOnce(new Error('canvas unavailable'))
    render(<QrDisplay value="bad-value" />)
    await waitFor(() => screen.getByText(/Failed to generate QR/))
  })
})
