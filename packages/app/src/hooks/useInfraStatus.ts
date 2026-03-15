import { useCallback, useEffect, useState } from 'react'
import type { InfraItem, MemberInfraStatus } from '@plus-ultra/core'
import {
  setMemberInfraStatus,
  subscribeToTribeInfraStatus,
} from '../lib/infra-status'

export function useInfraStatus(
  tribeId: string,
  memberPub: string,
  displayName: string,
): {
  myFailingItems: InfraItem[]
  tribeStatuses: MemberInfraStatus[]
  toggleItem: (item: InfraItem) => Promise<void>
} {
  const [tribeStatuses, setTribeStatuses] = useState<MemberInfraStatus[]>([])

  useEffect(() => {
    if (!tribeId || !memberPub) return
    return subscribeToTribeInfraStatus(tribeId, setTribeStatuses)
  }, [tribeId, memberPub])

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
