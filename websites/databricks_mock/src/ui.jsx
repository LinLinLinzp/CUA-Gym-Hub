import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { list, titleCase } from './model.js'

export function SiteLink({ to, nav = false, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}

export function useSiteNavigate() {
  const navigate = useNavigate()
  return (path) => navigate(withSid(path))
}

export function Header({ title, description, children, section, parent }) {
  return <div className="page-head">
    <div>
      {section && <div className="crumb"><SiteLink to={section.to}>{section.label}</SiteLink>
        <span aria-hidden="true">/</span>{parent && <><SiteLink to={parent.to}>{parent.label}</SiteLink><span aria-hidden="true">/</span></>}
        <span>{title}</span></div>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {children && <div className="actions">{children}</div>}
  </div>
}

export function Table({ headers, rows, empty, label }) {
  return <div className="panel table-wrap" role="region" aria-label={label} tabIndex={0}>
    <table><thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
      <tbody>{rows.length ? rows : <tr><td className="empty" colSpan={headers.length}>{empty}</td></tr>}</tbody>
    </table>
  </div>
}

export function Status({ value, label }) {
  return <span className={'status status-' + (value ?? 'neutral')}><i aria-hidden="true" />{label ?? titleCase(value)}</span>
}

export function Missing({ resource, section }) {
  return <><Header title={resource + ' unavailable'} section={section} />
    <section className="panel pad"><p>This record may have been removed or belongs to another workspace.</p>
      <SiteLink to={section.to}>Return to {section.label}</SiteLink></section></>
}

export function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null)
  const id = useId()
  useEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    dialog.showModal()
    return () => {
      dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} className={wide ? 'wide' : ''} aria-labelledby={id} onCancel={(event) => {
    event.preventDefault()
    onClose()
  }}>
    <div className="dialog-header"><h2 id={id}>{title}</h2>
      <button type="button" className="icon-btn" aria-label="Close dialog" onClick={onClose}>×</button></div>
    {children}
  </dialog>
}

export function FormActions({ close, label = 'Save changes', danger = false, disabled = false }) {
  return <div className="form-actions">
    <button type="button" onClick={close}>Cancel</button>
    <button className={danger ? 'danger' : 'primary'} disabled={disabled}>{label}</button>
  </div>
}

export function Confirm({ verb, name, close, submit, children, requireName = true, blocked = false, danger = true }) {
  const [value, setValue] = useState('')
  return <Dialog title={verb + ' ' + name} onClose={close}>
    <form onSubmit={(event) => {
      event.preventDefault()
      if (!blocked && (!requireName || value === name)) submit()
    }}>
      {children}
      {requireName && !blocked && <label><span>Type <strong>{name}</strong> to confirm</span>
        <input autoFocus required value={value} onChange={(event) => setValue(event.target.value)} /></label>}
      <FormActions close={close} label={verb} danger={danger} disabled={blocked || (requireName && value !== name)} />
    </form>
  </Dialog>
}

export function Output({ output }) {
  if (!output) return null
  if (output.kind === 'table') {
    return <Table label="Run output" headers={list(output.columns)} rows={list(output.rows).map((row, i) => (
      <tr key={i}>{list(row).map((cell, j) => <td key={j}>{String(cell ?? '—')}</td>)}</tr>
    ))} empty="No rows returned." />
  }
  return <pre className={'output' + (output.kind === 'error' ? ' error' : '')}>{output.text ?? ''}</pre>
}

export const sections = {
  workspace: { label: 'Workspace', to: '/workspace' },
  jobs: { label: 'Jobs', to: '/jobs' },
  compute: { label: 'Compute', to: '/compute' },
}
