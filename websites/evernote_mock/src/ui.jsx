import { useLayoutEffect, useRef } from 'react'

const symbols = {
  search: '⌕', notes: '▤', notebooks: '▥', tasks: '☑', trash: '▱',
  add: '+', close: '×', more: '···', arrow: '↗', flag: '⚑', help: '?',
}

export function Symbol({ name }) {
  return <span className={'symbol symbol-' + name} aria-hidden="true">{symbols[name]}</span>
}

export function Heading({ title, count, children, back }) {
  return <header className="collection-heading">
    {back}
    <div className="heading-line">
      <div><h1>{title}</h1>{count && <p className="collection-count">{count}</p>}</div>
      {children && <div className="controls">{children}</div>}
    </div>
  </header>
}

export function Empty({ title, children, symbol = 'notes' }) {
  return <div className="empty">
    <div className="empty-icon"><Symbol name={symbol} /></div>
    <h2>{title}</h2>
    {children}
  </div>
}

export function Menu({ label, children, iconOnly = false, icon = 'more' }) {
  const ref = useRef(null)
  return <details className="menu" ref={ref} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && ref.current.open) {
      event.stopPropagation()
      ref.current.open = false
      ref.current.querySelector('summary').focus()
    }
  }}>
    <summary className={iconOnly ? 'button icon-button' : 'button'} aria-label={label}>
      {iconOnly ? <Symbol name={icon} /> : <>{label} <Symbol name={icon} /></>}
    </summary>
    <div className="menu-panel" onClick={(event) => {
      if (event.target.closest('button,a')) {
        ref.current.open = false
        ref.current.querySelector('summary').focus()
      }
    }}>{children}</div>
  </details>
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    dialog.querySelector('[data-initial-focus]')?.focus()
    return () => {
      dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={(event) => {
    event.preventDefault()
    onClose()
  }}>
    <h2 id="dialog-title">{title}</h2>
    {children}
  </dialog>
}

export function Sheet({ label, children, onClose, className = '', sheetRef, onBlur }) {
  return <div className="sheet-layer">
    <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
    <aside className={'sheet ' + className} aria-label={label} ref={sheetRef} onBlur={onBlur}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }}>
      {children}
    </aside>
  </div>
}
