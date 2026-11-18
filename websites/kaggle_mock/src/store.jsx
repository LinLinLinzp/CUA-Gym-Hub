import { createContext, useContext, useRef, useState } from 'react'
import { saveState, withSid } from './utils/dataManager.js'
import { slugify } from './data/seed.js'

export const APP = 'kaggle'
const AccountStore = createContext(null)
export const useStore = () => useContext(AccountStore)

export function StoreProvider({ initial, children }) {
  const [state, setState] = useState(initial)
  const current = useRef(initial)
  function command(update) {
    const next = update(current.current)
    if (!next || next === current.current) return false
    current.current = next
    saveState(APP, next)
    setState(next)
    return true
  }
  return <AccountStore.Provider value={{ state, command }}>{children}</AccountStore.Provider>
}

export const activity = (state, fields) => ({
  id: crypto.randomUUID(), actorId: state.account.id, createdAt: new Date().toISOString(), ...fields,
})
export const getOwner = (state, ownerId) => ownerId === state.account.id
  ? state.account : state.users.find(user => user.id === ownerId)
export const canRead = (state, entity) => entity && (entity.visibility !== 'private' || entity.ownerId === state.account.id)
export const scopedRecords = (state, group) => state[group].filter(entity => canRead(state, entity))
export const entityPath = (state, group, entity) => {
  const owner = getOwner(state, entity.ownerId)?.username ?? entity.ownerId ?? 'unknown'
  return `/${group}/${encodeURIComponent(owner)}/${encodeURIComponent(entity.slug ?? entity.id)}`
}
export const competitionPath = (entry) => `/competitions/${encodeURIComponent(entry.slug ?? entry.id)}`
export const isJoined = (state, competition) => state.competitionEntries.find(entry =>
  entry.competitionId === competition.id && entry.actorId === state.account.id
  && entry.rulesVersion === (competition.rulesVersion ?? 1) && entry.status === 'joined')
export const withRecord = (state, key, record) => ({ ...state, [key]: [...state[key], record] })
export const replaceRecord = (state, key, record) => ({
  ...state, [key]: state[key].map(item => item.id === record.id ? record : item),
})
export function uniqueSlug(records, ownerId, title) {
  const base = slugify(title)
  const used = new Set(records.filter(item => item.ownerId === ownerId).map(item => item.slug ?? item.id))
  let slug = base
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`
  return slug
}

export function createNotebook(state, { title, language, sourceId, datasetId }) {
  const source = sourceId && state.notebooks.find(item => item.id === sourceId)
  const dataset = datasetId && state.datasets.find(item => item.id === datasetId)
  if ((sourceId && !canRead(state, source)) || (datasetId && !canRead(state, dataset))) return null
  const ownerId = state.account.id
  const name = (source ? `Copy of ${source.title ?? 'Untitled notebook'}` : title)?.trim()
  if (!name) return null
  const draft = source && notebookDraft(state, source)
  const cells = source
    ? draft.cells.map(cell => ({ ...cell, id: crypto.randomUUID() }))
    : [{ id: crypto.randomUUID(), type: 'code', source: (language ?? 'python') === 'r' ? '# Start your analysis in R' : '# Start your analysis in Python' }]
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(), slug: uniqueSlug(state.notebooks, ownerId, name), ownerId,
    title: name, language: source?.language ?? language ?? 'python', visibility: 'private', cells,
    datasetIds: source ? draft.datasetIds.filter(id => canRead(state, state.datasets.find(item => item.id === id)))
      : datasetId ? [datasetId] : [],
    tags: source?.tags ?? [], votes: 0, createdAt: now, updatedAt: now,
    ...(source ? { forkedFromId: source.id } : {}),
  }
}

export const versionsFor = (versions, parentKey, id) => versions.filter(version => version[parentKey] === id)
  .sort((left, right) => right.number - left.number)
export const latestVersion = (versions, entity) => versions.find(version => version.id === entity.latestVersionId) ?? versions[0]

export function notebookDraft(state, notebook) {
  const latest = notebook.cells == null || notebook.datasetIds == null
    ? latestVersion(versionsFor(state.notebookVersions, 'notebookId', notebook.id), notebook) : undefined
  return {
    cells: notebook.cells ?? latest?.cells ?? [],
    datasetIds: notebook.datasetIds ?? latest?.datasetIds ?? [],
  }
}

export function localFileUrl(file) {
  const url = file?.url
  return typeof url === 'string' && /^\/(?:files|fixtures)\/(?:[a-zA-Z0-9_./-]|%[\dA-Fa-f]{2})+$/.test(url)
    && !url.split('/').some(segment => segment === '..' || /%2e|%2f|%5c/i.test(segment)) ? withSid(url) : undefined
}

export async function uploadFiles(files) {
  if (!files.length || files.some(file => !file.size)) throw new Error('Choose one or more nonempty files.')
  const form = new FormData()
  files.forEach(file => form.append('files', file))
  const response = await fetch(withSid('/upload'), { method: 'POST', body: form })
  if (!response.ok) throw new Error('Upload failed. Please try again.')
  const { files: uploaded } = await response.json()
  if (!Array.isArray(uploaded) || uploaded.length !== files.length || uploaded.some((file, index) =>
    !localFileUrl(file) || file.size !== files[index].size)) throw new Error('Upload was incomplete. Please try again.')
  return uploaded.map((file, index) => ({
    id: crypto.randomUUID(), name: files[index].name, sizeBytes: file.size,
    contentType: file.content_type ?? files[index].type ?? 'application/octet-stream', url: file.url,
  }))
}
export function findEntity(state, group, owner, slug) {
  return scopedRecords(state, group).find(item => (item.slug ?? item.id) === slug
    && (getOwner(state, item.ownerId)?.username ?? item.ownerId ?? 'unknown') === owner)
}
