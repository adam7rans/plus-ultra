import { useEffect, useState } from 'react'
import { loadCachedMessages, getUnreadCount, dmChannelId } from '../lib/messaging'

/** Returns unread message count for a channel, computed from IDB on mount. */
export function useChannelUnread(channelId: string): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!channelId) return
    async function check() {
      const messages = await loadCachedMessages(channelId)
      const unread = await getUnreadCount(channelId, messages)
      setCount(unread)
    }
    void check()
  }, [channelId])

  return count
}

/** Returns a map of channelId → unread count for all DM pairs. */
export function useDMUnreadCounts(myPub: string, memberPubs: string[]): Map<string, number> {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!myPub || memberPubs.length === 0) return
    async function checkAll() {
      const result = new Map<string, number>()
      await Promise.all(
        memberPubs.map(async (pub) => {
          const channelId = dmChannelId(myPub, pub)
          const messages = await loadCachedMessages(channelId)
          const unread = await getUnreadCount(channelId, messages)
          if (unread > 0) result.set(pub, unread)
        })
      )
      setCounts(result)
    }
    void checkAll()
  }, [myPub, memberPubs.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  return counts
}
