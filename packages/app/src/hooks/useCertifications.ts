import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToAllCerts } from '../lib/certifications'
import { useIsGridUp } from './useIsGridUp'
import type { MemberCertification } from '@plus-ultra/core'

export function useCertifications(tribeId: string | null): { certs: MemberCertification[]; loading: boolean } {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.training.listCertifications,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<MemberCertification[]>([])
  const [gunLoading, setGunLoading] = useState(true)
  useEffect(() => {
    if (gridUp || !tribeId) return
    setGunLoading(true)
    const unsub = subscribeToAllCerts(tribeId, (c) => {
      setGunData(c)
      setGunLoading(false)
    })
    return unsub
  }, [tribeId, gridUp])

  if (gridUp) {
    return {
      certs: (convexData ?? []) as unknown as MemberCertification[],
      loading: convexData === undefined,
    }
  }
  return { certs: gunData, loading: gunLoading }
}
