import { Link, useLocation } from 'react-router-dom'
import { getSessionId } from './utils/dataManager'

export const directories = {
  people: { title: 'People', path: '/directory/people', collection: 'users' },
  groups: { title: 'Groups', path: '/directory/groups', collection: 'groups' },
  apps: { title: 'Applications', path: '/applications', collection: 'applications' },
}

export function useRouteLink() {
  const { search } = useLocation()
  return (pathname, tab) => {
    const params = new URLSearchParams(search)
    const sid = getSessionId()
    if (sid) params.set('sid', sid)
    params.delete('tab')
    if (tab) params.set('tab', tab)
    return { pathname, search: params.toString() }
  }
}

export function Missing({ section }) {
  const to = useRouteLink()
  return <section className="panel empty">
    <h1>{section ? 'Record unavailable' : 'Page unavailable'}</h1>
    <p>Return to the directory to choose an available record.</p>
    <Link className="button" to={to(section?.path || directories.people.path)}>Back to {section?.title || 'People'}</Link>
  </section>
}
