import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useRollCall } from '../hooks/useRollCall'
import { subscribeToMembers, updateMemberHealth } from '../lib/tribes'
import { hasAuthority, getAuthority, MUSTER_STATUS_META, MUSTER_REASON_META } from '@plus-ultra/core'
import type { TribeMember, MusterStatus, HealthStatus } from '@plus-ultra/core'
import MusterResponseForm from '../components/MusterResponseForm'
import { useOfflineStage } from '../hooks/useOfflineStage'
import OfflineStageBanner from '../components/OfflineStageBanner'

const HEALTH_BADGE: Record<HealthStatus, { icon: string; color: string }> = {
  well:         { icon: '✓', color: 'text-forest-400' },
  minor_injury: { icon: '⚠', color: 'text-yellow-400' },
  major_injury: { icon: '🩹', color: 'text-orange-400' },
  critical:     { icon: '🚨', color: 'text-red-400' },
  deceased:     { icon: '✝', color: 'text-gray-500' },
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function duration(start: number, end: number): string {
  const s = Math.floor((end - start) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RollCallScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/rollcall' })
  const { identity } = useIdentity()
  const [members, setMembers] = useState<TribeMember[]>([])
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())
  const [proxyTarget, setProxyTarget] = useState<TribeMember | null>(null)
  const [healthPromptPub, setHealthPromptPub] = useState<string | null>(null)
  const [updatingHealth, setUpdatingHealth] = useState(false)
  const { offlineStage, offlineSince } = useOfflineStage()
  // Tick every 30s so relative timestamps ("5m ago") stay fresh during a live muster
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember ? getAuthority(myMember, null as never) : 'member'
  const canInitiate = hasAuthority(myAuth, 'lead')
  const canClose = (muster: { initiatedBy: string }) =>
    identity?.pub === muster.initiatedBy || hasAuthority(myAuth, 'elder_council')
  const canProxy = hasAuthority(myAuth, 'lead')

  const memberName = myMember?.displayName ?? identity?.pub?.slice(0, 8) ?? 'Unknown'
  const { activeMuster, responses, history, myResponse, buildCounts, respondToMuster, closeMuster } =
    useRollCall(tribeId, memberName)

  useEffect(() => {
    const unsub = subscribeToMembers(tribeId, setMembers)
    return unsub
  }, [tribeId])

  const memberPubs = members.map(m => m.pubkey)
  const counts = buildCounts(memberPubs)

  // Sorted member list: unresponded first, then by status
  const STATUS_ORDER: MusterStatus[] = ['need_help', 'injured', 'unknown', 'present', 'away_authorized', 'away_unplanned']
  const responseByPub = new Map(responses.map(r => [r.memberPub, r]))

  const sortedMembers = [...members].sort((a, b) => {
    const aStatus = responseByPub.get(a.pubkey)?.status ?? 'unknown'
    const bStatus = responseByPub.get(b.pubkey)?.status ?? 'unknown'
    return STATUS_ORDER.indexOf(aStatus) - STATUS_ORDER.indexOf(bStatus)
  })

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Dashboard
      </Link>

      <OfflineStageBanner stage={offlineStage} offlineSince={offlineSince} />

      <h2 className="text-2xl font-bold text-gray-100 mb-1">Roll Call</h2>

      {activeMuster ? (
        <>
          {/* Active muster header */}
          <div className="card border-warning-500/40 bg-warning-900/20 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-warning-400 animate-pulse" />
              <span className="text-xs font-bold text-warning-400 uppercase tracking-widest">Live</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span>{MUSTER_REASON_META[activeMuster.reason].icon}</span>
              <span className="text-sm font-semibold text-gray-100">{MUSTER_REASON_META[activeMuster.reason].label}</span>
            </div>
            {activeMuster.message && (
              <p className="text-sm text-gray-300 mb-1">{activeMuster.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Called by {activeMuster.initiatedByName} · {timeAgo(activeMuster.initiatedAt)}
            </p>
          </div>

          {/* Count row */}
          <div className="card mb-4">
            <div className="flex items-center justify-around">
              {(['present', 'away_authorized', 'away_unplanned', 'injured', 'need_help', 'unknown'] as MusterStatus[]).map(s => {
                const meta = MUSTER_STATUS_META[s]
                return (
                  <div key={s} className="flex flex-col items-center gap-0.5">
                    <span className="text-lg">{meta.icon}</span>
                    <span className={`text-base font-bold ${meta.color}`}>{counts[s]}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Your response */}
          <div className="mb-4">
            <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">Your Response</h3>
            {myResponse ? (
              <div className="card border-forest-700">
                <div className="flex items-center gap-2 mb-2">
                  <span>{MUSTER_STATUS_META[myResponse.status].icon}</span>
                  <span className={`text-sm font-semibold ${MUSTER_STATUS_META[myResponse.status].color}`}>
                    {MUSTER_STATUS_META[myResponse.status].label}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">{timeAgo(myResponse.respondedAt)}</span>
                </div>
                {myResponse.location && (
                  <p className="text-xs text-gray-400">📍 {myResponse.location}</p>
                )}
                {myResponse.note && (
                  <p className="text-xs text-gray-400 mt-0.5">"{myResponse.note}"</p>
                )}
                <button
                  className="text-xs text-forest-400 hover:text-forest-300 mt-2"
                  onClick={() => setProxyTarget(myMember ?? null)}
                >
                  Update response
                </button>
              </div>
            ) : (
              <div className="card border-warning-600/40 bg-warning-900/10">
                <p className="text-sm text-warning-300 font-semibold mb-3">You haven't responded yet</p>
                <MusterResponseForm
                  onSubmit={async (status, opts) => {
                    await respondToMuster(status, opts)
                  }}
                />
              </div>
            )}
          </div>

          {/* Member status board */}
          <div className="mb-6">
            <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">
              Member Status — {responses.length}/{members.length} responded
            </h3>
            <div className="space-y-2">
              {sortedMembers.map(member => {
                const resp = responseByPub.get(member.pubkey)
                const status = resp?.status ?? 'unknown'
                const meta = MUSTER_STATUS_META[status]
                const isMe = member.pubkey === identity?.pub

                const healthStatus = member.currentHealthStatus
                const healthBadge = healthStatus && healthStatus !== 'well' ? HEALTH_BADGE[healthStatus] : null
                const showHealthPrompt = healthPromptPub === member.pubkey

                return (
                  <div key={member.pubkey} className="card py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-lg flex-shrink-0">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-100 truncate">
                            {member.displayName}
                            {isMe && <span className="text-xs text-forest-400 ml-1">(you)</span>}
                          </span>
                          <span className={`text-xs flex-shrink-0 ${meta.color}`}>{meta.label}</span>
                          {healthBadge && (
                            <span className={`text-xs flex-shrink-0 ${healthBadge.color}`}>
                              {healthBadge.icon}
                            </span>
                          )}
                        </div>
                        {resp && (
                          <div className="mt-0.5 space-y-0.5">
                            {resp.location && <p className="text-xs text-gray-500">📍 {resp.location}</p>}
                            {resp.note && <p className="text-xs text-gray-500 truncate">"{resp.note}"</p>}
                            {resp.voiceNote && (
                              <audio
                                controls
                                src={`data:audio/webm;base64,${resp.voiceNote}`}
                                className="h-6 w-full mt-1"
                              />
                            )}
                            {resp.respondedByPub !== resp.memberPub && (
                              <p className="text-xs text-warning-600">Marked by lead</p>
                            )}
                            {/* Health status prompt for injured/need_help responses */}
                            {(status === 'injured' || status === 'need_help') && (isMe || canProxy) && (
                              <button
                                className="text-xs text-warning-400 hover:text-warning-300 mt-1"
                                onClick={() => setHealthPromptPub(prev => prev === member.pubkey ? null : member.pubkey)}
                              >
                                {showHealthPrompt ? '▲ Close' : 'Update health status?'}
                              </button>
                            )}
                          </div>
                        )}
                        {/* Health status quick picker */}
                        {showHealthPrompt && identity && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(['minor_injury', 'major_injury', 'critical'] as HealthStatus[]).map(s => (
                              <button
                                key={s}
                                disabled={updatingHealth}
                                className={`text-xs px-2 py-1 rounded border border-forest-800 text-gray-400 hover:border-orange-700 hover:text-orange-300 transition-colors ${
                                  member.currentHealthStatus === s ? 'border-orange-700 text-orange-300' : ''
                                }`}
                                onClick={async () => {
                                  setUpdatingHealth(true)
                                  try {
                                    await updateMemberHealth(tribeId, member.pubkey, {
                                      currentHealthStatus: s,
                                      updatedByPub: identity.pub,
                                    })
                                    setHealthPromptPub(null)
                                  } finally {
                                    setUpdatingHealth(false)
                                  }
                                }}
                              >
                                {HEALTH_BADGE[s].icon} {s.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {resp && (
                        <span className="text-xs text-gray-600 flex-shrink-0">{timeAgo(resp.respondedAt)}</span>
                      )}
                      {canProxy && !isMe && (
                        <button
                          className="text-xs text-gray-500 hover:text-forest-400 flex-shrink-0 ml-1"
                          onClick={() => setProxyTarget(member)}
                          title="Respond on behalf"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Close muster */}
          {canClose(activeMuster) && (
            <button
              className="w-full py-2.5 px-4 rounded-xl border border-danger-700 text-danger-400 hover:bg-danger-900/20 text-sm font-semibold transition-colors mb-4"
              onClick={closeMuster}
            >
              Close Muster
            </button>
          )}
        </>
      ) : (
        <>
          {!canInitiate && (
            <p className="text-gray-500 text-sm mb-6">No active muster. Only leads and above can initiate one.</p>
          )}
          {canInitiate && (
            <p className="text-gray-500 text-sm mb-6">No active muster. Use the 📣 button on the dashboard to call one.</p>
          )}
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">Past Musters</h3>
          <div className="space-y-2">
            {history.filter(m => m.status === 'closed').map(m => {
              const isExpanded = expandedHistory.has(m.id)
              const reasonMeta = MUSTER_REASON_META[m.reason]
              return (
                <div key={m.id} className="card py-3">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedHistory(prev => {
                      const next = new Set(prev)
                      if (next.has(m.id)) next.delete(m.id)
                      else next.add(m.id)
                      return next
                    })}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{reasonMeta.icon}</span>
                      <span className="text-sm font-semibold text-gray-200">{reasonMeta.label}</span>
                      <span className="text-xs text-gray-500 ml-auto">{formatDate(m.initiatedAt)}</span>
                    </div>
                    {m.closedAt && (
                      <p className="text-xs text-gray-500">
                        Closed after {duration(m.initiatedAt, m.closedAt)} · by {m.initiatedByName}
                      </p>
                    )}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-forest-800 text-xs text-gray-500">
                      <p>Muster ID: {m.id.slice(0, 8)}…</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Proxy response modal */}
      {proxyTarget && activeMuster && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="max-w-sm w-full mx-4 mb-6 card border-warning-700/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-200">
                {proxyTarget.pubkey === identity?.pub ? 'Update Response' : `Respond for ${proxyTarget.displayName}`}
              </h3>
              <button className="text-gray-500 hover:text-gray-300" onClick={() => setProxyTarget(null)}>✕</button>
            </div>
            <MusterResponseForm
              proxyName={proxyTarget.pubkey !== identity?.pub ? proxyTarget.displayName : undefined}
              initialStatus={responseByPub.get(proxyTarget.pubkey)?.status}
              initialLocation={responseByPub.get(proxyTarget.pubkey)?.location}
              initialNote={responseByPub.get(proxyTarget.pubkey)?.note}
              submitLabel={proxyTarget.pubkey === identity?.pub ? 'Update Response' : `Submit for ${proxyTarget.displayName}`}
              onSubmit={async (status, opts) => {
                const isProxy = proxyTarget.pubkey !== identity?.pub
                await respondToMuster(status, {
                  ...opts,
                  targetMemberPub: isProxy ? proxyTarget.pubkey : undefined,
                  targetMemberName: isProxy ? proxyTarget.displayName : undefined,
                })
                setProxyTarget(null)
              }}
              onCancel={() => setProxyTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
