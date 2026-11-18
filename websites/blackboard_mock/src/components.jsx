import { cloneElement, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

export function SiteLink({ to, active = false, ...props }) {
  const { search } = useLocation()
  const Component = active ? NavLink : Link
  return <Component to={to + search} {...props} />
}

export const coursePath = (courseId) => '/courses/' + encodeURIComponent(courseId)
export const records = (value) => Array.isArray(value) ? value.filter(Boolean) : []
export const courseTitle = (course) => course?.title || 'Untitled course'
export const studentName = (student) => [student?.firstName, student?.lastName].filter(Boolean).join(' ') || student?.username || 'Unnamed student'
export const matches = (query, ...values) => values.some((value) => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
export const titleOrder = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base', numeric: true })
export const eligibleGrade = (grade) => grade.status === 'graded' && Number.isFinite(grade.score)
export const courseGrades = (state, courseId) => {
  const students = new Set(enrolledStudents(state, courseId).map(({ id }) => id))
  const items = new Set(records(state.gradeItems).filter((item) => item.courseId === courseId).map(({ id }) => id))
  return records(state.grades).filter((grade) => grade.courseId === courseId && students.has(grade.studentId) && items.has(grade.itemId))
}

export function enrolledStudents(state, courseId) {
  const ids = new Set(records(state.enrollments).filter((enrollment) => enrollment.courseId === courseId && enrollment.status === 'enrolled').map(({ studentId }) => studentId))
  return records(state.students).filter(({ id }) => ids.has(id))
}

export function dateLabel(value, time = false) {
  if (!value) return '—'
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00' : value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-US', time
    ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' })
}

const labels = {
  open: 'Open', closed: 'Closed', complete: 'Complete', ungraded: 'Ungraded',
  needs_grading: 'Needs grading', graded: 'Awaiting post', posted: 'Posted',
  draft: 'Draft', scheduled: 'Scheduled', hidden: 'Hidden',
}

export const statusLabel = (status) => labels[status] || '—'

export function Badge({ status }) {
  return <span className={'badge badge-' + status}>{statusLabel(status)}</span>
}

export function Field({ label, error, children }) {
  const id = useId()
  const errorId = id + '-error'
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {cloneElement(children, { id, 'aria-describedby': error ? errorId : undefined })}
    {error && <span className="error" id={errorId}>{error}</span>}
  </div>
}

export function Search({ label, value, onChange, placeholder }) {
  return <Field label={label}><input type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></Field>
}

export function Select({ label, value, onChange, children }) {
  return <Field label={label}><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></Field>
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>
}

export function Drawer({ title, wide = false, close, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])
  return <dialog ref={ref} className={'drawer' + (wide ? ' drawer-wide' : '')} aria-label={title}
    onCancel={(event) => { event.preventDefault(); close() }}
    onClick={(event) => { if (event.target === event.currentTarget) close() }}>
    <div className="drawer-inner">
      <header className="drawer-heading"><h2>{title}</h2><button type="button" className="icon" aria-label="Close" onClick={close}>×</button></header>
      {children}
    </div>
  </dialog>
}

export function Confirm({ title, children, confirmLabel, onConfirm, close, danger = false }) {
  return <Drawer title={title} close={close}>
    <p>{children}</p>
    <div className="actions"><button type="button" onClick={close}>Cancel</button>
      <button type="button" className={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</button></div>
  </Drawer>
}

export function useValidation() {
  const [errors, setErrors] = useState({})
  const ref = useRef(null)
  function validate(next) {
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) ref.current?.elements.namedItem(first)?.focus()
    return !first
  }
  return { errors, ref, validate }
}

export function Masthead({ account }) {
  const { pathname } = useLocation()
  const name = account?.name || 'Instructor'
  const initials = name.replace(/^Dr\.\s*|^Prof\.\s*/i, '').split(/\s+/).slice(0, 2).map((part) => part[0]).join('')
  return <header className="masthead"><div className="masthead-inner">
    <a className="wordmark" href={withSid('/')}>Blackboard</a>
    <nav aria-label="Main navigation">
      <SiteLink active to={pathname === '/' ? '/' : '/courses'}>Courses</SiteLink>
      <SiteLink active to="/grade-center">Grade Center</SiteLink>
      <SiteLink active to="/announcements">Announcements</SiteLink>
    </nav>
    <div className="identity"><span className="avatar" aria-hidden="true">{initials}</span><span>{name}</span></div>
  </div></header>
}
