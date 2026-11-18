import { Link, useLocation, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager'

export const projectPath = (id) => '/projects/' + encodeURIComponent(id)
export const recordPath = (base, id) => base + '/' + encodeURIComponent(id)

export function useRouteLink() {
  const { search } = useLocation()
  return (path) => search ? path + search : withSid(path)
}

export function RouteLink({ to, ...props }) {
  const route = useRouteLink()
  return <Link to={route(to)} {...props} />
}

export function useRouteNavigate() {
  const route = useRouteLink()
  const navigate = useNavigate()
  return (path, options) => navigate(route(path), options)
}
