import { byId, list, repoRecords } from '../utils/model.js'

export function commitIndex(state, repo) {
  return new Map(repoRecords(state.commits, repo).map(commit => [commit.id, commit]))
}

export function ancestry(commits, headId) {
  const seen = new Set()
  const queue = [headId]
  for (let index = 0; index < queue.length; index++) {
    const commit = commits.get(queue[index])
    if (!commit || seen.has(commit.id)) continue
    seen.add(commit.id)
    queue.push(...list(commit.parentIds))
  }
  return seen
}

export function history(commits, headId) {
  return [...ancestry(commits, headId)].map(id => commits.get(id))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export function treeAt(commits, headId) {
  const chain = []
  const seen = new Set()
  let commit = commits.get(headId)
  while (commit && !seen.has(commit.id)) {
    seen.add(commit.id)
    chain.push(commit)
    commit = commits.get(list(commit.parentIds)[0])
  }
  const files = new Map()
  for (const item of chain.reverse()) {
    for (const change of list(item.changes)) {
      if (!change.path) continue
      if (change.operation === 'delete') files.delete(change.path)
      else files.set(change.path, change.content ?? '')
    }
  }
  return files
}

export function fileChanges(before, after) {
  return [...new Set([...before.keys(), ...after.keys()])].sort().flatMap(path => {
    const oldText = before.get(path)
    const newText = after.get(path)
    if (oldText === newText) return []
    return [{ path, oldText, newText, operation: newText === undefined ? 'delete' : oldText === undefined ? 'add' : 'modify', content: newText ?? null }]
  })
}

export function compareHeads(commits, sourceId, destinationId) {
  const sourceSet = ancestry(commits, sourceId)
  const destinationSet = ancestry(commits, destinationId)
  const baseId = [...sourceSet].find(id => destinationSet.has(id))
  const base = treeAt(commits, baseId)
  const source = treeAt(commits, sourceId)
  const destination = treeAt(commits, destinationId)
  const changes = fileChanges(base, source)
  const theirs = new Map(fileChanges(base, destination).map(change => [change.path, change]))
  const conflicts = changes.filter(change => theirs.has(change.path) && theirs.get(change.path).newText !== change.newText).map(change => change.path)
  const merged = new Map(destination)
  for (const change of changes) {
    if (change.newText === undefined) merged.delete(change.path)
    else merged.set(change.path, change.newText)
  }
  for (const path of merged.keys()) {
    const components = path.split('/')
    for (let index = 1; index < components.length; index++) {
      const ancestor = components.slice(0, index).join('/')
      if (merged.has(ancestor) && !conflicts.includes(ancestor)) conflicts.push(ancestor)
    }
  }
  return { sourceTree: source, destinationTree: destination, changes, conflicts, mergeChanges: fileChanges(destination, merged).map(({ path, operation, content }) => ({ path, operation, content })),
    commits: history(commits, sourceId).filter(commit => !destinationSet.has(commit.id)) }
}

export function commitFor(state, repo, id) {
  return byId(repoRecords(state.commits, repo), id)
}

export function filePath(value) {
  const parts = value.trim().replaceAll('\\', '/').split('/')
  if (parts[0] === '' || parts.some(part => part === '..' || /[\x00-\x1f\x7f]/.test(part) || part.toLowerCase() === '.git')) return ''
  return parts.filter(part => part && part !== '.').join('/')
}
