export const array = value => Array.isArray(value) ? value : []
export const stamp = value => value ? Date.parse(value) : NaN
export const date = (value, time = false) => {
  const parsed = stamp(value)
  if (!Number.isFinite(parsed)) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(time ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(parsed)
}
export const count = value => value == null ? '—' : Number(value).toLocaleString('en-US')
export const money = (value, currency = 'USD') => {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return String(value)
  }
}
export const plural = (number, singular) => `${count(number)} ${singular}${number === 1 ? '' : 's'}`
export const postPath = (post, suffix = 'edit') => `/publish/posts/${encodeURIComponent(post.id)}/${suffix}`
export const articlePath = post => `/p/${encodeURIComponent(post.slug)}`
export const subscriberPath = subscriber => `/publish/subscribers/${encodeURIComponent(subscriber.id)}`
export const sortTime = (field, oldest = false) => (a, b) =>
  ((stamp(a[field]) || 0) - (stamp(b[field]) || 0)) * (oldest ? 1 : -1) || String(a.id).localeCompare(String(b.id))
export const audienceLabels = { everyone: 'Everyone', free: 'Free subscribers', paid: 'Paid subscribers', founding: 'Founding members' }
export const accessLabels = { free: 'Free', paid: 'Paid', founding: 'Founding', trial: 'Trial', comp: 'Comp', removed: 'Removed' }
export const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase() || '?'
