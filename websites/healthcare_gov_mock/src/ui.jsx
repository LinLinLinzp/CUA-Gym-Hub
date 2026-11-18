import React, { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager'
import { appPath, dateLabel, marketLabel, statusText } from './model'

export function RouteLink({ to, nav = false, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}

export function useGo() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export function RouteFocus() {
  const { pathname, search } = useLocation()
  const route = pathname + search
  const previous = useRef(route)
  useEffect(() => {
    if (previous.current !== route) {
      previous.current = route
      window.scrollTo(0, 0)
      document.getElementById('content')?.focus({ preventScroll: true })
    }
  }, [route])
  return null
}

export function PageTitle({ title, children, action }) {
  return <div className="page-heading"><div><h1>{title}</h1>{children && <div className="subtitle">{children}</div>}</div>{action}</div>
}

export function Chip({ status }) {
  return <span className={`chip ${status || ''}`}>{statusText(status)}</span>
}

export function Empty({ title, children, to, action }) {
  return <section className="card empty"><h2>{title}</h2>{children && <p>{children}</p>}{to && <RouteLink className="button secondary" to={to}>{action}</RouteLink>}</section>
}

export function Missing({ title = 'Page unavailable', to = '/', action = 'Back to overview' }) {
  return <><PageTitle title={title} /><Empty title="Find your account information" to={to} action={action}>This link may refer to a record that is no longer available.</Empty></>
}

export function AppCrumb({ app }) {
  return <div className="breadcrumbs"><RouteLink to="/applications">Applications</RouteLink> <span aria-hidden="true">/</span> <RouteLink to={appPath(app)}>{app.id}</RouteLink></div>
}

export function ApplicationTable({ applications, compact = false }) {
  return <div className="table-card"><table className="application-table">
    <thead><tr><th scope="col">Application</th><th scope="col">Coverage</th><th scope="col">Status</th><th scope="col">{compact ? 'Action' : 'Last updated'}</th>{!compact && <th scope="col">Action</th>}</tr></thead>
    <tbody>{applications.map((app) => <tr key={app.id}>
      <th scope="row"><RouteLink to={appPath(app)}>{app.id}</RouteLink></th>
      <td data-label="Coverage">{marketLabel(app)}</td>
      <td data-label="Status"><Chip status={app.status} /></td>
      {!compact && <td data-label="Last updated">{dateLabel(app.updatedAt)}</td>}
      <td><RouteLink to={app.status === 'draft' ? `${appPath(app)}/edit` : appPath(app)}>{app.status === 'draft' ? 'Continue application' : 'View application'}</RouteLink></td>
    </tr>)}</tbody>
  </table></div>
}

export function Field({ id, label, error, hint, children }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {React.cloneElement(children, { id, 'aria-describedby': describedBy || undefined, 'aria-invalid': error ? true : undefined })}
    {hint && <div className="hint" id={`${id}-hint`}>{hint}</div>}
    {error && <div className="field-error" id={`${id}-error`}>{error}</div>}
  </div>
}

export function ErrorSummary({ errors }) {
  const ref = useRef(null)
  useEffect(() => { if (Object.keys(errors).length) ref.current?.focus() }, [errors])
  if (!Object.keys(errors).length) return null
  return <div className="error-summary" tabIndex="-1" ref={ref} role="alert">
    <strong>Check the information below</strong>
    <ul>{Object.entries(errors).map(([id, message]) => <li key={id}>{id === 'form' ? message : <a href={`#${id}`} onClick={(event) => {
      event.preventDefault()
      document.getElementById(id)?.focus()
    }}>{message}</a>}</li>)}</ul>
  </div>
}

export function DataList({ items, className = '' }) {
  return <dl className={`data-list ${className}`}>{items.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? 'Unavailable'}</dd></div>)}</dl>
}

export function FormActions({ back, onBack, next, children }) {
  return <div className="form-actions">
    {back && <RouteLink className="button secondary" to={back}>Back</RouteLink>}
    {onBack && <button type="button" className="secondary" onClick={onBack}>Back</button>}
    <button type="submit">{next}</button>{children}
  </div>
}

export function Steps({ labels, current, completed = -1 }) {
  return <aside className="card step-rail"><h2>Progress</h2><ol>{labels.map((label, index) => <li key={label} aria-current={current === index ? 'step' : undefined}>
    <span className="step-number" aria-hidden="true">{index <= completed && current !== index ? '✓' : index + 1}</span>
    <div>{label}{current === index && <small>Current step</small>}{current !== index && index <= completed && <small>Completed</small>}</div>
  </li>)}</ol></aside>
}
