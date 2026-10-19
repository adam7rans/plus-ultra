import type { ReactNode } from 'react'

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'gray'

const TONES: Record<Tone, string> = {
  neutral: 'bg-forest-800 text-forest-300',
  green: 'bg-accent-700/40 text-accent-300 border border-accent-700/50',
  // NOTE: warning/danger scales only define 700/500/400 (+danger 900), so
  // tones below use 700 with opacity. (Old code referenced warning-900 and
  // danger-800, which don't exist and silently rendered unstyled.)
  red: 'bg-danger-900/40 text-danger-300 border border-danger-700/50',
  amber: 'bg-warning-700/30 text-warning-400 border border-warning-700/40',
  gray: 'bg-forest-900 text-gray-400 border border-forest-800',
}

/** AppBadge — small pill for counts, statuses, tags. */
export default function AppBadge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
