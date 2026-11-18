import { newId, writeAction } from './actions.js'

export function announcementStatus(record, now = new Date()) {
  if (record.status !== 'scheduled' || !record.publishAt) return record.status
  const publish = new Date(record.publishAt)
  if (!(publish <= now)) return 'scheduled'
  const hide = record.hideAt && new Date(record.hideAt)
  return hide && hide <= now ? 'hidden' : 'posted'
}

export function announcementDate(record, now) {
  const status = announcementStatus(record, now)
  if (status === 'posted' || status === 'hidden') return record.postedAt || record.publishAt || record.updatedAt
  if (status === 'scheduled') return record.publishAt || record.updatedAt
  return record.updatedAt || record.createdAt
}

const cleared = { publishAt: null, hideAt: null, postedAt: null }

export function changeAnnouncement(state, meta, { intent, courseId, id, title, message, publishAt, hideAt }) {
  if (!state.courses.some((course) => course?.id === courseId && course.access !== 'complete')) return state
  const current = id ? state.announcements.find((record) => record?.id === id && record.courseId === courseId) : null
  if (id && !current) return state

  if (intent === 'delete') {
    if (!current) return state
    return writeAction(state, 'announcements', state.announcements.filter((record) => record !== current),
      meta, 'announcement.delete', courseId, id, { title: current.title ?? '', status: current.status ?? null })
  }

  const copy = intent === 'copy'
  if (copy && !current) return state
  const existing = copy ? null : current
  const editedAt = new Date(meta.createdAt)
  const existingStatus = existing && announcementStatus(existing, editedAt)
  const published = existingStatus === 'posted' || existingStatus === 'hidden'
  let publication
  let type
  let details

  if (copy) {
    type = 'announcement.copy'
    publication = { ...cleared, status: 'draft' }
    details = { sourceAnnouncementId: id, status: 'draft' }
  } else if (intent === 'post' && !published) {
    type = 'announcement.post'
    publication = { ...cleared, status: 'posted', postedAt: meta.createdAt }
    details = { status: 'posted', postedAt: meta.createdAt }
  } else if (intent === 'schedule' && !published) {
    if (!(new Date(publishAt) > editedAt) || (hideAt && !(new Date(hideAt) > new Date(publishAt)))) return state
    type = 'announcement.schedule'
    publication = { status: 'scheduled', publishAt, hideAt, postedAt: null }
    details = { status: 'scheduled', publishAt, hideAt }
  } else {
    type = 'announcement.save'
    publication = published ? { status: existing.status } : { ...cleared, status: 'draft' }
    details = { status: publication.status }
  }

  const record = {
    ...(existing || { id: newId(), courseId, authorId: meta.actorId, createdAt: meta.createdAt }),
    title: copy ? current.title ?? '' : title,
    message: copy ? current.message ?? '' : message,
    ...publication, updatedAt: meta.createdAt, updatedBy: meta.actorId,
  }
  const announcements = existing ? state.announcements.map((entry) => entry === existing ? record : entry) : [...state.announcements, record]
  return writeAction(state, 'announcements', announcements, meta, type, courseId, record.id, details)
}
