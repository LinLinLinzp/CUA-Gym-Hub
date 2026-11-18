import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ChevronLeft, Star } from 'lucide-react'
import { array, isDraft, shortDate, displayAddress, subjectOf, visibleMail, timeOf } from './data/model.js'
import { useStore } from './store.jsx'
import { IconButton, inbox, InterfaceProvider, NotFound, Redirect } from './components/ui.jsx'
import { useOpenMail } from './components/mailActions.jsx'
import Shortcuts from './components/Shortcuts.jsx'
import { Header, Sidebar } from './components/Shell.jsx'
import Mailbox from './pages/Mailbox.jsx'
import Reading from './pages/Reading.jsx'
import Compose from './pages/Compose.jsx'
import Settings from './pages/Settings.jsx'
import Contacts from './pages/Contacts.jsx'
import Views from './pages/Views.jsx'

function RightPanel({ overlay, setOverlay }) {
  const { state, updateSettings } = useStore()
  const open = useOpenMail()
  const tab = state.settings?.rightPanel?.tab || 'starred'
  const starred = array(state.messages).filter(message => message.isStarred && !isDraft(message) && visibleMail(message)).sort((a, b) => timeOf(b) - timeOf(a))
  return <aside className={'right-panel card' + (overlay ? ' panel-overlay' : '')} aria-label="Mail side panel">
    <div className="panel-tabs" role="tablist" aria-label="Side panel view">
      {['starred', 'contacts'].map(name => <button key={name} role="tab" aria-selected={tab === name} onClick={() => updateSettings('rightPanel', { tab: name })}>{name === 'starred' ? 'Starred' : 'Contacts'}</button>)}
      <IconButton icon={ChevronLeft} label="Close side panel" onClick={() => { setOverlay(false); updateSettings('rightPanel', { open: false }) }} />
    </div>
    {tab === 'contacts' ? <Contacts panel /> : <div className="starred-list">
      {!starred.length && <p className="muted padded">Star an email to find it here.</p>}
      {starred.map(message => <button key={message.id} className="starred-item" onClick={() => open(message, '/n/starred', [message.id])}>
        <Star size={16} className="filled-star" /><span><strong>{subjectOf(message)}</strong><small>{displayAddress(message.from)} <span>·</span> {shortDate(message.date)}</small></span>
      </button>)}
    </div>}
  </aside>
}

function Workspace() {
  const { state, updateSettings } = useStore()
  const [overlay, setOverlay] = useState(false)
  const { pathname } = useLocation()
  const fullPage = /^\/n\/(settings|contacts)(\/|$)/.test(pathname)
  const showPanel = state.settings?.rightPanel?.open && !fullPage
  function togglePanel() {
    if (window.matchMedia('(max-width: 1279px)').matches) {
      setOverlay(!overlay)
      updateSettings('rightPanel', { open: !overlay })
    } else updateSettings('rightPanel', { open: !state.settings?.rightPanel?.open })
  }
  useEffect(() => {
    if (!overlay) return
    function dismiss(event) {
      if (event.key === 'Escape' || event.type === 'pointerdown' && !event.target.closest('.right-panel, [aria-label="Toggle side panel"]')) setOverlay(false)
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', dismiss) }
  }, [overlay])
  return <div className={'workspace' + (state.settings?.sidebar?.compact ? ' compact-nav' : '')}>
    <Header togglePanel={togglePanel} overlay={overlay} />
    <Shortcuts />
    <div className={'workspace-body' + (showPanel ? ' panel-open' : '')}>
      <Sidebar />
      <main className="main-card card" aria-label="Mail content">
        <Routes>
          <Route path="/" element={<Redirect to={inbox} />} />
          <Route path="/n/inbox/:category" element={<Mailbox kind="inbox" />} />
          <Route path="/n/folders/:folderId" element={<Mailbox kind="folder" />} />
          <Route path="/n/unread" element={<Mailbox kind="unread" />} />
          <Route path="/n/starred" element={<Mailbox kind="starred" />} />
          <Route path="/n/search" element={<Mailbox kind="search" />} />
          <Route path="/n/message/:messageId" element={<Reading />} />
          <Route path="/n/compose/:draftId?" element={<Compose />} />
          <Route path="/n/contacts/:contactId?" element={<Contacts />} />
          <Route path="/n/settings/:section" element={<Settings />} />
          <Route path="/n/views/:view" element={<Views />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {showPanel && <RightPanel overlay={overlay} setOverlay={setOverlay} />}
    </div>
  </div>
}

export default function App() {
  return <InterfaceProvider><Workspace /></InterfaceProvider>
}
