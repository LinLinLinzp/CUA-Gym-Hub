export const kinds = {
  models: { label: 'Models', singular: 'model', icon: 'model', field: 'task', fieldLabel: 'Task', options: ['feature-extraction', 'text-generation', 'image-classification', 'automatic-speech-recognition', 'text-classification', 'translation'] },
  datasets: { label: 'Datasets', singular: 'dataset', icon: 'dataset', field: 'format', fieldLabel: 'Format', options: ['parquet', 'csv', 'jsonl'] },
  spaces: { label: 'Spaces', singular: 'space', icon: 'space', field: 'sdk', fieldLabel: 'SDK', options: ['gradio', 'docker', 'static'] },
}

export const array = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const owns = (account, repo) => Boolean(repo && (repo.ownerId ? account?.id === repo.ownerId : account?.username && account.username === repo.owner))
export const visible = (account, repo) => repo.visibility !== 'private' || owns(account, repo)
export const sortRecent = (a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''))
export const repoKind = (type) => Object.keys(kinds).find((kind) => kinds[kind].singular === type)
export const findRepo = (state, type, id) => id && array(state[repoKind(type)]).find((repo) => repo.id === id)
export const slugify = (name) => name.trim().toLowerCase().replace(/\s+/g, '-')
export const repoPath = (kind, repo) => '/' + [kind, repo.owner, repo.slug].map(encodeURIComponent).join('/')
export const canLink = (repo) => Boolean(repo?.owner && repo?.slug)
export const displayName = (repo) => repo?.name || repo?.slug || 'Untitled repository'
export const namespace = (repo) => [repo.owner, repo.slug].filter(Boolean).join('/')
export const likeCount = (repo) => (Number(repo.likes) || 0) + array(repo.likedBy).length
export const requestFor = (state, kind, repo) => array(state.accessRequests).find((request) => request.repoType === kinds[kind].singular && request.repoId === repo.id && request.requesterId === state.account?.id)
export const isGated = (repo) => repo.visibility !== 'private' && ['auto', 'manual'].includes(repo.gating)
export const allowedFiles = (state, kind, repo) => owns(state.account, repo) || !isGated(repo) || requestFor(state, kind, repo)?.status === 'accepted'
export const receivedRequests = (state) => array(state.accessRequests).filter((request) => owns(state.account, findRepo(state, request.repoType, request.repoId)))
export const roles = ['read', 'write', 'fine-grained']
export const permissions = { 'repo:read': 'Read repositories', 'repo:write': 'Write repositories', 'space:manage': 'Manage Spaces' }
export const label = (value) => ({ gradio: 'Gradio', docker: 'Docker', static: 'Static', parquet: 'Parquet', csv: 'CSV', jsonl: 'JSONL', 'fine-grained': 'Fine-grained', 'cpu-basic': 'CPU Basic', 'cpu-upgrade': 'CPU Upgrade', 't4-small': 'T4 Small', auto: 'Automatic approval', manual: 'Manual approval' })[value] || (value ? String(value).replace(/-/g, ' ').replace(/^./, (letter) => letter.toUpperCase()) : '—')

const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export function date(value) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? dateFormat.format(timestamp) : '—'
}
