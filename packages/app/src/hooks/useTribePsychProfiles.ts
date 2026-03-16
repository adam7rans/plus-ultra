import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeTribePsychProfiles } from '../lib/psych'
import { useIsGridUp } from './useIsGridUp'
import type { PsychProfile } from '@plus-ultra/core'

export function useTribePsychProfiles(tribeId: string | null): Map<string, PsychProfile> {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.psych.listProfiles,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<Map<string, PsychProfile>>(new Map())
  useEffect(() => {
    if (gridUp || !tribeId) return
    const unsub = subscribeTribePsychProfiles(tribeId, profileList => {
      const map = new Map<string, PsychProfile>()
      for (const p of profileList) map.set(p.memberId, p)
      setGunData(map)
    })
    return unsub
  }, [tribeId, gridUp])

  if (gridUp) {
    const map = new Map<string, PsychProfile>()
    for (const p of (convexData ?? []) as unknown as PsychProfile[]) {
      map.set(p.memberId, p)
    }
    return map
  }
  return gunData
}
