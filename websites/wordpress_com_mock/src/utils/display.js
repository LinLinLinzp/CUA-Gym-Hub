export const rows = (value) => Array.isArray(value) ? value : []
export const named = (people, id) => rows(people).find((person) => person.id === id)?.name || '—'
export const titleOf = (row) => row?.title || 'Untitled'
export const statuses = {
  published: 'Published', draft: 'Draft', pending: 'Pending', scheduled: 'Scheduled',
  private: 'Private', trash: 'Trash', spam: 'Spam', approved: 'Approved',
}
export const formatStatus = (status) => statuses[status] || 'Draft'
const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
export function displayDate(value, time = false) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? (time ? dateTimeFormat : dateFormat).format(date) : '—'
}
export const contentDate = (row) => row.scheduledAt || row.publishedAt || row.updatedAt || row.createdAt
export const contentFor = (state, type, id) => rows(type === 'page' ? state.pages : state.posts).find((item) => item.id === id)
