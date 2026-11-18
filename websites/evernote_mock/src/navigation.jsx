import { createContext, useContext } from 'react'
import { Link } from 'react-router-dom'

export const Workspace = createContext(null)
export const useWorkspace = () => useContext(Workspace)

export const noteUrl = (id, collection = '/notes', taskId) => {
  const params = new URLSearchParams()
  if (collection !== '/notes') params.set('from', collection)
  if (taskId) params.set('task', taskId)
  return '/notes/' + encodeURIComponent(id) + (params.size ? '?' + params : '')
}
export const notebookUrl = (id) => '/notebooks/' + encodeURIComponent(id)
export const taskUrl = (id) => '/tasks/' + encodeURIComponent(id)

export function WorkspaceLink({ to, onClick, ...props }) {
  const { linkTo, flushEditor } = useWorkspace()
  return <Link {...props} to={linkTo(to)} onClick={(event) => {
    if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) flushEditor()
    onClick?.(event)
  }} />
}
