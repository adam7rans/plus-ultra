// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatLocality, reverseGeocode } from './geo'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('formatLocality', () => {
  it('joins city, region, country', () => {
    expect(formatLocality({ city: 'Austin', region: 'Texas', country: 'United States' })).toBe(
      'Austin, Texas, United States',
    )
  })

  it('skips absent parts', () => {
    expect(formatLocality({ country: 'Iceland' })).toBe('Iceland')
    expect(formatLocality({})).toBe('')
  })
})

describe('reverseGeocode', () => {
  it('returns city/region/country from the BigDataCloud response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            city: 'Austin',
            principalSubdivision: 'Texas',
            countryName: 'United States',
          }),
      }),
    )
    await expect(reverseGeocode(30.2672, -97.7431)).resolves.toEqual({
      city: 'Austin',
      region: 'Texas',
      country: 'United States',
    })
  })

  it('falls back to locality when city is empty (village/rural)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ city: '', locality: 'Marfa', countryName: 'United States' }),
      }),
    )
    await expect(reverseGeocode(29.0, -104.0)).resolves.toEqual({
      city: 'Marfa',
      region: undefined,
      country: 'United States',
    })
  })

  it('returns null on HTTP failure, empty data, or network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(reverseGeocode(0, 0)).resolves.toBeNull()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))
    await expect(reverseGeocode(0, 0)).resolves.toBeNull()

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(reverseGeocode(0, 0)).resolves.toBeNull()
  })
})
