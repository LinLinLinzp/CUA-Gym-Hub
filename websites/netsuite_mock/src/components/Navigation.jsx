import { Link, useLocation, useNavigate } from 'react-router-dom'
import { withSid } from '../utils/dataManager.js'

export const sessionPath = (to) => /[?&]sid=/.test(to) ? to : withSid(to)

export function AppLink({ to, ...props }) {
  return <Link to={sessionPath(to)} {...props} />
}

export function useAppNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(sessionPath(to), options)
}

export function useQuery() {
  const location = useLocation()
  return new URLSearchParams(location.search)
}
