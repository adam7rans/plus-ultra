import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribePsychProfile } from '../lib/psych'
import { useIsGridUp } from './useIsGridUp'
import type { PsychProfile } from '@plus-ultra/core'

export function usePsychProfile(tribeId: string | null, memberPub: string | null): PsychProfile | null {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): fetch all tribe profiles, filter by memberPub
  const convexData = useQuery(
    api.psych.listProfiles,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<PsychProfile | null>(null)
  useEffect(() => {
    if (gridUp || !tribeId || !memberPub) return
    const unsub = subscribePsychProfile(tribeId, memberPub, setGunData)
    return unsub
  }, [tribeId, memberPub, gridUp])

  if (gridUp) {
    if (!memberPub || !convexData) return null
    const found = (convexData as unknown as PsychProfile[]).find(p => p.memberId === memberPub)
    return found ?? null
  }
  return gunData
}
