import { useEffect, useRef, useState } from 'react'
import { requestCameraStream, stopStream, decodeQrFromImageData } from '../lib/platform/scan'
import { AppButton, AppCard } from './ui'

interface Props {
  onScan: (data: string) => void
  onClose: () => void
}

export default function CameraQrScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    function scan() {
      if (cancelled) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(scan)
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = decodeQrFromImageData(imageData.data, imageData.width, imageData.height)
      if (code?.data) {
        onScan(code.data)
        return
      }
      animFrameRef.current = requestAnimationFrame(scan)
    }

    async function start() {
      try {
        const stream = await requestCameraStream()
        if (cancelled) { stopStream(stream); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        scan()
      } catch {
        setError('Camera access denied or unavailable')
      }
    }

    void start()

    return () => {
      cancelled = true
      cancelAnimationFrame(animFrameRef.current)
      stopStream(streamRef.current)
    }
  }, [onScan])

  if (error) {
    return (
      <AppCard className="border-danger-700 text-center py-8">
        <p className="text-danger-400 text-sm mb-4">{error}</p>
        <AppButton variant="secondary" fullWidth onClick={onClose}>Close</AppButton>
      </AppCard>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden bg-black">
      <video ref={videoRef} className="w-full" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      {/* targeting overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-52 h-52 border-2 border-forest-400 rounded-xl opacity-80" />
      </div>
      <AppButton
        variant="ghost"
        size="sm"
        className="absolute top-3 right-3"
        onClick={onClose}
      >
        Cancel
      </AppButton>
      <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-gray-400">
        Point at the invite QR code
      </p>
    </div>
  )
}
