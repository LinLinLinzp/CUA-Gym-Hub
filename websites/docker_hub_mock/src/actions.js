import { active, byId, current, organizationUsers, permissionNames } from './model.js'

function requireValue(value, message) {
  if (!value) throw new Error(message)
  return value
}

function get(state, collection, id) {
  return requireValue(byId(state, collection, id), 'This item is unavailable.')
}

function add(state, key, row) {
  return [...(state[key] ?? []), row]
}

function stamp(state, key, ids, fields) {
  const selected = new Set(ids)
  return (state[key] ?? []).map(record => selected.has(record.id) ? { ...record, ...fields } : record)
}

function linkedIds(state, key, field, value) {
  return current(state, key).filter(record => record[field] === value).map(record => record.id)
}

function createNamed(state, meta, key, prefix, values) {
  const namespace = get(state, 'namespaces', values.namespaceId)
  const team = key === 'teams'
  if (team) requireValue(namespace.type === 'organization', 'Select an organization.')
  const name = values.name.trim()
  const description = values.description.trim()
  const pattern = team ? /^[a-z0-9_-]{2,64}$/ : /^[a-z0-9_-]{2,255}$/
  requireValue(pattern.test(name),
    `Use 2–${team ? 64 : 255} lowercase letters, digits, hyphens, or underscores for the name.`)
  requireValue(!current(state, key).some(row => row.namespaceId === namespace.id && row.name === name),
    `That ${team ? 'team' : 'repository'} name is already in use in this namespace.`)
  const record = { id: meta.id(prefix), namespaceId: namespace.id, name, description, ...meta.created }
  if (!team) {
    requireValue(description.length <= 100, 'Limit the short description to 100 characters.')
    requireValue(['public', 'private'].includes(values.visibility), 'Select a visibility.')
    Object.assign(record, { visibility: values.visibility, overview: '', pullCount: 0 })
  }
  return { collections: { [key]: add(state, key, record) }, targets: { [key]: [record.id] }, value: record }
}

function patch(state, meta, key, id, fields) {
  const record = get(state, key, id)
  const changedFields = {}
  const changes = {}
  for (const [field, value] of Object.entries(fields)) {
    if ((record[field] ?? '') === value) continue
    changedFields[field] = value
    changes[field] = { before: record[field] ?? null, after: value }
  }
  if (!Object.keys(changes).length) return null
  return {
    collections: { [key]: stamp(state, key, [id], { ...changedFields, ...meta.updated }) },
    targets: { [key]: [id] }, changes,
  }
}

function cascade(state, meta, parent, id, links) {
  get(state, parent, id)
  const targets = { [parent]: [id] }
  for (const [collection, field] of links) targets[collection] = linkedIds(state, collection, field, id)
  const collections = Object.fromEntries(Object.entries(targets)
    .map(([collection, ids]) => [collection, stamp(state, collection, ids, meta.deleted)]))
  return { collections, targets }
}

export const actions = {
  createRepository: values => (state, meta) => createNamed(state, meta, 'repositories', 'repo', values),
  updateRepository: (id, values) => (state, meta) => {
    const description = values.description.trim()
    requireValue(description.length <= 100, 'Limit the short description to 100 characters.')
    return patch(state, meta, 'repositories', id, { description, overview: values.overview.trim() })
  },
  visibility: (id, visibility) => (state, meta) => patch(state, meta, 'repositories', id, { visibility }),
  deleteRepository: id => (state, meta) => cascade(state, meta, 'repositories', id, [
    ['tags', 'repositoryId'], ['repositoryPermissions', 'repositoryId'],
  ]),
  createTag: (sourceId, name) => (state, meta) => {
    const source = get(state, 'tags', sourceId)
    const repository = get(state, 'repositories', source.repositoryId)
    requireValue(/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(name),
      'Use 1–128 letters, digits, underscores, periods, or hyphens. Start with a letter, digit, or underscore.')
    requireValue(!current(state, 'tags').some(tag => tag.repositoryId === repository.id && tag.name === name),
      'That tag name already exists in this repository.')
    const image = Object.fromEntries(['digest', 'platforms', 'sizeBytes']
      .filter(key => source[key] != null).map(key => [key, source[key]]))
    const tag = {
      ...image, name, id: meta.id('tag'), repositoryId: repository.id,
      sourceTagId: source.id, pushedAt: meta.created.createdAt, immutable: false, ...meta.created,
    }
    return {
      collections: { tags: add(state, 'tags', tag), repositories: stamp(state, 'repositories', [repository.id], meta.updated) },
      targets: { repositories: [repository.id], tags: [tag.id] }, value: tag,
    }
  },
  deleteTags: (repositoryId, ids) => (state, meta) => {
    get(state, 'repositories', repositoryId)
    const tags = (state.tags ?? []).filter(tag => active(tag) && ids.includes(tag.id)
      && tag.repositoryId === repositoryId && !tag.immutable)
    requireValue(tags.length > 0 && tags.length === ids.length, 'Some selected tags are unavailable for deletion.')
    return {
      collections: {
        tags: stamp(state, 'tags', ids, meta.deleted),
        repositories: stamp(state, 'repositories', [repositoryId], meta.updated),
      },
      targets: { repositories: [repositoryId], tags: ids },
    }
  },
  createTeam: values => (state, meta) => createNamed(state, meta, 'teams', 'team', values),
  updateTeam: (id, description) => (state, meta) => patch(state, meta, 'teams', id, { description: description.trim() }),
  addMember: (teamId, userId) => (state, meta) => {
    const team = get(state, 'teams', teamId)
    requireValue(organizationUsers(state, team.namespaceId).some(user => user.id === userId),
      'Select an existing organization member.')
    requireValue(!current(state, 'teamMemberships').some(row => row.teamId === teamId && row.userId === userId),
      'This person already belongs to the team.')
    const id = meta.id('tm')
    return {
      collections: {
        teamMemberships: add(state, 'teamMemberships', { id, teamId, userId, ...meta.created }),
        teams: stamp(state, 'teams', [teamId], meta.updated),
      },
      targets: { teams: [teamId], teamMemberships: [id], users: [userId] },
    }
  },
  removeMember: id => (state, meta) => {
    const { teamId, userId } = get(state, 'teamMemberships', id)
    get(state, 'teams', teamId)
    return {
      collections: {
        teamMemberships: stamp(state, 'teamMemberships', [id], meta.deleted),
        teams: stamp(state, 'teams', [teamId], meta.updated),
      },
      targets: { teams: [teamId], teamMemberships: [id], users: [userId] },
    }
  },
  grantPermission: (repositoryId, teamId, permission) => (state, meta) => {
    const repository = get(state, 'repositories', repositoryId)
    const team = get(state, 'teams', teamId)
    const namespace = get(state, 'namespaces', repository.namespaceId)
    requireValue(namespace.type === 'organization' && team.namespaceId === namespace.id,
      'Select a team in the repository’s organization.')
    requireValue(Object.hasOwn(permissionNames, permission), 'Select a permission level.')
    requireValue(!current(state, 'repositoryPermissions').some(row => row.repositoryId === repositoryId && row.teamId === teamId),
      'This team already has access to the repository.')
    const id = meta.id('rp')
    return {
      collections: {
        repositoryPermissions: add(state, 'repositoryPermissions', { id, repositoryId, teamId, permission, ...meta.created }),
        repositories: stamp(state, 'repositories', [repositoryId], meta.updated),
      },
      targets: { repositories: [repositoryId], repositoryPermissions: [id], teams: [teamId] },
    }
  },
  updatePermission: (id, permission) => (state, meta) => {
    requireValue(Object.hasOwn(permissionNames, permission), 'Select a permission level.')
    const { repositoryId, teamId } = get(state, 'repositoryPermissions', id)
    get(state, 'repositories', repositoryId)
    get(state, 'teams', teamId)
    const result = patch(state, meta, 'repositoryPermissions', id, { permission })
    if (!result) return null
    result.collections.repositories = stamp(state, 'repositories', [repositoryId], meta.updated)
    Object.assign(result.targets, { repositories: [repositoryId], teams: [teamId] })
    return result
  },
  revokePermission: id => (state, meta) => {
    const { repositoryId, teamId } = get(state, 'repositoryPermissions', id)
    get(state, 'repositories', repositoryId)
    return {
      collections: {
        repositoryPermissions: stamp(state, 'repositoryPermissions', [id], meta.deleted),
        repositories: stamp(state, 'repositories', [repositoryId], meta.updated),
      },
      targets: { repositories: [repositoryId], repositoryPermissions: [id], teams: [teamId] },
    }
  },
  deleteTeam: id => (state, meta) => cascade(state, meta, 'teams', id, [
    ['teamMemberships', 'teamId'], ['repositoryPermissions', 'teamId'],
  ]),
}

