import React, { useEffect, useRef } from 'react'
import { AlertCircle, ArrowLeft, Bug, Check, CheckCircle2, Circle, Clock, Layers3, ListChecks, X } from 'lucide-react'
import { list, userName } from '../model.js'
import { useStore } from '../store.jsx'
import { PLink } from '../navigation.jsx'

const LABELS = { inProgress: 'In progress', pendingApproval: 'Pending approval', waitingForAuthor: 'Waiting for author',
  approvedWithSuggestions: 'Approved with suggestions', individualCI: 'Continuous integration', pullRequest: 'Pull request' }
export const human = (value) => value ? LABELS[value] ?? (value[0].toUpperCase() + value.slice(1)) : '—'
export const dateText = (value) => value && !Number.isNaN(Date.parse(value))
  ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

export function Avatar({ user, small = false }) {
  return <span className={'avatar' + (small ? ' small' : '')} style={{ '--avatar': user?.avatarColor ?? '#546A82' }} aria-hidden="true">{user?.initials || user?.displayName?.split(' ').map((s) => s[0]).slice(0, 2).join('') || '?'}</span>
}
export function Person({ id }) {
  const { data } = useStore()
  return <span className="person">{id && <Avatar small user={list(data.users).find((user) => user.id === id)} />}{userName(data, id)}</span>
}
export function Status({ value }) {
  const status = String(value ?? '').toLowerCase()
  const ok = ['succeeded','approved','approvedwithsuggestions','closed','completed','resolved'].includes(status)
  const bad = ['failed','rejected','abandoned'].includes(status)
  const waiting = ['pendingapproval','pending','blocked'].includes(status)
  const active = ['active','inprogress'].includes(status)
  const Icon = ok ? CheckCircle2 : bad ? AlertCircle : waiting || active ? Clock : Circle
  return <span className={'status ' + (ok ? 'success' : bad ? 'error' : waiting ? 'warning' : active ? 'running' : '')}><Icon size={13} />{human(value)}</span>
}
export function TypeIcon({ type }) {
  const Icon = type === 'Bug' ? Bug : type === 'Feature' ? Layers3 : type === 'Task' ? Check : ListChecks
  return <Icon className={'type-icon ' + String(type).toLowerCase().replace(' ', '-')} size={16} aria-label={type} />
}
export function Button({ primary = false, className = '', type = 'button', ...props }) {
  return <button type={type} className={'button ' + (primary ? 'primary ' : '') + className} {...props} />
}
export function PageHead({ title, subtitle, children }) {
  return <header className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children && <div className="actions">{children}</div>}</header>
}
export function Tabs({ items, value, onChange, label = 'View' }) {
  return <div className="tabs local-tabs" role="group" aria-label={label}>{items.map((item) => {
    const [id, text] = Array.isArray(item) ? item : [item, item]
    return <button key={id} type="button" className={value === id ? 'selected' : ''} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>
  })}</div>
}
export const Empty = ({ title = 'No results', children }) => <div className="empty"><h2>{title}</h2>{children}</div>
export const Missing = ({ title, to = '/_summary' }) => <Empty title={title ?? 'This record is unavailable'}><PLink to={to}><ArrowLeft size={14} /> Back to project view</PLink></Empty>
export const ErrorText = ({ error }) => error ? <p className="form-error" role="alert"><AlertCircle size={15} /> {error}</p> : null
export const Panel = ({ title, children, className = '' }) => <section className={'panel ' + className}>{title && <h2>{title}</h2>}{children}</section>
export const Field = ({ label, children, className = '' }) => <label className={'field ' + className}><span>{label}</span>{children}</label>
export function Select({ options, empty, ...props }) {
  return <select {...props}>{empty !== undefined && <option value="">{empty}</option>}{options.map((option) => {
    const [id, label] = Array.isArray(option) ? option : [option, option]
    return <option key={id} value={id}>{label}</option>
  })}</select>
}
export function MultiSelect({ options, value, onChange, ...props }) {
  return <select multiple size={Math.min(5, Math.max(2, options.length))} value={value} onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))} {...props}>
    {options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
  </select>
}
export function Table({ columns, rows, render, empty = 'No matching records' }) {
  if (!rows.length) return <Empty title={empty} />
  return <div className="table-wrap"><table><thead><tr>{columns.map((column, i) => <th key={i} scope="col">{column}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.id}>{render(row)}</tr>)}</tbody></table></div>
}
export function Dialog({ title, onClose, drawer = false, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} className={drawer ? 'drawer' : ''} onCancel={(event) => { event.preventDefault(); onClose() }} aria-label={title}>
    <header><h2>{title}</h2><Button className="icon-button" aria-label="Close" onClick={onClose}><X size={18} /></Button></header>{children}
  </dialog>
}
export function ActionMenu({ label, children, title, disabled, primary, accessibleLabel }) {
  return <details className="menu">
    <summary className={'button' + (primary ? ' primary' : '') + (disabled ? ' disabled' : '')} aria-label={accessibleLabel} title={title} aria-disabled={disabled} onClick={(event) => { if (disabled) event.preventDefault() }}>{label}</summary>
    <div className="popover" onClick={(event) => { if (event.target.closest('button,a')) event.currentTarget.parentElement.open = false }}>{children}</div>
  </details>
}
export const Tags = ({ tags }) => <span className="tags">{list(tags).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</span>

export function Code({ text, dark = false }) {
  return <div className={'code ' + (dark ? 'log' : '')}>{String(text ?? '').split('\n').map((line, index) => <div key={index}><span className="line-number" aria-hidden="true">{index + 1}</span><code>{line || ' '}</code></div>)}</div>
}
