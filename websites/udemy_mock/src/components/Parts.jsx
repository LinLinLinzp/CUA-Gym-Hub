import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getSessionId } from '../utils/dataManager.js'

function sessionPath(path, search) {
  const url = new URL(path, window.location.origin)
  const sid = new URLSearchParams(search).get('sid') || getSessionId()
  if (sid) url.searchParams.set('sid', sid)
  return url.pathname + url.search + url.hash
}

export function RouteLink({ to, ...props }) {
  const { search } = useLocation()
  return <Link to={sessionPath(to, search)} {...props} />
}

export function useRouteNavigate() {
  const navigate = useNavigate()
  const { search } = useLocation()
  return (path, options) => navigate(sessionPath(path, search), options)
}

export function PageTitle({ title, children, actions }) {
  useEffect(() => { document.title = 'Udemy | ' + title }, [title])
  return <div className="page-heading"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{actions && <div className="actions">{actions}</div>}</div>
}

export function Empty({ title, children, action }) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>
}

export function Missing({ title = 'This page is unavailable', to = '/my-learning', label = 'Back to My learning', children }) {
  return <><PageTitle title={title} /><Empty title="Choose another destination" action={<RouteLink className="button" to={to}>{label}</RouteLink>}>{children}</Empty></>
}

export function Artwork({ category, wide = false, variant = 0 }) {
  const palette = ['Illustration', 'Music'].includes(category) ? 'lilac'
    : ['Photography', 'Design'].includes(category) ? 'clay' : 'green'
  return <div className={'artwork ' + palette + (wide ? ' art-wide' : '') + ' art-' + (variant % 3)} aria-hidden="true">
    <span className="art-disc" /><span className="art-rings" /><span className="art-lines" /><span className="art-dot" />
  </div>
}

export function Progress({ percent, done, total }) {
  return <div className="progress">
    <progress value={percent} max="100" aria-label="Course progress" />
    <span>{percent}% <span className="progress-count">· {done}/{total} lessons</span></span>
  </div>
}

export function Search({ label, value, onChange, placeholder }) {
  const id = useId()
  return <div className="filter"><label htmlFor={id}>{label}</label><input id={id} type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></div>
}

export function Select({ label, value, onChange, options }) {
  const id = useId()
  return <div className="filter"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={event => onChange(event.target.value)}>
    {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
  </select></div>
}

export function Modal({ title, onClose, children }) {
  const dialog = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const node = dialog.current
    node.showModal()
    const field = node.querySelector('[data-initial-focus]')
    if (field) field.focus()
    return () => {
      node.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])

  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose() }} aria-labelledby="dialog-title">
    <div className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>×</button></div>
    {children}
  </dialog>
}

export function FormDialog({ title, fields, initial, submitLabel, onClose, onSave }) {
  const [values, setValues] = useState(initial || {})
  const [errors, setErrors] = useState({})
  function submit(event) {
    event.preventDefault()
    const next = {}
    const invalid = {}
    for (const field of fields) {
      const value = String(values[field.name] ?? '').trim()
      if (field.required && !value) invalid[field.name] = 'Enter ' + (field.prompt || field.label.toLowerCase()) + '.'
      else if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) <= 0)) invalid[field.name] = 'Enter a duration greater than zero.'
      next[field.name] = field.type === 'number' ? Number(value) : value
    }
    setErrors(invalid)
    if (Object.keys(invalid).length) {
      event.currentTarget.elements.namedItem(Object.keys(invalid)[0])?.focus()
      return
    }
    if (!initial || fields.some(field => String(initial[field.name] ?? '').trim() !== String(next[field.name]))) onSave(next)
    onClose()
  }
  return <Modal title={title} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      {fields.map((field, index) => {
        const props = {
          id: 'field-' + field.name,
          name: field.name,
          value: values[field.name] ?? '',
          onChange: event => {
            setValues({ ...values, [field.name]: event.target.value })
            if (errors[field.name]) setErrors({ ...errors, [field.name]: '' })
          },
          'data-initial-focus': index === 0 ? '' : undefined,
          'aria-invalid': Boolean(errors[field.name]),
          'aria-describedby': errors[field.name] ? 'error-' + field.name : undefined,
          'aria-required': field.required || undefined,
        }
        return <div className="form-field" key={field.name}>
          <label htmlFor={props.id}>{field.label}{field.optional && <span> (optional)</span>}</label>
          {field.type === 'textarea' ? <textarea {...props} rows={4} /> : field.options
            ? <select {...props}><option value="">Choose a category</option>{field.options.map(option => <option key={option}>{option}</option>)}</select>
            : <input {...props} type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} />}
          {errors[field.name] && <div className="error" id={'error-' + field.name}>{errors[field.name]}</div>}
        </div>
      })}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">{submitLabel}</button></div>
    </form>
  </Modal>
}

export function ConfirmDialog({ title, children, label, onClose, onConfirm }) {
  return <Modal title={title} onClose={onClose}><p>{children}</p><div className="dialog-actions">
    <button data-initial-focus type="button" onClick={onClose}>Cancel</button>
    <button type="button" className="danger" onClick={() => { onConfirm(); onClose() }}>{label}</button>
  </div></Modal>
}
