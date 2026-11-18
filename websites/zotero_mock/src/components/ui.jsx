import { useEffect, useRef } from 'react'
import { itemTypes } from '../utils/model.js'

export function Tile({ type }) {
  return <span className={'tile tile-' + type} title={itemTypes[type]} aria-hidden="true">
    <span className="paper-mark" />
  </span>
}

export function Dialog({ title, close, children, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog.showModal()
    dialog.querySelector('[data-initial-focus]')?.focus()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  return <dialog ref={ref} className={wide ? 'dialog wide' : 'dialog'} aria-labelledby="dialog-title"
    onCancel={(event) => { event.preventDefault(); close() }}>
    <div className="dialog-head">
      <h2 id="dialog-title">{title}</h2>
      <button type="button" className="icon-button" aria-label="Close dialog" onClick={close}>×</button>
    </div>
    {children}
  </dialog>
}

export function FormActions({ close, submit = 'Save changes', danger = false }) {
  return <div className="form-actions">
    <button type="button" onClick={close}>Cancel</button>
    <button className={danger ? 'danger-button' : 'primary'}>{submit}</button>
  </div>
}

export function Empty({ title, children }) {
  return <div className="empty"><h2>{title}</h2>{children}</div>
}

export function Menu({ label, children }) {
  const summary = useRef(null)
  return <details className="menu" onClick={(event) => {
    if (event.target.closest('button')) {
      event.currentTarget.open = false
      summary.current.focus()
    }
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && event.currentTarget.open) {
      event.currentTarget.open = false
      summary.current.focus()
    }
  }}>
    <summary ref={summary} aria-label={label} title={label}>···</summary>
    <div className="menu-options">{children}</div>
  </details>
}
