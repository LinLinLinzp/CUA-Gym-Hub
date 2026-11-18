import { useEffect, useRef, useState } from 'react'
import { Archive, ChevronDown, ChevronRight, CircleHelp, FileText, Folder, FolderPlus, Inbox, MailOpen, Menu as MenuIcon, MoreHorizontal, Paperclip, Pencil, Search, Send, Settings, SlidersHorizontal, Star, Trash2, TriangleAlert, Users, X } from 'lucide-react'
import { activity, record, useStore } from '../store.jsx'
import { allFolders, array, folderTree, isDraft, isReceived, systemFolders, views } from '../data/model.js'
import { Avatar, draftPath, folderPath, IconButton, inbox, MailLink, Menu, MenuItem, useInterface, useMailNavigation } from './ui.jsx'

import { folderError, makeFolder } from '../data/folders.js'
import { useMailActions } from './mailActions.jsx'

const folderIcons = { draft: FileText, sent: Send, archive: Archive, spam: TriangleAlert, trash: Trash2 }

function SearchBox() {
  const { state } = useStore()
  const { location, go, back } = useMailNavigation()
  const search = location.pathname === '/n/search'
  const params = search ? new URLSearchParams(location.search) : new URLSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const [advanced, setAdvanced] = useState(false)
  const [error, setError] = useState('')
  const root = useRef(null)
  const trigger = useRef(null)
  useEffect(() => {
    if (!advanced) return
    function outside(event) { if (!root.current?.contains(event.target)) setAdvanced(false) }
    function escape(event) { if (event.key === 'Escape') { setAdvanced(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [advanced])
  const previous = search ? back : location.pathname + location.search
  function submit(values) {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(values)) if (String(value || '').trim()) next.set(key, String(value).trim())
    go(next.size ? '/n/search?' + next : previous, { state: { back: previous } })
    setAdvanced(false)
  }
  return <div className="search-area" ref={root}>
    <form className="search-form" role="search" onSubmit={event => { event.preventDefault(); submit({ q: query }) }}>
      <div className="search-input">
        <Search size={18} aria-hidden="true" />
        <input id="mail-search" aria-label="Search your mail" placeholder="Search your mail" value={query} onChange={event => setQuery(event.target.value)} />
        {(search || query) && <IconButton icon={X} label="Clear search" onClick={() => { setQuery(''); if (search) go(back) }} />}
        <IconButton ref={trigger} icon={SlidersHorizontal} label="Advanced search" aria-expanded={advanced} onClick={() => { setAdvanced(!advanced); setError('') }} />
      </div>
      <button type="submit" className="search-submit" aria-label="Search" title="Search"><Search size={20} /></button>
    </form>
    {advanced && <form className="popover advanced" onSubmit={event => {
      event.preventDefault()
      const values = Object.fromEntries(new FormData(event.currentTarget))
      if (values.after && values.before && values.after > values.before) { setError('The end date must be on or after the start date.'); return }
      submit(values)
    }}>
      <header className="dialog-header"><h2>Advanced search</h2><IconButton icon={X} label="Close advanced search" onClick={() => { setAdvanced(false); trigger.current?.focus() }} /></header>
      {Object.entries({ from: 'From', to: 'To', subject: 'Subject', q: 'Keyword' }).map(([name, label]) => <label className="field" key={name}>{label}<input name={name} defaultValue={name === 'q' ? query : params.get(name) || ''} /></label>)}
      <label className="field">Folder<select name="folder" defaultValue={params.get('folder') || ''}><option value="">All mail</option><option value="*">Include all folders</option>{allFolders(state.folders).map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
      <div className="two-fields"><label className="field">From date<input name="after" type="date" defaultValue={params.get('after') || ''} /></label><label className="field">To date<input name="before" type="date" defaultValue={params.get('before') || ''} /></label></div>
      <label className="check-label"><input name="attachment" type="checkbox" value="1" defaultChecked={params.has('attachment')} />Has attachments</label>
      {error && <p role="alert" className="error">{error}</p>}
      <footer className="dialog-actions"><button type="button" onClick={() => setAdvanced(false)} className="secondary">Cancel</button><button className="primary">Search</button></footer>
    </form>}
  </div>
}

export function AppearanceChoices() {
  const { state, updateSettings } = useStore()
  const appearance = state.settings?.appearance || {}
  return <div className="field-stack">
    {[
      ['theme', 'Theme', { light: 'Light', dark: 'Dark', auto: 'System' }],
      ['density', 'Message spacing', { compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious' }],
      ['messageLayout', 'Message layout', { list: 'List', right: 'Right', bottom: 'Bottom' }],
    ].map(([key, label, choices]) => <label className="field" key={key}>{label}<select value={appearance[key] || Object.keys(choices)[0]} onChange={event => updateSettings('appearance', { [key]: event.target.value })}>{Object.entries(choices).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>)}
  </div>
}

export function Header({ togglePanel, overlay }) {
  const { state, updateSettings } = useStore()
  const { location, go } = useMailNavigation()
  const user = state.currentUser
  return <header className="header">
    <div className="brand-area"><IconButton icon={MenuIcon} label="Toggle navigation" onClick={() => updateSettings('sidebar', { compact: !state.settings?.sidebar?.compact })} /><MailLink to={inbox} className="brand" aria-label="Yahoo Mail"><span>yahoo!</span><strong>mail</strong></MailLink></div>
    <SearchBox key={location.pathname === '/n/search' ? location.search : 'mail'} />
    <div className="header-tools">
      <IconButton icon={Users} label="Contacts" onClick={() => go('/n/contacts')} />
      <Menu label="Settings" icon={Settings}>{close => <section className="quick-settings"><h2>Quick settings</h2><AppearanceChoices /><button className="secondary" onClick={() => { close(); go('/n/settings/appearance') }}>More settings</button></section>}</Menu>
      {!/^\/n\/(settings|contacts)(\/|$)/.test(location.pathname) && <IconButton icon={Star} label="Toggle side panel" aria-expanded={overlay || Boolean(state.settings?.rightPanel?.open)} onClick={togglePanel} />}
      <Menu label={user?.name || 'Account'} icon={ChevronDown} text={<><Avatar name={user?.name} email={user?.email} color={user?.avatarColor} size={32} /><span className="account-name">{user?.firstName || user?.name || 'Account'}</span></>}>{close => <div className="account-menu"><strong>{user?.name}</strong><p className="muted">{user?.email}</p><MenuItem icon={CircleHelp} onClick={() => { close(); window.dispatchEvent(new Event('mail-shortcut-guide')) }}>Keyboard shortcuts</MenuItem></div>}</Menu>
    </div>
  </header>
}

const dragType = 'application/x-yahoo-mail-ids'

function FolderTree({ onSelect }) {
  const { state, dispatch } = useStore()
  const { location, go } = useMailNavigation()
  const { confirm, notify } = useInterface()
  const { change } = useMailActions()
  const [query, setQuery] = useState('')
  const [edit, setEdit] = useState(null)
  const [error, setError] = useState('')
  const [drop, setDrop] = useState(null)
  const rows = folderTree(state.folders, query)

  function begin(folder, rename = false) {
    setError('')
    setEdit({ folder, rename, name: rename ? folder.name || '' : '' })
  }
  async function submit(event) {
    event.preventDefault()
    let validation
    const done = await dispatch(current => {
      const folders = array(current.folders)
      const target = edit.folder && folders.find(folder => folder.id === edit.folder.id && folder.type !== 'system')
      if (edit.folder && !target) {
        validation = 'This folder is no longer available.'
        return current
      }
      const before = edit.rename ? target : null
      const parentId = (before ? before.parentId : target?.id) || null
      validation = folderError(folders, edit.name, parentId, before?.id)
      if (validation) return current
      const after = before ? { ...before, name: edit.name.trim(), updatedAt: new Date().toISOString() } : makeFolder(folders, edit.name, parentId)
      if (before?.name === after.name) return current
      return record(current, { folders: before ? folders.map(folder => folder.id === before.id ? after : folder) : [...folders, after] },
        activity(current, before ? 'folder.rename' : 'folder.create', { before, after, ...(before && { oldName: before.name, newName: after.name }) }, { folderIds: [after.id] }))
    })
    if (validation) setError(validation)
    else if (done !== null) setEdit(current => current === edit ? null : current)
  }
  function remove(folder) {
    const occupied = current => array(current.messages).some(message => message.folderId === folder.id) || array(current.folders).some(child => child.parentId === folder.id)
    if (occupied(state)) { notify('Move the messages and remove any subfolders before deleting this folder.'); return }
    confirm({
      title: 'Delete folder', text: 'Delete “' + folder.name + '”? Filters that use it will deliver to Inbox.', action: 'Delete folder', danger: true,
      onConfirm: async () => {
        const deleted = await dispatch(current => {
          const before = array(current.folders).find(item => item.id === folder.id)
          if (!before || before.type === 'system' || occupied(current)) return current
          const adjusted = []
          const filters = array(current.filters).map(filter => {
            if (filter.action?.folderId !== folder.id) return filter
            const after = { ...filter, action: { ...filter.action, folderId: 'inbox' }, updatedAt: new Date().toISOString() }
            adjusted.push({ filterId: filter.id, before: filter, after })
            return after
          })
          return record(current, { folders: array(current.folders).filter(item => item.id !== folder.id), filters },
            activity(current, 'folder.delete', { before, after: null, adjustedFilters: adjusted }, { folderIds: [folder.id], filterIds: adjusted.map(item => item.filterId) }))
        })
        if (deleted) {
          if (location.pathname === folderPath(folder.id)) go(inbox)
          notify('Folder deleted')
        }
      },
    })
  }
  async function markRead(folder) {
    const done = await dispatch(current => {
      const ids = []
      const now = new Date().toISOString()
      const messages = array(current.messages).map(message => {
        if (message.folderId !== folder.id || isDraft(message) || message.isRead) return message
        ids.push(message.id)
        return { ...message, isRead: true, updatedAt: now }
      })
      return ids.length ? record(current, { messages }, activity(current, 'folder.mark_all_read', { changes: ids.map(messageId => ({ messageId, field: 'isRead', before: false, after: true })) }, { folderIds: [folder.id], messageIds: ids })) : current
    })
    notify(done ? 'Folder marked as read' : 'All messages in this folder are already read')
  }
  function editor() {
    return <form className="folder-editor" onSubmit={submit}>
      <input autoFocus className="input" aria-label="Folder name" placeholder="Folder name" value={edit.name} onChange={event => setEdit({ ...edit, name: event.target.value })} />
      {error && <p className="error" role="alert">{error}</p>}
      <div><button className="primary">{edit.rename ? 'Update' : 'Add'}</button><button type="button" className="tool-button" onClick={() => setEdit(null)}>Cancel</button></div>
    </form>
  }
  return <section className="folder-section" aria-label="Folders">
    <div className="section-heading"><strong>Folders</strong><button className="link-button" onClick={() => begin(null)}><FolderPlus size={14} /> New folder</button></div>
    {edit && !edit.folder && editor()}
    <div className="folder-search"><Search size={14} /><input aria-label="Search folders" placeholder="Find a folder" value={query} onChange={event => setQuery(event.target.value)} /></div>
    <div className="folder-scroll">
      {rows.map(({ folder, depth }) => {
        const active = location.pathname === folderPath(folder.id)
        const count = array(state.messages).filter(message => message.folderId === folder.id && isReceived(message) && !message.isRead).length
        const editable = folder.type !== 'system' && !Object.hasOwn(systemFolders, folder.id)
        return <div key={folder.id}>
          <div className={'folder-row' + (drop === folder.id ? ' drop-target' : '')}
            onDragOver={event => { if (event.dataTransfer.types.includes(dragType)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDrop(folder.id) } }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDrop(null) }}
            onDrop={event => {
              event.preventDefault()
              setDrop(null)
              try {
                const ids = JSON.parse(event.dataTransfer.getData(dragType))
                if (Array.isArray(ids)) change(ids, 'move', folder.id)
              } catch { /* The drop did not contain mailbox data. */ }
            }}>
            <MailLink className={'nav-item' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined} to={folderPath(folder.id)} onClick={onSelect} style={{ paddingLeft: 9 + Math.min(depth, 5) * 16 }}><Folder size={16} /><span>{folder.name || 'Unnamed folder'}</span>{count > 0 && <small>{count}</small>}</MailLink>
            <Menu icon={MoreHorizontal} label={'Actions for ' + (folder.name || 'folder')}>{close => <>
              {editable && <MenuItem onClick={() => { close(); begin(folder) }}>Create subfolder</MenuItem>}
              {editable && <MenuItem onClick={() => { close(); begin(folder, true) }}>Rename</MenuItem>}
              <MenuItem onClick={() => { close(); markRead(folder) }}>Mark all as read</MenuItem>
              {editable && <MenuItem onClick={() => { close(); remove(folder) }}>Delete folder</MenuItem>}
            </>}</Menu>
          </div>
          {edit?.folder?.id === folder.id && editor()}
        </div>
      })}
      {!rows.length && <p className="small muted padded">{query ? 'No matching folders' : 'No custom folders'}</p>}
    </div>
  </section>
}

export function Sidebar() {
  const { state, updateSettings } = useStore()
  const { location } = useMailNavigation()
  const [drawer, setDrawer] = useState(false)
  const prefs = state.settings?.sidebar || {}
  const messages = array(state.messages)
  function count(key) {
    if (!state.settings?.inbox?.showUnreadCount && key === 'inbox') return null
    return messages.filter(message => message.folderId === key && (key === 'draft' || key === 'spam' || isReceived(message) && !message.isRead)).length || null
  }
  function nav(to, label, Icon, badge, active = location.pathname === to) {
    return <MailLink to={to} title={label} className={'nav-item' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined} onClick={() => setDrawer(false)}><Icon size={18} /><span>{label}</span>{badge && <small>{badge}</small>}</MailLink>
  }
  return <nav className={'sidebar' + (drawer ? ' drawer-open' : '')} aria-label="Mailbox navigation">
    <button className="mobile-nav tool-button" onClick={() => setDrawer(!drawer)} aria-expanded={drawer}><MenuIcon size={18} /> Mailboxes</button>
    <MailLink className="compose-button" to={draftPath()} state={{ back: location.pathname.startsWith('/n/compose') ? location.state?.back || inbox : location.pathname + location.search }} onClick={() => setDrawer(false)}><Pencil size={17} /><span>Compose</span></MailLink>
    {nav(inbox, 'Inbox', Inbox, count('inbox'), location.pathname.startsWith('/n/inbox/'))}
    {nav('/n/starred', 'Starred', Star)}
    {nav(folderPath('sent'), 'Sent', Send)}
    {nav(folderPath('draft'), 'Drafts', FileText, messages.filter(isDraft).length || null)}
    <button className="nav-item" aria-expanded={Boolean(prefs.foldersExpanded)} onClick={() => updateSettings('sidebar', { foldersExpanded: !prefs.foldersExpanded, ...(prefs.compact && { compact: false, foldersExpanded: true }) })}><Folder size={18} /><span>Folders</span>{prefs.foldersExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
    <button className="nav-item" aria-expanded={Boolean(prefs.moreExpanded)} onClick={() => updateSettings('sidebar', { moreExpanded: !prefs.moreExpanded })}><MoreHorizontal size={18} /><span>{prefs.moreExpanded ? 'Less' : 'More'}</span>{prefs.moreExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
    {prefs.moreExpanded && <div className="more-nav">
      {nav('/n/unread', 'Unread', MailOpen)}
      {['archive', 'spam', 'trash'].map(key => <div key={key}>{nav(folderPath(key), key[0].toUpperCase() + key.slice(1), folderIcons[key], key === 'spam' && count(key))}</div>)}
      <button className="nav-item" aria-expanded={Boolean(prefs.viewsExpanded)} onClick={() => updateSettings('sidebar', { viewsExpanded: !prefs.viewsExpanded })}><Paperclip size={18} /><span>Views</span>{prefs.viewsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
      {prefs.viewsExpanded && Object.entries(views).map(([key, title]) => <div className="nested-nav" key={key}>{nav('/n/views/' + key, title, key === 'attachments' ? Paperclip : FileText)}</div>)}
      {nav('/n/settings/appearance', 'Settings', Settings, null, location.pathname.startsWith('/n/settings/'))}
    </div>}
    {prefs.foldersExpanded && !prefs.compact && <FolderTree onSelect={() => setDrawer(false)} />}
  </nav>
}
