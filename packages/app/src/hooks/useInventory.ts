import { useEffect, useState } from 'react'
import { subscribeToInventory } from '../lib/inventory'
import type { TribeAsset } from '@plus-ultra/core'

export function useInventory(tribeId: string | null): TribeAsset[] {
  const [inventory, setInventory] = useState<TribeAsset[]>([])

  useEffect(() => {
    if (!tribeId) return
    const unsub = subscribeToInventory(tribeId, setInventory)
    return unsub
  }, [tribeId])

  return inventory
}
