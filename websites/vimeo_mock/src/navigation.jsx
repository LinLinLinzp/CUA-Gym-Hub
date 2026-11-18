import { ArrowLeft, Clapperboard } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export function useRoutePath() {
  const { search } = useLocation()
  return (path) => path + search
}

export function WorkspaceLink({ to, ...props }) {
  return <Link to={useRoutePath()(to)} {...props} />
}

export function useWorkspaceNavigate() {
  const path = useRoutePath()
  const navigate = useNavigate()
  return (to) => navigate(path(to))
}

export function Recovery({ title = 'Page unavailable', area = 'Library' }) {
  return <section className="empty recovery">
    <Clapperboard aria-hidden="true" size={28} />
    <h1>{title}</h1>
    <WorkspaceLink className="button" to={area === 'Showcases' ? '/showcases' : '/videos'}>
      <ArrowLeft size={16} /> Back to {area}
    </WorkspaceLink>
  </section>
}
