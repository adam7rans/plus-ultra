import { useRef, useState } from 'react'

interface Props {
  onScan: (data: string) => void
}

// Simple file-upload based QR scanner as a fallback
// Real camera-based scanning can be added in Sprint 5 polish
export default function QrScanner({ onScan }: Props) {
  const [manualInput, setManualInput] = useState('')
  const [mode, setMode] = useState<'upload' | 'manual'>('upload')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    // Use the browser's BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      try {
        const bd = new (window as unknown as { BarcodeDetector: new (opts: object) => { detect: (img: ImageBitmapSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ['qr_code'] })
        const bitmap = await createImageBitmap(file)
        const barcodes = await bd.detect(bitmap)
        if (barcodes.length > 0) {
          onScan(barcodes[0].rawValue)
          return
        }
      } catch {
        // Fall through to manual
      }
    }
    // Fallback: read file as text (for testing with exported JSON files)
    const text = await file.text()
    onScan(text.trim())
  }

  function handleManualSubmit() {
    if (manualInput.trim()) {
      onScan(manualInput.trim())
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'upload' ? 'bg-forest-700 text-white' : 'border border-forest-700 text-gray-400'}`}
          onClick={() => setMode('upload')}
        >
          Upload QR Image
        </button>
        <button
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-forest-700 text-white' : 'border border-forest-700 text-gray-400'}`}
          onClick={() => setMode('manual')}
        >
          Paste Backup Data
        </button>
      </div>

      {mode === 'upload' && (
        <div
          className="card border-dashed border-2 border-forest-700 flex flex-col items-center justify-center py-8 cursor-pointer hover:border-forest-500 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-4xl mb-3">📷</div>
          <p className="text-gray-400 text-sm">Tap to select QR code image</p>
          <p className="text-gray-600 text-xs mt-1">PNG, JPG accepted</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
        </div>
      )}

      {mode === 'manual' && (
        <div>
          <label className="label">Paste backup JSON</label>
          <textarea
            className="input h-32 font-mono text-xs resize-none"
            placeholder='{"pub":"...","priv":"...","epub":"...","epriv":"..."}'
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
          />
          <button
            className="btn-primary w-full mt-3"
            onClick={handleManualSubmit}
            disabled={!manualInput.trim()}
          >
            Restore Identity
          </button>
        </div>
      )}
    </div>
  )
}
