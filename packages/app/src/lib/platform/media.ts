/**
 * platform/media.ts — Phase 1 media abstraction.
 *
 * Phase 1: re-export of the existing web implementation (`../media`:
 * getUserMedia + MediaRecorder + canvas compression). Works as-is inside
 * the Capacitor WebView, so native reuses it until Phase 3 adds
 * `@capacitor/camera` / filesystem branches.
 *
 * Capability helpers centralize the `typeof MediaRecorder` /
 * `navigator.mediaDevices` guards previously scattered across
 * DiagnosticsScreen so future native branches land in one place.
 */

export { requestMicPermission, createVoiceRecorder, compressPhoto } from '../media'

import { isNative } from './types'

/** True when the MediaRecorder API exists in this runtime. */
export function hasMediaRecorder(): boolean {
  return typeof MediaRecorder !== 'undefined'
}

/** True when camera/mic capture via getUserMedia is available. */
export function hasGetUserMedia(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

/** MIME support probe — same list DiagnosticsScreen reports on. */
export function isAudioMimeSupported(mimeType: string): boolean {
  try {
    return hasMediaRecorder() && MediaRecorder.isTypeSupported(mimeType)
  } catch {
    return false
  }
}

/** Ordered preference list; first supported entry is used by recorders. */
export function getPreferredAudioMimeTypes(): string[] {
  return [
    'audio/mp4',
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/aac',
  ]
}

export interface NativePhoto {
  base64: string
  mimeType: string
}

/**
 * Native photo picker (Capacitor Camera). Returns null when cancelled,
 * unavailable, or running on web (callers keep the `<input type=file>`
 * path there). The returned base64 feeds the same `onSendPhoto` sinks,
 * so message/roll-call flows are unchanged.
 */
export async function pickNativePhoto(): Promise<NativePhoto | null> {
  if (!isNative()) return null
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
    })
    if (!photo.base64String) return null
    const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg'
    return { base64: photo.base64String, mimeType }
  } catch {
    // user cancelled or plugin unavailable
    return null
  }
}
