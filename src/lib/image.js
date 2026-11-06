// Shrinks a payment screenshot so it stays small on the phone (about 100 to 200 KB).
export async function compressImage(file, maxDim = 1280, maxBytes = 200000) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  if (bitmap.close) bitmap.close()
  let quality = 0.8
  let url = canvas.toDataURL('image/jpeg', quality)
  while (url.length * 0.75 > maxBytes && quality > 0.35) {
    quality -= 0.1
    url = canvas.toDataURL('image/jpeg', quality)
  }
  return url
}
