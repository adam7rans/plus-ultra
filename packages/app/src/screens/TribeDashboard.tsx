import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useTribe } from '../contexts/TribeContext'
import { useIdentity } from '../contexts/IdentityContext'
import { createInviteToken, buildInviteUrl, fetchTribeMeta } from '../lib/tribes'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import type { Tribe } from '@plus-ultra/core'
import SurvivabilityScore from '../components/SurvivabilityScore'
import BucketGrid from '../components/BucketGrid'
import CriticalGapsPanel from '../components/CriticalGapsPanel'
import MemberCard from '../components/MemberCard'

export default function TribeDashboard() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId' })
  const { identity } = useIdentity()
  const { setActiveTribeId } = useTribe()

  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [showBuckets, setShowBuckets] = useState(false)

  const { score, bucketScores, members, skills, criticalGaps, warnings } = useSurvivabilityScore(tribeId)

  useEffect(() => {
    setActiveTribeId(tribeId)
    fetchTribeMeta(tribeId).then(setTribe)
  }, [tribeId, setActiveTribeId])

  async function handleGenerateInvite() {
    setLoadingInvite(true)
    try {
      const token = await createInviteToken(tribeId)
      const url = buildInviteUrl(tribeId, token)
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

      {tribe ? (
        <>
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-100">{tribe.name}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{tribe.location} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Survivability score */}
          <div className="mb-4">
            <SurvivabilityScore score={score} hasCriticalGap={criticalGaps.length > 0} />
          </div>

          {/* Declare skills CTA if user has none */}
          {mySkillCount === 0 && (
            <div className="card border-forest-600 bg-forest-900/30 mb-4">
              <p className="text-forest-300 text-sm font-semibold mb-1">You haven't declared your skills</p>
              <p className="text-gray-500 text-xs mb-3">
                Declaring skills updates the tribe's survivability score in real time.
              </p>
              <Link to="/tribe/$tribeId/skills" params={{ tribeId }}>
                <button className="btn-primary w-full text-sm">Declare Skills →</button>
              </Link>
            </div>
          )}

          {/* Critical gaps */}
          <div className="mb-6">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">Gaps &amp; Priorities</h3>
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
              <h3 className="text-xs text-gray-500 uppercase tracking-widest">
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
              <h3 className="text-xs text-gray-500 uppercase tracking-widest">
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
                <p className="text-gray-600 text-sm">No members yet — invite some</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(member => (
                  <MemberCard
                    key={member.pubkey}
                    member={member}
                    isYou={member.pubkey === identity?.pub}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Invite section */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Invite Members</h3>
            {inviteUrl ? (
              <div className="space-y-3">
                <div className="bg-forest-950 rounded-lg p-3 font-mono text-xs text-gray-400 break-all">
                  {inviteUrl}
                </div>
                <p className="text-xs text-gray-600">24 hours · single use</p>
                <button
                  className={`btn-primary w-full ${copySuccess ? 'bg-forest-600' : ''}`}
                  onClick={handleCopyInvite}
                >
                  {copySuccess ? '✓ Copied!' : 'Copy Invite Link'}
                </button>
                <button
                  className="btn-secondary w-full text-sm"
                  onClick={() => setInviteUrl(null)}
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
    </div>
  )
}
