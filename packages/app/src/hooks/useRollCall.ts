import { useState, useEffect, useCallback } from 'react'
import { useIdentity } from '../contexts/IdentityContext'
import {
  subscribeToMuster,
  initiateMuster as libInitiateMuster,
  respondToMuster as libRespondToMuster,
  closeMuster as libCloseMuster,
  getMusterHistory,
} from '../lib/rollcall'
import type { MusterCall, MusterResponse, MusterStatus, MusterReason } from '@plus-ultra/core'

export function useRollCall(tribeId: string, memberName: string) {
  const { identity } = useIdentity()
  const [activeMuster, setActiveMuster] = useState<MusterCall | null>(null)
  const [responses, setResponses] = useState<MusterResponse[]>([])
  const [history, setHistory] = useState<MusterCall[]>([])

  useEffect(() => {
    if (!tribeId) return
    const unsub = subscribeToMuster(tribeId, (muster, resps) => {
      setActiveMuster(muster)
      setResponses(resps)
    })
    getMusterHistory(tribeId).then(setHistory)
    return unsub
  }, [tribeId])

  const myResponse = identity
    ? responses.find(r => r.memberPub === identity.pub) ?? null
    : null

  function buildCounts(memberPubs: string[]): Record<MusterStatus, number> {
    const counts: Record<MusterStatus, number> = {
      present: 0, away_authorized: 0, away_unplanned: 0,
      injured: 0, need_help: 0, unknown: 0,
    }
    const respondedPubs = new Set(responses.map(r => r.memberPub))
    for (const r of responses) counts[r.status]++
    counts.unknown = memberPubs.filter(p => !respondedPubs.has(p)).length
    return counts
  }

  const initiateMuster = useCallback(async (reason: MusterReason, message?: string) => {
    if (!identity) return null
    return libInitiateMuster(tribeId, identity.pub, memberName, reason, message)
  }, [tribeId, identity, memberName])

  const respondToMuster = useCallback(async (
    status: MusterStatus,
    opts?: {
      location?: string
      note?: string
      voiceNote?: string
      targetMemberPub?: string
      targetMemberName?: string
    },
  ) => {
    if (!identity || !activeMuster) return
    const targetPub = opts?.targetMemberPub ?? identity.pub
    const targetName = opts?.targetMemberName ?? memberName
    await libRespondToMuster(
      tribeId,
      activeMuster.id,
      targetPub,
      targetName,
      status,
      {
        location: opts?.location,
        note: opts?.note,
        voiceNote: opts?.voiceNote,
        respondedByPub: opts?.targetMemberPub ? identity.pub : undefined,
      },
    )
  }, [tribeId, identity, activeMuster, memberName])

  const closeMuster = useCallback(async () => {
    if (!activeMuster) return
    await libCloseMuster(tribeId, activeMuster.id)
    setActiveMuster(null)
    setResponses([])
    getMusterHistory(tribeId).then(setHistory)
  }, [tribeId, activeMuster])

  return {
    activeMuster,
    responses,
    history,
    myResponse,
    buildCounts,
    initiateMuster,
    respondToMuster,
    closeMuster,
  }
}
