import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

// True only inside the installed Android app. In a browser this is always false.
export const isNative = () => Capacitor.isNativePlatform()

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Writes the file to the app's cache, then opens Android's share sheet with it attached.
// From there the user can pick WhatsApp, Google Drive ("Save to Drive"), Files, and so on.
export async function shareFileNative({ blob, filename, text, title }) {
  const data = await toBase64(blob)
  const written = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache })
  await Share.share({ title, text, files: [written.uri], dialogTitle: 'Send with' })
}

export function isCancel(err) {
  return /cancel/i.test(String((err && err.message) || err || ''))
}
