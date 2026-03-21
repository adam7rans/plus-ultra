import StepCard from './StepCard'
import type { Flow } from './types'

interface Props {
  flow: Flow
}

export default function FlowView({ flow }: Props) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[13px] text-zinc-600">#{String(flow.id).padStart(2, '0')}</span>
        <h2 className="text-[18px] font-bold text-zinc-100">{flow.title}</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 border border-zinc-700 text-zinc-500 rounded">
          Mode: {flow.mode}
        </span>
      </div>
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-4">{flow.section}</div>
      <p className="text-[12px] text-zinc-400 leading-relaxed mb-8 max-w-[55ch]">{flow.summary}</p>
      <div>
        {flow.steps.map(step => (
          <StepCard key={String(step.n)} step={step} flowId={flow.id} />
        ))}
      </div>
    </div>
  )
}
