import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Globe, LockKeyhole, Users, X } from 'lucide-react'
import { localAsset, userName } from '../data/selectors.js'
import { withSid } from '../utils/dataManager.js'

export function IconButton({ icon: Icon, label, className = '', size = 18, children, ...props }) {
  return <button type="button" className={'icon-button ' + className} aria-label={label} title={label} {...props}>
    {Icon && <Icon size={size} aria-hidden="true" />}{children}
  </button>
}

export function Avatar({ user, size = 32, presence, className = '' }) {
  const name = userName(user)
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  const color = [...(user?.id ?? name)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 7
  const url = localAsset(user?.avatarUrl)
  return <span className={'avatar ' + className} style={{ '--avatar-size': size + 'px', '--avatar-color': color }} title={name} aria-label={name}>
    {url ? <img src={withSid(url)} alt="" /> : initials}
    {presence && <span className={'presence ' + presence} title={presence} aria-label={presence} />}
  </span>
}

export function ChannelIcon({ channel, size = 16 }) {
  const Icon = channel.type === 'P' ? LockKeyhole : ['D', 'G'].includes(channel.type) ? Users : Globe
  return <Icon size={size} aria-hidden="true" />
}

export function Empty({ icon: Icon, title, children }) {
  return <div className="empty">{Icon && <Icon size={33} aria-hidden="true" />}<h2>{title}</h2>{children}</div>
}

const focusable = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]'
const visibleControls = node => [...node.querySelectorAll(focusable)].filter(control => control.getClientRects().length)

export function Dialog({ title, children, close, wide, className = '' }) {
  const container = useRef(null)
  const closeRef = useRef(close)
  closeRef.current = close

  useLayoutEffect(() => {
    const previous = document.activeElement
    const node = container.current
    const initial = node.querySelector('[data-focus]') ?? visibleControls(node).find(el => !el.classList.contains('dialog-close')) ?? node
    initial.focus()
    function key(event) {
      if (event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const controls = visibleControls(node)
      const first = controls[0]
      const last = controls.at(-1)
      if (!first || event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement)) ||
          !event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
        event.preventDefault()
        ;(event.shiftKey ? last ?? node : first ?? node).focus()
      }
    }
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('keydown', key, true)
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  return createPortal(<div className="backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
    <section ref={container} tabIndex={-1} aria-modal="true" role="dialog" aria-label={title}
      className={'dialog ' + (wide ? 'wide ' : '') + className}>
      <header><h2>{title}</h2><IconButton icon={X} label="Close dialog" className="dialog-close" onClick={close} /></header>
      {children}
    </section>
  </div>, document.querySelector('.theme') ?? document.body)
}

export function Actions({ children, close, submit = 'Save', disabled, danger, onSubmit }) {
  return <footer className="dialog-actions">
    {children}<button type="button" className="secondary" onClick={close}>Cancel</button>
    <button type={onSubmit ? 'button' : 'submit'} className={danger ? 'danger' : 'primary'} disabled={disabled} onClick={onSubmit}>{submit}</button>
  </footer>
}

export function Menu({ icon, label, tooltip = label, items, className, children }) {
  const button = useRef(null)
  const menu = useRef(null)
  const [position, setPosition] = useState(null)

  function close(restore = true) {
    setPosition(null)
    if (restore) button.current?.focus()
  }

  useLayoutEffect(() => {
    if (!position) return
    const node = menu.current
    node.style.left = Math.max(8, Math.min(position.right - node.offsetWidth, window.innerWidth - node.offsetWidth - 8)) + 'px'
    node.style.top = Math.max(8, Math.min(position.bottom + 4, window.innerHeight - node.offsetHeight - 8)) + 'px'
    visibleControls(node)[0]?.focus()
  }, [position])

  useEffect(() => {
    if (!position) return
    const outside = event => {
      if (!menu.current?.contains(event.target) && !button.current?.contains(event.target)) close(false)
    }
    const resize = () => close(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', resize)
    }
  }, [position])

  function key(event) {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      close()
      return
    }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const options = visibleControls(menu.current)
    const current = options.indexOf(document.activeElement)
    const next = { ArrowUp: (current + options.length - 1) % options.length, ArrowDown: (current + 1) % options.length, Home: 0, End: options.length - 1 }[event.key]
    options[next]?.focus()
  }

  const Icon = icon
  return <>
    <button ref={button} type="button" className={className ?? 'icon-button'} title={tooltip} aria-label={label} aria-haspopup="menu"
      aria-expanded={Boolean(position)} onClick={() => position ? close() : setPosition(button.current.getBoundingClientRect())}
      onKeyDown={event => { if (event.key === 'ArrowDown' && !position) { event.preventDefault(); setPosition(button.current.getBoundingClientRect()) } }}>
      {Icon && <Icon size={18} aria-hidden="true" />}{children}
    </button>
    {position && createPortal(<div className="menu" role="menu" aria-label={label} ref={menu} onKeyDown={key}>
      {items.filter(Boolean).map(item => <button type="button" role="menuitem" key={item.label}
        className={item.danger ? 'danger-text' : ''} onClick={() => { close(); item.run() }}>{item.label}</button>)}
    </div>, document.querySelector('.theme') ?? document.body)}
  </>
}

export function Pane({ title, source, close, controls, children, embedded = false }) {
  const node = useRef(null)
  useLayoutEffect(() => {
    const opener = document.activeElement
    const panel = node.current
    return () => {
      if (panel.contains(document.activeElement) && opener?.isConnected) opener.focus()
    }
  }, [])
  return <aside ref={node} className={embedded ? 'right-pane embedded' : 'right-pane'} aria-label={title}>
    <header className="pane-header">
      {close && <IconButton icon={ArrowLeft} className="mobile-only" label={'Back from ' + title} onClick={close} />}
      <h2>{title}</h2>{source && <span className="source">{source}</span>}
      <div className="extras">{controls}{close && <IconButton icon={X} className="pane-dismiss" label={'Close ' + title} onClick={close} />}</div>
    </header>
    {children}
  </aside>
}

