import { useEffect, useId, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { withSid } from '../utils/dataManager'
import { coursePath } from '../data/views'

export const Nav = ({ to, ...props }) => <NavLink to={withSid(to)} {...props} />
export const Go = ({ to, ...props }) => <Link to={withSid(to)} {...props} />
export function useGo() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

const icons = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  books: 'M4 5h5v15H4zM10 5h4v15h-4zM15 6l4-1 4 14-4 1z',
  work: 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6',
  grade: 'M4 4h16v16H4zM4 9h16M9 9v11M14 9v11M4 15h16',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M16 3a4 4 0 0 1 0 8',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2',
  check: 'm5 12 5 5L20 7',
  plus: 'M12 4v16M4 12h16',
}
export function Icon({ name, size = 19 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={icons[name]} /></svg>
}

export function Heading({ title, subtitle, actions, children }) {
  const { pathname } = useLocation()
  useEffect(() => { document.title = title + ' | Moodle' }, [title, pathname])
  return <><header className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="actions">{actions}</div>}</header>{children}</>
}

export function CourseTabs({ course }) {
  const base = coursePath(course)
  return <nav className="tabs" aria-label="Course navigation">
    <Nav end to={base}>Course</Nav><Nav to={base + '/participants'}>Participants</Nav>
    <Nav to={base + '/grades'}>Grades</Nav><Nav to={base + '/settings'}>Settings</Nav>
  </nav>
}

export function Missing({ to = '/courses', title = 'Page unavailable', children }) {
  return <Heading title={title}><div className="panel empty"><p>{children ?? 'This record is unavailable in the current workspace.'}</p><Go className="button secondary" to={to}>Go back</Go></div></Heading>
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={'badge ' + tone}>{children}</span>
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>
}

export function Field({ label, error, children }) {
  const id = useId()
  return <label className="field"><span id={id + '-label'}>{label}</span>{children({ 'aria-labelledby': id + '-label', 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? id : undefined })}{error && <span className="error" id={id}>{error}</span>}</label>
}

export function Select({ label, value, onChange, children }) {
  const id = useId()
  return <label className="filter"><span id={id}>{label}</span><select aria-labelledby={id} value={value} onChange={event => onChange(event.target.value)}>{children}</select></label>
}

export function Search({ label, value, onChange, placeholder }) {
  return <label className="filter search"><span>{label}</span><input type="search" value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>
}

export function FormActions({ cancel, children }) {
  return <div className="actions form-actions">{children}<Go className="button secondary" to={cancel}>Cancel</Go></div>
}

export function Pagination({ count, size, page, setPage, label }) {
  if (!count) return null
  return <div className="pagination"><span>{page * size + 1}–{Math.min((page + 1) * size, count)} of {count} {label}</span>
    {count > size && <div className="actions"><button type="button" className="secondary" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><button type="button" className="secondary" disabled={(page + 1) * size >= count} onClick={() => setPage(page + 1)}>Next</button></div>}
  </div>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2><button type="button" className="secondary icon-button" aria-label="Close dialog" onClick={onClose}>×</button></div>
    {children}
  </dialog>
}
