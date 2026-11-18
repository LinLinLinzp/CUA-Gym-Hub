export const list = value => Array.isArray(value) ? value : []
export const byId = (records, id) => list(records).find(record => record.id === id)
export const scoped = (records, key, id) => list(records).filter(record => record[key] === id)
export const repoRecords = (records, repo) => scoped(records, 'repositoryId', repo?.id)
export const activeRepos = (state, workspace) => scoped(state.repositories, 'workspaceId', workspace.id).filter(repo => !repo.deletedAt)
export const openBranches = (state, repo) => repoRecords(state.branches, repo).filter(branch => !branch.closedAt)
export const signedIn = state => byId(state.users, state.currentUserId)
export const defaultWorkspace = state => byId(state.workspaces, 'ws-northstar') || list(state.workspaces)[0]
export const starRecord = (state, repo) => repoRecords(state.repositoryStars, repo).find(star => star.userId === state.currentUserId)
export const newest = (a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
export const person = (state, id) => byId(state.users, id)?.name || 'Unknown user'
export const slugify = name => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const numberAfter = (records, field) => list(records).reduce((max, record) => Math.max(max, Number(record[field]) || 0), 0) + 1
export const shortHash = commit => (commit?.hash || commit?.id || '').slice(0, 7)
export const human = text => String(text || 'Unknown').replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())

export function relative(date) {
  const timestamp = Date.parse(date)
  if (!Number.isFinite(timestamp)) return '—'
  const minutes = Math.round((timestamp - new Date().getTime()) / 60000)
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
  if (Math.abs(minutes) < 1440) return format.format(Math.round(minutes / 60), 'hour')
  if (Math.abs(minutes) < 43200) return format.format(Math.round(minutes / 1440), 'day')
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(timestamp)
}

export function duration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export const wsPath = (workspace, page = 'for-you') => `/${encodeURIComponent(workspace.slug)}/workspace/${page}`
export const repoPath = (workspace, repo, page = 'src') => `/${encodeURIComponent(workspace.slug)}/${encodeURIComponent(repo.slug)}/${page}`
export const buildPath = (workspace, repo, run) => repoPath(workspace, repo, `pipelines/results/${run.buildNumber}`)
export const reviewPath = (workspace, repo, pr) => repoPath(workspace, repo, `pull-requests/${pr.number}`)
export const encodedPath = path => path.split('/').map(encodeURIComponent).join('/')
export function query(path, values) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  }
  return params.size ? `${path}?${params}` : path
}
