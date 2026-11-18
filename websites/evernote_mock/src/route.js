const collectionPaths = new Set(['/notes', '/search', '/trash'])

function pathParts(path) {
  return path.split('/').filter(Boolean).map((part) => {
    try { return decodeURIComponent(part) } catch { return part }
  })
}

function noteOrigin(raw, world) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/notes'
  const url = new URL(raw, window.location.origin)
  if (url.origin !== window.location.origin) return '/notes'
  const [section, id, extra] = pathParts(url.pathname)
  if (section === 'notebooks' && id && !extra && world.bookById.has(id)) return url.pathname
  if (!collectionPaths.has(url.pathname)) return '/notes'
  const query = url.searchParams.get('q')
  return url.pathname === '/search' && query !== null ? '/search?' + new URLSearchParams({ q: query }) : url.pathname
}

export function resolveRoute(location, world) {
  const [section = 'notes', id, extra] = pathParts(location.pathname)
  const params = new URLSearchParams(location.search)
  const query = params.get('q') || ''
  if (extra) return { section: 'notes', collection: '/notes', missing: 'Page unavailable' }
  if (section === 'notes' && id) {
    const note = world.noteById.get(id)
    const origin = noteOrigin(params.get('from'), world)
    if (!note || (note.status && !['active', 'trashed'].includes(note.status))) {
      return { section: 'notes', collection: '/notes', missing: 'Note unavailable' }
    }
    if (note.status === 'trashed' && origin !== '/trash') {
      return { section: 'notes', collection: '/notes', missing: 'This note is in Trash', recovery: '/trash', recoveryLabel: 'Open Trash' }
    }
    const notebookId = pathParts(origin.split('?')[0])[1]
    return {
      section: origin.split(/[/?]/)[1], collection: origin, note,
      query: new URL(origin, window.location.origin).searchParams.get('q') || '',
      notebook: world.bookById.get(notebookId),
      task: world.visibleTasks.find((task) => task.id === params.get('task') && task.noteId === note.id),
    }
  }
  if (section === 'notebooks') {
    if (!id) return { section, collection: '/notebooks' }
    const notebook = world.bookById.get(id)
    return { section, notebook, collection: notebook ? location.pathname : '/notebooks', missing: notebook ? '' : 'Notebook unavailable' }
  }
  if (section === 'tasks') {
    const task = world.visibleTasks.find((task) => task.id === id)
    return { section, task, collection: '/tasks', missing: id && !task ? 'Task unavailable' : '' }
  }
  if (!id && (section === 'notes' || section === 'trash' || section === 'search')) {
    return { section, collection: section === 'search' ? '/search?' + new URLSearchParams({ q: query }) : '/' + section, query }
  }
  return { section: 'notes', collection: '/notes', missing: 'Page unavailable' }
}
