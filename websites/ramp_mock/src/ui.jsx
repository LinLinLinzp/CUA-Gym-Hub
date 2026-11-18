import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { getSessionId, withSid } from './utils/dataManager.js'
import { label } from './utils/format.js'

export function RouteLink({ to, nav, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component {...props} to={withSid(to)} />
}

export function BackLink({ base, children }) {
  const { state } = useLocation()
  const backTo = typeof state?.listPath === 'string' && state.listPath.startsWith(base + '?') ? state.listPath : base
  return <RouteLink to={backTo} className="back">← {children}</RouteLink>
}

export function RowLink({ to, children }) {
  const { pathname, search } = useLocation()
  const params = new URLSearchParams(search)
  params.delete('sid')
  return <RouteLink to={to} state={{ listPath: pathname + (params.size ? '?' + params : '') }}>{children}</RouteLink>
}

export function Heading({ title, subtitle, children }) {
  return <div className="heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children && <div className="actions">{children}</div>}</div>
}

export function Panel({ title, children, className = '' }) {
  return <section className={'panel ' + className}>{title && <h2>{title}</h2>}{children}</section>
}

export function Status({ value }) {
  const tones = { active: 'good', approved: 'good', paid: 'good', pending: 'warn', pending_approval: 'warn', locked: 'warn', scheduled: 'warn', rejected: 'bad' }
  return <span className={'pill ' + (tones[value] || 'neutral')}>{label(value)}</span>
}

export function Button({ children, variant = 'secondary', type = 'button', ...props }) {
  return <button {...props} type={type} className={'button ' + variant}>{children}</button>
}

export function Field({ label: title, error, hint, as: Control = 'input', children, ...props }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{title}</label>
    <Control {...props} id={id} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? id + '-help' : undefined}>{children}</Control>
    {(error || hint) && <span id={id + '-help'} className={error ? 'error' : 'muted'}>{error || hint}</span>}
  </div>
}

export function Select({ options, ...props }) {
  return <Field {...props} as="select">{options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</Field>
}

export function useFilters() {
  const [params, setParams] = useSearchParams()
  return {
    get: (key, fallback = '') => params.get(key) ?? fallback,
    set: (key, value) => {
      const next = new URLSearchParams(params)
      const sid = getSessionId()
      if (!next.has('sid') && sid) next.set('sid', sid)
      if (value) next.set(key, value)
      else next.delete(key)
      setParams(next, { replace: true })
    },
  }
}

export function Table({ columns, rows, empty = 'No records match your filters.' }) {
  if (!rows.length) return <div className="empty">{empty}</div>
  return <div className="table-wrap"><table><thead><tr>{columns.map(([name, numeric]) =>
    <th key={name} scope="col" className={numeric ? 'numeric' : undefined}>{name}</th>)}</tr></thead>
    <tbody>{rows.map(([id, cells]) => <tr key={id}>{cells.map((cell, i) =>
      <td key={columns[i][0]} className={columns[i][1] ? 'numeric' : undefined}>{cell}</td>)}</tr>)}</tbody>
  </table></div>
}

export function Facts({ rows }) {
  return <dl className="facts">{rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

export function Dialog({ title, onClose, children, wide }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} className={wide ? 'wide' : undefined}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id={titleId}>{title}</h2>
    {children}
  </dialog>
}

export function useForm(initial) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  return {
    values, setValues, errors, setErrors,
    bind: key => ({ value: values[key] ?? '', error: errors[key], onChange: event => {
      const value = event.target.value
      setValues(current => ({ ...current, [key]: value }))
      setErrors(current => ({ ...current, [key]: undefined, form: undefined }))
    } }),
    submit: (event, problems, save) => {
      event.preventDefault()
      setErrors(problems)
      if (Object.keys(problems).length) return
      try { save() } catch (error) { setErrors({ form: error.message }) }
    },
  }
}

export function FormFooter({ onClose, submit, error, danger, disabled }) {
  return <>{error && <p className="error" role="alert">{error}</p>}<div className="dialog-actions">
    <Button onClick={onClose}>Cancel</Button>
    <Button type="submit" disabled={disabled} variant={danger ? 'danger' : 'primary'}>{submit}</Button>
  </div></>
}

export function Confirmation({ title, children, submit = title, onClose, onConfirm, danger }) {
  const form = useForm({})
  return <Dialog title={title} onClose={onClose}>
    <form onSubmit={event => form.submit(event, {}, () => { onConfirm(); onClose() })}>
      <p>{children}</p><FormFooter onClose={onClose} submit={submit} error={form.errors.form} danger={danger} />
    </form>
  </Dialog>
}


