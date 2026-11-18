export const list = (value) => Array.isArray(value) ? value : []
export const lower = (value) => String(value ?? '').toLowerCase()
export const textSort = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'en', { numeric: true, sensitivity: 'base' })
export const newest = (a, b) => textSort(b.createdAt, a.createdAt) || textSort(a.id, b.id)
export const forProject = (rows, projectId) => list(rows).filter(row => row.projectId === projectId)
export const campaignsFor = (state, id) => forProject(state.trackingCampaigns, id).sort(newest)
export const runsFor = (state, id) => forProject(state.auditRuns, id).sort((a, b) => (b.runNumber ?? 0) - (a.runNumber ?? 0) || newest(a, b))
export const configFor = (state, id) => forProject(state.auditConfigs, id).sort(newest)[0]
export const latestHistory = (campaign) => list(campaign?.history).slice().sort((a, b) => textSort(a.date, b.date))
export const movement = (row) => row.previousPosition == null || row.position == null ? null : row.previousPosition - row.position
export const inBand = (row, band) => band === 'unranked' ? row.position == null : !band || (Number.isFinite(row.position) && row.position >= 1 && row.position <= Number(band))
export const splitItems = (value) => {
  const seen = new Set()
  return String(value ?? '').split(/[,\n]/).map(item => item.trim()).filter(item => {
    const key = lower(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function parseLocation(value) {
  const raw = String(value ?? '').trim()
  if (!raw || /\s/.test(raw)) return null
  try {
    const url = new URL(raw.includes('://') ? raw : 'https://' + raw)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    const host = lower(url.hostname).replace(/\.$/, '')
    if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(host)) return null
    url.hostname = host
    return url
  } catch {
    return null
  }
}

export function normalizeTarget(value, scope) {
  const url = parseLocation(value)
  if (!url) return ''
  if (scope === 'url') return url.href.split('#')[0]
  if (scope === 'subfolder') {
    const path = url.pathname.replace(/\/+$/, '')
    return path ? url.hostname + path + '/' : ''
  }
  return url.hostname
}

export const dateLabel = (value) => {
  const date = new Date(value ?? NaN)
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
export const numberLabel = (value, suffix = '') => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + suffix : '—'
export const projectLabel = (project) => project.name || project.domain || 'Untitled project'
export const projectPath = (project, tool = '') => '/projects/' + encodeURIComponent(project.id) + (tool ? '/' + tool : '')
export const replaceRecord = (rows, id, patch) => list(rows).map(row => row.id === id ? { ...row, ...patch } : row)
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export function downloadCsv(filename, columns, rows) {
  const escape = (value) => {
    const cell = String(value ?? '')
    return '"' + (/^[=+@\t\r]/.test(cell) || /^-[^0-9]/.test(cell) ? "'" : '') + cell.replaceAll('"', '""') + '"'
  }
  const content = [columns, ...rows].map(row => row.map(escape).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

