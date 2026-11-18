import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, Eye, FileText, GitBranch, ListChecks, X } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'
import { statuses } from './model.js'

export const formPath = (id, tab = 'build') => '/forms/' + encodeURIComponent(id) + '/' + tab
export const workspacePath = (id) => '/workspaces/' + encodeURIComponent(id)
export const respondentPath = (id) => withSid('/to/' + encodeURIComponent(id))

function useQueryPath(path) {
  const { search } = useLocation()
  return path + search
}

export function AppLink({ to, nav = false, ...props }) {
  const path = useQueryPath(to)
  const Component = nav ? NavLink : Link
  return <Component to={path} {...props} />
}

export function useAppNavigate() {
  const navigate = useNavigate()
  const { search } = useLocation()
  return (path, options) => navigate(path + search, options)
}

export function Status({ status = 'draft' }) {
  const value = Object.hasOwn(statuses, status) ? status : 'draft'
  return <span className={'status ' + value}><i />{statuses[value]}</span>
}

export function Empty({ title, children, action }) {
  return <div className="empty">
    <div className="empty-shape pattern" aria-hidden="true"><FileText size={25} /></div>
    <h2>{title}</h2>
    {children && <p>{children}</p>}
    {action}
  </div>
}

export function Dialog({ title, children, onClose, wide = false }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  return <dialog ref={dialog} className={wide ? 'response-drawer' : 'dialog'} aria-label={title}
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="dialog-inner">
      <header className="dialog-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>
      {children}
    </div>
  </dialog>
}

export function Confirm({ title, description, label, onConfirm, onClose, danger = true }) {
  return <Dialog title={title} onClose={onClose}>
    <p className="muted">{description}</p>
    <div className="dialog-actions">
      <button type="button" onClick={onClose} autoFocus>Cancel</button>
      <button type="button" className={danger ? 'danger-button' : 'primary'} onClick={onConfirm}>{label}</button>
    </div>
  </Dialog>
}

const tabs = [['build', 'Build', FileText], ['logic', 'Logic', GitBranch], ['responses', 'Responses', ListChecks]]

export function FormHeader({ form, workspace, children }) {
  return <>
    <AppLink className="breadcrumb" to={workspace ? workspacePath(workspace.id) : '/'}><ArrowLeft size={15} />{workspace?.name || 'Workspaces'}</AppLink>
    <div className="page-heading form-heading">
      <div><h1>{form.title || 'Untitled form'}</h1><Status status={form.status} /></div>
      <div className="heading-actions">
        <AppLink className="button" to={formPath(form.id, 'preview')}><Eye size={17} /> Preview</AppLink>
        {children}
      </div>
    </div>
    <nav className="tabs" aria-label="Form navigation">
      {tabs.map(([key, label, Icon]) => <AppLink nav key={key} to={formPath(form.id, key)}><Icon size={17} />{label}</AppLink>)}
    </nav>
  </>
}

export function BackHome() {
  return <AppLink className="button" to="/">Back to workspaces <ArrowRight size={16} /></AppLink>
}
