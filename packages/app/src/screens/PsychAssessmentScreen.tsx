import { useState } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { saveQuizResult } from '../lib/psych'
import type { PsychProfile, PsychArchetype } from '@plus-ultra/core'

// ─── Quiz definitions ─────────────────────────────────────────────────────────

type QuestionType = 'scenario' | 'forced'

interface Question {
  id: string
  type: QuestionType
  prompt: string
  options: { key: 'A' | 'B' | 'C' | 'D'; label: string }[]
}

const QUESTIONS: Question[] = [
  // Scenario questions
  {
    id: 'S1', type: 'scenario',
    prompt: 'The tribe needs someone to represent you at a critical inter-group meeting tomorrow. What do you do?',
    options: [
      { key: 'A', label: 'Volunteer to go yourself — you want to be in the room where it happens' },
      { key: 'B', label: 'Delegate to the most experienced person available' },
      { key: 'C', label: 'Suggest the decision be made together as a group' },
      { key: 'D', label: 'Offer to prepare a briefing but let someone else go' },
    ],
  },
  {
    id: 'S2', type: 'scenario',
    prompt: 'The perimeter alarm fires at 3 AM — unknown cause. What\'s your first move?',
    options: [
      { key: 'A', label: 'Grab gear and move to investigate immediately' },
      { key: 'B', label: 'Alert the watch team and coordinate a response' },
      { key: 'C', label: 'Wake the leadership and wait for instruction' },
      { key: 'D', label: 'Monitor from a safe position while others respond' },
    ],
  },
  {
    id: 'S3', type: 'scenario',
    prompt: 'Two tribe members are in a heated argument that\'s drawing a crowd. You\'re nearby.',
    options: [
      { key: 'A', label: 'Step in directly — de-escalate or separate them now' },
      { key: 'B', label: 'Get an elder or authority figure to handle it' },
      { key: 'C', label: 'Stay close and observe — only intervene if it turns physical' },
      { key: 'D', label: 'Give them space — they need to work it out themselves' },
    ],
  },
  {
    id: 'S4', type: 'scenario',
    prompt: 'Supplies are critically low. A risky foraging mission could restock — but someone might get hurt.',
    options: [
      { key: 'A', label: 'Organize the mission immediately — the risk is worth it' },
      { key: 'B', label: 'Send a small scouting party first to assess' },
      { key: 'C', label: 'Implement strict rationing while exploring safer alternatives' },
      { key: 'D', label: 'Wait — conditions may improve without the risk' },
    ],
  },
  {
    id: 'S5', type: 'scenario',
    prompt: 'Three critical problems hit at once: medical emergency, equipment failure, and a security breach. You\'re the senior person available.',
    options: [
      { key: 'A', label: 'Quickly triage — assign people to each problem and coordinate' },
      { key: 'B', label: 'Focus on the most life-threatening issue first; delegate the rest' },
      { key: 'C', label: 'Take a moment to think clearly before acting' },
      { key: 'D', label: 'Call for help and wait for backup before making decisions' },
    ],
  },
  {
    id: 'S6', type: 'scenario',
    prompt: 'After an exhausting week, you have an unexpected free afternoon. How do you recharge?',
    options: [
      { key: 'A', label: 'Join the group gathering — being around people energizes you' },
      { key: 'B', label: 'Help someone with a project — staying productive feels restorative' },
      { key: 'C', label: 'Find a quiet corner to read, think, or rest alone' },
      { key: 'D', label: 'Take a walk outside, just you and your thoughts' },
    ],
  },
  {
    id: 'S7', type: 'scenario',
    prompt: 'You find an unregistered cache of supplies in an obscure location. What do you do?',
    options: [
      { key: 'A', label: 'Secure it and report to leadership immediately' },
      { key: 'B', label: 'Assess what it contains and decide whether to report based on contents' },
      { key: 'C', label: 'Report it immediately without touching anything' },
      { key: 'D', label: 'Leave it and tell one trusted person about it first' },
    ],
  },
  {
    id: 'S8', type: 'scenario',
    prompt: 'You proposed a major change and it was voted down. You still believe it was the right call.',
    options: [
      { key: 'A', label: 'Accept the outcome and move on — the group has spoken' },
      { key: 'B', label: 'Ask for feedback and refine the proposal before resubmitting' },
      { key: 'C', label: 'Push back — make the case again with more evidence' },
      { key: 'D', label: 'Implement what you can within your own domain regardless' },
    ],
  },
  {
    id: 'S9', type: 'scenario',
    prompt: 'A new member joins the tribe. You\'re one of the first to encounter them.',
    options: [
      { key: 'A', label: 'Introduce yourself right away and offer to show them around' },
      { key: 'B', label: 'Welcome them, then connect them with the relevant lead' },
      { key: 'C', label: 'Observe them for a bit before making introductions' },
      { key: 'D', label: 'Wait for them to approach you when they\'re ready' },
    ],
  },
  {
    id: 'S10', type: 'scenario',
    prompt: 'An unconfirmed report says a threat is approaching your location. What do you do?',
    options: [
      { key: 'A', label: 'Initiate defensive protocols immediately — assume the threat is real' },
      { key: 'B', label: 'Alert key people and prepare while sending scouts to verify' },
      { key: 'C', label: 'Gather more information before taking any action' },
      { key: 'D', label: 'Consult leadership before doing anything' },
    ],
  },
  // Forced-rank pairs
  {
    id: 'F1', type: 'forced',
    prompt: 'Which describes you better under pressure?',
    options: [
      { key: 'A', label: 'Decide fast, commit fully, adjust if needed' },
      { key: 'B', label: 'Consider all angles first — a wrong decision costs more than a slow one' },
    ],
  },
  {
    id: 'F2', type: 'forced',
    prompt: 'Which leadership style do you naturally gravitate toward?',
    options: [
      { key: 'A', label: 'Leader sets clear direction and the team executes' },
      { key: 'B', label: 'Leader builds consensus — the best decision emerges from the group' },
    ],
  },
  {
    id: 'F3', type: 'forced',
    prompt: 'When planning, which do you prefer?',
    options: [
      { key: 'A', label: 'Predictable outcomes and steady, reliable progress' },
      { key: 'B', label: 'Bold moves with bigger potential upside, even if riskier' },
    ],
  },
  {
    id: 'F4', type: 'forced',
    prompt: 'Where do you get your energy from?',
    options: [
      { key: 'A', label: 'Being around people — collaboration fuels me' },
      { key: 'B', label: 'Quiet focus time — I do my best work alone' },
    ],
  },
  {
    id: 'F5', type: 'forced',
    prompt: 'When everything is going wrong, you tend to:',
    options: [
      { key: 'A', label: 'Act on instinct — hesitating makes it worse' },
      { key: 'B', label: 'Slow down and think — reactive decisions are costly' },
    ],
  },
  {
    id: 'F6', type: 'forced',
    prompt: 'When conflict arises, your instinct is to:',
    options: [
      { key: 'A', label: 'Address it head-on — avoiding conflict lets it fester' },
      { key: 'B', label: 'Pick battles carefully — not every conflict is worth the cost' },
    ],
  },
  {
    id: 'F7', type: 'forced',
    prompt: 'On decisions with incomplete information:',
    options: [
      { key: 'A', label: 'A good decision now beats a perfect decision later' },
      { key: 'B', label: 'The cost of a wrong decision outweighs the cost of waiting' },
    ],
  },
  {
    id: 'F8', type: 'forced',
    prompt: 'Your preferred approach to improvement:',
    options: [
      { key: 'A', label: 'Try new things — failure is part of growth' },
      { key: 'B', label: 'Refine what works — avoid unnecessary risk' },
    ],
  },
]

// Group questions into steps of ~4 each (for dot indicators)
const STEP_SIZE = 4
const STEP_COUNT = Math.ceil(QUESTIONS.length / STEP_SIZE)

// ─── Archetype metadata ───────────────────────────────────────────────────────

const ARCHETYPE_META: Record<PsychArchetype, { tagline: string; description: string; color: string }> = {
  Commander: {
    tagline: 'Decisive under fire',
    description: 'You act fast when it counts and hold steady under pressure. Others look to you for direction when things get hard. Best deployed leading high-stakes operations where hesitation costs lives.',
    color: 'text-red-400',
  },
  Scout: {
    tagline: 'First in, adapts fast',
    description: 'You thrive at the edge of the known — high risk, high reward. Your decisiveness and appetite for the unknown make you invaluable for reconnaissance and first contact.',
    color: 'text-amber-400',
  },
  Strategist: {
    tagline: 'Thinks three moves ahead',
    description: 'You don\'t rush. You read the landscape, find the angles others miss, and build plans that hold up when conditions change. Your patience is a strategic asset.',
    color: 'text-blue-400',
  },
  Connector: {
    tagline: 'The tribe\'s social backbone',
    description: 'You build trust, mediate tensions, and hold relationships together. Your collaborative nature and social energy make you the person others come to when morale needs lifting.',
    color: 'text-green-400',
  },
  Planner: {
    tagline: 'Steady, methodical, reliable',
    description: 'You\'re the person who makes sure nothing falls through the cracks. Cautious, thorough, and consistent — you\'re the one who keeps the tribe running day to day.',
    color: 'text-purple-400',
  },
  Sustainer: {
    tagline: 'Calm center in the storm',
    description: 'You keep people together when pressure peaks. High stress tolerance and collaborative leadership make you the tribe\'s stabilizing force — essential when conflict threatens cohesion.',
    color: 'text-cyan-400',
  },
}

const DIM_LABELS: Record<string, { low: string; high: string }> = {
  decisionSpeed:   { low: 'Deliberate', high: 'Decisive' },
  stressTolerance: { low: 'Reactive', high: 'Resilient' },
  leadershipStyle: { low: 'Directive', high: 'Collaborative' },
  conflictApproach:{ low: 'Avoidant', high: 'Assertive' },
  riskAppetite:    { low: 'Conservative', high: 'Bold' },
  socialEnergy:    { low: 'Introverted', high: 'Extraverted' },
}

const DIM_ORDER = ['decisionSpeed', 'stressTolerance', 'leadershipStyle', 'conflictApproach', 'riskAppetite', 'socialEnergy'] as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function PsychAssessmentScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/psych/assessment' })
  const { identity } = useIdentity()
  const navigate = useNavigate()

  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<PsychProfile | null>(null)

  const question = QUESTIONS[currentQ]
  const currentStep = Math.floor(currentQ / STEP_SIZE)
  const answered = answers[question?.id]
  const isLast = currentQ === QUESTIONS.length - 1

  function handleAnswer(key: 'A' | 'B' | 'C' | 'D') {
    setAnswers(prev => ({ ...prev, [question.id]: key }))
  }

  function goNext() {
    if (isLast) return
    setCurrentQ(prev => prev + 1)
  }

  function goBack() {
    if (currentQ === 0) return
    setCurrentQ(prev => prev - 1)
  }

  async function handleSave() {
    if (!identity || saving) return
    setSaving(true)
    try {
      const profile = await saveQuizResult(tribeId, identity.pub, answers)
      setResult(profile)
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    const meta = ARCHETYPE_META[result.archetype]
    return (
      <div className="max-w-md mx-auto px-4 py-8 pb-24">
        <Link
          to="/tribe/$tribeId/psych"
          params={{ tribeId }}
          className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
        >
          ← Psychology
        </Link>

        <div className="card mb-4">
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold mb-1 ${meta.color}`}>{result.archetype}</div>
            <div className="text-gray-400 text-sm">{meta.tagline}</div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed mb-6">{meta.description}</p>

          <div className="space-y-3">
            {DIM_ORDER.map(dim => {
              const val = result.dimensions[dim]
              const labels = DIM_LABELS[dim]
              return (
                <div key={dim}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{labels.low}</span>
                    <span>{labels.high}</span>
                  </div>
                  <div className="w-full bg-forest-950 rounded-full h-2">
                    <div
                      className="bg-forest-500 h-2 rounded-full transition-all"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <button
          className="btn-primary w-full"
          onClick={() => navigate({ to: '/tribe/$tribeId/psych', params: { tribeId } })}
        >
          View Tribe Psychology
        </button>
      </div>
    )
  }

  if (!question) return null

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <Link
        to="/tribe/$tribeId/psych"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        ← Psychology
      </Link>

      {/* Step dots */}
      <div className="flex gap-1.5 justify-center mb-6">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i < currentStep
                ? 'bg-forest-500 w-4'
                : i === currentStep
                  ? 'bg-forest-400 w-6'
                  : 'bg-forest-900 w-4'
            }`}
          />
        ))}
      </div>

      {/* Progress */}
      <div className="text-xs text-gray-500 text-center mb-4">
        {currentQ + 1} / {QUESTIONS.length}
      </div>

      {/* Question */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-gray-200 leading-relaxed mb-4">
          {question.prompt}
        </p>

        {question.type === 'forced' ? (
          <div className="grid grid-cols-1 gap-2">
            {question.options.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleAnswer(opt.key)}
                className={`p-4 rounded-lg border text-sm text-left transition-colors ${
                  answered === opt.key
                    ? 'border-forest-500 bg-forest-900/50 text-forest-200'
                    : 'border-forest-800 text-gray-300 hover:border-forest-600 hover:text-gray-200'
                }`}
              >
                <span className="font-semibold text-forest-400 mr-2">{opt.key}</span>
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {question.options.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleAnswer(opt.key)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                  answered === opt.key
                    ? 'border-forest-500 bg-forest-900/50 text-forest-200'
                    : 'border-forest-800 text-gray-300 hover:border-forest-600 hover:text-gray-200'
                }`}
              >
                <span className="font-semibold text-forest-400 mr-2">{opt.key}.</span>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <button
          className="btn-secondary flex-1"
          onClick={goBack}
          disabled={currentQ === 0}
        >
          Back
        </button>
        {isLast ? (
          <button
            className="btn-primary flex-1"
            onClick={handleSave}
            disabled={!answered || saving}
          >
            {saving ? 'Saving...' : 'See Results'}
          </button>
        ) : (
          <button
            className="btn-primary flex-1"
            onClick={goNext}
            disabled={!answered}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
