import { useLayoutEffect, useRef } from 'react'

const symbols = {
  files: '▤', drafts: '◩', starred: '☆', trash: '♜', folder: '▱', search: '⌕',
  plus: '+', grid: '▦', list: '☰', more: '⋯', back: '←', close: '×', arrow: '→',
}
export function Icon({ name }) {
  return <span className={'icon icon-' + name} aria-hidden="true">{symbols[name]}</span>
}

export function Avatar({ name, color }) {
  const initials = String(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
  return <span className="avatar" style={{ backgroundColor: color }} aria-hidden="true">{initials || '·'}</span>
}

export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    dialog.querySelector('[data-focus]')?.focus()
    return () => {
      dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} className={wide ? 'dialog wide' : 'dialog'} aria-labelledby="modal-title"
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="dialog-inner">
      <header className="dialog-heading"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button quiet" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></header>
      {children}
    </div>
  </dialog>
}

export function FormFooter({ onClose, label, disabled, danger }) {
  return <div className="form-footer">
    <button type="button" onClick={onClose}>Cancel</button>
    <button type="submit" className={danger ? 'danger' : 'primary'} disabled={disabled}>{label}</button>
  </div>
}

export function Empty({ title, children }) {
  return <div className="empty"><h2>{title}</h2>{children}</div>
}

