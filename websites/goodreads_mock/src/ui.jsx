import React, { useEffect, useId, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { authorName, bookName } from './model.js'

const icons = {
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  chevron: <path d="m6 9 6 6 6-6"/>,
  arrow: <path d="M20 12H4m7-7-7 7 7 7"/>,
  book: <><path d="M12 6v14M3 5c3-2 6-1 9 1 3-2 6-3 9-1v14c-3-2-6-1-9 1-3-2-6-3-9-1z"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  calendar: <><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v6m8-6v6M4 11h16"/></>,
}

export function Icon({ name }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export function SiteLink({ to, ...props }) {
  useLocation()
  return <Link to={withSid(to)} {...props} />
}

export const bookPath = id => `/books/${encodeURIComponent(id)}`

export function Heading({ title, description, children }) {
  return <header className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {children && <div className="heading-actions">{children}</div>}
  </header>
}

export function Empty({ title, children }) {
  return <div className="empty">
    <span className="empty-icon"><Icon name="book" /></span>
    <h2>{title}</h2>
    {children}
  </div>
}

const motifs = {
  orchard: <><circle cx="97" cy="89" r="44" /><path d="M60 177Q77 106 125 52m-43 77-24-42m34 20 38-12m-28-4-8-33m-21 97 43-13m-45 22-29-32"/><path d="M58 87q-18-2-19-23 19 2 19 23m72 8q20-13 31 0-17 12-31 0m-14 47q21-15 35-5-14 16-35 5m-74-10q-20-1-22-19 19-1 22 19"/></>,
  tide: <><circle cx="122" cy="70" r="27" /><path d="M0 120q45-42 90 0t90 0M0 136q45-42 90 0t90 0M0 152q45-42 90 0t90 0M0 168q45-42 90 0t90 0M0 184q45-42 90 0t90 0"/></>,
  hills: <><circle cx="113" cy="72" r="23"/><path d="m0 151 52-77 48 63 34-39 46 54M0 175l61-67 39 47 26-23 54 38M0 189l54-36 42 27 39-19 45 24"/></>,
  stars: <><circle cx="90" cy="114" r="59"/><circle cx="90" cy="114" r="40"/><path d="m65 141 19-44 35 18 18-37M90 47v13m0 107v14m-68-67h13m110 0h13"/><circle cx="65" cy="141" r="4"/><circle cx="84" cy="97" r="5"/><circle cx="119" cy="115" r="4"/><circle cx="137" cy="78" r="4"/></>,
  blocks: <><rect x="40" y="57" width="100" height="115" rx="50"/><path d="M40 117h100M90 57v115m-50-15 75-92m-49 105 73-91"/><circle cx="113" cy="136" r="17"/></>,
  window: <><path d="M46 177V89a44 44 0 0 1 88 0v88zM57 165V89a33 33 0 0 1 66 0v76zM90 57v108M57 110h66"/><circle cx="105" cy="87" r="9"/><path d="m57 151 20-21 13 14 18-24 15 16"/></>,
}
const colors = [
  ['#243f35', '#ecd19b', '#dce5d8'], ['#17475c', '#a5e0e0', '#d7e6e9'],
  ['#672f36', '#ffd49b', '#eeded9'], ['#323354', '#e2cdfa', '#e4e0ee'],
  ['#b66c38', '#fff0bf', '#f0e2ce'], ['#43565f', '#f0d3a0', '#dce5e7'],
]

export function Cover({ book, className = '' }) {
  const coverIndex = Object.keys(motifs).indexOf(book?.coverStyle)
  const [paper, ink, well] = colors[coverIndex < 0 ? 5 : coverIndex]
  return <div aria-hidden="true" className={`cover-well ${className}`} style={{ '--paper': paper, '--cover-ink': ink, '--well': well }}>
    <div className="cover">
      <svg viewBox="0 0 180 240" fill="none" stroke="currentColor" strokeWidth="1.4" preserveAspectRatio="xMidYMid slice">
        <path d="M14 12h152v216H14z" opacity=".4" />
        {motifs[book?.coverStyle] || motifs.window}
      </svg>
      <span className="cover-title">{bookName(book)}</span>
      <span className="cover-author">{authorName(book)}</span>
    </div>
  </div>
}

export function Modal({ title, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    const menuOpener = opener?.closest('details')?.querySelector('summary')
    dialog.showModal()
    dialog.querySelector('[data-initial-focus]')?.focus()
    return () => {
      dialog.close()
      if (opener?.isConnected && opener.getClientRects().length) opener.focus()
      else if (menuOpener?.isConnected) menuOpener.focus()
      else document.getElementById('main-content')?.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-heading">
      <h2 id={titleId}>{title}</h2>
      <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button>
    </div>
    {children}
  </dialog>
}

export function DialogActions({ onClose, submit, destructive = false }) {
  return <div className="dialog-actions">
    <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
    <button className={`button ${destructive ? 'danger' : ''}`} type="submit">{submit}</button>
  </div>
}

export function FieldError({ id, children }) {
  return children ? <p id={id} className="field-error" role="alert">{children}</p> : null
}

