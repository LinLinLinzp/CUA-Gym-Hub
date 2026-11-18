import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { useStore } from './store.jsx'

const paths = {
  repository: 'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7m-9 4v10M7.5 5l9 4',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm3-3.9a4 4 0 0 1 0 7.8',
  search: 'M16 16l4 4m-2-9a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  tags: 'M3 4h8l9 9-7 7-9-9V4zm5 4h.01',
  lock: 'M5 10h14v10H5zm3 0V7a4 4 0 0 1 8 0v3',
  globe: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM2 12h20m-10-10c5 5.5 5 14.5 0 20-5-5.5-5-14.5 0-20z',
  close: 'M6 6l12 12M6 18L18 6',
}

export function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>
}

export function LocalLink({ to, ...props }) {
  return <Link {...props} to={withSid(to)} />
}

export function useLocalNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function Page({ section, trail = [], context, title, description, action, children }) {
  const crumbs = [{ name: section, to: section === 'Teams' ? '/teams' : '/repositories' }, ...trail]
  return <>
    <div className="utility">
      <nav aria-label="Breadcrumb">
        <ol>{crumbs.map(({ name, to }, index) => <li key={index}>
          {index > 0 && <Icon name="chevron" size={13} />}
          {index === crumbs.length - 1 ? <span aria-current="page">{name}</span> : <LocalLink to={to}>{name}</LocalLink>}
        </li>)}</ol>
      </nav>
      {context && <span className="context"><span className="status-dot" />{context}</span>}
    </div>
    <div className="content">
      <div className="page-head">
        <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
        {action}
      </div>
      {children}
    </div>
  </>
}

export function ActionLink({ to, children }) {
  return <LocalLink to={to} className="button primary"><Icon name="plus" />{children}</LocalLink>
}

export function Search({ label, value, onChange, placeholder }) {
  return <label className="control search"><span>{label}</span><span className="search-input">
    <Icon name="search" size={17} />
    <input type="search" value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
  </span></label>
}

export function Select({ label, value, onChange, options, disabled }) {
  const labelId = useId()
  return <label className="control">
    <span id={labelId}>{label}</span>
    <select aria-labelledby={labelId} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
      {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  </label>
}

export function Field({ label, hint, multiline, value, onChange, ...props }) {
  const labelId = useId()
  const hintId = useId()
  const Input = multiline ? 'textarea' : 'input'
  return <label className="control">
    <span id={labelId}>{label}</span>
    <Input {...props} aria-labelledby={labelId} aria-describedby={hint ? hintId : undefined} value={value}
      onChange={event => onChange(event.target.value)} />
    {hint && <small id={hintId}>{hint}</small>}
  </label>
}

export function ErrorText({ error }) {
  return error && <p className="error" role="alert">{error}</p>
}

export function Table({ headers, children, className = '' }) {
  return <div className={`table-wrap ${className}`}>
    <table>
      <thead><tr>{headers.map((header, index) => <th scope="col" key={index}>{header}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>
}

export function Empty({ title, children, icon = 'repository' }) {
  return <div className="empty">
    <span className="empty-icon"><Icon name={icon} size={25} /></span>
    <h2>{title}</h2>{children}
  </div>
}

export function Visibility({ value }) {
  if (value !== 'public' && value !== 'private') return '—'
  return <span className={`chip ${value}`}>
    <Icon name={value === 'public' ? 'globe' : 'lock'} size={13} />
    {value === 'public' ? 'Public' : 'Private'}
  </span>
}

export function PullCommand({ reference }) {
  const { announce } = useStore()
  const command = `docker pull ${reference}`
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command)
      } else {
        const selection = window.getSelection()
        const code = document.getElementById(commandId)
        const range = document.createRange()
        range.selectNodeContents(code)
        selection.removeAllRanges()
        selection.addRange(range)
        if (!document.execCommand('copy')) throw new Error()
        selection.removeAllRanges()
      }
      announce('Pull command copied.')
    } catch {
      announce('Copy is unavailable. Select the command to copy it manually.')
    }
  }
  const commandId = useId()
  return <div className="command"><code id={commandId}>{command}</code>
    <button type="button" onClick={copy}><Icon name="copy" size={16} />Copy</button>
  </div>
}

export function FormActions({ onCancel, label = 'Save', to, disabled }) {
  return <div className="form-actions">
    {to ? <LocalLink className="button" to={to}>Cancel</LocalLink> :
      <button type="button" onClick={onCancel}>Cancel</button>}
    <button type="submit" className="primary" disabled={disabled}>{label}</button>
  </div>
}

export function Dialog({ title, onCancel, onConfirm, confirm, disabled, children }) {
  const dialog = useRef(null)
  const cancel = useRef(null)
  const heading = useId()
  const [error, setError] = useState('')
  useEffect(() => {
    const opener = document.activeElement
    const element = dialog.current
    element.showModal()
    cancel.current.focus()
    return () => {
      element.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])
  function submit(event) {
    event.preventDefault()
    try {
      onConfirm()
    } catch (failure) {
      setError(failure.message)
    }
  }
  return <dialog ref={dialog} aria-labelledby={heading} onCancel={event => {
    event.preventDefault()
    onCancel()
  }}>
    <form onSubmit={submit}>
      <h2 id={heading}>{title}</h2>
      {children}
      <ErrorText error={error} />
      <div className="form-actions">
        <button type="button" ref={cancel} onClick={onCancel}>Cancel</button>
        <button className="primary" type="submit" disabled={disabled}>{confirm}</button>
      </div>
    </form>
  </dialog>
}

