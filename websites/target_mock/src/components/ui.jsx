import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'

export function sessionPath(path) {
  const sid = new URLSearchParams(window.location.search).get('sid') || sessionStorage.getItem('mock_sid')
  if (!sid) return path
  const url = new URL(path, window.location.origin)
  url.searchParams.set('sid', sid)
  return url.pathname + url.search + url.hash
}

export function ShopLink({ to, ...props }) {
  return <Link to={sessionPath(to)} {...props} />
}

export function useShopNavigate() {
  const navigate = useNavigate()
  return (path, options) => navigate(sessionPath(path), options)
}

export function PageHeading({ title, children }) {
  return <div className="page-heading"><h1>{title}</h1>{children}</div>
}

export function Empty({ title, children, to, action }) {
  return <section className="panel empty">
    <h2>{title}</h2>
    {children && <p>{children}</p>}
    {to && <ShopLink className="button secondary" to={to}>{action}<ArrowRight size={16} /></ShopLink>}
  </section>
}

export function Status({ tone = 'neutral', children }) {
  return <span className={`status status-${tone}`}>{children}</span>
}

export function FeedbackProvider({ children }) {
  const [message, setMessage] = useState(null)
  const [modals, setModals] = useState([])
  const dialog = useRef(null)
  const returnFocus = useRef(null)
  const active = useRef(null)
  const top = modals.at(-1)

  function open(config) {
    const opener = document.activeElement
    setModals((current) => [...current, { ...config, opener }])
  }

  function close() {
    returnFocus.current = active.current?.opener
    setModals((current) => current.slice(0, -1))
  }

  useLayoutEffect(() => {
    active.current = top
    const element = dialog.current
    if (top && !element.open) element.showModal()
    if (!top && element.open) element.close()
    const target = returnFocus.current
    if (target && !target.closest('[hidden]')) target.focus()
    else if (top && modals.length > 1) element.querySelector('[data-current] .icon-button')?.focus()
    returnFocus.current = null
  }, [modals, top])

  return <FeedbackContext.Provider value={{ open, close, notify: (text, action) => setMessage({ text, action }) }}>
    {children}
    <div className="feedback-region" role="status" aria-live="polite">
      {message && <div className="feedback">
        <span>{message.text}</span>
        {message.action && <ShopLink to={message.action.to} onClick={() => setMessage(null)}>{message.action.label}</ShopLink>}
        <button className="icon-button" aria-label="Dismiss message" onClick={() => setMessage(null)}><X size={19} /></button>
      </div>}
    </div>
    <dialog ref={dialog} className={top?.wide ? 'modal-wide' : ''} aria-labelledby="dialog-title"
      onClick={(event) => { if (event.target === dialog.current) close() }}
      onCancel={(event) => { event.preventDefault(); close() }}>
      {modals.map((modal, index) => {
        const active = index === modals.length - 1
        return <div key={index} className="dialog-inner" hidden={!active} data-current={active ? '' : undefined}>
          <div className="dialog-title"><h2 id={active ? 'dialog-title' : undefined}>{modal.title}</h2>
            <button className="icon-button" aria-label="Close dialog" onClick={close}><X size={22} /></button></div>
          {modal.content}
        </div>
      })}
    </dialog>
  </FeedbackContext.Provider>
}

const FeedbackContext = createContext(null)
export const useFeedback = () => useContext(FeedbackContext)
