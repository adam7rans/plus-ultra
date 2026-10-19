import {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react'

const INPUT_CLS =
  'bg-forest-950 border border-forest-700 focus:border-forest-500 text-gray-100 placeholder-gray-500 rounded-lg px-4 py-3 w-full outline-none transition-colors duration-150 disabled:opacity-50'

/** AppField — label + control + optional hint/error block. */
export function AppField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <div>
      <label className="text-sm font-medium text-forest-300 mb-1 block">
        {label} {required && <span className="text-danger-400">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger-400 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-600 mt-1">{hint}</p>
      ) : null}
    </div>
  )
}

export function AppInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLS} ${props.className ?? ''}`} />
}

export function AppTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${INPUT_CLS} ${props.className ?? ''}`} />
}

export function AppSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${INPUT_CLS} appearance-none pr-10 ${props.className ?? ''}`} />
  )
}
