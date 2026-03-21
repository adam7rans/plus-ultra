import type { PrefillField } from '../types'

export function prefillFormFields(
  iframe: HTMLIFrameElement,
  fields: PrefillField[],
  onDone: (msg: string, isError?: boolean) => void,
): void {
  function doFill() {
    try {
      const iwin = iframe.contentWindow as Window & typeof globalThis
      const doc = iwin.document
      let count = 0
      for (const f of fields) {
        const elem = doc.querySelector(f.selector) as HTMLElement | null
        if (!elem) continue
        if (f.type === 'click') {
          elem.click()
        } else if (elem instanceof iwin.HTMLSelectElement) {
          const d = Object.getOwnPropertyDescriptor(iwin.HTMLSelectElement.prototype, 'value')
          d?.set?.call(elem, f.value ?? '')
          elem.dispatchEvent(new iwin.Event('change', { bubbles: true }))
        } else if (elem instanceof iwin.HTMLTextAreaElement) {
          const d = Object.getOwnPropertyDescriptor(iwin.HTMLTextAreaElement.prototype, 'value')
          d?.set?.call(elem, f.value ?? '')
          elem.dispatchEvent(new iwin.Event('input', { bubbles: true }))
        } else if (elem instanceof iwin.HTMLInputElement) {
          const d = Object.getOwnPropertyDescriptor(iwin.HTMLInputElement.prototype, 'value')
          d?.set?.call(elem, f.value ?? '')
          elem.dispatchEvent(new iwin.Event('input', { bubbles: true }))
        }
        count++
      }
      onDone(`Pre-filled ${count}/${fields.length} field(s)`)
    } catch (e) {
      onDone(`Pre-fill failed: ${(e as Error).message}`, true)
    }
  }

  const doc = iframe.contentDocument
  if (doc?.readyState === 'complete') {
    doFill()
  } else {
    iframe.addEventListener('load', doFill, { once: true })
  }
}
