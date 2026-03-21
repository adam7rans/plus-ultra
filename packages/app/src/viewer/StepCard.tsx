import PhoneFrame from './PhoneFrame'
import type { Step } from './types'

interface Props {
  step: Step
  flowId: number
}

export default function StepCard({ step, flowId }: Props) {
  const iframeId = `iframe-${flowId}-${String(step.n).replace(/[^a-zA-Z0-9]/g, '_')}`

  return (
    <div className="flex gap-8 items-start py-8 border-t border-zinc-800 first:border-t-0 first:pt-0">
      <div className="flex-shrink-0">
        {step.manual ? (
          <div className="w-[215px] bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">⚠</div>
            <div className="text-[11px] font-bold text-zinc-200 mb-1.5">Manual Testing Required</div>
            <div className="text-[10px] text-zinc-500 leading-relaxed">{step.manualDesc}</div>
          </div>
        ) : (
          <PhoneFrame
            iframeId={iframeId}
            route={step.route ?? '/'}
            injectIDB={step.injectIDB}
            prefillForm={step.prefillForm}
            gridDown={step.gridDown}
            gridDownKey={step.gridDownKey}
            gridDownValue={step.gridDownValue}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-[55ch] pt-1">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">
          Step {step.n}
        </div>
        <div className="text-[12px] font-bold text-zinc-100 mb-1">{step.screen}</div>
        <div className="text-[11px] text-zinc-400 leading-relaxed mb-2">{step.desc}</div>

        {step.note && (
          <div className="text-[11px] text-yellow-400 bg-yellow-950/30 border border-yellow-900/40 rounded px-3 py-2 leading-relaxed mb-2">
            ⚠ {step.note}
          </div>
        )}
        {step.injectIDB && (
          <div className="text-[11px] text-yellow-300/70 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 leading-relaxed mb-2">
            ⬡ Tap "Seed Data" to write dummy IDB records and reload.
          </div>
        )}
        {step.prefillForm && (
          <div className="text-[11px] text-blue-300/70 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 leading-relaxed mb-2">
            ✏ Tap "Pre-fill" after the form loads to populate fields via React setter.
          </div>
        )}
        {step.gridDown && (
          <div className="text-[11px] text-amber-300/70 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 leading-relaxed mb-2">
            ⚡ Tap "Inject Offline" to set localStorage and simulate offline conditions.
          </div>
        )}

        <div className="flex gap-1.5 items-start text-[11px] mt-1">
          <span className="text-zinc-600 flex-shrink-0 mt-0.5">▶</span>
          <span className="text-zinc-300 leading-relaxed">{step.action}</span>
        </div>
      </div>
    </div>
  )
}
