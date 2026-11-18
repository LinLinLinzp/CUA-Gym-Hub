import { Link } from 'react-router-dom'
import { withSid } from '../utils/dataManager.js'

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export const titlePath = (id) => `/title/${encodeURIComponent(id)}`
export const orderPath = (id) => `/account/purchases/${encodeURIComponent(id)}`
