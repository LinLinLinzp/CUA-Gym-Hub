import { useLocation, useNavigate } from 'react-router-dom'
import { getSessionId } from './utils/dataManager.js'

export function usePaths() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(search)
  const sid = params.get('sid') ?? getSessionId()

  function path(to, values = {}) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(values)) {
      if (value) query.set(key, value)
    }
    if (sid) query.set('sid', sid)
    return query.size ? to + '?' + query.toString() : to
  }

  function setQuery(values, options) {
    navigate(path(pathname, { ...Object.fromEntries(params), ...values }), options)
  }

  return { params, path, setQuery, navigate }
}

