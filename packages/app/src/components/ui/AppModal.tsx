import type { ReactNode } from 'react'
import AppIcon, { type AppIconName } from '../AppIcon'
import AppButton from './AppButton'

/**
 * AppModal — centered card dialog (the pattern every modal in the app uses).
 * Backdrop tap does NOT dismiss (destructive flows); use the X / actions.
 */
export default function AppModal({
  title,
  icon,
  tone = 'default',
  onClose,
  children,
  wide,
}: {
  title: string
  icon?: AppIconName
  tone?: 'default' | 'danger'
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const titleColor = tone === 'danger' ? 'text-danger-400' : 'text-gray-100'
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={`${wide ? 'max-w-md' : 'max-w-sm'} w-full mx-4 bg-forest-900 border rounded-xl p-4 max-h-[85vh] overflow-y-auto ${
          tone === 'danger' ? 'border-danger-500/50' : 'border-forest-800'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-bold flex items-center gap-1.5 ${titleColor}`}>
            {icon && <AppIcon name={icon} size={16} />}
            {title}
          </h3>
          <AppButton variant="icon" icon="close" iconSize={16} onClick={onClose} aria-label="Close" />
        </div>
        {children}
      </div>
    </div>
  )
}
