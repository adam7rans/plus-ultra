interface Props {
  score: number
  hasCriticalGap: boolean
}

function scoreColor(score: number, hasCriticalGap: boolean): string {
  if (hasCriticalGap || score < 25) return 'text-danger-400'
  if (score < 50) return 'text-warning-400'
  if (score < 75) return 'text-yellow-300'
  return 'text-forest-300'
}

function scoreBg(score: number, hasCriticalGap: boolean): string {
  if (hasCriticalGap || score < 25) return 'border-danger-700/50 bg-danger-900/10'
  if (score < 50) return 'border-warning-700/50 bg-warning-700/5'
  if (score < 75) return 'border-yellow-700/50'
  return 'border-forest-700/50 bg-forest-900/20'
}

function scoreLabel(score: number, hasCriticalGap: boolean): string {
  if (hasCriticalGap) return 'Critical gap — tribe cannot survive'
  if (score === 0) return 'No skills declared yet'
  if (score < 25) return 'Very low — critical buckets empty'
  if (score < 50) return 'Low — significant gaps remain'
  if (score < 75) return 'Moderate — improving'
  if (score < 90) return 'Good — most buckets filled'
  return 'Strong — well-rounded tribe'
}

export default function SurvivabilityScore({ score, hasCriticalGap }: Props) {
  return (
    <div className={`card border ${scoreBg(score, hasCriticalGap)}`}>
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-xs text-gray-300 uppercase tracking-widest mb-1">
            Survivability Score
          </div>
          <div className={`text-6xl font-bold font-mono leading-none ${scoreColor(score, hasCriticalGap)}`}>
            {score}
            <span className="text-3xl">%</span>
          </div>
        </div>
        {hasCriticalGap && (
          <div className="text-2xl animate-pulse">⚠</div>
        )}
      </div>
      <p className={`text-xs mt-2 ${scoreColor(score, hasCriticalGap)}`}>
        {scoreLabel(score, hasCriticalGap)}
      </p>
    </div>
  )
}
