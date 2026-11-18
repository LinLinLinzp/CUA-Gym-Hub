export const list = (value) => Array.isArray(value) ? value : []
export const find = (rows, id) => list(rows).find((row) => row.id === id)
export const scoped = (rows, projectId) => list(rows).filter((row) => row.projectId === projectId)
export const update = (rows, row) => rows.map((old) => old.id === row.id ? row : old)
export const byNewest = (a, b) => String(b.updatedAt ?? b.changedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.changedAt ?? a.createdAt ?? '') || String(b.id).localeCompare(String(a.id), undefined, { numeric: true })
export const byBoard = (a, b) => (Number(a.boardOrder) || 0) - (Number(b.boardOrder) || 0) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
export const nextNumber = (rows) => String(rows.reduce((max, row) => /^\d+$/.test(row.id) ? (BigInt(row.id) > max ? BigInt(row.id) : max) : max, 0n) + 1n)
export const nextId = (rows, prefix) => {
  const taken = new Set(rows.map(({ id }) => id))
  let index = rows.length + 1
  while (taken.has(prefix + index)) index++
  return prefix + index
}
export const includes = (value, search) => String(value ?? '').toLowerCase().includes(String(search ?? '').trim().toLowerCase())
export const tagsFrom = (text) => [...new Set(text.split(',').map((tag) => tag.trim()).filter(Boolean))]
export const requireThat = (condition, message) => {
  if (!condition) throw new Error(message)
}
export function rebaseEditorFields(original, draft, latest, conflictMessage) {
  return Object.fromEntries(Object.entries(draft).map(([field, value]) => {
    const before = JSON.stringify(original[field])
    const proposed = JSON.stringify(value)
    if (proposed === before) return [field, latest[field]]
    const current = JSON.stringify(latest[field])
    requireThat(current === before || current === proposed, conflictMessage)
    return [field, value]
  }))
}
export const memberList = (state, project) => list(project?.memberIds).map((id) => find(state.users, id)).filter(Boolean)
export const userName = (state, id) => find(state.users, id)?.displayName ?? (id ? 'Unknown user' : 'Unassigned')
export const stamp = (actor, now) => ({ updatedBy: actor, updatedAt: now })
export const created = (actor, now) => ({ createdBy: actor, createdAt: now })
export const changed = (actor, now) => ({ changedBy: actor, changedAt: now })
export const workTypes = ['Bug', 'User Story', 'Task', 'Feature']
export const workStates = ['New', 'Active', 'Resolved', 'Closed']
export const story = (row) => row.type === 'User Story' || row.type === 'Bug'
export const sprintChoices = (state, projectId, teamId) => scoped(state.sprints, projectId).filter((row) => row.teamId === teamId)
// Harbor treats a literal filename extension at the end of a path as an asset.
export const segment = (part) => encodeURIComponent(part ?? '').replaceAll('.', '%2E')
export const repoPath = (repo) => '/_git/' + segment(repo?.slug ?? repo?.id ?? '')
