import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Inbox, Mail, MailOpen, Paperclip, Search, Star, Trash2 } from 'lucide-react'
import { useStore } from '../store.jsx'
import { array, categories, dateGroup, displayAddress, folderExists, folderName, isDraft, isReceived, shortDate, subjectOf } from '../data/model.js'
import { mailboxLocation, mailboxRows, mailScope, sortOptions } from '../data/mailbox.js'
import { Avatar, draftPath, Empty, IconButton, MailLink, Menu, MenuItem, NotFound, useMailNavigation } from '../components/ui.jsx'
import { MailTools, useMailActions, useOpenMail } from '../components/mailActions.jsx'
import { withSid } from '../utils/dataManager.js'
import { localFilePath } from '../data/filesAccess.js'

const selectionOptions = {
  All: () => true, None: () => false, Read: message => message.isRead,
  Unread: message => !message.isRead, Starred: message => message.isStarred, Unstarred: message => !message.isStarred,
}

export const dragType = 'application/x-yahoo-mail-ids'

export default function Mailbox({ kind, scope, embedded = false }) {
  const { location } = useMailNavigation()
  const path = scope || location.pathname + location.search
  const mailbox = mailboxLocation(path)
  return <MailboxContent key={path} path={path} mailbox={mailbox} kind={kind} category={kind === 'inbox' ? mailbox.parameter : null} folderId={kind === 'folder' ? mailbox.parameter : null} embedded={embedded} />
}

function MailboxContent({ path, mailbox, kind, folderId, category, embedded }) {
  const { state, updateSettings } = useStore()
  const { go, back } = useMailNavigation()
  const open = useOpenMail()
  const { change, remove, discardDrafts } = useMailActions()
  const [selected, setSelected] = useState([])
  const [moveOpen, setMoveOpen] = useState(false)
  const selectAll = useRef(null)
  const messages = mailScope(state, mailbox)
  const rows = mailboxRows(state, messages)
  const active = messages.filter(message => selected.includes(message.id))
  const activeIds = active.map(message => message.id)
  const selectedMail = active.filter(message => !isDraft(message))
  const selectedMailIds = selectedMail.map(message => message.id)
  const selectedDraftIds = active.filter(isDraft).map(message => message.id)
  const sort = state.settings?.inbox?.sort || 'date_desc'
  const allSelected = messages.length > 0 && activeIds.length === messages.length
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = Boolean(activeIds.length && !allSelected)
  }, [activeIds.length, allSelected])

  useEffect(() => {
    async function shortcut(event) {
      const ids = selectedMailIds
      const key = event.detail.key
      if (embedded) return
      if (key === 'Delete' && selectedDraftIds.length) { discardDrafts(selectedDraftIds); return }
      if (!ids.length) return
      if (key === 'd') setMoveOpen(true)
      const action = { k: 'read', K: 'unread', l: 'star', L: 'unstar', e: 'archive', Delete: 'delete' }[key]
      if (action === 'delete' && folderId === 'trash') remove(ids)
      else if (action && await change(ids, action)) {
        if (['archive', 'delete'].includes(action)) setSelected([])
      }
    }
    window.addEventListener('mail-action-shortcut', shortcut)
    return () => window.removeEventListener('mail-action-shortcut', shortcut)
  })
  if (kind === 'folder' && !folderExists(state.folders, folderId)) return <NotFound title="This folder is unavailable" />
  if (kind === 'inbox' && !Object.hasOwn(categories, category)) return <NotFound title="This inbox category is unavailable" />

  const isSearch = kind === 'search'
  const priority = kind === 'inbox' && category === 'primary' && state.settings?.inbox?.categoriesEnabled !== false
  const isInbox = kind === 'inbox'
  const title = isInbox ? 'Inbox' : isSearch ? 'Search results' : kind === 'folder' ? folderName(state.folders, folderId) : kind === 'starred' ? 'Starred' : 'Unread'
  const canEmpty = ['trash', 'spam'].includes(folderId) && messages.length > 0
  const criteria = mailbox.criteria
  const querySummary = [...criteria].filter(([key]) => key !== 'sid').map(([key, value]) => key === 'attachment' ? 'Has attachments' : key === 'q' ? '“' + value + '”' : key === 'folder' ? (value === '*' ? 'All folders' : folderName(state.folders, value)) : ({ from: 'From', to: 'To', subject: 'Subject', after: 'From date', before: 'To date' }[key] || key) + ' ' + value)
  let lastGroup

  function toggle(ids) {
    setSelected(current => ids.every(id => current.includes(id)) ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])])
  }

  return <section className={'mailbox' + (embedded ? ' embedded' : '')} data-density={state.settings?.appearance?.density || 'comfortable'}>
    <div className="mailbox-top">
      <header className="mailbox-heading"><div><h1>{title}</h1>{isSearch && <p className="muted">{messages.length} {messages.length === 1 ? 'message' : 'messages'}{querySummary.length > 0 && ' · ' + querySummary.join(' · ')}</p>}</div>
        {canEmpty && <button className="secondary" onClick={() => remove(messages.map(message => message.id), folderId)}>Empty {title}</button>}
        {isSearch && <button className="tool-button" onClick={() => go(back)}>Clear search</button>}
      </header>
      {isInbox && !embedded && state.settings?.inbox?.categoriesEnabled !== false && <div className="tabs" role="tablist" aria-label="Inbox categories">
        {Object.entries(categories).map(([key, name]) => <button key={key} role="tab" aria-selected={category === key} onClick={() => go('/n/inbox/' + key)}>{name}</button>)}
      </div>}
      <div className="mail-toolbar">
        <div className="select-box">
          <input type="checkbox" ref={selectAll} aria-label="Select all messages" checked={allSelected} disabled={!messages.length} onChange={() => setSelected(allSelected ? [] : messages.map(message => message.id))} />
          <Menu label="Selection options" align="left" icon={ChevronDown}>{close => Object.entries(selectionOptions).map(([label, match]) => <MenuItem key={label} onClick={() => { setSelected(messages.filter(match).map(message => message.id)); close() }}>{label}</MenuItem>)}</Menu>
        </div>
        {!!activeIds.length && <>
          <span className="selection-count">{activeIds.length} selected</span>
          {!!selectedDraftIds.length && <button className="tool-button" onClick={() => discardDrafts(selectedDraftIds)}><Trash2 size={17} />{selectedDraftIds.length === 1 ? 'Discard draft' : 'Discard drafts'}</button>}
          {!!selectedMailIds.length && <MailTools ids={selectedMailIds} messages={selectedMail} onAction={action => { if (['move', 'delete', 'spam', 'archive', 'restore', 'not_spam'].includes(action)) setSelected([]) }} moveOpen={moveOpen} setMoveOpen={setMoveOpen} />}
        </>}
        <div className="toolbar-spacer" />
        {!embedded && <Menu label="Sort messages" text="Sort">{close => Object.entries(sortOptions).map(([value, label]) => <MenuItem key={value} onClick={() => { updateSettings('inbox', { sort: value }); close() }}>{label}{sort === value && <span aria-label="Selected">✓</span>}</MenuItem>)}</Menu>}
      </div>
    </div>
    {!rows.length && <Empty icon={isSearch ? Search : Inbox} title={isSearch ? 'No results found' : 'Nothing in ' + title}>
      <p className="muted">{isSearch ? 'Try a different keyword or fewer search filters.' : 'Messages will appear here when available.'}</p>
      {isSearch ? <button className="secondary" onClick={() => go(back)}>Clear search</button> : <MailLink className="primary" to={draftPath()}>Compose</MailLink>}
    </Empty>}
    {rows.map(({ message, ids }) => {
      const group = sort.startsWith('date') ? dateGroup(message.date || message.createdAt) : ''
      const heading = group !== lastGroup
      lastGroup = group
      const represented = messages.filter(item => ids.includes(item.id))
      const draft = isDraft(message)
      const unread = !draft && represented.some(item => !item.isRead)
      const starred = represented.some(item => item.isStarred)
      const checked = ids.every(id => activeIds.includes(id))
      const attachments = represented.flatMap(item => array(item.attachments))
      const image = attachments.find(file => file.kind === 'image' && localFilePath(file.url))
      const from = draft || message.folderId === 'sent' ? array(message.to)[0] : message.from
      const sender = from ? displayAddress(from) : draft ? 'Draft' : 'Unknown sender'
      const summary = message.snippet || message.body || ''
      const flags = message.forwardedAt ? 'Forwarded' : message.repliedAt ? 'Replied' : ''
      const searchSender = () => go('/n/search?' + new URLSearchParams({ from: message.from?.email || displayAddress(message.from) }), { state: { back: isSearch ? back : path } })
      return <div key={message.id}>
        {heading && group && <h2 className="date-group">{group}</h2>}
        <article className={'mail-row' + (priority ? ' priority-row' : '') + (unread ? ' unread' : '') + (checked ? ' selected' : '')}
          draggable={!draft} onDragStart={event => {
            if (draft) { event.preventDefault(); return }
            event.dataTransfer.setData(dragType, JSON.stringify(ids.some(id => selectedMailIds.includes(id)) ? selectedMailIds : ids))
            event.dataTransfer.effectAllowed = 'move'
          }}>
          <input type="checkbox" aria-label={'Select ' + subjectOf(message)} checked={checked} onChange={() => toggle(ids)} />
          <button type="button" className="row-open" aria-label={'Open ' + subjectOf(message) + (unread ? ', unread' : '')} onClick={() => open(message, path, ids)}>
            <Avatar name={sender} email={from?.email} />
            <span className="row-sender" title={sender}>{sender}{ids.length > 1 && <span className="thread-count">{ids.length}</span>}</span>
            <span className="row-content">
              <span className="row-subject">{flags && <small className="row-tag">{flags}</small>}{isInbox && category === 'all' && message.category !== 'primary' && <small className="row-tag">{categories[message.category] || 'Other'}</small>}{isSearch && !folderExists(state.folders, message.folderId) && <small className="row-tag">Unknown folder</small>}{subjectOf(message)}</span>
              {summary && <span className="row-snippet">{summary}</span>}
            </span>
            {priority && image && <img alt="" className="row-image" src={withSid(image.url)} />}
            {!!attachments.length && <Paperclip className="row-attachment" size={16} aria-label="Has attachments" />}
            <time className="row-date">{shortDate(message.date || message.createdAt)}</time>
          </button>
          {draft ? <div className="row-actions"><IconButton icon={Trash2} label="Discard draft" onClick={() => discardDrafts(ids)} /></div> : <>
            <IconButton className={starred ? 'filled-star' : 'row-star'} icon={Star} label={starred ? 'Remove star' : 'Star'} aria-pressed={starred} onClick={() => change(ids, starred ? 'unstar' : 'star')} />
            <div className="row-actions">
              <IconButton icon={unread ? MailOpen : Mail} label={unread ? 'Mark as read' : 'Mark as unread'} onClick={() => change(ids, unread ? 'read' : 'unread')} />
              <MailTools iconOnly ids={ids} messages={represented} extra={close => <MenuItem icon={Search} onClick={() => { close(); searchSender() }}>Search messages from sender</MenuItem>} />
            </div>
          </>}
        </article>
      </div>
    })}
    {priority && rows.length > 0 && <p className="mail-notice">Looking for older messages? Try <MailLink to="/n/inbox/all">checking the All tab</MailLink>.</p>}
  </section>
}
