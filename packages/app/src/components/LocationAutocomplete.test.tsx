// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { useState, act } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationAutocomplete from './LocationAutocomplete'

const PHOTON_AUSTIN = {
  features: [
    { properties: { name: 'Austin', state: 'Texas', country: 'United States' } },
    { properties: { name: 'Austinville', state: 'Virginia', country: 'United States' } },
  ],
}

function mockFetch(handler: (url: string) => unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      const body = handler(url)
      if (body instanceof Error) return Promise.reject(body)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
    }),
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

type FieldProps = Parameters<typeof LocationAutocomplete>[0]

function renderField(overrides: Partial<FieldProps> = {}) {
  const props: FieldProps & { onPick: Mock; onCoords: Mock; onChange: Mock } = {
    value: '',
    onChange: vi.fn(),
    onPick: vi.fn(),
    onCoords: vi.fn(),
    ...overrides,
  }
  // Controlled wrapper so typing updates the visible value.
  function Wrapper() {
    const [v, setV] = useState('')
    return (
      <LocationAutocomplete
        {...props}
        value={v}
        onChange={(nv) => {
          setV(nv)
          props.onChange(nv)
        }}
      />
    )
  }
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const utils = render(<Wrapper />)
  return { ...utils, props, user }
}

/** Flush the 350ms type-ahead debounce + mocked fetch + React updates. */
async function settle(ms = 500) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('LocationAutocomplete', () => {
  it('shows suggestions while typing and narrows with more characters', async () => {
    mockFetch((url) =>
      url.includes('photon')
        ? url.includes('Austinville')
          ? { features: [PHOTON_AUSTIN.features[1]] }
          : PHOTON_AUSTIN
        : {},
    )
    const { user } = renderField()
    await user.type(screen.getByRole('combobox'), 'Aust')
    await settle()
    expect(screen.getByText('Austin')).toBeTruthy()
    expect(screen.getByText('Austinville')).toBeTruthy()
    await user.type(screen.getByRole('combobox'), 'inville')
    await settle()
    expect(screen.queryByText('Austin')).toBeNull()
    expect(screen.getByText('Austinville')).toBeTruthy()
  })

  it('picking a suggestion fires onPick with location + region', async () => {
    mockFetch(() => PHOTON_AUSTIN)
    const { user, props } = renderField()
    await user.type(screen.getByRole('combobox'), 'Aust')
    await settle()
    // State/country detail renders under the name.
    expect(screen.getByText('Texas, United States')).toBeTruthy()
    await user.click(screen.getByText('Austin'))
    expect(props.onPick).toHaveBeenCalledWith({ location: 'Austin', region: 'Texas' })
  })

  it('shows the offline fallback when search fails', async () => {
    mockFetch(() => new Error('offline'))
    const { user } = renderField()
    await user.type(screen.getByRole('combobox'), 'Aus')
    await settle()
    expect(screen.getByText(/Offline — type the place manually/)).toBeTruthy()
  })

  it('GPS row resolves coords + locality and fires onCoords/onPick', async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({
        coords: { latitude: 30.2672, longitude: -97.7431, accuracy: 10 },
      } as GeolocationPosition),
    )
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })
    mockFetch((url) =>
      url.includes('bigdatacloud')
        ? { city: 'Austin', principalSubdivision: 'Texas', countryName: 'United States' }
        : PHOTON_AUSTIN,
    )
    const onLocality = vi.fn()
    const { user, props } = renderField({ onLocality })
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Use current location'))
    await settle()
    expect(props.onCoords).toHaveBeenCalledWith(30.2672, -97.7431)
    expect(props.onPick).toHaveBeenCalledWith({ location: 'Austin', region: 'Texas' })
    expect(onLocality).toHaveBeenCalledWith('Austin, Texas, United States')
  })
})
