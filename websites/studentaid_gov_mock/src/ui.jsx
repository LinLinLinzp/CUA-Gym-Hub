import { Children, cloneElement, useEffect, useId } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { words } from './domain.js'

export function A({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}
export function useGo() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
export function usePageFocus() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.getElementById('page-heading')?.focus({ preventScroll: true })
  }, [pathname])
}
export function Heading({ title, description, actions, back, backLabel }) {
  usePageFocus()
  return <header className="page-heading">
    {back && <A className="back" to={back}><span aria-hidden="true">← </span>{backLabel}</A>}
    <div className="heading-row"><div><h1 id="page-heading" tabIndex={-1}>{title}</h1>
      {description && <p>{description}</p>}</div>{actions && <div className="actions">{actions}</div>}</div>
  </header>
}
export function Badge({ status }) {
  return <span className={'badge badge-' + status}><span aria-hidden="true" />{words(status)}</span>
}
export function Missing({ title = 'Page unavailable', to = '/', label = 'Dashboard' }) {
  return <><Heading title={title} /><Empty title="We couldn’t find that record or page."><A to={to}>{label}</A></Empty></>
}
export function Empty({ title, children }) {
  return <div className="panel empty"><strong>{title}</strong>{children && <div>{children}</div>}</div>
}
export function Field({ label, children }) {
  const id = useId()
  const [control, ...details] = Children.toArray(children)
  return <label className="field"><span id={id}>{label}</span>{cloneElement(control, { 'aria-labelledby': id })}{details}</label>
}
export function Options({ values }) {
  return values.map(value => Array.isArray(value) ? <option key={value[0]} value={value[0]}>{value[1]}</option> : <option key={value} value={value}>{words(value)}</option>)
}
export function Check({ children, ...props }) {
  return <label className="check"><input type="checkbox" {...props} /><span>{children}</span></label>
}
export function Problem({ errors = {} }) {
  const messages = Object.values(errors)
  if (!messages.length) return null
  return <div className="notice error" role="alert"><strong>Review the highlighted fields.</strong>
    <ul>{Object.entries(errors).map(([id, message]) => <li key={id}><a href={'#' + id}>{message}</a></li>)}</ul>
  </div>
}
export const errorProps = (errors, key) => errors[key] ? { 'aria-invalid': true } : {}
export function InlineError({ errors, name }) {
  return errors[name] ? <small className="inline-error">{errors[name]}</small> : null
}
export function Facts({ entries }) {
  return <dl className="facts">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}
export function Table({ columns, rows, label }) {
  return <div className="table-panel"><table aria-label={label}>
    <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
    <tbody>{rows.map(([id, ...cells]) => <tr key={id}>{cells.map((cell, index) => <td key={columns[index]} data-label={columns[index]}>{cell}</td>)}</tr>)}</tbody>
  </table></div>
}
export function Wizard({ steps, step, onStep, children }) {
  const id = useId()
  const index = steps.findIndex(([key]) => key === step)
  return <div className="wizard">
    <aside className="panel steps" aria-label="Progress"><ol>{steps.map(([key, title], i) => <li key={key} aria-current={step === key ? 'step' : undefined}>
      {i < index ? <button type="button" onClick={() => onStep(key)}><b>{i + 1}</b>{title}</button> : <span><b>{i + 1}</b>{title}</span>}
    </li>)}</ol></aside>
    <section className="panel form-panel" aria-labelledby={id}>
      <div className="step-count">Step {index + 1} of {steps.length}</div>
      <h2 id={id} tabIndex={-1} data-step-heading>{steps[index]?.[1]}</h2>
      {children}
    </section>
  </div>
}
export function focusError(errors) {
  requestAnimationFrame(() => document.getElementById(Object.keys(errors)[0])?.focus())
}
export function focusStep() {
  requestAnimationFrame(() => document.querySelector('[data-step-heading]')?.focus())
}
export function Glyph({ name }) {
  const paths = {
    dashboard: 'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',
    forms: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6m-6 4h6',
    loans: 'M3 7h18v13H3z M8 7V4h8v3 M3 12h18m-11 0v3h4v-3',
    repayment: 'M4 18V6m0 12h16M8 14l4-5 4 2 4-5',
    activity: 'M8 5h12M8 12h12M8 19h12M4 5h.01M4 12h.01M4 19h.01',
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}
