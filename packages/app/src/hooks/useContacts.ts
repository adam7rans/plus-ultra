import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToContacts } from '../lib/contacts'
import { useIsGridUp } from './useIsGridUp'
import type { ExternalContact } from '@plus-ultra/core'

export function useContacts(tribeId: string | null) {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.contacts.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<ExternalContact[]>([])
  useEffect(() => {
    if (gridUp || !tribeId) return
    const unsub = subscribeToContacts(tribeId, all => {
      setGunData([...all].sort((a, b) => a.name.localeCompare(b.name)))
    })
    return unsub
  }, [tribeId, gridUp])

  if (gridUp) {
    const sorted = [...((convexData ?? []) as unknown as ExternalContact[])]
      .sort((a, b) => a.name.localeCompare(b.name))
    return { contacts: sorted }
  }
  return { contacts: gunData }
}
