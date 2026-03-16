import { useCallback, useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { InfraItem, MemberInfraStatus } from '@plus-ultra/core'
import {
  setMemberInfraStatus,
  subscribeToTribeInfraStatus,
} from '../lib/infra-status'
import { useIsGridUp } from './useIsGridUp'

// Convex stores failingItems as string[], local type uses failingItemsJson (JSON string)
interface ConvexInfraStatus {
  memberPub: string
  tribeId: string
  failingItems: string[]
  updatedAt: number
  displayName: string
}

function convexToLocal(c: ConvexInfraStatus): MemberInfraStatus {
  return {
    memberPub: c.memberPub,
    tribeId: c.tribeId,
    failingItemsJson: JSON.stringify(c.failingItems ?? []),
    updatedAt: c.updatedAt,
    displayName: c.displayName,
  }
}

export function useInfraStatus(
  tribeId: string,
  memberPub: string,
  displayName: string,
): {
  myFailingItems: InfraItem[]
  tribeStatuses: MemberInfraStatus[]
  toggleItem: (item: InfraItem) => Promise<void>
} {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.gridState.listInfraStatus,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunStatuses, setGunStatuses] = useState<MemberInfraStatus[]>([])

  useEffect(() => {
    if (gridUp || !tribeId || !memberPub) return
    return subscribeToTribeInfraStatus(tribeId, setGunStatuses)
  }, [tribeId, memberPub, gridUp])

  const tribeStatuses = gridUp
    ? ((convexData ?? []) as unknown as ConvexInfraStatus[]).map(convexToLocal)
    : gunStatuses

  const myStatus = tribeStatuses.find(s => s.memberPub === memberPub)
  let myFailingItems: InfraItem[] = []
  try {
    myFailingItems = myStatus ? JSON.parse(myStatus.failingItemsJson) : []
  } catch {
    myFailingItems = []
  }

  const toggleItem = useCallback(async (item: InfraItem) => {
    const current: InfraItem[] = (() => {
      try {
        return myStatus ? JSON.parse(myStatus.failingItemsJson) : []
      } catch {
        return []
      }
    })()

    const next: InfraItem[] = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item]

    await setMemberInfraStatus({
      memberPub,
      tribeId,
      failingItemsJson: JSON.stringify(next),
      updatedAt: Date.now(),
      displayName,
    })
  }, [tribeId, memberPub, displayName, myStatus])

  return { myFailingItems, tribeStatuses, toggleItem }
}
