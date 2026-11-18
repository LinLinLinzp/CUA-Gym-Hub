import { Link, NavLink, useNavigate } from 'react-router-dom'
import { withSid } from './dataManager.js'

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function SiteNavLink({ to, ...props }) {
  return <NavLink to={withSid(to)} {...props} />
}

export function useSiteNavigate() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export function routeWith(path, params) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  return query.size ? `${path}?${query}` : path
}
