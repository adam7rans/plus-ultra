// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

// ── Gun mock — demo-seed pulls Gun transitively via tribes/messaging;
// the pure helpers under test never touch the network.
vi.mock('./gun.js', () => {
  function chain(path: string[] = []): Record<string, unknown> {
    return {
      get(key: string) { return chain([...path, key]) },
      put(payload: unknown, ack?: () => void) {
        ack?.()
        return chain(path)
      },
      on() { return chain(path) },
      once() { return chain(path) },
      map() { return chain(path) },
      off() {},
    }
  }
  return { gun: chain() }
})

import { buildRoster, makeWavBase64, makePhotoBase64, makeVideoBase64 } from './demo-seed'

describe('buildRoster', () => {
  it('returns the requested count with unique names', () => {
    const roster = buildRoster(24)
    expect(roster).toHaveLength(24)
    expect(new Set(roster.map((r) => r.name)).size).toBe(24)
  })

  it('clamps out-of-range counts', () => {
    expect(buildRoster(0)).toHaveLength(0)
    expect(buildRoster(999).length).toBeLessThanOrEqual(24)
  })
})

describe('makeWavBase64', () => {
  it('produces a valid WAV container', () => {
    const bin = atob(makeWavBase64(3))
    expect(bin.slice(0, 4)).toBe('RIFF')
    expect(bin.slice(8, 12)).toBe('WAVE')
    expect(bin.slice(12, 16)).toBe('fmt ')
    expect(bin.slice(36, 40)).toBe('data')
    // 8kHz × 1.6s × 2 bytes + 44-byte header
    expect(bin.length).toBe(44 + 8000 * 1.6 * 2)
  })

  it('varies with the seed but keeps the container valid', () => {
    expect(makeWavBase64(1)).not.toBe(makeWavBase64(2))
    expect(atob(makeWavBase64(9)).slice(0, 4)).toBe('RIFF')
  })
})

describe('node fallbacks (no DOM)', () => {
  it('makePhotoBase64 returns a JPEG data payload without canvas', () => {
    const raw = makePhotoBase64('Test', 120, '🌲')
    expect(typeof raw).toBe('string')
    expect(raw.length).toBeGreaterThan(100)
    // JPEG magic bytes FF D8 FF
    expect(atob(raw).slice(0, 3)).toBe('ÿØÿ')
  })

  it('makeVideoBase64 resolves null without capture support', async () => {
    await expect(makeVideoBase64()).resolves.toBeNull()
  })
})
