// Voice recording using MediaRecorder API
export async function requestMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(t => t.stop())
    return true
  } catch {
    return false
  }
}

export function createVoiceRecorder(onStop: (base64: string, mimeType: string) => void) {
  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []

  async function start(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'
      recorder = new MediaRecorder(stream, { mimeType })
      chunks = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        stream.getTracks().forEach(t => t.stop())
        blobToBase64(blob).then(base64 => onStop(base64, mimeType))
      }

      recorder.start()
      return true
    } catch {
      return false
    }
  }

  function stop() {
    recorder?.stop()
  }

  function isRecording(): boolean {
    return recorder?.state === 'recording'
  }

  return { start, stop, isRecording }
}

// Photo compression using canvas
export async function compressPhoto(file: File, maxBytes = 500_000): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')

      let { width, height } = img
      const maxDim = 1200

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // Try quality levels until under maxBytes
      let quality = 0.85
      let base64 = canvas.toDataURL('image/jpeg', quality)

      while (base64.length > maxBytes * 1.37 && quality > 0.3) {
        quality -= 0.1
        base64 = canvas.toDataURL('image/jpeg', quality)
      }

      // Strip data URL prefix to get raw base64
      const raw = base64.split(',')[1]
      resolve({ base64: raw, mimeType: 'image/jpeg' })
    }

    img.onerror = reject
    img.src = url
  })
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // strip data URL prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
