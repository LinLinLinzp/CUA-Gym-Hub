import { array } from './model.js'

export const attachmentLimit = 25000000
export const attachmentBytes = files => array(files).reduce((total, file) => total + Math.max(0, Number(file?.size) || 0), 0)

export function localFilePath(value) {
  if (typeof value !== 'string' || !/^\/(attachments|files)\//.test(value)) return null
  try {
    const url = new URL(value, 'http://mail.local')
    if (url.origin !== 'http://mail.local' || !/^\/(attachments|files)\//.test(url.pathname) || url.searchParams.has('sid')) return null
    return url.pathname + url.search
  } catch {
    return null
  }
}

export const fileSize = bytes => Number(bytes) >= 1000000
  ? (Number(bytes) / 1000000).toFixed(1) + ' MB'
  : Number(bytes) >= 1000 ? Math.round(Number(bytes) / 1000) + ' KB' : (Number(bytes) || 0) + ' B'
