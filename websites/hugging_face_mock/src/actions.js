import { array, findRepo, isGated, kinds, owns, permissions, requestFor, roles, slugify, visible } from './workspace'

export const licenses = {
  models: ['apache-2.0', 'mit', 'bsd-3-clause', 'other'],
  datasets: ['cc-by-4.0', 'cc0-1.0', 'odc-by', 'other'],
}
export const hardwareOptions = ['cpu-basic', 'cpu-upgrade', 't4-small']
const visibilityOptions = ['public', 'private']
const simpleName = /^[a-z0-9](?:[a-z0-9._-]{0,94}[a-z0-9])?$/
const filename = /^[a-z0-9][a-z0-9._-]{0,95}$/i
const text = (value) => String(value ?? '').trim()
const uid = () => crypto.randomUUID()
const error = (message) => ({ error: message })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const bytes = (value) => new TextEncoder().encode(value).length
const replace = (list, record) => array(list).map((item) => item.id === record.id ? record : item)

function fileRecord(id, path, content, actor, now) {
  return { id, path, content, sizeBytes: bytes(content), createdAt: now, updatedAt: now, createdBy: actor, updatedBy: actor }
}

export function applyAction(state, action, payload) {
  const account = state.account
  const actor = account?.id
  if (!actor) return error('The active account is unavailable.')
  const { kind, id } = payload
  const spec = kinds[kind]
  const repo = spec && findRepo(state, spec.singular, id)
  const owner = owns(account, repo)
  const now = new Date().toISOString()

  function commit(fields, details, source = repo, sourceType = spec?.singular) {
    return { state: { ...state, ...fields, activity: [...array(state.activity), {
      id: uid(), action, actorId: actor, repoType: sourceType ?? null, repoId: source?.id ?? null, createdAt: now, details,
    }] }, record: source }
  }
  function update(changes, details, touch = true) {
    const record = { ...repo, ...changes, ...(touch ? { updatedAt: now } : {}) }
    return commit({ [kind]: replace(state[kind], record) }, details, record)
  }

  switch (action) {
    case 'repository.created': {
      if (!spec || !account.username) return error('A repository namespace is required.')
      const { description, tags, visibility } = payload
      const name = text(payload.name)
      const slug = slugify(name)
      if (!simpleName.test(slug)) return error('Use 1–96 letters, numbers, dots, underscores, or dashes, starting and ending with a letter or number.')
      if (array(state[kind]).some((record) => record.owner === account.username && String(record.slug).toLowerCase() === slug)) return error('This repository name is already in use in your namespace.')
      const field = payload[spec.field]
      if (!spec.options.includes(field) || !visibilityOptions.includes(visibility) || (licenses[kind] && !licenses[kind].includes(payload.license))) return error('Select valid repository settings.')
      const content = '# ' + name + '\n\n' + text(description) + '\n'
      const record = {
        id: spec.singular + '-' + uid(), name, slug, ownerId: actor, owner: account.username, createdBy: actor,
        description: text(description), tags: array(tags), visibility, createdAt: now, updatedAt: now,
        likes: 0, likedBy: [], files: [fileRecord('file-' + uid(), 'README.md', content, actor, now)], [spec.field]: field,
      }
      if (kind === 'spaces') {
        const isStatic = field === 'static'
        Object.assign(record, { hardware: isStatic ? null : 'cpu-basic', runtimeStatus: isStatic ? 'static' : 'running', lastStartedAt: isStatic ? null : now })
      } else {
        Object.assign(record, { license: payload.license, downloads: 0, gating: 'off' })
        if (kind === 'datasets') Object.assign(record, { splits: [], sampleRows: [] })
      }
      return commit({ [kind]: [...array(state[kind]), record] }, { slug, visibility }, record)
    }
    case 'repository.updated': {
      if (!owner) return error('Only the repository owner can edit settings.')
      const { description, tags, visibility } = payload
      if (!visibilityOptions.includes(visibility)) return error('Select a visibility.')
      const values = { description: text(description), tags: array(tags), visibility }
      if (kind === 'spaces') {
        if (repo.sdk !== 'static') {
          if (!hardwareOptions.includes(payload.hardware) && payload.hardware !== repo.hardware) return error('Select a hardware option.')
          values.hardware = payload.hardware
        }
      } else {
        const type = payload[spec.field]
        if ((!spec.options.includes(type) && type !== repo[spec.field]) || (!licenses[kind].includes(payload.license) && payload.license !== repo.license)) return error('Select valid repository settings.')
        Object.assign(values, { [spec.field]: type, license: payload.license })
        if (visibility === 'private' && isGated(repo)) values.gating = 'off'
      }
      const changes = Object.fromEntries(Object.entries(values).filter(([key, value]) => !same(repo[key], value)))
      if (!Object.keys(changes).length) return error('There are no changes to save.')
      return update(changes, { changes })
    }
    case 'model.like_changed': {
      if (kind !== 'models' || !repo || !visible(account, repo)) return error('This model is unavailable.')
      const before = array(repo.likedBy)
      const liked = !before.includes(actor)
      return update({ likedBy: liked ? [...before, actor] : before.filter((item) => item !== actor) }, { liked }, false)
    }
    case 'dataset.file_saved': {
      if (kind !== 'datasets' || !owner) return error('Only the dataset owner can save files.')
      const path = text(payload.path)
      const content = String(payload.content ?? '')
      if (!filename.test(path)) return error('Use a simple filename with letters, numbers, dots, underscores, or dashes.')
      if (bytes(content) > 4096) return error('Text files must be 4 KB or smaller.')
      const files = array(repo.files)
      const existing = files.find((file) => file.path === path)
      if (existing?.content === content) return error('There are no changes to save.')
      const file = existing
        ? { ...existing, content, sizeBytes: bytes(content), updatedAt: now, updatedBy: actor }
        : fileRecord('file-' + uid(), path, content, actor, now)
      return update({ files: existing ? files.map((item) => item === existing ? file : item) : [...files, file] },
        { fileId: file.id, path, operation: existing ? 'updated' : 'created' })
    }
    case 'space.paused':
    case 'space.restarted': {
      const fromStatus = repo?.runtimeStatus
      const restarting = action === 'space.restarted'
      if (kind !== 'spaces' || !owner || !repo.sdk || repo.sdk === 'static' || !(fromStatus === 'running' || (restarting && fromStatus === 'paused'))) return error('This runtime action is unavailable.')
      const toStatus = restarting ? 'running' : 'paused'
      return update({ runtimeStatus: toStatus, ...(restarting ? { lastStartedAt: now } : {}) }, { fromStatus, toStatus })
    }
    case 'repository.gating_changed': {
      const fromMode = repo?.gating || 'off'
      const toMode = payload.mode
      if (!owner || kind === 'spaces' || (repo.visibility || 'public') !== 'public' || !['off', 'auto', 'manual'].includes(toMode)) return error('Gating is available on owned public models and datasets.')
      if (fromMode === toMode) return error('The approval mode is already set.')
      return update({ gating: toMode }, { fromMode, toMode })
    }
    case 'access.requested': {
      if (!repo?.id || kind === 'spaces' || owner || !isGated(repo) || requestFor(state, kind, repo)) return error('An access request is unavailable for this repository.')
      if (payload.consent !== true) return error('Agree to share your account details before submitting.')
      const status = repo.gating === 'auto' ? 'accepted' : 'pending'
      const request = { id: 'request-' + uid(), repoType: spec.singular, repoId: repo.id, requesterId: actor,
        consent: true, purpose: text(payload.purpose).slice(0, 300), status, createdAt: now, updatedAt: now,
        reviewedAt: status === 'accepted' ? now : null, reviewedBy: null, rejectionReason: null }
      return commit({ accessRequests: [...array(state.accessRequests), request] }, { requestId: request.id, status })
    }
    case 'access.reviewed': {
      const request = array(state.accessRequests).find((entry) => entry.id === payload.requestId)
      const target = findRepo(state, request?.repoType, request?.repoId)
      const allowed = { pending: ['accepted', 'rejected'], accepted: ['pending', 'rejected'], rejected: ['accepted'] }
      const status = payload.status
      if (!request || !owns(account, target) || !allowed[request.status]?.includes(status)) return error('This access decision is unavailable.')
      const record = { ...request, status, updatedAt: now, reviewedAt: now, reviewedBy: actor,
        rejectionReason: status === 'rejected' ? text(payload.rejectionReason).slice(0, 300) || null : null }
      return commit({ accessRequests: replace(state.accessRequests, record) },
        { requestId: record.id, fromStatus: request.status, toStatus: status }, target, request.repoType)
    }
    case 'token.created': {
      const name = text(payload.name)
      const role = payload.role
      if (!name) return error('Enter a token name.')
      if (!roles.includes(role)) return error('Select a token role.')
      const selected = role === 'fine-grained' ? [...new Set(array(payload.permissions))].filter((key) => Object.hasOwn(permissions, key)) : []
      if (role === 'fine-grained' && !selected.length) return error('Select at least one permission.')
      const value = 'hf_demo_' + uid().replaceAll('-', '')
      const token = { id: 'token-' + uid(), ownerId: actor, name, role, permissions: selected, suffix: value.slice(-4), status: 'active',
        createdAt: now, revokedAt: null, revokedBy: null }
      return { ...commit({ accessTokens: [...array(state.accessTokens), token] }, { tokenId: token.id }), value }
    }
    case 'token.revoked': {
      const token = array(state.accessTokens).find((entry) => entry.id === payload.tokenId)
      if (token?.ownerId !== actor || token.status !== 'active') return error('This token is unavailable for revocation.')
      const record = { ...token, status: 'revoked', revokedAt: now, revokedBy: actor }
      return commit({ accessTokens: replace(state.accessTokens, record) }, { tokenId: token.id })
    }
    default:
      return error('This action is unavailable.')
  }
}
