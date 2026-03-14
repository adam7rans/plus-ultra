import { useEffect, useState } from 'react'
import { subscribeTribePsychProfiles } from '../lib/psych'
import type { PsychProfile } from '@plus-ultra/core'

export function useTribePsychProfiles(tribeId: string | null): Map<string, PsychProfile> {
  const [profiles, setProfiles] = useState<Map<string, PsychProfile>>(new Map())

  useEffect(() => {
    if (!tribeId) return
    const unsub = subscribeTribePsychProfiles(tribeId, profileList => {
      const map = new Map<string, PsychProfile>()
      for (const p of profileList) map.set(p.memberId, p)
      setProfiles(map)
    })
    return unsub
  }, [tribeId])

  return profiles
}
