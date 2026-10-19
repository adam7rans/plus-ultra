import type { ReactNode } from 'react'
import AppIcon, { type AppIconName } from '../AppIcon'

/** AppEmptyState — centered icon + title + body for empty lists. */
export default function AppEmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: AppIconName
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="text-gray-600 mb-3">
        <AppIcon name={icon} size={48} />
      </div>
      <p className="text-gray-300 text-sm font-medium">{title}</p>
      {body && <p className="text-gray-600 text-xs mt-1">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
