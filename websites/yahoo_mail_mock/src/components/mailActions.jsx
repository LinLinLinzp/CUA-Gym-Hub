import { useState } from 'react'
import { Archive, ArrowLeft, FolderInput, Mail, MailOpen, MoreHorizontal, Search, ShieldAlert, Star, Trash2 } from 'lucide-react'
import { activity, record, useStore } from '../store.jsx'
import { array, folderTree, isDraft, isReceived, systemFolders } from '../data/model.js'
import { mailChange, readGroup } from '../data/mailbox.js'
import { draftPath, Menu, MenuItem, messagePath, useInterface, useMailNavigation } from './ui.jsx'
import { useDraftActions } from './draftActions.jsx'

const messagesByAction = {
  read: 'Marked as read', unread: 'Marked as unread', star: 'Starred', unstar: 'Star removed',
  move: 'Moved to folder', archive: 'Archived', delete: 'Moved to Trash',
  spam: 'Moved to Spam', restore: 'Message restored', not_spam: 'Restored from Spam',
}

export function useMailActions() {
  const { dispatch, dispatchChange } = useStore()
  const { confirm, notify } = useInterface()
  const { discard } = useDraftActions()
  async function change(ids, action, target, silent = false) {
    let result, event
    if (!await dispatch(state => {
      result = mailChange(state, ids, action, target)
      if (!result) return state
      event = activity(state, 'message.' + action, { changes: result.changes }, { messageIds: result.messageIds, folderIds: result.folderIds })
      return record(state, { messages: result.messages }, event)
    })) return false
    if (!silent) notify(messagesByAction[action], async () => {
      if (await dispatchChange({ type: 'undo', inverses: result.inverses, activityId: event.id, folderIds: result.folderIds }, 'Undo mailbox action')) notify('Action undone')
    })
    return true
  }
  function remove(ids, folderId) {
    const count = ids.length
    if (!count) return
    const label = folderId ? 'Empty ' + systemFolders[folderId] : 'Delete permanently'
    confirm({
      title: label,
      text: 'Permanently delete ' + count + (count === 1 ? ' message?' : ' messages?'),
      action: label, danger: true,
      onConfirm: async () => {
        const done = await dispatchChange({ type: 'deleteMessages', ids, folderId }, label)
        if (done) notify('Messages permanently deleted')
      },
    })
  }
  function discardDrafts(ids, onDiscard) {
    const plural = ids.length > 1
    const label = plural ? 'Discard drafts' : 'Discard draft'
    confirm({ title: label + '?', text: plural ? 'Delete these ' + ids.length + ' drafts and their edits?' : 'This draft and its edits will be deleted.',
      action: label, danger: true, onConfirm: async () => {
        if (!await discard(ids)) return
        notify(plural ? 'Drafts discarded' : 'Draft discarded')
        onDiscard?.()
      },
    })
  }
  return { change, remove, discardDrafts }
}

export function useOpenMail() {
  const { state } = useStore()
  const { go, location } = useMailNavigation()
  const { change } = useMailActions()
  return (message, back = location.pathname + location.search, ids) => {
    if (isDraft(message)) {
      go(draftPath(message.id), { state: { back } })
      return
    }
    if (state.settings?.viewing?.markAsRead !== 'never') {
      const unread = readGroup(state, message).filter(item => isReceived(item) && !item.isRead).map(item => item.id)
      change(unread, 'read', null, true)
    }
    go(messagePath(message.id), { state: { back, scope: ids } })
  }
}

export function MoveMenu({ onMove, open, onOpenChange, text = 'Move' }) {
  const { state } = useStore()
  return <Menu label="Move" icon={FolderInput} text={text} open={open} onOpenChange={onOpenChange}>
    {close => <MoveOptions close={close} onMove={onMove} folders={state.folders} />}
  </Menu>
}

function MoveOptions({ close, onMove, folders }) {
  const [query, setQuery] = useState('')
  const roots = Object.entries(systemFolders).filter(([key, name]) => !['draft', 'sent'].includes(key) && name.toLowerCase().includes(query.toLowerCase())).map(([id, name]) => ({ folder: { id, name }, depth: 0 }))
  const options = [...roots, ...folderTree(folders, query)]
  return <div className="move-options">
    <label className="folder-search"><Search size={14} /><input autoFocus aria-label="Find destination folder" placeholder="Find a folder" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {options.map(({ folder, depth }) => <MenuItem key={folder.id} icon={FolderInput} onClick={() => { close(); onMove(folder.id) }}><span style={{ paddingLeft: depth * 12 }}>{folder.name || 'Unnamed folder'}</span></MenuItem>)}
    {!options.length && <p className="small muted padded">No matching folders</p>}
  </div>
}

export function MailTools({ ids, messages, iconOnly, onAction, moveOpen, setMoveOpen, extra }) {
  const { change, remove } = useMailActions()
  const isTrash = messages.length > 0 && messages.every(message => message.folderId === 'trash')
  const isSpam = messages.length > 0 && messages.every(message => message.folderId === 'spam')
  const isArchive = messages.length > 0 && messages.every(message => message.folderId === 'archive')
  const allRead = messages.every(message => message.isRead)
  const allStarred = messages.every(message => message.isStarred)
  async function act(action, target) {
    if (action === 'delete' && isTrash) { remove(ids); return }
    if (await change(ids, action, target)) onAction?.(action)
  }
  const button = (Icon, label, action) => <button type="button" title={label} aria-label={label} className={iconOnly ? 'icon-button' : 'tool-button'} onClick={() => act(action)}><Icon size={17} />{!iconOnly && label}</button>
  return <>
    {isTrash || isSpam || isArchive ? button(ArrowLeft, isSpam ? 'Not spam' : isArchive ? 'Move to Inbox' : 'Restore', isSpam ? 'not_spam' : 'restore') : button(Archive, 'Archive', 'archive')}
    <MoveMenu onMove={target => act('move', target)} open={moveOpen} onOpenChange={setMoveOpen} text={iconOnly ? null : 'Move'} />
    {button(Trash2, isTrash ? 'Delete permanently' : 'Delete', 'delete')}
    {!isSpam && !isTrash && !iconOnly && button(ShieldAlert, 'Spam', 'spam')}
    <Menu label="More message actions" icon={MoreHorizontal}>{close => <>
      <MenuItem icon={allRead ? Mail : MailOpen} onClick={() => { close(); act(allRead ? 'unread' : 'read') }}>{allRead ? 'Mark as unread' : 'Mark as read'}</MenuItem>
      <MenuItem icon={Star} onClick={() => { close(); act(allStarred ? 'unstar' : 'star') }}>{allStarred ? 'Remove star' : 'Star'}</MenuItem>
      {iconOnly && !isSpam && !isTrash && <MenuItem icon={ShieldAlert} onClick={() => { close(); act('spam') }}>Spam</MenuItem>}
      {extra?.(close)}
    </>}</Menu>
  </>
}
