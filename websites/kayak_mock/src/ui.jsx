import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export function useAccountPath() {
  const { search } = useLocation()
  return (path) => ({ pathname: path, search })
}

export function AccountLink({ to, ...props }) {
  const path = useAccountPath()
  return <Link to={path(to)} {...props} />
}

export function Symbol({ name, className = '' }) {
  return <span className={`symbol symbol-${name} ${className}`} aria-hidden="true" />
}

export function PageHeader({ title, description, actions, feature = false, eyebrow, children }) {
  return <header className={`page-header${feature ? ' feature' : ''}`}>
    {feature && <div className="route-art" aria-hidden="true"><i /><i /><i /><b /><b /></div>}
    <div className="heading-copy">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
    {actions && <div className="actions header-actions">{actions}</div>}
  </header>
}

export function Primary({ children, ...props }) {
  return <button type="button" className="primary" {...props}>{children}</button>
}

export function Filter({ label, value, onChange, options }) {
  const id = useId()
  return <div className="filter"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map(([key, caption]) => <option key={key} value={key}>{caption}</option>)}
  </select></div>
}

export function Search({ label, placeholder, value, onChange }) {
  const id = useId()
  return <div className="filter search"><label htmlFor={id}>{label}</label>
    <span className="search-control">
      <Symbol name="search" />
      <input id={id} type="search" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </span>
  </div>
}

export function Results({ count, singular, plural = `${singular}s`, onReset }) {
  return <div className="results">
    <span role="status">{count} {count === 1 ? singular : plural}</span>
    {onReset && <button type="button" className="text-button" onClick={onReset}>Clear search and filters</button>}
  </div>
}

export function Empty({ title, children, action }) {
  return <section className="empty">
    <h2>{title}</h2>{children && <p>{children}</p>}{action}
  </section>
}

const positive = ['Active', 'Upcoming', 'Confirmed']
const attention = ['Planning', 'Pending']
export function Badge({ children }) {
  const tone = positive.includes(children) ? 'positive' : attention.includes(children) ? 'attention' : 'neutral'
  return <span className={`badge ${tone}`}>{children}</span>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  const id = useId()

  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    const initial = dialog.querySelector('[data-initial-focus], input, select, textarea')
    if (initial) initial.focus()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  return <dialog ref={ref} className="dialog" aria-labelledby={id} onCancel={(event) => {
    event.preventDefault()
    onClose()
  }}>
    <header className="dialog-header"><h2 id={id}>{title}</h2>
      <button className="close" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
    </header>
    {children}
  </dialog>
}

export function FormDialog({ title, initial, onClose, onSave, children, submit = 'Save' }) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const id = useId()
  const form = useRef(null)

  function field(name, label, options = {}) {
    const { choices, multiline, wide, ...attributes } = options
    const inputId = `${id}-${name}`
    const props = {
      id: inputId,
      name,
      value: values[name] ?? '',
      onChange: (event) => {
        setValues({ ...values, [name]: event.target.value })
        if (errors[name]) setErrors({ ...errors, [name]: undefined })
      },
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? `${inputId}-error` : undefined,
      ...attributes,
    }
    return <div className={`field${wide ? ' wide' : ''}`}>
      <label htmlFor={inputId}>{label}</label>
      {choices ? <select {...props}>
        {choices.map(([value, caption]) => <option key={value} value={value}>{caption}</option>)}
      </select> : multiline ? <textarea rows={3} {...props} /> : <input {...props} />}
      {errors[name] && <span className="field-error" id={`${inputId}-error`}>{errors[name]}</span>}
    </div>
  }

  return <Dialog title={title} onClose={onClose}>
    <form ref={form} className="dialog-form" noValidate onSubmit={(event) => {
      event.preventDefault()
      const issues = onSave(values)
      if (issues && Object.keys(issues).length) {
        setErrors(issues)
        form.current.elements.namedItem(Object.keys(issues)[0])?.focus()
      }
    }}>
      <div className="dialog-body fields">{children(field, values)}</div>
      <footer className="dialog-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <Primary type="submit">{submit}</Primary>
      </footer>
    </form>
  </Dialog>
}

export function Confirm({ action, name, detail, onClose, onConfirm }) {
  return <Dialog title={action} onClose={onClose}>
    <div className="dialog-body"><p>{detail || <>Remove <strong>{name}</strong> from your account?</>}</p></div>
    <footer className="dialog-footer">
      <button type="button" data-initial-focus onClick={onClose}>Cancel</button>
      <button type="button" className="danger-fill" onClick={onConfirm}>{action}</button>
    </footer>
  </Dialog>
}
