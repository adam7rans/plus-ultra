/**
 * AppSegmented — single-select pill group (the Proposals filter pattern).
 */
export default function AppSegmented<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  labels?: Partial<Record<T, string>>
}) {
  return (
    <div className="flex gap-1 bg-forest-900/50 rounded-lg p-1" role="tablist">
      {options.map((opt) => (
        <button
          key={opt}
          role="tab"
          aria-selected={value === opt}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
            value === opt ? 'bg-forest-700 text-white' : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => onChange(opt)}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}
