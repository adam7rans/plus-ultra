import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { declareSkill } from '../lib/skills'
import { updateMemberProfile } from '../lib/tribes'
import { DOMAIN_META, ROLES_BY_DOMAIN } from '../lib/roles'
import type { SkillDomain, SkillRole, ProficiencyLevel, MemberType } from '@plus-ultra/core'
import { getSpecializationsForRole } from '@plus-ultra/core'

const ALL_DOMAINS = Object.keys(DOMAIN_META) as SkillDomain[]

const MEMBER_TYPES: { value: MemberType; label: string; icon: string }[] = [
  { value: 'adult', label: 'Adult', icon: '🧑' },
  { value: 'elder', label: 'Elder', icon: '👴' },
  { value: 'child', label: 'Child', icon: '👦' },
  { value: 'dependent', label: 'Dependent', icon: '🤲' },
]

const PROFICIENCY_OPTIONS: { value: ProficiencyLevel; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
  { value: 'verified_expert', label: 'Verified Expert' },
]

const EXPERIENCE_OPTIONS = ['< 1 year', '1–3 years', '3–7 years', '7–15 years', '15+ years']

const AVAILABILITY_OPTIONS = [
  { value: 'full-time', label: 'Full-time', icon: '🕐' },
  { value: 'part-time', label: 'Part-time', icon: '🕑' },
  { value: 'on-call', label: 'On-call', icon: '📟' },
]

interface RoleSelection {
  proficiency: ProficiencyLevel
  experience: string
  specializations: string[]
}

type WizardStep = 'profile' | 'domains' | 'skills' | 'availability' | 'review'
const STEPS: WizardStep[] = ['profile', 'domains', 'skills', 'availability', 'review']

export default function OnboardingScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/onboarding' })
  const { identity, saveDisplayName } = useIdentity()
  const navigate = useNavigate()

  // Step tracking
  const [currentStep, setCurrentStep] = useState<WizardStep>('profile')
  const [currentDomainIdx, setCurrentDomainIdx] = useState(0)

  // Step 1: Profile
  const [displayName, setDisplayName] = useState(identity?.displayName ?? '')
  const [memberType, setMemberType] = useState<MemberType | null>(null)
  const [, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [bio, setBio] = useState('')

  // Step 2: Domains
  const [selectedDomains, setSelectedDomains] = useState<SkillDomain[]>([])

  // Step 3: Skills per role
  const [roleSelections, setRoleSelections] = useState<Map<SkillRole, RoleSelection>>(new Map())
  const [expandedRole, setExpandedRole] = useState<SkillRole | null>(null)

  // Step 4: Availability
  const [availability, setAvailability] = useState<string | null>(null)
  const [limitations, setLimitations] = useState('')
  const [notes, setNotes] = useState('')

  // Submission
  const [saving, setSaving] = useState(false)

  const stepIndex = STEPS.indexOf(currentStep)

  // -- Navigation helpers --
  function canGoNext(): boolean {
    switch (currentStep) {
      case 'profile':
        return displayName.trim().length > 0 && memberType !== null
      case 'domains':
        return selectedDomains.length > 0
      case 'skills':
        return true
      case 'availability':
        return availability !== null
      case 'review':
        return true
    }
  }

  function goNext() {
    if (currentStep === 'skills') {
      if (currentDomainIdx < selectedDomains.length - 1) {
        setCurrentDomainIdx(currentDomainIdx + 1)
        setExpandedRole(null)
        return
      }
    }
    const next = STEPS[stepIndex + 1]
    if (next) {
      setCurrentStep(next)
      if (next === 'skills') {
        setCurrentDomainIdx(0)
        setExpandedRole(null)
      }
    }
  }

  function goBack() {
    if (currentStep === 'skills' && currentDomainIdx > 0) {
      setCurrentDomainIdx(currentDomainIdx - 1)
      setExpandedRole(null)
      return
    }
    const prev = STEPS[stepIndex - 1]
    if (prev) setCurrentStep(prev)
  }

  // -- Photo handling --
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // -- Domain toggle --
  function toggleDomain(domain: SkillDomain) {
    setSelectedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    )
  }

  // -- Role toggle --
  function toggleRole(role: SkillRole) {
    setRoleSelections(prev => {
      const next = new Map(prev)
      if (next.has(role)) {
        next.delete(role)
        if (expandedRole === role) setExpandedRole(null)
      } else {
        next.set(role, { proficiency: 'intermediate', experience: '', specializations: [] })
        setExpandedRole(role)
      }
      return next
    })
  }

  function updateRole(role: SkillRole, update: Partial<RoleSelection>) {
    setRoleSelections(prev => {
      const next = new Map(prev)
      const existing = next.get(role)
      if (existing) next.set(role, { ...existing, ...update })
      return next
    })
  }

  function toggleSpecialization(role: SkillRole, spec: string) {
    const sel = roleSelections.get(role)
    if (!sel) return
    const specs = sel.specializations.includes(spec)
      ? sel.specializations.filter(s => s !== spec)
      : [...sel.specializations, spec]
    updateRole(role, { specializations: specs })
  }

  // -- Submit --
  async function handleSubmit() {
    if (!identity) return
    setSaving(true)
    try {
      await saveDisplayName(displayName.trim())

      // Persist profile fields collected in onboarding steps 1 + 4
      // Map UI availability value (hyphenated) to the type value (underscored)
      const availabilityMap: Record<string, 'full_time' | 'part_time' | 'on_call'> = {
        'full-time': 'full_time',
        'part-time': 'part_time',
        'on-call': 'on_call',
      }
      await updateMemberProfile(tribeId, identity.pub, {
        bio: bio.trim() || undefined,
        photo: photoPreview ?? undefined,
        availability: availability ? (availabilityMap[availability] ?? undefined) : undefined,
        physicalLimitations: limitations.trim() || undefined,
        memberType: memberType ?? 'adult',
      })

      // Persist skills with specializations + experience
      const promises = Array.from(roleSelections.entries()).map(([role, sel]) =>
        declareSkill(tribeId, identity.pub, role, sel.proficiency, {
          specializations: sel.specializations.length ? sel.specializations : undefined,
          yearsExperience: sel.experience || undefined,
        })
      )
      await Promise.all(promises)

      await navigate({ to: '/tribe/$tribeId', params: { tribeId } })
    } finally {
      setSaving(false)
    }
  }

  // -- Derived --
  const currentDomain = selectedDomains[currentDomainIdx]
  const currentDomainRoles = currentDomain ? ROLES_BY_DOMAIN[currentDomain] : []
  const domainRoleCounts = selectedDomains.map(d => ({
    domain: d,
    count: ROLES_BY_DOMAIN[d].filter(r => roleSelections.has(r.role)).length,
  }))

  // -- Render helpers --
  function renderStepDots() {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === stepIndex ? 'bg-forest-400' : i < stepIndex ? 'bg-forest-600' : 'bg-forest-800'
            }`}
          />
        ))}
      </div>
    )
  }

  function renderProfile() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 mb-1">Welcome to the Tribe</h2>
          <p className="text-gray-500 text-sm">Tell us about yourself.</p>
        </div>

        <div>
          <label className="label">Display Name *</label>
          <input
            type="text"
            className="input"
            placeholder="Your name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Member Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {MEMBER_TYPES.map(mt => (
              <button
                key={mt.value}
                onClick={() => setMemberType(mt.value)}
                className={`p-4 rounded-xl border text-center transition-colors ${
                  memberType === mt.value
                    ? 'border-forest-400 bg-forest-900 text-gray-100'
                    : 'border-forest-800 bg-forest-950 text-gray-400 hover:border-forest-700'
                }`}
              >
                <div className="text-2xl mb-1">{mt.icon}</div>
                <div className="text-sm font-semibold">{mt.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Photo (optional)</label>
          <div className="flex items-center gap-4">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-forest-600" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-forest-900 border-2 border-forest-800 flex items-center justify-center text-gray-600 text-xl">
                👤
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-forest-800 file:text-forest-300 file:font-semibold file:cursor-pointer hover:file:bg-forest-700"
            />
          </div>
        </div>

        <div>
          <label className="label">Short Bio (optional)</label>
          <textarea
            className="input"
            rows={2}
            placeholder="A few words about yourself..."
            value={bio}
            onChange={e => setBio(e.target.value)}
          />
        </div>
      </div>
    )
  }

  function renderDomains() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 mb-1">What can you contribute?</h2>
          <p className="text-gray-500 text-sm">Select all domains where you have skills.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ALL_DOMAINS.map(domain => {
            const meta = DOMAIN_META[domain]
            const isSelected = selectedDomains.includes(domain)
            return (
              <button
                key={domain}
                onClick={() => toggleDomain(domain)}
                className={`p-4 rounded-xl border text-center transition-colors ${
                  isSelected
                    ? 'border-forest-400 bg-forest-900 text-gray-100'
                    : 'border-forest-800 bg-forest-950 text-gray-400 hover:border-forest-700'
                }`}
              >
                <div className="text-2xl mb-1">{meta.icon}</div>
                <div className="text-sm font-semibold">{meta.label}</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderSkillsDomain() {
    if (!currentDomain) return null
    const meta = DOMAIN_META[currentDomain]

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{meta.icon}</span>
            <h2 className="text-xl font-bold text-gray-100">{meta.label}</h2>
          </div>
          {selectedDomains.length > 1 && (
            <p className="text-gray-500 text-sm">
              Domain {currentDomainIdx + 1} of {selectedDomains.length}
            </p>
          )}
          <p className="text-gray-500 text-sm mt-1">Select the roles you can fill.</p>
        </div>

        <div className="space-y-2">
          {currentDomainRoles.map(roleSpec => {
            const isSelected = roleSelections.has(roleSpec.role)
            const isExpanded = expandedRole === roleSpec.role
            const sel = roleSelections.get(roleSpec.role)

            const roleSpecializations = getSpecializationsForRole(roleSpec.role)
            const roleSpecs = roleSpecializations?.specializations

            return (
              <div
                key={roleSpec.role}
                className={`rounded-xl border transition-colors overflow-hidden ${
                  isSelected
                    ? 'border-forest-500 bg-forest-900'
                    : 'border-forest-800 bg-forest-950'
                }`}
              >
                <button
                  className="w-full text-left p-3 flex items-center gap-3"
                  onClick={() => {
                    if (isSelected) {
                      setExpandedRole(isExpanded ? null : roleSpec.role)
                    } else {
                      toggleRole(roleSpec.role)
                    }
                  }}
                >
                  <span className="text-xl leading-none">{roleSpec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-100">{roleSpec.label}</div>
                    <div className="text-xs text-gray-500 truncate">{roleSpec.description}</div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    isSelected ? 'border-forest-400 bg-forest-400' : 'border-gray-600'
                  }`}>
                    {isSelected && <span className="text-forest-950 text-xs font-bold">✓</span>}
                  </div>
                </button>

                {isExpanded && isSelected && sel && (
                  <div className="border-t border-forest-800 p-3 space-y-4">
                    {/* Specializations */}
                    {roleSpecs && roleSpecs.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Sub-specialties:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {roleSpecs.map(spec => (
                            <button
                              key={spec.key}
                              onClick={() => toggleSpecialization(roleSpec.role, spec.key)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                sel.specializations.includes(spec.key)
                                  ? 'bg-forest-600 text-forest-100 border border-forest-500'
                                  : 'bg-forest-900 text-gray-400 border border-forest-800 hover:border-forest-700'
                              }`}
                            >
                              {spec.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Experience:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {EXPERIENCE_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            onClick={() => updateRole(roleSpec.role, { experience: opt })}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              sel.experience === opt
                                ? 'bg-forest-600 text-forest-100 border border-forest-500'
                                : 'bg-forest-950 text-gray-400 border border-forest-800 hover:border-forest-700'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Proficiency */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Proficiency:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PROFICIENCY_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => updateRole(roleSpec.role, { proficiency: opt.value })}
                            className={`p-2 rounded-lg border text-xs font-semibold transition-colors ${
                              sel.proficiency === opt.value
                                ? 'border-forest-400 bg-forest-800 text-forest-300'
                                : 'border-forest-800 text-gray-400 hover:border-forest-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleRole(roleSpec.role)}
                      className="text-xs text-danger-400 hover:text-danger-300"
                    >
                      Remove this role
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderAvailability() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 mb-1">Availability</h2>
          <p className="text-gray-500 text-sm">How much time can you give?</p>
        </div>

        <div className="space-y-2">
          {AVAILABILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setAvailability(opt.value)}
              className={`w-full p-4 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                availability === opt.value
                  ? 'border-forest-400 bg-forest-900 text-gray-100'
                  : 'border-forest-800 bg-forest-950 text-gray-400 hover:border-forest-700'
              }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-sm font-semibold">{opt.label}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="label">Physical Limitations (optional)</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. bad knee, limited vision..."
            value={limitations}
            onChange={e => setLimitations(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Anything else the tribe should know? (optional)</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Allergies, special needs, dependents..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>
    )
  }

  function renderReview() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-100 mb-1">Review & Confirm</h2>
          <p className="text-gray-500 text-sm">Make sure everything looks right.</p>
        </div>

        <div className="card space-y-4">
          {/* Profile summary */}
          <div className="flex items-center gap-3">
            {photoPreview ? (
              <img src={photoPreview} alt="Photo" className="w-12 h-12 rounded-full object-cover border-2 border-forest-600" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-forest-800 flex items-center justify-center text-gray-500 text-lg">👤</div>
            )}
            <div>
              <div className="font-semibold text-gray-100">{displayName}</div>
              <div className="text-xs text-gray-500 capitalize">{memberType}</div>
            </div>
          </div>

          {/* Domains & roles */}
          {domainRoleCounts.length > 0 && (
            <div className="border-t border-forest-800 pt-3 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Skills</p>
              {domainRoleCounts.map(({ domain, count }) => {
                const meta = DOMAIN_META[domain]
                const domainRoles = ROLES_BY_DOMAIN[domain].filter(r => roleSelections.has(r.role))
                return (
                  <div key={domain}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{meta.icon}</span>
                      <span className="text-xs font-semibold text-gray-400">{meta.label}</span>
                      <span className="text-xs text-gray-600">({count})</span>
                    </div>
                    <div className="space-y-1 ml-6">
                      {domainRoles.map(r => {
                        const sel = roleSelections.get(r.role)
                        return (
                          <div key={r.role} className="flex items-center gap-2">
                            <span className="text-xs text-gray-300">{r.label}</span>
                            {sel && (
                              <span className="text-xs bg-forest-800 text-forest-300 px-2 py-0.5 rounded-full capitalize">
                                {sel.proficiency.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Availability */}
          {availability && (
            <div className="border-t border-forest-800 pt-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Availability</p>
              <p className="text-sm text-gray-300 capitalize">{availability}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // -- Main render --
  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-28">
      {renderStepDots()}

      {currentStep === 'profile' && renderProfile()}
      {currentStep === 'domains' && renderDomains()}
      {currentStep === 'skills' && renderSkillsDomain()}
      {currentStep === 'availability' && renderAvailability()}
      {currentStep === 'review' && renderReview()}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-forest-950/95 backdrop-blur border-t border-forest-800">
        <div className="max-w-md mx-auto flex gap-3">
          {stepIndex > 0 && (
            <button className="btn-secondary flex-1" onClick={goBack}>
              ← Back
            </button>
          )}
          {currentStep === 'review' ? (
            <button
              className="btn-primary flex-1"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Joining...' : 'Join Tribe'}
            </button>
          ) : currentStep === 'skills' && currentDomainIdx < selectedDomains.length - 1 ? (
            <button className="btn-primary flex-1" onClick={goNext}>
              Next Domain →
            </button>
          ) : (
            <button
              className="btn-primary flex-1"
              onClick={goNext}
              disabled={!canGoNext()}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
