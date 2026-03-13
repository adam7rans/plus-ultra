import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useTribe } from '../contexts/TribeContext'
import { useIdentity } from '../contexts/IdentityContext'
import { createInviteToken, buildInviteUrl, fetchTribeMeta } from '../lib/tribes'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useInventory } from '../hooks/useInventory'
import { useNotifications } from '../hooks/useNotifications'
import { assetReadiness, getAuthority, hasAuthority } from '@plus-ultra/core'
import type { Tribe } from '@plus-ultra/core'
import SurvivabilityScore from '../components/SurvivabilityScore'
import NowAndUpNext from '../components/NowAndUpNext'
import { useEvents } from '../hooks/useEvents'
import BucketGrid from '../components/BucketGrid'
import CriticalGapsPanel from '../components/CriticalGapsPanel'
import MemberCard from '../components/MemberCard'
import QrDisplay from '../components/QrDisplay'
import NotificationsPanel from '../components/NotificationsPanel'
import SendAlertModal from '../components/SendAlertModal'
import AlertOverlay from '../components/AlertOverlay'
import { subscribeToAlerts } from '../lib/notifications'
import type { TribeAlert } from '../lib/notifications'
import { pushSupported, subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../lib/push'
import { useChannelUnread, useDMUnreadCounts } from '../hooks/useChannelUnread'
import { useProposals } from '../hooks/useProposals'

export default function TribeDashboard() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId' })
  const { identity } = useIdentity()
  const { setActiveTribeId, myTribes } = useTribe()
  const localRef = myTribes.find(t => t.tribeId === tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [showInviteQr, setShowInviteQr] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  async function handleShare() {
    if (!inviteUrl) return
    const title = `Join ${tribe?.name ?? localRef?.name ?? 'my tribe'}`
    if (navigator.share) {
      try {
        await navigator.share({ url: inviteUrl, title })
        return
      } catch {
        // user cancelled or API failed — fall through to copy
      }
    }
    // Desktop fallback: copy to clipboard
    await navigator.clipboard.writeText(inviteUrl)
    setShareSuccess(true)
    setTimeout(() => setShareSuccess(false), 2000)
  }
  const [showBuckets, setShowBuckets] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSendAlert, setShowSendAlert] = useState(false)
  const [activeAlert, setActiveAlert] = useState<TribeAlert | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  const { score, bucketScores, members, skills, criticalGaps, warnings } = useSurvivabilityScore(tribeId)
  const events = useEvents(tribeId)
  const inventory = useInventory(tribeId)
  const readiness = Math.round(assetReadiness(members.length || 1, inventory.map(i => ({ asset: i.asset, quantity: i.quantity }))) * 100)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(tribeId, identity?.pub ?? null)
  const tribeChannelUnread = useChannelUnread('tribe-wide')
  const dmUnreadCounts = useDMUnreadCounts(identity?.pub ?? '', members.map(m => m.pubkey).filter(p => p !== identity?.pub))
  const { proposals: allProposals } = useProposals(tribeId)
  const openProposalCount = allProposals.filter(p => p.status === 'open').length

  // Determine if user can send alerts (elder_council+)
  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const canSendAlerts = hasAuthority(myAuth, 'elder_council')

  const [tribePub, setTribePub] = useState<string>('')

  useEffect(() => {
    setActiveTribeId(tribeId)
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
    // Load tribePub from my-tribes for invite URL (needed even when tribe-cache is empty)
    import('../lib/db').then(({ getDB }) =>
      getDB().then(db => db.get('my-tribes', tribeId).then(r => { if (r?.tribePub) setTribePub(r.tribePub) }))
    )
  }, [tribeId, setActiveTribeId])

  // Check push subscription status
  useEffect(() => {
    isPushSubscribed().then(setPushEnabled)
  }, [])

  async function handleTogglePush() {
    if (!identity) return
    setPushLoading(true)
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(tribeId, identity.pub)
        setPushEnabled(false)
      } else {
        const ok = await subscribeToPush(tribeId, identity.pub)
        setPushEnabled(ok)
      }
    } finally {
      setPushLoading(false)
    }
  }

  // Subscribe to live alerts for full-screen overlay
  useEffect(() => {
    const unsub = subscribeToAlerts(tribeId, (alert) => {
      // Don't show your own alerts
      if (alert.senderPub === identity?.pub) return
      setActiveAlert(alert)
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200])
    })
    return unsub
  }, [tribeId, identity?.pub])

  async function handleGenerateInvite() {
    setLoadingInvite(true)
    try {
      const token = await createInviteToken(tribeId)
      const pub = tribe?.pub ?? tribePub
      const tribeMeta = { name: tribe?.name ?? localRef?.name ?? '', location: tribe?.location ?? localRef?.location ?? '', pub }
      const url = buildInviteUrl(tribeId, token, tribeMeta)
      setInviteUrl(url)
    } finally {
      setLoadingInvite(false)
    }
  }

  async function handleCopyInvite() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const mySkillCount = identity
    ? skills.filter(s => s.memberId === identity.pub).length
    : 0

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← All Tribes
      </Link>

      {(tribe ?? localRef) ? (
        <>
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">{tribe?.name ?? localRef?.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{tribe?.location ?? localRef?.location} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {canSendAlerts && (
                <button
                  className="text-lg hover:scale-110 transition-transform"
                  onClick={() => setShowSendAlert(true)}
                  title="Send Alert"
                >
                  🚨
                </button>
              )}
              <button
                className="relative text-lg hover:scale-110 transition-transform"
                onClick={() => setShowNotifications(prev => !prev)}
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <Link
                to="/tribe/$tribeId/settings"
                params={{ tribeId }}
                className="text-lg hover:scale-110 transition-transform"
                title="Tribe Settings"
              >
                ⚙️
              </Link>
            </div>
          </div>

          {/* Notifications panel */}
          {showNotifications && (
            <div className="mb-4 space-y-2">
              <NotificationsPanel
                notifications={notifications}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                onClose={() => setShowNotifications(false)}
              />
              {pushSupported() && (
                <div className="card flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📲</span>
                    <span className="text-xs text-gray-300">Push notifications</span>
                  </div>
                  <button
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      pushEnabled
                        ? 'border-forest-500 bg-forest-900/50 text-forest-300'
                        : 'border-forest-800 text-gray-400 hover:border-forest-600'
                    }`}
                    onClick={handleTogglePush}
                    disabled={pushLoading}
                  >
                    {pushLoading ? '...' : pushEnabled ? 'Enabled ✓' : 'Enable'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Survivability score */}
          <div className="mb-4">
            <SurvivabilityScore score={score} hasCriticalGap={criticalGaps.length > 0} />
          </div>

          <div className="mb-4 flex items-center gap-3">
            <div className="card flex-1 flex items-center gap-2 py-2">
              <span className="text-sm">📦</span>
              <span className="text-xs text-gray-400">Asset Readiness</span>
              <span className={`text-sm font-mono font-bold ml-auto ${
                readiness >= 70 ? 'text-forest-400' : readiness >= 40 ? 'text-warning-400' : 'text-danger-400'
              }`}>{readiness}%</span>
            </div>
          </div>

          {/* Now + Up Next */}
          <div className="mb-4">
            <NowAndUpNext tribeId={tribeId} events={events} />
          </div>

          {/* Navigation cards */}
          <div className="space-y-2 mb-4">
            <Link
              to="/tribe/$tribeId/channel"
              params={{ tribeId }}
              className="flex items-center gap-3 card hover:border-forest-600 transition-colors"
            >
              <span className="text-2xl">📡</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-100 text-sm">Tribe Channel</div>
                <div className="text-xs text-gray-400">Tribe-wide messages</div>
              </div>
              {tribeChannelUnread > 0 && (
                <span className="w-5 h-5 rounded-full bg-forest-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {tribeChannelUnread > 9 ? '9+' : tribeChannelUnread}
                </span>
              )}
              <span className="text-forest-400 text-lg">→</span>
            </Link>
            <Link
              to="/tribe/$tribeId/schematic"
              params={{ tribeId }}
              className="flex items-center gap-3 card hover:border-forest-600 transition-colors"
            >
              <span className="text-2xl">📋</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-100 text-sm">Tribe Schematic</div>
                <div className="text-xs text-gray-400">Bird's eye view — roles, resources, readiness</div>
              </div>
              <span className="text-forest-400 text-lg">→</span>
            </Link>
            <Link
              to="/tribe/$tribeId/station"
              params={{ tribeId }}
              className="flex items-center gap-3 card hover:border-forest-600 transition-colors"
            >
              <span className="text-2xl">🪖</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-100 text-sm">My Station</div>
                <div className="text-xs text-gray-400">Your team, inventory, and priorities</div>
              </div>
              <span className="text-forest-400 text-lg">→</span>
            </Link>
            <Link
              to="/tribe/$tribeId/people"
              params={{ tribeId }}
              className="flex items-center gap-3 card hover:border-forest-600 transition-colors"
            >
              <span className="text-2xl">👨‍👩‍👧</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-100 text-sm">My People</div>
                <div className="text-xs text-gray-400">Family and friends</div>
              </div>
              <span className="text-forest-400 text-lg">→</span>
            </Link>
            <Link
              to="/tribe/$tribeId/inventory"
              params={{ tribeId }}
              className="flex items-center gap-3 card hover:border-forest-600 transition-colors"
            >
              <span className="text-2xl">📦</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-100 text-sm">Inventory</div>
                <div className="text-xs text-gray-400">Track assets and supplies</div>
              </div>
              <span className="text-forest-400 text-lg">→</span>
            </Link>
            <Link
              to="/tribe/$tribeId/proposals"
              params={{ tribeId }}
              className="flex items-center gap-3 card hover:border-forest-600 transition-colors"
            >
              <span className="text-2xl">🗳️</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-100 text-sm">Proposals</div>
                <div className="text-xs text-gray-400">Decisions and governance</div>
              </div>
              {openProposalCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-forest-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {openProposalCount > 9 ? '9+' : openProposalCount}
                </span>
              )}
              <span className="text-forest-400 text-lg">→</span>
            </Link>
            <Link
              to="/tribe/$tribeId/map"
              params={{ tribeId }}
              className="flex items-center gap-3 card hover:border-forest-600 transition-colors"
            >
              <span className="text-2xl">🗺️</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-100 text-sm">Map</div>
                <div className="text-xs text-gray-400">Territory, pins, and patrol routes</div>
              </div>
              {tribe?.lat && (
                <span className="text-xs text-forest-400 flex-shrink-0">Coordinates set</span>
              )}
              <span className="text-forest-400 text-lg">→</span>
            </Link>
          </div>

          {/* Declare skills CTA if user has none */}
          {mySkillCount === 0 && (
            <div className="card border-forest-600 bg-forest-900/30 mb-4">
              <p className="text-forest-300 text-sm font-semibold mb-1">You haven't declared your skills</p>
              <p className="text-gray-400 text-xs mb-3">
                Declaring skills updates the tribe's survivability score in real time.
              </p>
              <Link to="/tribe/$tribeId/skills" params={{ tribeId }}>
                <button className="btn-primary w-full text-sm">Declare Skills →</button>
              </Link>
            </div>
          )}

          {/* Critical gaps */}
          <div className="mb-6">
            <h3 className="text-xs text-gray-300 uppercase tracking-widest mb-2">Gaps &amp; Priorities</h3>
            <CriticalGapsPanel
              criticalGaps={criticalGaps}
              warnings={warnings}
              tribeId={tribeId}
            />
          </div>

          {/* Bucket grid toggle */}
          <div className="mb-6">
            <button
              className="flex items-center justify-between w-full mb-3"
              onClick={() => setShowBuckets(prev => !prev)}
            >
              <h3 className="text-xs text-gray-300 uppercase tracking-widest">
                All Buckets
              </h3>
              <span className="text-xs text-forest-400">{showBuckets ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {showBuckets && (
              <BucketGrid bucketScores={bucketScores} members={members} skills={skills} />
            )}
          </div>

          {/* Members */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs text-gray-300 uppercase tracking-widest">
                Members ({members.length})
              </h3>
              {mySkillCount > 0 && (
                <Link to="/tribe/$tribeId/skills" params={{ tribeId }}>
                  <span className="text-xs text-forest-400 hover:text-forest-300">Edit skills</span>
                </Link>
              )}
            </div>
            {members.length === 0 ? (
              <div className="card text-center py-6">
                <p className="text-gray-400 text-sm">No members yet — invite some</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(member => {
                  const actorMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
                  return (
                    <MemberCard
                      key={member.pubkey}
                      member={member}
                      isYou={member.pubkey === identity?.pub}
                      tribeId={tribeId}
                      tribe={tribe}
                      actorMember={actorMember}
                      skills={skills}
                      dmUnreadCount={dmUnreadCounts.get(member.pubkey)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Invite section */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Invite Members</h3>
            {inviteUrl ? (
              <div className="space-y-3">
                {/* QR code toggle */}
                <button
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-forest-900 border border-forest-700 hover:border-forest-500 transition-colors"
                  onClick={() => setShowInviteQr(prev => !prev)}
                >
                  <span className="text-sm text-gray-300">Show QR Code</span>
                  <span className="text-forest-400 text-sm">{showInviteQr ? '▲' : '▼'}</span>
                </button>
                {showInviteQr && (
                  <div className="flex justify-center py-2">
                    <QrDisplay value={inviteUrl} />
                  </div>
                )}

                {/* URL display */}
                <div className="bg-forest-950 rounded-lg p-3 font-mono text-xs text-gray-400 break-all">
                  {inviteUrl}
                </div>
                <p className="text-xs text-gray-400">24 hours · single use</p>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`btn-primary ${copySuccess ? 'bg-forest-600' : ''}`}
                    onClick={handleCopyInvite}
                  >
                    {copySuccess ? '✓ Copied!' : 'Copy Link'}
                  </button>
                  <button
                    className={`btn-primary ${shareSuccess ? 'bg-forest-600' : ''}`}
                    onClick={handleShare}
                  >
                    {shareSuccess ? '✓ Copied!' : 'Share ↗'}
                  </button>
                </div>
                <button
                  className="btn-secondary w-full text-sm"
                  onClick={() => { setInviteUrl(null); setShowInviteQr(false) }}
                >
                  Generate new link
                </button>
              </div>
            ) : (
              <button
                className="btn-primary w-full"
                onClick={handleGenerateInvite}
                disabled={loadingInvite}
              >
                {loadingInvite ? 'Generating...' : 'Generate Invite Link'}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="text-forest-400 text-sm animate-pulse">Loading tribe...</div>
        </div>
      )}

      {/* Send Alert modal */}
      {showSendAlert && identity && (
        <SendAlertModal
          tribeId={tribeId}
          senderPub={identity.pub}
          senderName={myMember?.displayName ?? 'Unknown'}
          onClose={() => setShowSendAlert(false)}
        />
      )}

      {/* Full-screen alert overlay */}
      {activeAlert && (
        <AlertOverlay
          alert={activeAlert}
          onDismiss={() => setActiveAlert(null)}
        />
      )}
    </div>
  )
}
