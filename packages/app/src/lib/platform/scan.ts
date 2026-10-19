/**
 * platform/scan.ts — Phase 1 QR/camera-scan abstraction.
 *
 * Isolates the two web APIs CameraQrScanner uses directly:
 *   1. `navigator.mediaDevices.getUserMedia` (camera stream)
 *   2. `jsqr` (frame decoding)
 *
 * Web behavior unchanged. Phase 3 swaps the internals for
 * `@capacitor-mlkit/barcode-scanning` when `isNative()` — call sites
 * keep calling `requestCameraStream` / `decodeQrFromImageData` / `stopStream`.
 */

import jsQR from 'jsqr'

export interface QrResult {
  data: string
}

/** Acquire a rear-facing camera stream. Throws with a user-facing message on denial. */
export async function requestCameraStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
  } catch {
    throw new Error('Camera access denied or unavailable')
  }
}

/** Stop every track of a stream acquired via requestCameraStream. */
export function stopStream(stream: MediaStream | null): void {
  if (!stream) return
  stream.getTracks().forEach((t) => t.stop())
}

/**
 * Decode a QR code from raw camera frame pixels.
 * Returns null when no code is visible in this frame.
 */
export function decodeQrFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): QrResult | null {
  const code = jsQR(data, width, height)
  return code?.data ? { data: code.data } : null
}
