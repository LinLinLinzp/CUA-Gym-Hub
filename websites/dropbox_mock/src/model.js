import { withSid } from './utils/dataManager'

export const active = file => !!file && file.status !== 'deleted'
export const sameName = (first, second) => String(first || '').toLowerCase() === String(second || '').toLowerCase()
export const parentOf = file => file?.parentId ?? null
export const getFile = (state, id) => id == null ? undefined : state.files.find(file => file.id === id)
export const accountId = state => state.account?.userId || 'usr_morgan'
export const routeFor = file => (file.kind === 'folder' ? '/folder/' : '/file/') + encodeURIComponent(file.id)
export const currentVersion = (state, file) => state.versions.find(version => version.id === file.currentVersionId && version.fileId === file.id)
export const emailValue = value => value.trim().toLowerCase()
export const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
export const newId = prefix => prefix + '_' + Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')

export function ancestry(state, id, includeDeleted = false) {
  const byId = new Map(state.files.map(file => [file.id, file]))
  const seen = new Set()
  const items = []
  while (id != null) {
    const folder = byId.get(id)
    if (folder?.kind !== 'folder' || (!includeDeleted && !active(folder)) || seen.has(id)) return { items: items.reverse(), valid: false }
    seen.add(id)
    items.push(folder)
    id = parentOf(folder)
  }
  return { items: items.reverse(), valid: true }
}

export function pathLabel(state, id, includeDeleted = false) {
  const { items, valid } = ancestry(state, id, includeDeleted)
  return [valid ? 'All files' : 'Unknown location', ...items.map(folder => folder.name || 'Untitled folder')].join(' / ')
}

export function memberships(state, file) {
  const ancestorIds = new Set(ancestry(state, parentOf(file)).items.map(folder => folder.id))
  return state.shareMembers.filter(member => member.status === 'active' && (member.fileId === file.id || ancestorIds.has(member.fileId)))
}

export function accessLabel(state, file) {
  if (file.ownerId && file.ownerId !== accountId(state)) return 'Shared with you'
  if (memberships(state, file).length || state.shareLinks.some(link => link.fileId === file.id && link.status === 'active')) return 'Shared'
  return 'Only you'
}

export function accessibleLink(state, file, link) {
  if (link.audience === 'anyone') return true
  const id = accountId(state)
  const user = state.users.find(item => item.id === id)
  if (link.audience === 'team') return !!user?.isTeamMember
  return link.audience === 'invited' && (file.ownerId === id || memberships(state, file).some(member =>
    member.userId === id || (!!user?.email && sameName(member.email, user.email))))
}

export function requireFolder(state, id, allowRoot = true) {
  if (id == null && !allowRoot) throw new Error('Choose a destination folder.')
  if (!ancestry(state, id).valid) throw new Error('That destination folder is unavailable. Choose another folder.')
}

export function requireFile(state, id) {
  const item = getFile(state, id)
  if (!active(item)) throw new Error('This item is no longer available.')
  return item
}

export function cleanName(value) {
  const name = value.trim()
  if (!name || name === '.' || name === '..' || /[\\/<>:"|?*\u0000-\u001f\u007f]/.test(name) || name.length > 255) {
    throw new Error('Enter a name of 1–255 characters without reserved characters.')
  }
  return name
}

function sibling(state, parentId, name, exceptId) {
  return state.files.find(item => active(item) && parentOf(item) === parentId && item.id !== exceptId && sameName(item.name, name))
}

function ensureUnique(state, parentId, name, exceptId) {
  if (sibling(state, parentId, name, exceptId)) throw new Error('An item with that name already exists in this folder.')
}

export function uniqueName(name, exists) {
  if (!exists(name)) return name
  const dot = name.lastIndexOf('.')
  const extension = dot > 0 ? name.slice(dot) : ''
  const stem = dot > 0 ? name.slice(0, dot) : name
  let count = 2
  while (true) {
    const suffix = ' (' + count + ')'
    const ending = extension.slice(0, 254 - suffix.length)
    const candidate = stem.slice(0, 255 - suffix.length - ending.length) + suffix + ending
    if (!exists(candidate)) return candidate
    count++
  }
}

export function transaction(state, actorId = accountId(state)) {
  const data = { ...state }
  const now = new Date().toISOString()
  const created = { createdAt: now, createdBy: actorId }
  const updated = { updatedAt: now, updatedBy: actorId }
  function insert(collection, record) {
    data[collection] = [...data[collection], record]
    return record
  }
  function patch(collection, id, changes) {
    data[collection] = data[collection].map(item => item.id === id ? { ...item, ...changes } : item)
  }
  function event(action, targetType, targetId, details) {
    insert('activity', { id: newId('evt'), action, actorId, targetType, targetId, details, createdAt: now, status: 'completed' })
  }
  return { data, now, actorId, created, updated, insert, patch, event }
}

export function createItem(tx, name, parentId, kind, content) {
  const file = tx.insert('files', { id: newId(kind === 'folder' ? 'fld' : 'file'), name, parentId, kind, ownerId: accountId(tx.data),
    status: 'active', ...tx.created, ...tx.updated, deletedAt: null, deletedBy: null, deletionRootId: null,
    currentVersionId: null, sizeBytes: null, mimeType: null })
  const version = kind === 'file' ? writeVersion(tx, file, content) : null
  return { file, version }
}

export function writeVersion(tx, file, metadata, sourceVersionId = null) {
  const version = tx.insert('versions', { id: newId('ver'), fileId: file.id, ...tx.created, sourceVersionId,
    mimeType: metadata.mimeType || 'application/octet-stream', sizeBytes: metadata.sizeBytes ?? 0, content: metadata.content ?? null })
  tx.patch('files', file.id, { currentVersionId: version.id, mimeType: version.mimeType, sizeBytes: version.sizeBytes, ...tx.updated })
  return version
}

export function createFolder(state, parentId, value) {
  requireFolder(state, parentId)
  const name = cleanName(value)
  ensureUnique(state, parentId, name)
  const tx = transaction(state)
  const { file } = createItem(tx, name, parentId, 'folder')
  tx.event('file.createFolder', 'file', file.id, { name, parentId })
  return tx.data
}

export function renameFile(state, id, value) {
  const file = requireFile(state, id)
  const name = cleanName(value)
  if (file.name === name) return state
  ensureUnique(state, parentOf(file), name, id)
  const tx = transaction(state)
  tx.patch('files', id, { name, ...tx.updated })
  tx.event('file.rename', 'file', id, { previousName: file.name ?? '', name })
  return tx.data
}

function subtree(state, root, include) {
  const children = new Map()
  for (const item of state.files) {
    if (!include(item)) continue
    const parentId = parentOf(item)
    if (!children.has(parentId)) children.set(parentId, [])
    children.get(parentId).push(item)
  }
  const found = [root]
  const seen = new Set([root.id])
  for (const item of found) {
    if (item.kind !== 'folder') continue
    for (const child of children.get(item.id) || []) {
      if (seen.has(child.id)) continue
      found.push(child)
      seen.add(child.id)
    }
  }
  return found
}

function roots(state, ids) {
  const selected = new Set(ids)
  return [...selected].map(id => requireFile(state, id)).filter(item => {
    const chain = ancestry(state, parentOf(item))
    if (!chain.valid) throw new Error('This item has an unavailable parent folder.')
    return !chain.items.some(folder => selected.has(folder.id))
  })
}

export function organizeFiles(state, ids, destination, operation) {
  requireFolder(state, destination)
  const targets = roots(state, ids).filter(item => operation === 'copy' || parentOf(item) !== destination)
  if (!targets.length) return state
  const chain = ancestry(state, destination).items
  const proposed = new Set()
  for (const item of targets) {
    if (chain.some(folder => folder.id === item.id)) throw new Error('Choose a folder outside the selected item.')
    const name = String(item.name || 'Untitled').toLowerCase()
    if (proposed.has(name)) throw new Error('Two selected items have the same name.')
    proposed.add(name)
    ensureUnique(state, destination, name)
  }
  const tx = transaction(state)
  for (const item of targets) {
    if (operation === 'move') {
      tx.patch('files', item.id, { parentId: destination, ...tx.updated })
      tx.event('file.move', 'file', item.id, { previousParentId: parentOf(item), parentId: destination })
      continue
    }
    const copies = new Map()
    for (const source of subtree(state, item, active)) {
      const parentId = source.id === item.id ? destination : copies.get(parentOf(source))
      const revision = currentVersion(state, source) || source
      const { file } = createItem(tx, source.name || 'Untitled', parentId, source.kind, revision)
      copies.set(source.id, file.id)
    }
    const id = copies.get(item.id)
    tx.event('file.copy', 'file', id, { sourceFileId: item.id, destinationFolderId: destination, affectedIds: [...copies.values()] })
  }
  return tx.data
}

export function deleteFiles(state, ids) {
  const tx = transaction(state)
  for (const root of roots(state, ids)) {
    const affected = subtree(state, root, active)
    for (const { id } of affected) {
      tx.patch('files', id, { status: 'deleted', deletedAt: tx.now, deletedBy: tx.actorId, deletionRootId: root.id, ...tx.updated })
    }
    tx.event('file.delete', 'file', root.id, { parentId: parentOf(root), affectedIds: affected.map(item => item.id) })
  }
  return tx.data
}

export function restoreFile(state, id, destination) {
  const root = getFile(state, id)
  if (root?.status !== 'deleted' || (root.deletionRootId && root.deletionRootId !== id)) throw new Error('This deletion is no longer available.')
  requireFolder(state, destination)
  ensureUnique(state, destination, root.name)
  const tx = transaction(state)
  const affected = state.files.filter(item => item.status === 'deleted' && (item.id === id || item.deletionRootId === id))
  for (const item of affected) {
    const parentId = item.id === id ? destination : parentOf(item)
    ensureUnique(state, parentId, item.name)
    tx.patch('files', item.id, { parentId, status: 'active', deletedAt: null, deletedBy: null, deletionRootId: null, ...tx.updated })
  }
  tx.event('file.restore', 'file', id, { previousParentId: parentOf(root), parentId: destination, affectedIds: affected.map(item => item.id) })
  return tx.data
}

export async function uploadBytes(files) {
  const body = new FormData()
  for (const file of files) body.append('files', file)
  const response = await fetch(withSid('/upload'), { method: 'POST', body })
  if (!response.ok) throw new Error('Upload failed. Try again.')
  const result = await response.json()
  if (result.files?.length !== files.length) throw new Error('Some files could not be uploaded. Try again.')
  return result.files.map(file => {
    if (typeof file.url !== 'string' || !file.url.startsWith('/files/')) throw new Error('The uploaded file is unavailable.')
    return { sizeBytes: file.size, mimeType: file.content_type, content: { kind: 'upload', value: file.url } }
  })
}

export function planUploads(state, parentId, files, choices) {
  requireFolder(state, parentId)
  const names = new Map(state.files.filter(file => active(file) && parentOf(file) === parentId).map(file => [String(file.name || '').toLowerCase(), file]))
  return files.map((file, index) => {
    const name = cleanName(file.name)
    const key = name.toLowerCase()
    const conflict = names.get(key)
    const canReplace = conflict?.kind === 'file'
    const choice = choices[index]
    if (!conflict) {
      names.set(key, { kind: 'file', index })
      return { name }
    }
    if (choice === 'replace' && canReplace) return { name, conflict, canReplace, replace: conflict }
    if (choice === 'keep') {
      const next = uniqueName(name, candidate => names.has(candidate.toLowerCase()))
      names.set(next.toLowerCase(), { kind: 'file', index })
      return { name: next, conflict, canReplace }
    }
    return { name, conflict, canReplace, needsChoice: true }
  })
}

export function commitUploads(state, parentId, files, choices, uploaded, expectedPlan) {
  const plan = planUploads(state, parentId, files, choices)
  if (plan.some((entry, index) => {
    const expected = expectedPlan[index]
    return entry.needsChoice || entry.name !== expected.name || entry.replace?.id !== expected.replace?.id || entry.replace?.index !== expected.replace?.index
  })) throw new Error('The destination changed during upload. Review the file names and try again.')
  const tx = transaction(state)
  const created = []
  plan.forEach(({ name, replace }, index) => {
    if (replace) {
      const file = requireFile(tx.data, replace.id ?? created[replace.index])
      const version = writeVersion(tx, file, uploaded[index])
      tx.event('file.replace', 'file', file.id, { previousVersionId: file.currentVersionId ?? null, versionId: version.id })
    } else {
      const { file, version } = createItem(tx, name, parentId, 'file', uploaded[index])
      created[index] = file.id
      tx.event('file.upload', 'file', file.id, { name, parentId, versionId: version.id })
    }
  })
  return tx.data
}

export function inviteMember(state, fileId, value, role) {
  const file = requireFile(state, fileId)
  const email = emailValue(value)
  if (!validEmail(email)) throw new Error('Enter a valid email address.')
  const user = state.users.find(record => sameName(record.email, email))
  if (user && user.id === file.ownerId) throw new Error('The owner already has access.')
  const member = state.shareMembers.find(record => record.fileId === fileId && sameName(record.email, email))
  if (member?.status === 'active') throw new Error('This person already has access. Update their role below.')
  const tx = transaction(state)
  const fields = { email, userId: user?.id ?? null, role, status: 'active', removedAt: null, ...tx.updated }
  const id = member?.id || newId('mem')
  if (member) tx.patch('shareMembers', id, fields)
  else tx.insert('shareMembers', { id, fileId, ...tx.created, ...fields })
  tx.event('share.invite', 'shareMember', id, { fileId, email, role, reactivated: !!member })
  return tx.data
}

export function updateMember(state, fileId, id, role) {
  requireFile(state, fileId)
  const member = state.shareMembers.find(record => record.id === id && record.fileId === fileId && record.status === 'active')
  if (!member) throw new Error('This person no longer has direct access.')
  if (member.role === role) return state
  const tx = transaction(state)
  if (role) {
    tx.patch('shareMembers', id, { role, ...tx.updated })
    tx.event('share.changeRole', 'shareMember', id, { fileId, email: member.email ?? null, previousRole: member.role ?? null, role })
  } else {
    tx.patch('shareMembers', id, { status: 'removed', removedAt: tx.now, ...tx.updated })
    tx.event('share.remove', 'shareMember', id, { fileId, email: member.email ?? null, previousRole: member.role ?? null })
  }
  return tx.data
}

export function saveLink(state, fileId, id, audience, role) {
  requireFile(state, fileId)
  const link = state.shareLinks.find(record => record.id === id && record.fileId === fileId && record.status === 'active')
  if (id && !link) throw new Error('This link is no longer active.')
  if (link?.audience === audience && link.role === role) return state
  const tx = transaction(state)
  const fields = { audience, role, ...tx.updated }
  if (link) {
    tx.patch('shareLinks', id, fields)
    tx.event('link.update', 'shareLink', id, { fileId, previousAudience: link.audience ?? null, previousRole: link.role ?? null, audience, role })
  } else {
    const created = tx.insert('shareLinks', { id: newId('lnk'), fileId, token: newId('share'), status: 'active', revokedAt: null, ...tx.created, ...fields })
    tx.event('link.create', 'shareLink', created.id, { fileId, audience, role })
  }
  return tx.data
}

export function revokeLink(state, fileId, id) {
  requireFile(state, fileId)
  const link = state.shareLinks.find(record => record.id === id && record.fileId === fileId && record.status === 'active')
  if (!link) throw new Error('This link is no longer active.')
  const tx = transaction(state)
  tx.patch('shareLinks', id, { status: 'revoked', revokedAt: tx.now, ...tx.updated })
  tx.event('link.revoke', 'shareLink', id, { fileId, audience: link.audience ?? null, role: link.role ?? null })
  return tx.data
}

export function saveRequest(state, id, values) {
  const title = values.title.trim()
  const description = values.description.trim()
  const destinationFolderId = values.destinationFolderId
  if (!title || title.length > 140) throw new Error('Enter a title of 1–140 characters.')
  requireFolder(state, destinationFolderId, false)
  const request = state.fileRequests.find(record => record.id === id)
  if (id && request?.status !== 'open') throw new Error('Only open requests can be edited.')
  if (request?.title === title && (request.description || '') === description && request.destinationFolderId === destinationFolderId) return state
  const tx = transaction(state)
  const fields = { title, description, destinationFolderId, ...tx.updated }
  if (request) {
    tx.patch('fileRequests', id, fields)
    tx.event('request.edit', 'fileRequest', id, { title, description, destinationFolderId, previousTitle: request.title ?? null,
      previousDescription: request.description ?? null, previousDestinationFolderId: request.destinationFolderId ?? null })
  } else {
    const created = tx.insert('fileRequests', { id: newId('req'), token: newId('receive'), status: 'open', closedAt: null, ...tx.created, ...fields })
    tx.event('request.create', 'fileRequest', created.id, { title, destinationFolderId })
  }
  return tx.data
}

export function changeRequestStatus(state, id, open) {
  const request = state.fileRequests.find(record => record.id === id)
  if (!request) throw new Error('This request is unavailable.')
  const status = open ? 'open' : 'closed'
  if (status === request.status) return state
  const tx = transaction(state)
  tx.patch('fileRequests', id, { status, closedAt: open ? null : tx.now, ...tx.updated })
  tx.event(open ? 'request.reopen' : 'request.close', 'fileRequest', id, { previousStatus: request.status ?? null, status })
  return tx.data
}

export function availableRequest(state, token) {
  const request = state.fileRequests.find(record => record.token === token && record.status === 'open')
  return request?.destinationFolderId && ancestry(state, request.destinationFolderId).valid ? request : null
}

export function submitRequest(state, token, contributor, files, uploaded) {
  const request = availableRequest(state, token)
  if (!request) throw new Error('This request is no longer accepting files.')
  const uploaderName = contributor.name.trim()
  const uploaderEmail = emailValue(contributor.email)
  if (!uploaderName || !validEmail(uploaderEmail) || !files.length || files.length !== uploaded.length) {
    throw new Error('Provide your name, a valid email, and at least one file.')
  }
  const tx = transaction(state, 'external:' + uploaderEmail)
  const destinationFolderId = request.destinationFolderId
  files.forEach((selected, index) => {
    const name = uniqueName(cleanName(selected.name), candidate => !!sibling(tx.data, destinationFolderId, candidate))
    const { file, version } = createItem(tx, name, destinationFolderId, 'file', uploaded[index])
    const submission = tx.insert('requestSubmissions', { id: newId('sub'), requestId: request.id,
      fileId: file.id, destinationFolderId, originalName: selected.name, uploaderName, uploaderEmail, createdAt: tx.now, status: 'received' })
    tx.event('request.submit', 'requestSubmission', submission.id, { requestId: request.id, fileId: file.id, destinationFolderId, versionId: version.id })
  })
  return tx.data
}

export function restoreVersion(state, fileId, sourceVersionId) {
  const file = requireFile(state, fileId)
  const source = state.versions.find(version => version.id === sourceVersionId && version.fileId === fileId)
  if (file.kind !== 'file' || !source || source.id === file.currentVersionId) throw new Error('Choose an earlier version of this file.')
  const tx = transaction(state)
  const version = writeVersion(tx, file, source, source.id)
  tx.event('version.restore', 'file', fileId, { previousVersionId: file.currentVersionId ?? null, sourceVersionId, versionId: version.id })
  return tx.data
}
