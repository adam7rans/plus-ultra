import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import AppIcon, { type AppIconName } from '../AppIcon'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  // Green CTA — the only green-on-dark fill in the kit.
  primary: 'bg-accent-500 hover:bg-accent-400 text-white',
  secondary: 'border border-forest-600 hover:border-forest-400 text-forest-300',
  danger: 'bg-danger-700 hover:bg-danger-500 text-white',
  ghost: 'text-gray-400 hover:text-gray-200 hover:bg-forest-800',
  icon: 'text-gray-500 hover:text-forest-400 flex-shrink-0',
}

const SIZES: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** Ignored for variant="icon" (fixed 44px touch target). */
  size?: Size
  icon?: AppIconName
  iconSize?: number
  loading?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

/**
 * AppButton — the only button in the app.
 * Replaces .btn-primary/.btn-secondary/.btn-danger plus ~200 bespoke
 * Tailwind button strings. Visuals match the old classes 1:1.
 */
export default function AppButton({
  variant = 'primary',
  size = 'md',
  icon,
  iconSize,
  loading,
  fullWidth,
  className = '',
  disabled,
  children,
  ...rest
}: Props) {
  if (variant === 'icon') {
    return (
      <button
        className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-lg transition-colors active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${VARIANTS.icon} ${className}`}
        disabled={disabled || loading}
        {...rest}
      >
        {icon && <AppIcon name={icon} size={iconSize ?? 20} />}
        {children}
      </button>
    )
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin flex-shrink-0" />
      )}
      {icon && <AppIcon name={icon} size={iconSize ?? 18} />}
      {children}
    </button>
  )
}
