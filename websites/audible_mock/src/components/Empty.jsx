import { SiteLink } from './links.jsx'

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Missing({ title, to = '/library', label = 'Back to Library' }) {
  return (
    <section>
      <h1 tabIndex={-1}>{title}</h1>
      <Empty title="This page is unavailable" action={<SiteLink className="button" to={to}>{label}</SiteLink>}>
        You can continue from your account.
      </Empty>
    </section>
  )
}
