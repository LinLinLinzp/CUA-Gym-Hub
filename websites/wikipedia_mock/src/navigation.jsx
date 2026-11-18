import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function ButtonLink({ primary, ...props }) {
  return <SiteLink className={primary ? 'button primary' : 'button'} {...props} />
}

export function useSiteNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function useQuery() {
  const [params, setParams] = useSearchParams()
  return [params, values => {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(values)) {
      if (value) next.set(name, value)
      else next.delete(name)
    }
    setParams(next, { replace: true })
  }]
}
