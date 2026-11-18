import React, {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {Link, useNavigate} from 'react-router-dom'
import {Check, FileSpreadsheet, Search, X} from 'lucide-react'
import {withSid} from '../utils/dataManager.js'
import {findRecord, useStore} from '../store.jsx'

export const AppLink = ({to, ...props}) => <Link to={withSid(to)} {...props}/>
export function useAppNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
export function Avatar({person}) {
  return <span className="avatar" style={{backgroundColor:person?.avatarColor || '#335e52'}} title={person?.displayName ?? 'You'}>{person?.initials ?? person?.displayName?.split(' ').slice(0,2).map(word => word[0]).join('') ?? 'Y'}</span>
}
export function Header({children, search, onSearch, onSearchKeyDown, searchPlaceholder = 'Search workbooks', showSaveStatus = false}) {
  const {world, saveStatus} = useStore()
  return <header className="app-header">
    <AppLink className="brand" to="/" aria-label="Excel Home"><FileSpreadsheet size={22}/> Excel</AppLink>
    {children}
    {(showSaveStatus || saveStatus !== 'saved') && <SaveStatus/>}
    {onSearch && <label className="header-search"><Search size={17}/><input type="search" value={search} onChange={e => onSearch(e.target.value)} onKeyDown={onSearchKeyDown} placeholder={searchPlaceholder} aria-label={searchPlaceholder}/></label>}
    <div className="header-account"><Avatar person={findRecord(world, 'users', world.currentUserId)}/></div>
  </header>
}
function SaveStatus() {
  const {world, saveStatus, retrySave, loadServerCopy} = useStore()
  const [recover, setRecover] = useState(false)
  function downloadRecovery() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(world, null, 2)], {type:'application/json'}))
    const link = document.createElement('a')
    link.href = url
    link.download = 'excel-unsaved-changes.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  if (saveStatus === 'conflict') return <div className="saved">
    <span role="status">Save conflict</span>
    <button onClick={() => setRecover(true)}>Resolve conflict</button>
    {recover && createPortal(<Modal title="Save conflict" close={() => setRecover(false)}>
      <p>A newer version was saved in another session. Download your unsaved changes before loading the server version.</p>
      <div className="dialog-actions">
        <button className="secondary" onClick={downloadRecovery}>Download unsaved changes</button>
        <button className="primary" onClick={loadServerCopy}>Load server version</button>
      </div>
    </Modal>, document.body)}
  </div>
  return <div className="saved">
    <span role="status">{saveStatus === 'saved' ? <><Check size={13}/> Saved</> : saveStatus === 'saving' ? 'Saving…' : 'Save failed'}</span>
    {saveStatus === 'failed' && <button onClick={retrySave}>Retry save</button>}
  </div>
}
export function Modal({title, close, children, wide = false, className = '', point}) {
  const ref = useRef(null)
  const onClose = useRef(close)
  onClose.current = close
  useEffect(() => {
    const previous = document.activeElement
    const dialog = ref.current
    const natural = dialog.querySelector('[data-initial-focus]') || dialog.querySelector('input:not([type=checkbox]), select, textarea') || dialog.querySelector('button')
    natural?.focus()
    return () => { if (previous?.isConnected) previous.focus({preventScroll:true}) }
  }, [])
  useLayoutEffect(() => {
    if (!point) return
    const dialog=ref.current
    const position=()=>{
      const x=Math.max(8,Math.min(point.x,innerWidth-dialog.offsetWidth-8))
      const y=Math.max(8,Math.min(point.y,innerHeight-dialog.offsetHeight-8))
      dialog.style.left=`${x}px`
      dialog.style.top=`${y}px`
    }
    position()
    const observer=new ResizeObserver(position)
    observer.observe(dialog)
    window.addEventListener('resize',position)
    return ()=>{observer.disconnect();window.removeEventListener('resize',position)}
  },[point])
  return <div className={`overlay ${point?'popover-overlay':''}`} onMouseDown={e => {if (e.target === e.currentTarget) onClose.current()}}>
    <section className={`dialog ${wide ? 'wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} onKeyDown={e => {
      if (e.key === 'Escape') {e.stopPropagation(); onClose.current()}
      if (e.key !== 'Tab') return
      const focusable = [...ref.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex="0"]')].filter(node => node.getClientRects().length)
      if (e.shiftKey && document.activeElement === focusable[0]) {e.preventDefault(); focusable.at(-1)?.focus()}
      if (!e.shiftKey && document.activeElement === focusable.at(-1)) {e.preventDefault(); focusable[0]?.focus()}
    }}>
      <div className="dialog-header"><h2>{title}</h2><button type="button" className="icon" aria-label="Close" onClick={close}><X size={18}/></button></div>
      {children}
    </section>
  </div>
}
export function Actions({close, label = 'OK', disabled = false, onAction}) {
  return <footer className="dialog-actions">
    <button type="button" className="secondary" onClick={close}>Cancel</button>
    <button type={onAction ? 'button' : 'submit'} className="primary" disabled={disabled} onClick={onAction}>{label}</button>
  </footer>
}
export function Menu({items, close, point, label = 'Actions'}) {
  const ref = useRef()
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    const previous = document.activeElement
    ref.current.querySelector('button:not([disabled])')?.focus({preventScroll:true})
    const outside = event => {if (!ref.current?.contains(event.target)) closeRef.current()}
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      if (previous?.isConnected && document.activeElement === document.body) previous.focus({preventScroll:true})
    }
  }, [])
  return <div role="menu" aria-label={label} className={`menu ${point ? 'positioned' : ''}`} ref={ref} style={point ? {left:Math.max(4, Math.min(point.x, innerWidth-234)), top:Math.max(4, Math.min(point.y, innerHeight-Math.min(innerHeight-12,36*items.length+16)))} : undefined} onKeyDown={e => {
    if (e.key === 'Escape') {e.stopPropagation(); closeRef.current()}
    if (!['ArrowUp','ArrowDown'].includes(e.key)) return
    e.preventDefault()
    const items = [...ref.current.querySelectorAll('button:not([disabled])')]
    const next = (items.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }}>{items.map(({label, action, disabled, icon:Icon}) => <button role="menuitem" key={label} type="button" disabled={disabled} onClick={() => {close(); action()}}>{Icon && <Icon size={16}/>} {label}</button>)}</div>
}
export const eventPoint = e => {
  const rect = e.currentTarget.getBoundingClientRect()
  return {x: e.type === 'contextmenu' ? e.clientX : rect.left, y:e.type === 'contextmenu' ? e.clientY : rect.bottom}
}
