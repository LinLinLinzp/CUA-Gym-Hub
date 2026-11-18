import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getSessionId } from '../utils/dataManager.js'

export function useSidPath() {
  const { search } = useLocation()
  const sid = new URLSearchParams(search).get('sid') || getSessionId()
  return (to) => {
    const url = new URL(to, window.location.origin)
    if (sid) url.searchParams.set('sid', sid)
    return url.pathname + url.search + url.hash
  }
}

export function AccountLink({ to, ...props }) {
  return <Link to={useSidPath()(to)} {...props} />
}

export function useAccountNavigate() {
  const navigate = useNavigate()
  const path = useSidPath()
  return (to, options) => navigate(path(to), options)
}

export function BackLink({ to, children }) {
  return <AccountLink className="text-link back-link" to={to}><ArrowLeft size={16} aria-hidden="true" />{children}</AccountLink>
}

export function Missing({ title = 'Page unavailable', to = '/', label = 'Back to overview' }) {
  return <section className="card empty">
    <h1>{title}</h1>
    <p className="muted">Choose a destination to continue.</p>
    <AccountLink className="button primary" to={to}>{label} <ArrowRight size={16} aria-hidden="true" /></AccountLink>
  </section>
}
