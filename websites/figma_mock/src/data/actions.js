import {
  active, activeFolder, actorId, availableComponent, byPosition, clean, editable, fileName,
  find, geometryOf, mainFor, normalizeEmail, owns, records, roleFor,
} from './model.js'

const append = (state, key, ...items) => ({ ...state, [key]: [...(state[key] ?? []), ...items] })
const patch = (state, key, id, changes) => ({
  ...state, [key]: state[key].map((item) => item?.id === id ? { ...item, ...changes } : item),
})
export function newRecordId(kind) {
  const random = crypto.getRandomValues(new Uint8Array(16))
  return kind + '-' + Array.from(random, (part) => part.toString(16).padStart(2, '0')).join('')
}
const link = (audit, audience = 'invited', role = null) => ({ audience, role, ...audit })
const clearTrash = { trashedAt: null, trashedById: null }
const clearRestore = { restoredAt: null, restoredById: null }
const clearResolution = { resolvedAt: null, resolvedById: null }
const unpublished = { status: 'local', publishedAt: null, publishedById: null }
const pageLayers = (state, page) => records(state, 'layers').filter((layer) => layer.pageId === page.id && layer.fileId === page.fileId)
const validFolder = (state, folderId) => activeFolder(find(state, 'folders', folderId))
const validRole = (role) => role === 'view' || role === 'edit'

function addFile(state, file, pages, layers = [], components = []) {
  let next = append(append(state, 'files', file), 'pages', ...pages)
  if (layers.length) next = append(next, 'layers', ...layers)
  if (components.length) next = append(next, 'components', ...components)
  return next
}

function duplicate(state, file, newFile, created) {
  const pages = records(state, 'pages').filter((item) => item.fileId === file.id).sort(byPosition)
  const pageIds = new Map(pages.map((item) => [item.id, newRecordId('page')]))
  const layers = records(state, 'layers').filter((item) => item.fileId === file.id && pageIds.has(item.pageId))
  const layerIds = new Map(layers.map((item) => [item.id, newRecordId('layer')]))
  const local = records(state, 'components').filter((item) => item.fileId === file.id)
  const localIds = new Set(local.map((item) => item.id))
  const components = local.filter((item) => pageIds.has(item.pageId) && layerIds.has(item.mainLayerId))
  const componentIds = new Map(components.map((item) => [item.id, newRecordId('component')]))
  const copiedPages = pages.map((item) => ({ ...item, ...created, id: pageIds.get(item.id), fileId: newFile.id }))
  if (!copiedPages.length) copiedPages.push({ ...created, id: newRecordId('page'), fileId: newFile.id, name: 'Page 1', position: 0 })
  return addFile(state, newFile, copiedPages,
    layers.map((item) => ({
      ...item, ...created, id: layerIds.get(item.id), fileId: newFile.id, pageId: pageIds.get(item.pageId),
      parentLayerId: layerIds.get(item.parentLayerId) ?? null,
      componentId: componentIds.get(item.componentId) ?? (localIds.has(item.componentId) ? null : (item.componentId ?? null)),
    })),
    components.map((item) => ({
      ...item, ...created, ...unpublished, id: componentIds.get(item.id), fileId: newFile.id,
      pageId: pageIds.get(item.pageId), mainLayerId: layerIds.get(item.mainLayerId),
    })),
  )
}

function placement(state, page, size) {
  const layers = pageLayers(state, page)
  for (let y = 70; y <= 570 - size.height; y += 32) {
    for (let x = 85; x <= 930 - size.width; x += 40) {
      const overlaps = layers.some((layer) => {
        const box = geometryOf(layer)
        return x < box.x + box.width + 12 && x + size.width + 12 > box.x &&
          y < box.y + box.height + 12 && y + size.height + 12 > box.y
      })
      if (!overlaps) return { x, y, ...size }
    }
  }
  return { x: 30 + (layers.length * 17) % (900 - size.width), y: 30 + (layers.length * 19) % (540 - size.height), ...size }
}

export function inviteError(state, file, address) {
  const email = normalizeEmail(address)
  if (!/^[^\s@<>]+@[^\s@<>.]+(?:\.[^\s@<>.]+)+$/.test(email)) return 'Enter a valid email address.'
  if (email === normalizeEmail(find(state, 'users', file.ownerId)?.email)) return 'This person already owns the file.'
  if (records(state, 'fileAccess').some((item) => item.fileId === file.id &&
      ['active', 'pending'].includes(item.status) && (normalizeEmail(item.email) || normalizeEmail(find(state, 'users', item.userId)?.email)) === email)) {
    return 'This person already has access or a pending invitation.'
  }
  return ''
}

export function mutate(state, action) {
  const user = actorId(state)
  if (!user) return state
  const now = new Date().toISOString()
  const updated = { updatedAt: now, updatedById: user }
  const created = { createdAt: now, createdById: user, ...updated }
  const file = find(state, 'files', action.fileId)
  const page = find(state, 'pages', action.pageId)
  const name = clean(action.name)
  const stampFile = (next, fields = {}) => patch(next, 'files', file.id, { ...fields, ...updated })

  if (action.type === 'create' || action.type === 'duplicate') {
    if (action.type === 'create' && (!name || (action.folderId && !validFolder(state, action.folderId)))) return state
    if (action.type === 'duplicate' && !roleFor(state, file)) return state
    const folderId = action.type === 'create' ? action.folderId ?? null
      : editable(state, file) && validFolder(state, file.folderId) ? file.folderId : null
    const newFile = {
      id: action.newId, name: action.type === 'create' ? name : 'Copy of ' + fileName(file),
      folderId, ownerId: user, sourceFileId: file?.id ?? null, status: 'active',
      preview: file?.preview || 'blank', linkAccess: link(updated),
      ...clearTrash, ...clearRestore, ...created,
    }
    if (action.type === 'duplicate') return duplicate(state, file, newFile, created)
    return addFile(state, newFile, [{ id: newRecordId('page'), fileId: newFile.id, name: 'Page 1', position: 0, ...created }])
  }

  if (!file) return state
  if (action.type === 'restore') {
    if (file.status !== 'trashed' || !owns(state, file)) return state
    return stampFile(state, {
      status: 'active', ...clearTrash, restoredAt: now, restoredById: user,
      folderId: validFolder(state, file.folderId) ? file.folderId : null,
    })
  }
  if (!roleFor(state, file)) return state

  switch (action.type) {
    case 'rename':
      return editable(state, file) && name && name !== file.name ? stampFile(state, { name }) : state
    case 'move':
      return editable(state, file) && (file.folderId ?? null) !== action.folderId &&
        (action.folderId === null || validFolder(state, action.folderId)) ? stampFile(state, { folderId: action.folderId }) : state
    case 'trash':
      return owns(state, file) ? stampFile(state, { status: 'trashed', trashedAt: now, trashedById: user }) : state
    case 'star': {
      const star = records(state, 'fileStars').find((item) => item.fileId === file.id && item.userId === user)
      return star
        ? patch(state, 'fileStars', star.id, { status: star.status === 'starred' ? 'unstarred' : 'starred', ...updated })
        : append(state, 'fileStars', { id: newRecordId('star'), fileId: file.id, userId: user, status: 'starred', ...created })
    }
    case 'comment': {
      const body = clean(action.body)
      if (!body || page?.fileId !== file.id || ![action.x, action.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) return state
      const layer = find(state, 'layers', action.layerId)
      return append(state, 'commentThreads', {
        id: action.newId, fileId: file.id, pageId: page.id,
        layerId: layer?.pageId === page.id && layer.fileId === file.id ? layer.id : null,
        x: action.x, y: action.y, body, status: 'open', ...clearResolution,
        reopenedAt: null, reopenedById: null, ...created,
      })
    }
    case 'reply':
    case 'resolve':
    case 'reopen': {
      const thread = find(state, 'commentThreads', action.threadId)
      if (thread?.fileId !== file.id) return state
      if (action.type === 'reopen') return thread.status === 'resolved'
        ? patch(state, 'commentThreads', thread.id, { status: 'open', ...clearResolution, reopenedAt: now, reopenedById: user, ...updated }) : state
      if (thread.status === 'resolved') return state
      if (action.type === 'resolve') return patch(state, 'commentThreads', thread.id, { status: 'resolved', resolvedAt: now, resolvedById: user, ...updated })
      const body = clean(action.body)
      return body ? patch(append(state, 'commentReplies', { id: newRecordId('reply'), threadId: thread.id, body, ...created }),
        'commentThreads', thread.id, updated) : state
    }
    case 'invite': {
      if (!owns(state, file) || !validRole(action.role) || inviteError(state, file, action.email)) return state
      const email = normalizeEmail(action.email)
      const person = records(state, 'users').find((item) => normalizeEmail(item.email) === email)
      return append(state, 'fileAccess', {
        id: newRecordId('access'), fileId: file.id, userId: person?.id ?? null, email, role: action.role,
        status: person ? 'active' : 'pending', removedAt: null, removedById: null, ...created,
      })
    }
    case 'grant-role':
    case 'grant-remove': {
      const grant = find(state, 'fileAccess', action.grantId)
      if (!owns(state, file) || grant?.fileId !== file.id || !['pending', 'active'].includes(grant.status)) return state
      if (action.type === 'grant-remove') return patch(state, 'fileAccess', grant.id, { status: 'removed', removedAt: now, removedById: user, ...updated })
      return validRole(action.role) && grant.role !== action.role ? patch(state, 'fileAccess', grant.id, { role: action.role, ...updated }) : state
    }
    case 'link': {
      if (!owns(state, file) || (action.audience !== 'invited' && (action.audience !== 'anyone' || !validRole(action.role)))) return state
      const role = action.audience === 'invited' ? null : action.role
      if ((file.linkAccess?.audience ?? 'invited') === action.audience && (file.linkAccess?.role ?? null) === role) return state
      return patch(state, 'files', file.id, { linkAccess: { ...file.linkAccess, ...link(updated, action.audience, role) } })
    }
    case 'shape':
    case 'insert': {
      if (!editable(state, file) || page?.fileId !== file.id) return state
      const component = find(state, 'components', action.componentId)
      if (action.type === 'insert' && !availableComponent(state, component, file)) return state
      const main = mainFor(state, component)
      const { width, height } = geometryOf(main)
      const size = main ? { width: Math.min(width, 880), height: Math.min(height, 520) } : { width: 190, height: 85 }
      const position = pageLayers(state, page).reduce((max, layer) => Math.max(max, Number(layer.position) || 0), -1) + 1
      return stampFile(append(state, 'layers', {
        id: action.newId, fileId: file.id, pageId: page.id, parentLayerId: null,
        kind: main ? 'instance' : 'shape', name: main ? component.name || 'Untitled component' : 'Rectangle',
        componentId: main ? component.id : null, geometry: placement(state, page, size), position,
        text: null, fill: main ? null : '#DCCBF1', ...created,
      }))
    }
    case 'component': {
      const layer = find(state, 'layers', action.layerId)
      if (!editable(state, file) || !name || layer?.fileId !== file.id || layer.pageId !== page?.id ||
        page.fileId !== file.id || !['frame', 'shape', 'text'].includes(layer.kind)) return state
      const next = append(state, 'components', {
        id: action.newId, fileId: file.id, pageId: page.id, mainLayerId: layer.id, name,
        description: clean(action.description), ...unpublished, ...created,
      })
      return stampFile(patch(next, 'layers', layer.id, { kind: 'component', name, componentId: action.newId, ...updated }))
    }
    case 'component-edit': {
      const component = find(state, 'components', action.componentId)
      const main = mainFor(state, component)
      if (!editable(state, file) || !main || component.fileId !== file.id || !name) return state
      const description = clean(action.description)
      if (name === component.name && description === (component.description ?? '')) return state
      const next = patch(state, 'components', component.id, { name, description, ...updated })
      return stampFile(name !== component.name ? patch(next, 'layers', main.id, { name, ...updated }) : next)
    }
    case 'publish': {
      if (!editable(state, file) || !active(file)) return state
      const selected = records(state, 'components').filter((item) => item.fileId === file.id &&
        item.status !== 'published' && action.componentIds.includes(item.id) && mainFor(state, item))
      if (!selected.length) return state
      const ids = new Set(selected.map((item) => item.id))
      return stampFile({
        ...state,
        components: state.components.map((item) => ids.has(item?.id)
          ? { ...item, status: 'published', publishedAt: now, publishedById: user, ...updated } : item),
      })
    }
    default:
      return state
  }
}

