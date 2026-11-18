import { contentFor, rows } from '../utils/display.js'
import { appendActivity, created, difference, error, event, unchanged, updated } from './records.js'

const mimeByExtension = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  avif: 'image/avif', bmp: 'image/bmp', pdf: 'application/pdf', mp3: 'audio/mpeg', wav: 'audio/wav',
  ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', mp4: 'video/mp4',
  m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', ogv: 'video/ogg',
}
export const mediaAccept = Object.keys(mimeByExtension).map((ext) => '.' + ext).join(',')
export function acceptedMime(file) {
  const ext = file.name.split('.').at(-1).toLowerCase()
  const expected = mimeByExtension[ext]
  if (!expected) return null
  if (!file.type || file.type === 'application/octet-stream') return expected
  const kind = expected.split('/')[0]
  return file.type === expected || kind !== 'application' && file.type.startsWith(kind + '/') ? file.type : null
}

export function createMedia(state, stamp, uploads) {
  if (!uploads.length) return unchanged
  const media = uploads.map(({ file, width, height }) => ({
    ...created('media', stamp), fileName: file.original_name, url: file.url, mimeType: file.content_type,
    sizeBytes: file.size, width, height, title: file.original_name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
    altText: '', caption: '', description: '', uploadedTo: null, authorId: stamp.actor,
  }))
  return {
    next: { ...state, media: [...rows(state.media), ...media] },
    message: media.length === 1 ? 'Media file uploaded.' : media.length + ' media files uploaded.',
  }
}

export function updateMedia(state, stamp, id, changes, message = 'Media details saved.') {
  const media = rows(state.media)
  const current = media.find((item) => item.id === id)
  if (!current) return error('This media item is no longer available.')
  if (!Object.keys(difference(current, changes)).length) return unchanged
  return { next: { ...state, media: media.map((item) => item === current ? { ...current, ...changes, ...updated(stamp) } : item) }, message }
}

export function changeAttachment(state, stamp, id, link) {
  if (link) {
    const target = ['post', 'page'].includes(link.type) && contentFor(state, link.type, link.id)
    if (!target || target.status === 'trash') return error('That content is no longer available to attach.')
  }
  return updateMedia(state, stamp, id, { uploadedTo: link }, link ? 'Media attached.' : 'Media detached.')
}

export function usesMedia(document, id) {
  return document.featuredImageId === id || rows(document.blocks).some((block) => block.type === 'image' && block.mediaId === id)
}

export function mediaImpact(state, item) {
  const documents = [['post', rows(state.posts)], ['page', rows(state.pages)]]
  return documents.flatMap(([type, collection]) => collection.filter((document) =>
    usesMedia(document, item.id) || (item.uploadedTo?.type === type && item.uploadedTo.id === document.id)
  ))
}

export function deleteMedia(state, stamp, ids) {
  const selected = new Set(ids)
  const library = rows(state.media)
  const targets = library.filter((row) => selected.has(row.id))
  if (!targets.length) return error('The selected media is no longer available.')
  const affected = new Set(targets.map((item) => item.id))
  const reconcile = (document) => {
    const featured = affected.has(document.featuredImageId)
    const blocks = rows(document.blocks)
    const affectedBlocks = blocks.some((block) => block.type === 'image' && affected.has(block.mediaId))
    if (!featured && !affectedBlocks) return document
    return {
      ...document,
      ...(featured ? { featuredImageId: null } : {}),
      ...(affectedBlocks ? { blocks: blocks.map((block) => block.type === 'image' && affected.has(block.mediaId) ? { ...block, mediaId: null } : block) } : {}),
      ...updated(stamp),
    }
  }
  return {
    next: {
      ...state,
      media: library.filter((item) => !affected.has(item.id)),
      posts: rows(state.posts).map(reconcile),
      pages: rows(state.pages).map(reconcile),
      activity: appendActivity(state, targets.map((item) => event('media_deleted', 'media', item, stamp, {
        relatedIds: [...new Set(mediaImpact(state, item).map((document) => document.id))],
      }))),
    },
    message: targets.length === 1 ? 'Media file permanently deleted.' : targets.length + ' media files permanently deleted.',
  }
}
