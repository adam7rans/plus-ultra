import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { declareSkill, getMySkills } from '../lib/skills'
import { ALL_ROLES_BY_TIER } from '../lib/roles'
import type { SkillRole, ProficiencyLevel } from '@plus-ultra/core'

const PROFICIENCY_OPTIONS: { value: ProficiencyLevel; label: string; description: string }[] = [
  { value: 'basic', label: 'Basic', description: 'Some knowledge, learning' },
  { value: 'intermediate', label: 'Intermediate', description: 'Competent, can contribute' },
  { value: 'expert', label: 'Expert', description: 'Highly skilled, years of experience' },
  { value: 'verified_expert', label: 'Verified Expert', description: 'Certified / credentialed professional' },
]

const TIER_LABELS = ['Tier 1 — Critical', 'Tier 2 — Essential', 'Tier 3 — Multipliers']

export default function SkillsDeclarationScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/skills' })
  const { identity } = useIdentity()
  const navigate = useNavigate()

  // Map of role → proficiency (selected skills)
  const [selected, setSelected] = useState<Map<SkillRole, ProficiencyLevel>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedRole, setExpandedRole] = useState<SkillRole | null>(null)

  // Load existing declarations
  useEffect(() => {
    if (!identity) return
    getMySkills(tribeId, identity.pub).then(existing => {
      const map = new Map<SkillRole, ProficiencyLevel>()
      existing.forEach(s => map.set(s.role, s.proficiency))
      setSelected(map)
      setLoading(false)
    })
  }, [tribeId, identity])

  function toggleRole(role: SkillRole) {
    if (selected.has(role)) {
      // Already selected — open to change proficiency
      setExpandedRole(expandedRole === role ? null : role)
    } else {
      // Not selected — add with default proficiency and expand
      setSelected(prev => new Map(prev).set(role, 'intermediate'))
      setExpandedRole(role)
    }
  }

  function setProficiency(role: SkillRole, proficiency: ProficiencyLevel) {
    setSelected(prev => new Map(prev).set(role, proficiency))
    setExpandedRole(null)
  }

  function deselect(role: SkillRole) {
    setSelected(prev => {
      const next = new Map(prev)
      next.delete(role)
      return next
    })
    setExpandedRole(null)
  }

  async function handleSave() {
    if (!identity) return
    setSaving(true)
    try {
      // Declare all selected skills
      const promises = Array.from(selected.entries()).map(([role, proficiency]) =>
        declareSkill(tribeId, identity.pub, role, proficiency)
      )
      await Promise.all(promises)
      await navigate({ to: '/tribe/$tribeId', params: { tribeId } })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-forest-400 text-sm animate-pulse">Loading your skills...</div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Back to Tribe
      </Link>

      <h2 className="text-xl font-bold text-gray-100 mb-1">Declare Your Skills</h2>
      <p className="text-gray-500 text-sm mb-6">
        Select all roles that apply. Be honest — this data drives the tribe's survivability score.
      </p>

      <div className="space-y-6">
        {ALL_ROLES_BY_TIER.map((roles, tierIdx) => (
          <div key={tierIdx}>
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">
              {TIER_LABELS[tierIdx]}
            </h3>
            <div className="space-y-2">
              {roles.map(meta => {
                const isSelected = selected.has(meta.role)
                const isExpanded = expandedRole === meta.role
                const currentProficiency = selected.get(meta.role)

                return (
                  <div
                    key={meta.role}
                    className={`rounded-xl border transition-colors overflow-hidden ${
                      isSelected
                        ? 'border-forest-500 bg-forest-900'
                        : 'border-forest-800 bg-forest-950'
                    }`}
                  >
                    {/* Role row */}
                    <button
                      className="w-full text-left p-3 flex items-center gap-3"
                      onClick={() => toggleRole(meta.role)}
                    >
                      <span className="text-xl leading-none">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-100">{meta.label}</div>
                        <div className="text-xs text-gray-500 truncate">{meta.description}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSelected && currentProficiency && (
                          <span className="text-xs bg-forest-800 text-forest-300 px-2 py-0.5 rounded-full capitalize">
                            {currentProficiency.replace('_', ' ')}
                          </span>
                        )}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-forest-400 bg-forest-400' : 'border-gray-600'
                        }`}>
                          {isSelected && <span className="text-forest-950 text-xs font-bold">✓</span>}
                        </div>
                      </div>
                    </button>

                    {/* Proficiency picker (expanded) */}
                    {isExpanded && isSelected && (
                      <div className="border-t border-forest-800 p-3">
                        <p className="text-xs text-gray-500 mb-2">Proficiency level:</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {PROFICIENCY_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setProficiency(meta.role, opt.value)}
                              className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                                currentProficiency === opt.value
                                  ? 'border-forest-400 bg-forest-800 text-forest-300'
                                  : 'border-forest-800 text-gray-400 hover:border-forest-700'
                              }`}
                            >
                              <div className="font-semibold mb-0.5">{opt.label}</div>
                              <div className="text-gray-500 text-xs leading-snug">{opt.description}</div>
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => deselect(meta.role)}
                          className="text-xs text-danger-400 hover:text-danger-300 mt-2"
                        >
                          Remove this skill
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed save bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-forest-950/95 backdrop-blur border-t border-forest-800">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              {selected.size} skill{selected.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            className="btn-primary w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Skills'}
          </button>
        </div>
      </div>
    </div>
  )
}
