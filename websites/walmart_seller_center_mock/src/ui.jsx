import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { date, label, text } from './model.js'

export function SiteLink({ to, nav = false, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}

const icons = {
  catalog: <><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M9 6V4h6v2m-5 8h4"/></>,
  orders: <><path d="M6 4h9l3 3v13H6zM14 4v4h4M9 12h6m-6 4h6"/></>,
  returns: <><path d="M7 8h8a5 5 0 0 1 0 10h-3M10 5 7 8l3 3"/><path d="M7 14v4h5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/></>,
  left: <path d="m14 6-6 6 6 6"/>,
  right: <path d="m10 6 6 6-6 6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  download: <><path d="M12 4v11m-4-4 4 4 4-4M5 17v3h14v-3"/></>,
  check: <path d="m5 12 4 4 10-10"/>,
}

export function Icon({ name, size = 20 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export function Pill({ status }) {
  return <span className={'pill ' + (status ?? '')}><span aria-hidden="true" />{label(status)}</span>
}

export function PageHead({ title, description, back, badge, children }) {
  return <header className="page-head">
    <div>{back && <SiteLink to={back.to} className="back"><Icon name="left" size={15} />{back.label}</SiteLink>}
      <div className="heading-line"><h1 tabIndex={-1}>{title}</h1>{badge}</div>
      {description && <p>{description}</p>}
    </div>
    {children && <div className="page-actions">{children}</div>}
  </header>
}

export function Panel({ title, action, children, className = '' }) {
  return <section className={'panel ' + className}>
    {title && <div className="panel-heading"><h2>{title}</h2>{action}</div>}
    {children}
  </section>
}

export function Facts({ entries }) {
  return <dl className="facts">{entries.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'object' && value !== null ? value : text(value)}</dd></div>)}</dl>
}

export function Activity({ entries, empty = 'No activity recorded yet.' }) {
  const ordered = [...entries].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
  return <Panel title="Activity">
    {ordered.length ? <ul className="activity">{ordered.map((entry) => <li key={entry.id}>
      <span className="event-dot" aria-hidden="true" />
      <div><strong>{entry.title ?? label(entry.type)}</strong><p>{entry.detail ?? text(entry.actorId)}</p></div><time>{date(entry.createdAt)}</time>
    </li>)}</ul> : <p className="panel-note">{empty}</p>}
  </Panel>
}

export function Empty({ title = 'No results', children = 'Try changing your search or filters.' }) {
  return <div className="empty"><strong>{title}</strong><div>{children}</div></div>
}

export function Missing({ to, name }) {
  return <><PageHead title={name + ' unavailable'} /><Panel><Empty title={'This ' + name.toLowerCase() + ' could not be found'}><SiteLink to={to}>Return to the queue</SiteLink></Empty></Panel></>
}

export function Search({ value, onChange, name, placeholder }) {
  return <label className="search"><span className="sr-only">{name}</span><Icon name="search" size={18} />
    <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
  </label>
}

export function Select({ name, value, onChange, options }) {
  const id = useId()
  return <div className="filter"><label htmlFor={id}>{name}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map(([key, title]) => <option key={key} value={key}>{title}</option>)}
  </select></div>
}

export function Tabs({ tabs, active, section }) {
  return <nav className="tabs" aria-label={section + ' views'}>{tabs.map(([key, title, count]) => <SiteLink
    key={key} to={key ? '/' + section + '?view=' + key : '/' + section} aria-current={active === key ? 'page' : undefined}
  >{title}<span>{count}</span></SiteLink>)}</nav>
}

export function Table({ columns, children, empty, className = '' }) {
  return <div className={'table-wrap ' + className}>
    <table><thead><tr>{columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
    {empty && <Empty />}
  </div>
}

export function Pager({ page, pageSize, total, onPage }) {
  const start = page * pageSize
  return <div className="pager">
    <span>{total ? 'Showing ' + (start + 1) + '–' + Math.min(start + pageSize, total) + ' of ' + total : '0 results'}</span>
    <div><button className="button square" aria-label="Previous page" disabled={!page} onClick={() => onPage(page - 1)}><Icon name="left" size={16} /></button>
      <button className="button square" aria-label="Next page" disabled={start + pageSize >= total} onClick={() => onPage(page + 1)}><Icon name="right" size={16} /></button>
    </div>
  </div>
}

export function Field({ label: name, error, help, children, ...props }) {
  const id = useId()
  const Element = props.as ?? 'input'
  const { as, ...input } = props
  return <div className="field"><label htmlFor={id}>{name}</label>
    <Element id={id} {...input} aria-invalid={error ? true : undefined} aria-describedby={error || help ? id + '-hint' : undefined}>{children}</Element>
    {(error || help) && <span id={id + '-hint'} className={error ? 'error-text' : 'muted'}>{error || help}</span>}
  </div>
}

export function Dialog({ title, confirm = title, onClose, onConfirm, children, danger = false, wide = false }) {
  const ref = useRef(null)
  const id = useId()
  const [error, setError] = useState('')
  const submitted = useRef(false)
  useEffect(() => {
    const element = ref.current
    const previous = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (previous?.isConnected && !previous.disabled) previous.focus()
      else document.querySelector('main h1')?.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={id} className={wide ? 'wide' : ''} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <form noValidate onChange={() => { if (error) setError('') }} onSubmit={(event) => {
      event.preventDefault()
      if (submitted.current) return
      const errorMessage = onConfirm()
      if (errorMessage) setError(errorMessage)
      else {
        submitted.current = true
        onClose()
      }
    }}>
      <div className="dialog-head"><h2 id={id}>{title}</h2><button type="button" className="button square" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
      <div className="dialog-body">{children}{error && <p className="error-text" role="alert">{error}</p>}</div>
      <footer className="dialog-actions"><button type="button" className="button" onClick={onClose}>Back</button>
        <button className={'button ' + (danger ? 'danger' : 'primary')} type="submit">{confirm}</button>
      </footer>
    </form>
  </dialog>
}

export function Thumbnail({ type }) {
  const kinds = ['kitchen', 'home', 'outdoor', 'office', 'pet']
  return <span className={'thumbnail ' + (kinds.includes(type) ? type : 'home')} aria-hidden="true"><i /></span>
}
