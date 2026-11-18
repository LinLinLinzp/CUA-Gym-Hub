import { cloneElement, useEffect, useId, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { withSid } from '../utils/dataManager.js'
import { formatDate, stateNames } from '../model.js'

export function SiteLink({ to, nav = false, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}

export function PageTitle({ title, description, actions, back }) {
  return <>
    {back && <SiteLink className="back" to={back.to}>← {back.label}</SiteLink>}
    <div className="page-title">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  </>
}

export function Pill({ value }) {
  return value ? <span className={'pill ' + String(value).toLowerCase()}>{stateNames[value] ?? value}</span> : '—'
}

export function Field({ label, error, hint, children }) {
  const id = useId()
  const description = [hint && id + '-hint', error && id + '-error'].filter(Boolean).join(' ')
  return <div className={'field' + (error ? ' invalid' : '')}>
    <label htmlFor={id}>{label}</label>
    {cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': description || undefined })}
    {hint && <small className="muted" id={id + '-hint'}>{hint}</small>}
    {error && <small role="alert" id={id + '-error'}>{error}</small>}
  </div>
}

export function Table({ columns, children, empty, caption }) {
  return <div className="table-wrap">
    {empty ? <div className="empty">{empty}</div> :
      <table aria-label={caption}><thead><tr>{columns.map((column, index) => <th scope="col" key={index}>{column}</th>)}</tr></thead><tbody>{children}</tbody></table>}
  </div>
}

export function Dialog({ title, onClose, children }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
    <h2>{title}</h2>{children}
  </dialog>
}

export function Confirm({ title, description, action, submit, onClose, danger }) {
  return <Dialog title={title} onClose={onClose}>
    <p>{description}</p>
    <div className="form-actions">
      <button onClick={onClose}>Cancel</button>
      <button className={danger ? 'danger' : 'primary'} onClick={submit}>{action}</button>
    </div>
  </Dialog>
}

export function Details({ items }) {
  return <dl className="details">{items.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

export function Activity({ items, users }) {
  return items.length ? <ul className="activity">{items.map(item => {
    const [subject, verb] = String(item.type ?? '').split('.')
    const names = { query_ran: 'Query ran', updated: 'Updated', created: 'Created', dropped: 'Dropped', resumed: 'Resumed', suspended: 'Suspended', deleted: 'Deleted', revoked: 'Revoked' }
    return <li key={item.id}><strong>{names[verb] ?? subject ?? 'Activity'}</strong><span>{item.entityLabel ?? '—'}</span><small>{users.find(user => user.id === item.actorUserId)?.displayName ?? '—'} · {formatDate(item.createdAt)}</small></li>
  })}</ul> : <div className="empty">No recent activity.</div>
}

export function Missing({ area }) {
  return <><PageTitle title={area ? 'Record unavailable' : 'Page unavailable'} description="The address may have changed or the record may have been removed." />
    <SiteLink className="button primary" to={area ? '/' + area.toLowerCase() : '/'}>{area ? 'Back to ' + area : 'Back to overview'}</SiteLink>
  </>
}
