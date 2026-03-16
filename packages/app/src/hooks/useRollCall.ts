import { useState, useEffect, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useIdentity } from '../contexts/IdentityContext'
import {
  subscribeToMuster,
  initiateMuster as libInitiateMuster,
  respondToMuster as libRespondToMuster,
  closeMuster as libCloseMuster,
  getMusterHistory,
} from '../lib/rollcall'
import { useIsGridUp } from './useIsGridUp'
import type { MusterCall, MusterResponse, MusterStatus, MusterReason } from '@plus-ultra/core'

export function useRollCall(tribeId: string, memberName: string) {
  const { identity } = useIdentity()
  const gridUp = useIsGridUp()

  // Convex path (grid-up): list all musters for tribe, find active one
  const convexMusters = useQuery(
    api.rollcall.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )
  // Derive the active muster from the list
  const convexActiveMuster = convexMusters
    ? ((convexMusters as unknown as MusterCall[]).find(m => m.status === 'active') ?? null)
    : null
  const convexResponses = useQuery(
    api.rollcall.listResponses,
    gridUp && convexActiveMuster ? { musterId: convexActiveMuster.id } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunActiveMuster, setGunActiveMuster] = useState<MusterCall | null>(null)
  const [gunResponses, setGunResponses] = useState<MusterResponse[]>([])
  const [history, setHistory] = useState<MusterCall[]>([])

  useEffect(() => {
    if (gridUp || !tribeId) return
    const unsub = subscribeToMuster(tribeId, (muster, resps) => {
      setGunActiveMuster(muster)
      setGunResponses(resps)
    })
    getMusterHistory(tribeId).then(setHistory)
    return unsub
  }, [tribeId, gridUp])

  const activeMuster = gridUp ? convexActiveMuster : gunActiveMuster
  const responses = gridUp ? (convexResponses ?? []) as unknown as MusterResponse[] : gunResponses

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
    if (!gridUp) {
      setGunActiveMuster(null)
      setGunResponses([])
      getMusterHistory(tribeId).then(setHistory)
    }
  }, [tribeId, activeMuster, gridUp])

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
