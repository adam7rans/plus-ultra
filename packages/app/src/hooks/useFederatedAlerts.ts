import { useEffect, useState } from 'react'
import { subscribeToFederatedAlerts } from '../lib/federation'
import type { FederationRelationship, FederatedAlert } from '@plus-ultra/core'

export function useFederatedAlerts(
  relationships: FederationRelationship[],
  myTribeEpub: string | null,
  myTribeEpriv: string | null,
): FederatedAlert[] {
  const [alerts, setAlerts] = useState<FederatedAlert[]>([])

  const alliedCount = relationships.filter(r => r.status === 'allied').length
  const channelIds = relationships.map(r => r.channelId).join(',')

  useEffect(() => {
    if (!myTribeEpub || !myTribeEpriv || relationships.length === 0) return
    const unsub = subscribeToFederatedAlerts(
      relationships, myTribeEpub, myTribeEpriv, setAlerts,
    )
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alliedCount, channelIds, myTribeEpub, myTribeEpriv])

  return alerts
}
