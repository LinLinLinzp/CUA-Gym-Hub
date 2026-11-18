import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

export const projectPath = (project) => `/projects/${encodeURIComponent(project.id)}`
export const listPath = (project, list) => `${projectPath(project)}/todos/lists/${encodeURIComponent(list.id)}`
export const taskPath = (project, todo) => `${projectPath(project)}/todos/items/${encodeURIComponent(todo.id)}`
export function messagePath(project, message) {
  const id = String(message.id)
  const reserved = ['new', 'drafts'].includes(id.toLowerCase())
  return `${projectPath(project)}/message-board/${encodeURIComponent(id)}${reserved ? '/details' : ''}`
}

export function eventPath(project, entry) {
  const id = String(entry.id)
  return `${projectPath(project)}/schedule/${encodeURIComponent(id)}${id.toLowerCase() === 'new' ? '/details' : ''}`
}

function keepSession(to, search) {
  const sid = new URLSearchParams(search).get('sid') || sessionStorage.getItem('mock_sid')
  const url = new URL(to, window.location.origin)
  if (sid && !url.searchParams.has('sid')) url.searchParams.set('sid', sid)
  return url.pathname + url.search + url.hash
}

export function AppLink({ to, nav, ...props }) {
  const { search } = useLocation()
  const Component = nav ? NavLink : Link
  return <Component {...props} to={keepSession(to, search)} />
}

export function useAppNavigate() {
  const { search } = useLocation()
  const navigate = useNavigate()
  return (to, options) => navigate(keepSession(to, search), options)
}

export function useQuery() {
  const { pathname, search } = useLocation()
  const navigate = useAppNavigate()
  const params = new URLSearchParams(search)
  return [params, (updates, options = { replace: true }) => {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    navigate(pathname + (next.size ? `?${next}` : ''), options)
  }]
}
