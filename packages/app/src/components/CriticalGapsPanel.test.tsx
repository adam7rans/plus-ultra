// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CriticalGapsPanel from './CriticalGapsPanel'
import type { SkillRole } from '@plus-ultra/core'

vi.mock('@tanstack/react-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Link: (props: any) => props.children,
}))

describe('CriticalGapsPanel', () => {
  it('shows all-clear message when both arrays are empty', () => {
    render(<CriticalGapsPanel criticalGaps={[]} warnings={[]} tribeId="tribe-1" />)
    expect(screen.getByText(/All critical roles covered/)).toBeTruthy()
  })

  it('hides all-clear when there are critical gaps', () => {
    render(
      <CriticalGapsPanel
        criticalGaps={['physician' as SkillRole]}
        warnings={[]}
        tribeId="tribe-1"
      />
    )
    expect(screen.queryByText(/All critical roles covered/)).toBeNull()
  })

  it('renders critical gap role labels and section header', () => {
    render(
      <CriticalGapsPanel
        criticalGaps={['physician' as SkillRole, 'farmer' as SkillRole]}
        warnings={[]}
        tribeId="tribe-1"
      />
    )
    expect(screen.getByText('Physician (MD/DO)')).toBeTruthy()
    expect(screen.getByText('Farmer (Crops)')).toBeTruthy()
    expect(screen.getByText(/Critical gaps/)).toBeTruthy()
  })

  it('shows "0 members" label for each critical gap', () => {
    render(
      <CriticalGapsPanel
        criticalGaps={['nurse' as SkillRole]}
        warnings={[]}
        tribeId="tribe-1"
      />
    )
    expect(screen.getByText('0 members')).toBeTruthy()
  })

  it('renders warnings section with role labels', () => {
    render(
      <CriticalGapsPanel
        criticalGaps={[]}
        warnings={['nurse' as SkillRole]}
        tribeId="tribe-1"
      />
    )
    expect(screen.getByText('Nurse (RN/LPN)')).toBeTruthy()
    expect(screen.getByText(/Below minimum/)).toBeTruthy()
  })

  it('renders both critical and warning sections together', () => {
    render(
      <CriticalGapsPanel
        criticalGaps={['physician' as SkillRole]}
        warnings={['farmer' as SkillRole]}
        tribeId="tribe-1"
      />
    )
    expect(screen.getByText('Physician (MD/DO)')).toBeTruthy()
    expect(screen.getByText('Farmer (Crops)')).toBeTruthy()
    expect(screen.getByText(/Critical gaps/)).toBeTruthy()
    expect(screen.getByText(/Below minimum/)).toBeTruthy()
  })

  it('renders declare skills button', () => {
    render(
      <CriticalGapsPanel
        criticalGaps={['physician' as SkillRole]}
        warnings={[]}
        tribeId="tribe-1"
      />
    )
    expect(screen.getByText(/Declare your skills/)).toBeTruthy()
  })
})
