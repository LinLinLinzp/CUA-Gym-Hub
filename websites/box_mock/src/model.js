export const roles = {
  co_owner: 'Co-owner', editor: 'Editor', viewer_uploader: 'Viewer Uploader',
  previewer_uploader: 'Previewer Uploader', viewer: 'Viewer', previewer: 'Previewer', uploader: 'Uploader',
}
export const label = value => value === 'non_modifiable' ? 'Non-modifiable' : String(value || 'Unknown').replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())
export const nameOf = record => record?.name || 'Untitled'
export const normalize = value => String(value ?? '').trim().toLowerCase()
export const person = (state, id) => state.users.find(user => user.id === id)
export const personName = (state, id) => person(state, id)?.name || 'Unknown user'
export const stampRemoval = ({ actor, now, update }) => ({ ...update, status: 'removed', removedById: actor, removedAt: now })
export const replace = (records, id, patch) => records.map(record => record.id === id ? { ...record, ...patch } : record)
export const humanDate = value => {
  const date = new Date(value?.length === 10 ? value + 'T12:00:00' : value)
  return value && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date) : '—'
}
export const durationLabel = duration => duration?.unit === 'indefinite' ? 'Indefinite' : duration?.value ? `${duration.value} ${duration.value === 1 ? duration.unit?.replace(/s$/, '') : duration.unit}` : '—'

export class FieldError extends Error {
  constructor(field, message) {
    super(message)
    this.field = field
  }
}

export function directory(state) {
  const folders = new Map(state.folders.map(folder => [folder.id, folder]))
  const paths = new Map()
  function chain(id) {
    if (paths.has(id)) return paths.get(id)
    const trail = []
    const seen = new Set()
    let current = id
    while (current != null) {
      const folder = folders.get(current)
      if (!folder || seen.has(current)) return null
      seen.add(current)
      trail.push(folder)
      current = folder.parentId
    }
    const path = trail.reverse()
    paths.set(id, path)
    return path
  }
  const visible = id => chain(id)?.every(folder => folder.status !== 'trashed') ?? false
  const pathLabel = id => ['All files', ...(chain(id) || []).map(nameOf)].join(' / ')
  return { folders, chain, visible, pathLabel }
}

export function folderName(state, input, parentId, exclude, field = 'name') {
  const name = String(input ?? '').trim()
  if (!name || /[\\/]/.test(name)) throw new FieldError(field, 'Enter a folder name without slashes.')
  const key = normalize(name)
  if (state.folders.some(folder => folder.id !== exclude && (folder.parentId ?? null) === parentId && folder.status !== 'trashed' && normalize(folder.name) === key) ||
      state.files.some(file => (file.folderId ?? null) === parentId && normalize(file.name) === key)) {
    throw new FieldError(field, 'An item with that name already exists here.')
  }
  return name
}

export function grants(state, folderId) {
  const trail = directory(state).chain(folderId) || []
  return trail.flatMap(folder => state.collaborations.filter(entry => entry.folderId === folder.id &&
    (folder.id === folderId ? ['active', 'pending'].includes(entry.status) : entry.status === 'active')))
}

export function inviteRecords(state, meta, folder, input) {
  const emails = input.recipients.split(/[\s,;]+/).filter(Boolean).map(normalize)
  if (!emails.length) return []
  if (!Object.hasOwn(roles, input.role)) throw new FieldError('role', 'Select an access role.')
  const existing = state.collaborations.filter(entry => entry.folderId === folder.id && entry.status !== 'removed')
  const ownerEmail = normalize(person(state, folder.ownerId)?.email)
  const known = new Map(state.users.filter(user => user.email).map(user => [normalize(user.email), user]))
  const seen = new Set()
  return emails.map(email => {
    if (!/^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/.test(email)) throw new FieldError('recipients', `Enter a valid email for ${email}.`)
    const userId = known.get(email)?.id ?? null
    if (email === ownerEmail || (userId && userId === folder.ownerId)) throw new FieldError('recipients', 'The owner already has access.')
    if (seen.has(email) || existing.some(entry => normalize(entry.inviteeEmail) === email || (userId && entry.userId === userId))) {
      throw new FieldError('recipients', `${email} already has a direct invitation or access.`)
    }
    seen.add(email)
    return {
      ...meta.record('collab'), folderId: folder.id, userId, inviteeEmail: email, role: input.role,
      message: input.message.trim() || null, status: userId ? 'active' : 'pending', removedAt: null, removedById: null,
    }
  })
}

export function coverage(state, folderId) {
  const tree = directory(state)
  const trail = new Set((tree.chain(folderId) || []).map(folder => folder.id))
  return state.retentionAssignments.filter(entry => entry.status === 'active' && trail.has(entry.folderId))
    .flatMap(entry => {
      const policy = state.retentionPolicies.find(item => item.id === entry.policyId)
      return policy ? [{ entry, policy }] : []
    })
}

export function retentionRecord(meta, policyId, folderId, sourceAssignmentId = null) {
  return {
    ...meta.record('retention-assignment'), policyId, folderId, sourceAssignmentId,
    kind: sourceAssignmentId ? 'carried' : 'direct', status: 'active', removedAt: null, removedById: null,
  }
}

export function carryRetention(state, meta, folder, parentId) {
  const retained = new Set(coverage(state, parentId).map(({ policy }) => policy.id))
  const carried = []
  for (const { entry, policy } of coverage(state, folder.id)) {
    if (entry.folderId === folder.id) retained.add(policy.id)
  }
  for (const { entry, policy } of coverage(state, folder.parentId)) {
    if (retained.has(policy.id)) continue
    retained.add(policy.id)
    carried.push(retentionRecord(meta, policy.id, folder.id, entry.sourceAssignmentId ?? entry.id))
  }
  return [...state.retentionAssignments, ...carried]
}

export function folderDestination(state, folder, parentId, move) {
  const tree = directory(state)
  if (move && (folder.parentId ?? null) === parentId) throw new Error('Choose a different destination.')
  if (!tree.visible(parentId)) throw new Error('Choose an active destination.')
  if (tree.chain(parentId).some(item => item.id === folder.id)) throw new Error('Choose a location outside this folder.')
  folderName(state, folder.name, parentId, folder.id, null)
}

export function eligibleUsers(state, file) {
  const tree = directory(state)
  if (!tree.visible(file.folderId)) return []
  const owner = file.folderId == null ? file.ownerId : tree.folders.get(file.folderId)?.ownerId
  const ids = new Set([owner, ...grants(state, file.folderId).filter(entry => entry.status === 'active').map(entry => entry.userId)])
  return state.users.filter(user => ids.has(user.id)).sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
}


