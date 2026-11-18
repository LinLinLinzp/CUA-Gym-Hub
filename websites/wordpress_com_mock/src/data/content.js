import { rows, titleOf } from '../utils/display.js'
import { appendActivity, created, difference, error, event, slugify, unchanged, updated } from './records.js'

export const contentStatuses = ['published', 'draft', 'pending', 'scheduled', 'private']
export const collectionFor = (type) => type === 'page' ? 'pages' : 'posts'
export const typeLabel = (type) => type === 'page' ? 'Page' : 'Post'
export const assigned = (values) => [...new Set(rows(values))]

export function contentFields(record, type, state) {
  const category = rows(state.categories).find((term) => term.slug === 'uncategorized')
  const common = {
    title: record?.title ?? '', slug: record?.slug ?? '', blocks: rows(record?.blocks),
    excerpt: record?.excerpt ?? '', authorId: record?.authorId ?? state.currentUserId ?? null,
    featuredImageId: record?.featuredImageId ?? null, commentsOpen: record?.commentsOpen ?? type === 'post',
    status: record?.status ?? 'draft',
  }
  if (type === 'page') return { ...common, parentId: record?.parentId ?? null, menuOrder: record?.menuOrder ?? 0 }
  return {
    ...common,
    categoryIds: record ? assigned(record.categoryIds) : category ? [category.id] : [],
    tagIds: assigned(record?.tagIds),
  }
}

export const isUtcDateInput = (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '')
export function utcInput(value) {
  if (value == null || value === '') return ''
  const millis = new Date(value).getTime()
  return Number.isFinite(millis) ? new Date(millis).toISOString().slice(0, 16) : ''
}

function lifecycle(record, status, date, now) {
  if (status === undefined) return {}
  if (!contentStatuses.includes(status)) return error('Choose a valid status.', 'status')
  const titleRequired = ['published', 'pending', 'private', 'scheduled'].includes(status)
  if (titleRequired && !String(record.title || '').trim()) return error('Enter a title to continue.', 'title')
  const candidate = isUtcDateInput(date) ? Date.parse(date + 'Z') : NaN
  if (date && (!Number.isFinite(candidate) || utcInput(candidate) !== date)) return error('Enter a valid date and time in UTC.', 'date')
  const chosen = Number.isFinite(candidate) ? new Date(candidate).toISOString() : null
  if (status === 'scheduled') {
    if (record.status === 'scheduled' && record.scheduledAt && date === undefined) return {}
    if (!chosen || chosen <= now) return error('Choose a future date and time in UTC.', 'date')
    return { status, scheduledAt: chosen, publishedAt: null, trashedAt: null }
  }
  const live = ['published', 'private'].includes(status)
  if (live && chosen && chosen > now) return error('Use Schedule to publish on a future date.', 'date')
  const existingDate = ['published', 'private'].includes(record.status) ? record.publishedAt : null
  return { status, scheduledAt: null, publishedAt: live ? chosen || existingDate || now : null, trashedAt: null }
}

function resolveSlug(record, changed, siblings, type) {
  const inUse = (slug) => siblings.some((item) => item.id !== record.id && item.slug === slug &&
    (type === 'post' || (item.parentId ?? null) === (record.parentId ?? null)))
  const slug = slugify(record.slug)
  if (slug && !inUse(slug)) return slug
  if (slug && changed) return error('This slug is already in use.', 'slug')
  const stem = slug || slugify(record.title) || 'untitled'
  let generated = stem
  for (let index = 2; inUse(generated); index++) generated = stem + '-' + index
  return generated
}

export function pageParentOptions(pages, excludeIds) {
  const index = new Map(pages.map((page) => [page.id, page]))
  const excluded = new Set(excludeIds)
  return pages.filter((page) => {
    if (page.status === 'trash') return false
    const seen = new Set()
    let node = page
    while (node) {
      if (excluded.has(node.id) || seen.has(node.id)) return false
      seen.add(node.id)
      node = index.get(node.parentId)
    }
    return true
  })
}

function resolveTerms(state, additions, stamp) {
  const result = {}
  for (const [property, prefix] of [['categories', 'cat'], ['tags', 'tag']]) {
    const names = rows(additions?.[property])
    const existing = rows(state[property])
    const records = [...existing]
    const ids = []
    for (const value of names) {
      const name = value.trim()
      const slug = slugify(name)
      if (!slug) continue
      let term = records.find((item) => slugify(item.slug ?? item.name) === slug)
      if (!term) {
        term = { ...created(prefix, stamp), name, slug }
        records.push(term)
      }
      ids.push(term.id)
    }
    result[property] = { ids, records: records.length > existing.length ? records : existing }
  }
  return result
}

export function saveContent(state, stamp, type, ids, fields, options = {}) {
  const key = collectionFor(type)
  const collection = rows(state[key])
  const idsSet = new Set(ids)
  const originals = options.create ? [null] : collection.filter((row) => idsSet.has(row.id))
  if (!originals.length || originals.length !== idsSet.size && !options.create) return error('The selected content is no longer available.')
  if (originals.some((record) => record?.status === 'trash')) return error('Restore this content before editing it.')
  const terms = type === 'post' && options.terms ? resolveTerms(state, options.terms, stamp) : null
  const candidates = []
  const mediaIds = new Set(rows(state.media).map((item) => item.id))
  const selectedParent = fields.parentId
  if (type === 'page' && selectedParent && !pageParentOptions(collection, ids).some((page) => page.id === selectedParent)) {
    return error('Choose a parent outside the selected pages and their descendants.', 'parentId')
  }
  for (const previous of originals) {
    const patch = { ...fields }
    if ('title' in patch) patch.title = patch.title.trim()
    if ('slug' in patch) patch.slug = patch.slug.trim()
    if ('menuOrder' in patch) {
      const value = String(patch.menuOrder).trim()
      if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return error('Enter a whole number for page order.', 'menuOrder')
      patch.menuOrder = Number(value)
    }
    if (terms) {
      if (terms.categories.ids.length) patch.categoryIds = assigned([...rows(patch.categoryIds ?? previous?.categoryIds), ...terms.categories.ids])
      if (terms.tags.ids.length) patch.tagIds = assigned([...rows(patch.tagIds ?? previous?.tagIds), ...terms.tags.ids])
    }
    const oldBlocks = new Map(rows(previous?.blocks).map((block) => [block.id, block]))
    const missingImage = patch.featuredImageId && patch.featuredImageId !== previous?.featuredImageId && !mediaIds.has(patch.featuredImageId) ||
      rows(patch.blocks).some((block) => block.type === 'image' && block.mediaId && oldBlocks.get(block.id)?.mediaId !== block.mediaId && !mediaIds.has(block.mediaId))
    if (missingImage) return error('An image in this document is no longer in the Media Library. Replace or remove it and try again.')
    const status = patch.status
    delete patch.status
    const candidate = { ...previous, ...patch }
    const dates = lifecycle(candidate, status, options.date, stamp.now)
    if (dates.error) return dates
    Object.assign(candidate, dates)
    if (!previous || 'title' in patch || 'slug' in patch || 'parentId' in patch) {
      const overrides = new Map(candidates.map(({ record }) => [record.id, record]))
      const siblings = collection.map((row) => overrides.get(row.id) || row)
      const slug = resolveSlug(candidate, Boolean(patch.slug) || Boolean(previous?.slug && candidate.parentId !== previous.parentId), siblings, type)
      if (slug.error) return slug
      candidate.slug = slug
    }
    if (previous && !Object.keys(difference(previous, candidate)).length) continue
    const record = previous ? { ...candidate, ...updated(stamp) } : { ...candidate, ...created(type, stamp) }
    candidates.push({ previous, record })
  }
  if (!candidates.length) return unchanged
  const byId = new Map(candidates.map(({ record }) => [record.id, record]))
  const next = { ...state, [key]: options.create ? [...collection, ...byId.values()] : collection.map((row) => byId.get(row.id) || row) }
  if (terms) {
    next.categories = terms.categories.records
    next.tags = terms.tags.records
  }
  const record = candidates[0].record
  const message = candidates.length === 1 ? typeLabel(type) + ' saved.' : candidates.length + ' ' + key + ' updated.'
  return { next, record, message }
}

export function changeContentLifecycle(state, stamp, type, ids, action) {
  const key = collectionFor(type)
  const collection = rows(state[key])
  const selected = new Set(ids)
  const targets = collection.filter((row) => selected.has(row.id) && (action === 'trash' ? row.status !== 'trash' : row.status === 'trash'))
  if (!targets.length) return error('The selected content is no longer available for this action.')
  const targetIds = new Set(targets.map((row) => row.id))
  const label = targets.length === 1 ? '“' + titleOf(targets[0]) + '”' : targets.length + ' ' + key
  if (action === 'trash' || action === 'restore') {
    const patch = action === 'trash'
      ? { status: 'trash', trashedAt: stamp.now, scheduledAt: null }
      : { status: 'draft', publishedAt: null, scheduledAt: null, trashedAt: null }
    return {
      next: { ...state, [key]: collection.map((row) => targetIds.has(row.id) ? { ...row, ...patch, ...updated(stamp) } : row) },
      message: label + (action === 'trash' ? ' moved to Trash.' : ' restored to Drafts.'),
    }
  }
  if (action !== 'delete') return error('Choose a valid action.')
  const comments = rows(state.comments)
  const removedFor = (id) => comments.filter((row) => row.contentType === type && row.contentId === id).map((row) => row.id)
  const events = targets.map((record) => event(type + '_deleted', type, record, stamp, { relatedIds: removedFor(record.id) }))
  return {
    next: {
      ...state,
      [key]: collection.filter((row) => !targetIds.has(row.id)).map((row) => type === 'page' && targetIds.has(row.parentId) ? { ...row, parentId: null, ...updated(stamp) } : row),
      comments: comments.filter((row) => row.contentType !== type || !targetIds.has(row.contentId)),
      media: rows(state.media).map((row) => row.uploadedTo?.type === type && targetIds.has(row.uploadedTo.id) ? { ...row, uploadedTo: null, ...updated(stamp) } : row),
      activity: appendActivity(state, events),
    },
    message: label + ' permanently deleted.',
  }
}
