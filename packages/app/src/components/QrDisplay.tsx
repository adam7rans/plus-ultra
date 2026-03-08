import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  value: string
  onShown?: () => void
}

export default function QrDisplay({ value, onShown }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: 280,
      margin: 2,
      color: { dark: '#1A3A2A', light: '#F9FAF8' }
    }).then(() => {
      onShown?.()
    }).catch(err => {
      setError(String(err))
    })
  }, [value, onShown])

  if (error) {
    return <p className="text-danger-400 text-sm">Failed to generate QR: {error}</p>
  }

  return <canvas ref={canvasRef} className="rounded-lg" />
}
