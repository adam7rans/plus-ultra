import { useEffect, useState } from 'react'
import { subscribeToFederationRelationships } from '../lib/federation'
import type { FederationRelationship } from '@plus-ultra/core'

export function useFederation(tribeId: string | null): {
  relationships: FederationRelationship[]
} {
  const [relationships, setRelationships] = useState<FederationRelationship[]>([])

  useEffect(() => {
    if (!tribeId) return
    const unsub = subscribeToFederationRelationships(tribeId, setRelationships)
    return unsub
  }, [tribeId])

  return { relationships }
}
