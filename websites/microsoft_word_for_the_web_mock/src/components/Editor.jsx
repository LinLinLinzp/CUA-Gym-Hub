import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Copy, Eye, ListTree, MessageSquare, MessageSquarePlus, Pencil, Printer, Search, Share2, Trash2, X } from 'lucide-react'
import { actorOf, canEdit, canReview, rows } from '../data/access.js'
import { bodyText, inBounds, locate, marksAt, normalizeBody } from '../data/body.js'
import { deleteDocument, newId, renameDocument } from '../data/documents.js'
import { mentionableUsers, postThread, updateThread } from '../data/comments.js'
import { anchorInAccepted, decideChanges, editDocument, pendingChanges, projectBody, projectPoint, setTracking } from '../data/revisions.js'
import { useWorkspace } from '../data/store.jsx'
import { routeTo } from '../utils/routes.js'
import { DeleteDialog, RenameField, useDocumentCreation } from './DocumentActions.jsx'
import { EditorSurface, useEditorSelection } from './EditorSurface.jsx'
import { Comments } from './Comments.jsx'
import { ShareDrawer } from './ShareDrawer.jsx'
import { ReviewBlock, ReviewCommands, ReviewPanel } from './Review.jsx'
import { PrintPreview } from './PrintPreview.jsx'
import { Outline, Zoom } from './ReadingAids.jsx'
import { CommandButton, HomeCommands } from './HomeCommands.jsx'
import { placeSelection, scrollToOffset } from '../utils/selection.js'
import { Avatar, Menu } from './ui.jsx'

const modeLabels = { editing: 'Editing', reviewing: 'Reviewing', viewing: 'Viewing' }

export function Editor({ state, doc, role }) {
  const { commit } = useWorkspace()
  const create = useDocumentCreation()
  const location = useLocation()
  const navigate = useNavigate()
  const paper = useRef(null)
  const titleButton = useRef(null)
  const [panel, setPanel] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [tab, setTab] = useState('Home')
  const [draft, setDraft] = useState(null)
  const [selectedThread, setSelectedThread] = useState(null)
  const [context, setContext] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mode, setMode] = useState(canEdit(role) ? 'editing' : role === 'review' ? 'reviewing' : 'viewing')
  const [markup, setMarkup] = useState('simple')
  const [selectedChange, setSelectedChange] = useState(null)
  const [notice, setNotice] = useState('')
  const [finding, setFinding] = useState(false)
  const [query, setQuery] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const accepted = useMemo(() => normalizeBody(doc.body, doc.id), [doc.body, doc.id])
  const pending = useMemo(() => pendingChanges(state, doc.id), [state.trackedChanges, doc.id])
  const projected = useMemo(() => projectBody(accepted, pending), [accepted, pending])
  const displayed = projected.body
  const text = bodyText(displayed)
  const writableComments = Boolean(actorOf(state)) && canReview(role) && mode !== 'viewing'
  const editable = Boolean(actorOf(state)) && mode !== 'viewing'
  const canDecide = canEdit(role) && editable
  const selection = useEditorSelection(displayed, paper, (range, after, formatScope) => {
    if (!editable) return false
    let result
    commit((current) => {
      result = editDocument(current, doc.id, mode, range, after, formatScope)
      return result.state
    })
    setNotice(result.error ?? '')
    return !result.error
  })
  const block = locate(displayed, selection.visualRange.start).block
  const activeMarks = selection.typingMarks ?? marksAt(displayed, selection.visualRange.start)
  const matches = useMemo(() => {
    const result = []
    const term = query.trim().toLowerCase()
    const searchable = text.toLowerCase()
    if (!term) return result
    for (let point = searchable.indexOf(term); point >= 0; point = searchable.indexOf(term, point + term.length)) {
      result.push({ start: point, end: point + term.length })
    }
    return result
  }, [query, text])
  const threads = rows(state, 'commentThreads').filter((thread) => thread.documentId === doc.id && thread.status !== 'deleted')
  const activeAnchor = draft ?? threads.find((thread) => thread.id === selectedThread)?.anchor
  const selectedAnchor = inBounds(accepted, activeAnchor) && !activeAnchor.detached ? activeAnchor : null
  const commentStart = selectedAnchor ? projectPoint(projected.entries, selectedAnchor.start, 'end') : null
  const highlights = [
    ...(finding && matches.length ? [{ range: matches[matchIndex % matches.length], className: 'find-highlight' }] : []),
    ...(panel === 'comments' && selectedAnchor ? [{ range: {
      start: commentStart,
      end: selectedAnchor.start === selectedAnchor.end ? commentStart : Math.max(commentStart, projectPoint(projected.entries, selectedAnchor.end, 'start')),
    }, className: 'comment-highlight' }] : []),
  ]

  function beginComment(range = selection.read()) {
    if (!writableComments) return
    setContext(null)
    setPanel('comments')
    if (draft) return
    setSelectedThread(null)
    setDraft(anchorInAccepted(projected.entries, range, text.slice(range.start, range.end)))
  }
  function openSelectionMenu(event) {
    if (!writableComments) return
    event.preventDefault()
    const nativeSelection = window.getSelection()
    const selectedText = nativeSelection?.rangeCount && paper.current.contains(nativeSelection.anchorNode)
      ? nativeSelection.getRangeAt(0).getBoundingClientRect() : null
    const anchor = selectedText?.height ? selectedText : paper.current.getBoundingClientRect()
    const x = Number.isFinite(event.clientX) && event.clientX > 0 ? event.clientX : anchor.left
    const y = Number.isFinite(event.clientY) && event.clientY > 0 ? event.clientY : anchor.bottom
    setContext({
      x: Math.max(8, Math.min(x, window.innerWidth - 174)),
      y: Math.max(8, Math.min(y, window.innerHeight - 55)),
      range: selection.read(),
    })
  }
  function selectThread(thread) {
    setSelectedThread(thread.id)
    if (!thread.anchor?.detached && inBounds(accepted, thread.anchor)) scrollToOffset(paper.current, projectPoint(projected.entries, thread.anchor.start))
  }
  function selectChange(id, scroll = true) {
    setSelectedChange(id)
    setPanel('changes')
    const entry = projected.entries.find(({ change }) => change.id === id)
    if (scroll && entry?.valid) scrollToOffset(paper.current, entry.start)
  }
  function stepChange(direction) {
    if (!projected.entries.length) return
    const index = projected.entries.findIndex(({ change }) => change.id === selectedChange)
    const next = index < 0 && direction < 0 ? projected.entries.length - 1
      : (index + direction + projected.entries.length) % projected.entries.length
    selectChange(projected.entries[next].change.id)
  }

  function decide(decision, id) {
    if (!canDecide) return
    commit((current) => decideChanges(current, doc.id, decision, id))
    const index = projected.entries.findIndex(({ change }) => change.id === id)
    if (id) {
      const next = projected.entries[index + 1] ?? projected.entries[index - 1]
      setSelectedChange(next?.change.id ?? null)
    } else setSelectedChange(null)
    setNotice('')
  }

  function submitComment(message) {
    if (!writableComments || !draft) return
    const id = newId('thread')
    commit((current) => postThread(current, doc, draft, message, id))
    setSelectedThread(id)
    setDraft(null)
  }
  useEffect(() => {
    if (!context) return
    function dismiss(event) {
      if (!event.target.closest('.selection-menu')) setContext(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [context])
  useEffect(() => {
    if (!finding || !matches.length) return
    const range = matches[matchIndex % matches.length]
    scrollToOffset(paper.current, range.start)
  }, [finding, matchIndex, matches])
  useEffect(() => {
    if (location.state?.focusDocument) paper.current?.focus()
  }, [location.state])
  const title = doc.title || 'Untitled document'
  const fileItems = [...(canEdit(role) ? [
    { label: 'Rename', icon: <Pencil size={15} />, action: () => setRenaming(true) },
    { label: 'Create a copy', icon: <Copy size={15} />, action: () => create({ source: doc }) },
    ...(role === 'owner' ? [{ label: 'Delete', icon: <Trash2 size={15} />, action: () => setDeleting(true), danger: true }] : []),
  ] : []), ...(role !== 'viewNoDownload' ? [{ label: 'Print preview', icon: <Printer size={15} />, action: () => setPrinting(true) }] : [])]
  if (printing) return <PrintPreview title={title} body={accepted} onClose={() => setPrinting(false)} />
  return <main className="editor" onKeyDown={(event) => {
    if (event.key === 'Escape') {
      if (context) {
        setContext(null)
        requestAnimationFrame(() => {
          paper.current?.focus()
          placeSelection(paper.current, context.range)
        })
      }
      else if (finding) setFinding(false)
      else setPanel(null)
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault()
      setFinding(true)
    }
    if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'm' && writableComments) {
      event.preventDefault()
      beginComment()
    }
  }}>
    <header className="editor-header">
      <Link className="icon-button" to={routeTo('/')} title="Back to documents" aria-label="Back to documents"><ArrowLeft size={19} /></Link>
      {renaming ? <RenameField inline doc={doc} onCancel={() => {
        setRenaming(false)
        requestAnimationFrame(() => titleButton.current?.focus())
      }} onSave={(text) => {
        commit((current) => renameDocument(current, doc.id, text)); setRenaming(false)
      }} /> : <h1>{canEdit(role) ? <button ref={titleButton} className="editor-title" type="button" title="Rename document" onClick={() => setRenaming(true)}>{title}</button> : title}</h1>}
      <span className="editor-save-status" aria-label="Saved" title="Saved"><CheckCircle2 size={15} /><span>Saved</span></span>
      <div className="header-actions">
        {canReview(role) ? <Menu label="Document mode" text={modeLabels[mode]} icon={<>{mode === 'viewing' ? <Eye size={15} /> : <Pencil size={15} />}<ChevronDown size={12} /></>}
          className="mode-picker" items={Object.entries(modeLabels).filter(([value]) => value !== 'editing' || canEdit(role))
            .map(([value, label]) => ({ label, checked: mode === value, action: () => setMode(value) }))} /> :
          <span className="viewer-mode"><Eye size={15} /><span>Viewing</span></span>}
        <button type="button" className="button ghost" aria-label="Comments" aria-expanded={panel === 'comments'} onClick={() => setPanel(panel === 'comments' ? null : 'comments')}><MessageSquare size={16} /><span>Comments</span></button>
        {canEdit(role) && <button type="button" className="button primary share-button" aria-label="Share" onClick={() => setSharing(true)}><Share2 size={16} /><span>Share</span></button>}
        <Avatar user={actorOf(state)} />
      </div>
    </header>
    <div className="editor-tabs">
      {fileItems.length > 0 && <Menu text="File" label="File" icon={<ChevronDown size={12} />} items={fileItems} align="start" />}
      {['Home', 'Review', 'View'].map((name) => <button type="button" key={name} className={`editor-tab ${tab === name ? 'tab-active' : ''}`}
        aria-pressed={tab === name} onClick={() => setTab(name)}>{name}</button>)}
    </div>
    <div className="editor-commands" aria-label={tab + ' commands'}>
      {tab === 'Home' ? <HomeCommands block={block} activeMarks={activeMarks} editable={editable} selection={selection} onFind={() => setFinding(!finding)} /> : tab === 'Review' ?
        <ReviewCommands doc={doc} role={role} writable={writableComments} onComment={() => beginComment()}
          markup={markup} setMarkup={setMarkup} entries={projected.entries} onStep={stepChange} selected={selectedChange} canDecide={canDecide} onDecide={decide}
          onTracking={(value) => commit((current) => setTracking(current, doc.id, value))} /> :
        <CommandButton label="Navigation" Icon={ListTree} active={panel === 'outline'} onClick={() => setPanel(panel === 'outline' ? null : 'outline')}><span>Navigation</span></CommandButton>}
    </div>
    {finding && <div className="find-bar" role="search">
      <Search size={16} />
      <input className="field" placeholder="Find in document" aria-label="Find in document" autoFocus value={query}
        onChange={(event) => { setQuery(event.target.value); setMatchIndex(0) }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && matches.length) setMatchIndex((index) => (index + (event.shiftKey ? -1 : 1) + matches.length) % matches.length)
        }} />
      <span className="muted" aria-live="polite">{query.trim() ? (matches.length ? `${matchIndex % matches.length + 1} of ${matches.length}` : 'No matches') : ''}</span>
      <button className="icon-button" aria-label="Previous match" disabled={!matches.length} onClick={() => setMatchIndex((index) => (index + matches.length - 1) % matches.length)}><ArrowUp size={16} /></button>
      <button className="icon-button" aria-label="Next match" disabled={!matches.length} onClick={() => setMatchIndex((index) => (index + 1) % matches.length)}><ArrowDown size={16} /></button>
      <button className="icon-button" aria-label="Close find" onClick={() => setFinding(false)}><X size={17} /></button>
    </div>}
    <div className="editor-workspace">
      <div className="canvas"><EditorSurface body={displayed} editable={editable} editorRef={paper} selection={selection} zoom={zoom}
        renderBlock={(entry) => <ReviewBlock entry={entry} projected={projected.entries} highlights={highlights}
          markup={markup} selected={selectedChange} onSelect={selectChange} />}
        onContextMenu={openSelectionMenu} /></div>
      {panel === 'comments' && <Comments state={state} body={accepted} threads={threads} people={mentionableUsers(state, doc)}
        draft={writableComments ? draft : null} selectedId={selectedThread} writable={writableComments} onNew={() => beginComment()} onClose={() => setPanel(null)}
        onSelect={selectThread} onPost={submitComment} onCancel={() => setDraft(null)}
        onUpdate={(id, action, options) => {
          if (writableComments) commit((current) => updateThread(current, doc, id, action, options))
        }} />}
      {panel === 'outline' && <Outline body={displayed} onJump={(offset) => scrollToOffset(paper.current, offset)} onClose={() => setPanel(null)} />}
      {panel === 'changes' && <ReviewPanel entries={projected.entries} state={state} selected={selectedChange}
        onSelect={selectChange} onClose={() => setPanel(null)} canDecide={canDecide} onDecide={decide} />}
    </div>
    {notice && <div className="editor-notice" role="status">{notice}<button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={16} /></button></div>}
    <footer className="status-bar"><span>Page 1</span><span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span><Zoom value={zoom} onChange={setZoom} /></footer>
    {context && <div className="popup-menu selection-menu" style={{ left: context.x, top: context.y }}>
      <button autoFocus type="button" onClick={() => beginComment(context.range)}><MessageSquarePlus size={15} />New Comment</button>
    </div>}
    {sharing && <ShareDrawer state={state} doc={doc} role={role} onClose={() => setSharing(false)} />}
    {deleting && <DeleteDialog doc={doc} onClose={() => setDeleting(false)} onDelete={() => {
      commit((current) => deleteDocument(current, doc.id)); navigate(routeTo('/'))
    }} />}
  </main>
}
