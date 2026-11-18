import { useEffect, useState } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { CircleHelp } from 'lucide-react'
import { listPath, projectPath, useAppNavigate } from './navigation.jsx'
import { Dialog } from './ui.jsx'
import { active, array, boardOf, byId, inProject, listsOf, scheduleOf } from '../utils/records.js'
import { validDate } from '../utils/dates.js'

function createRoute(state, pathname, search) {
  const match = matchPath('/projects/:projectId/*', pathname)
  if (!match) return null
  const project = byId(state.projects, match.params.projectId)
    ?? array(state.projects).find((candidate) => encodeURIComponent(candidate.id) === match.params.projectId)
  if (!project) return null
  const base = projectPath(project)
  const params = new URLSearchParams(search)
  const tool = match.params['*']?.replace(/\/$/, '')

  if (tool === 'todos') {
    params.set('newList', '1')
    return base + '/todos?' + params
  }
  if (tool?.startsWith('todos/lists/')) {
    params.set('add', '1')
    return pathname + '?' + params
  }
  if (tool?.startsWith('todos/items/')) {
    const task = inProject(state.todos, project).find((item) => encodeURIComponent(item.id) === tool.slice(12))
    const list = active(task) && byId(listsOf(state, project), task.listId)
    return list ? listPath(project, list) + '?add=1' : null
  }
  if ((tool === 'message-board' || tool?.startsWith('message-board/')) &&
      tool !== 'message-board/new' && !tool.endsWith('/edit') && boardOf(state, project)) {
    return base + '/message-board/new'
  }
  if ((tool === 'schedule' || tool?.startsWith('schedule/')) &&
      tool !== 'schedule/new' && !tool.endsWith('/edit') && scheduleOf(state, project)) {
    const date = params.get('date')
    return base + '/schedule/new' + (validDate(date) ? '?date=' + date : '')
  }
  return null
}

export function Shortcuts({ state }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useAppNavigate()
  const { pathname, search } = location

  useEffect(() => {
    function onKey(event) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey ||
          document.querySelector('dialog[open]') || event.target.closest?.('input, textarea, select, [contenteditable]')) return
      if (event.key === '?') {
        event.preventDefault()
        setOpen(true)
      } else if (event.key === '/') {
        event.preventDefault()
        navigate('/find')
        document.querySelector('input[type=search]')?.focus()
      } else if (event.key.toLowerCase() === 'n') {
        const to = createRoute(state, pathname, search)
        if (!to) return
        event.preventDefault()
        navigate(to)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate, pathname, search, state])

  return <>
    <button type="button" className="icon-button shortcut-help" title="Keyboard shortcuts" aria-label="Keyboard shortcuts"
      onClick={() => setOpen(true)}><CircleHelp size={19} /></button>
    {open && <Dialog title="Keyboard shortcuts" onClose={() => setOpen(false)}>
      <dl className="shortcut-list">
        <div><dt><kbd>/</kbd></dt><dd>Open Find</dd></div>
        <div><dt><kbd>N</kbd></dt><dd>Create a list, to-do, message, or event from its project tool</dd></div>
        <div><dt><kbd>?</kbd></dt><dd>Show keyboard shortcuts</dd></div>
      </dl>
      <button type="button" className="button secondary" onClick={() => setOpen(false)}>Close</button>
    </Dialog>}
  </>
}
