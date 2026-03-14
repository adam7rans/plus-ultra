import { useEffect, useState } from 'react'
import { subscribePsychProfile } from '../lib/psych'
import type { PsychProfile } from '@plus-ultra/core'

export function usePsychProfile(tribeId: string | null, memberPub: string | null): PsychProfile | null {
  const [profile, setProfile] = useState<PsychProfile | null>(null)

  useEffect(() => {
    if (!tribeId || !memberPub) return
    const unsub = subscribePsychProfile(tribeId, memberPub, setProfile)
    return unsub
  }, [tribeId, memberPub])

  return profile
}
