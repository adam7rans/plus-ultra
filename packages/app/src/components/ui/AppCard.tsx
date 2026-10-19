import type { ReactNode } from 'react'

/** AppCard — standard surface. Same look as the legacy `.card` class. */
export default function AppCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-forest-900 border border-forest-800 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}
