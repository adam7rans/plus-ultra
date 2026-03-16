import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToFederationRelationships } from '../lib/federation'
import { useIsGridUp } from './useIsGridUp'
import type { FederationRelationship } from '@plus-ultra/core'

export function useFederation(tribeId: string | null): {
  relationships: FederationRelationship[]
} {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): listRelationships takes myTribeId
  const convexData = useQuery(
    api.federation.listRelationships,
    gridUp && tribeId ? { myTribeId: tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<FederationRelationship[]>([])
  useEffect(() => {
    if (gridUp || !tribeId) return
    const unsub = subscribeToFederationRelationships(tribeId, setGunData)
    return unsub
  }, [tribeId, gridUp])

  return {
    relationships: gridUp ? (convexData ?? []) as unknown as FederationRelationship[] : gunData,
  }
}
