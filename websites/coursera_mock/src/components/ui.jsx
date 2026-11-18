import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { withSid } from '../utils/dataManager.js'

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}
export const coursePath = id => '/learn/' + encodeURIComponent(id)
export const lessonPath = (course, lesson) => coursePath(course) + '/lesson/' + encodeURIComponent(lesson)
export const assignmentPath = (course, assignment) => coursePath(course) + '/assignments/' + encodeURIComponent(assignment)
export const certificatePath = id => '/accomplishments/' + encodeURIComponent(id)
export const verificationPath = code => '/verify/' + encodeURIComponent(code)
export const requirementPath = (courseId, row) => row.kind === 'lesson' ? lessonPath(courseId, row.id) : assignmentPath(courseId, row.id)

export const matches = (query, ...fields) => fields.join(' ').toLowerCase().includes(query.trim().toLowerCase())
export const duration = minutes => Number.isFinite(minutes) && minutes > 0
  ? [Math.floor(minutes / 60) ? Math.floor(minutes / 60) + ' hr' : '', minutes % 60 ? minutes % 60 + ' min' : ''].filter(Boolean).join(' ')
  : 'Duration unavailable'
export function dateText(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(date) : ''
}
const tags = {
  in_progress: ['In progress', 'blue'], completed: ['Completed', 'success'], withdrawn: ['Withdrawn', 'failure'],
  passed: ['Passed', 'success'], failed: ['Needs attention', 'warning'], issued: ['Issued', 'success'],
  not_started: ['Not started', 'neutral'], unavailable: ['Unavailable', 'neutral'],
}
export function Status({ value, label }) {
  const [name, tone] = tags[value] || tags.unavailable
  return <span className={'status ' + tone}><i aria-hidden="true" />{label || name}</span>
}
export function Progress({ value, showLabel = true }) {
  const percent = Math.min(100, Math.max(0, Number(value) || 0))
  return <div className="progress">
    <progress max="100" value={percent} aria-label="Course progress" />
    {showLabel && <span>{percent}%</span>}
  </div>
}
export function PageHeading({ title, subtitle, eyebrow }) {
  return <header className="page-heading">
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
    <h1>{title}</h1>
    {subtitle && <p className="subtitle">{subtitle}</p>}
  </header>
}
export function SearchField({ label, value, setValue }) {
  return <label className="filter search-field">
    <span className="sr-only">{label}</span><Search size={18} aria-hidden="true" />
    <input type="search" placeholder={label} value={value} onChange={event => setValue(event.target.value)} />
  </label>
}
export function SelectField({ label, value, setValue, options }) {
  return <label className="filter select-field">
    <span className="sr-only">{label}</span>
    <select value={value} onChange={event => setValue(event.target.value)}>
      {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>
  </label>
}
export function Empty({ title, description, to, action }) {
  return <section className="empty">
    <h2>{title}</h2><p>{description}</p>
    {to && <SiteLink to={to} className="button secondary">{action}<ArrowRight size={16} aria-hidden="true" /></SiteLink>}
  </section>
}
export function Back({ to, children }) {
  return <SiteLink to={to} className="back"><ArrowLeft size={16} aria-hidden="true" />{children}</SiteLink>
}
export function Missing({ to, action }) {
  return <Empty title="We couldn’t find this page" description="Use the link below to return to your workspace." to={to} action={action} />
}
export function Artwork({ variant = 'archive', className = '' }) {
  const styles = ['museum', 'film', 'archive', 'story', 'design', 'history', 'photo', 'material']
  return <div aria-hidden="true" className={'artwork art-' + (styles.includes(variant) ? variant : 'archive') + ' ' + className}>
    <span /><span /><span /><span /><span />
  </div>
}
export function Confirm({ title, description, onClose, onConfirm, label, danger = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const trigger = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && document.contains(trigger)) trigger.focus()
      else document.getElementById('workspace-main')?.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={event => { event.preventDefault(); onClose() }}>
    <header><h2 id="confirm-title">{title}</h2><button className="icon-button" aria-label="Close confirmation" onClick={onClose}><X size={19} /></button></header>
    <p id="confirm-description">{description}</p>
    <footer><button className="secondary" onClick={onClose} autoFocus>Cancel</button><button className={danger ? 'danger' : ''} onClick={onConfirm}>{label}</button></footer>
  </dialog>
}
