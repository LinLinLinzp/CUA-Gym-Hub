import { acceptedMime } from '../data/media.js'
import { withSid } from './dataManager.js'

async function imageSize(file, mime) {
  if (!mime.startsWith('image/')) return { width: null, height: null }
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    bitmap.close()
    return { width, height }
  } catch { return { width: null, height: null } }
}

export async function uploadFile(file) {
  const mime = acceptedMime(file)
  if (!mime) throw new Error('Choose a supported image, PDF, audio, or video file.')
  if (!file.size) throw new Error('The file is empty.')
  const form = new FormData()
  form.append('file', file.type === mime ? file : file.slice(0, file.size, mime), file.name)
  let response
  try {
    response = await fetch(withSid('/upload'), { method: 'POST', body: form })
  } catch { throw new Error('Could not reach the upload service.') }
  const result = await response.json().catch(() => null)
  const remote = result?.files?.[0]
  if (!response.ok || !remote?.url?.startsWith('/files/') || typeof remote.original_name !== 'string' || !Number.isInteger(remote.size)) {
    throw new Error(result?.error || 'The file could not be uploaded.')
  }
  return { file: { ...remote, content_type: remote.content_type || mime }, ...await imageSize(file, mime) }
}
