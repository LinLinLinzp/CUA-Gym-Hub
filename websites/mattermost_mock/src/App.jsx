import { useEffect, useState } from 'react'
import { ChevronDown, FileText, Hash, Info, Link2, Pin, Plus, Star, Users } from 'lucide-react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useFeedback } from './components/Feedback.jsx'
import { ChannelDialogs } from './components/ChannelDialogs.jsx'
import { BrowseChannels, ChannelInfo, Confirm, channelMenu } from './components/Channels.jsx'
import { categoryCommand, joinChannel, channelPreference, updateBookmark, updateChannelRead } from './data/channelActions.js'
import { useStore } from './store.jsx'
import { active, activePins, byId, canPost, canView, channelName, member, members } from './data/selectors.js'
import { deletePost, markThreadsRead, sendPost } from './data/postActions.js'
import { Message, ThreadDiscussion, ThreadsInbox, Timeline } from './components/Messages.jsx'
import { FilePreview, FilesPane } from './components/Files.jsx'
import { SearchDialog, SearchResults, PersonalMessages } from './components/Search.jsx'
import { SettingsDialog, ShortcutsDialog } from './components/Settings.jsx'
import { BookmarkDialog, CategoryDialog, ForwardDialog } from './components/ExtraDialogs.jsx'
import { EmojiPicker } from './components/Emoji.jsx'
import { appPath, browsePath, channelPath, postPath } from './utils/routes.js'
import { ChannelIcon, Dialog, Empty, IconButton, Menu, Pane } from './components/UI.jsx'
import { Sidebar, Topbar } from './components/Shell.jsx'

function Workspace({ mode }) {
  const { state, dispatch, saveStatus, retrySave } = useStore()
  const { notify } = useFeedback()
  const change = (command, ...args) => dispatch(current => {
    const time = new Date().toISOString()
    return command(current, ...args, time)
  })
  const { teamName, channelName: slug, channelId, postId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const user = byId(state.users, state.currentUserId)
  const team = teamName ? state.teams.find(row => row?.name === teamName) : byId(state.teams, state.currentTeamId) ?? state.teams.find(Boolean)
  const [drawer, setDrawer] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [lastSearch, setLastSearch] = useState(null)
  const [pane, setPane] = useState(null)
  const [threadFocus, setThreadFocus] = useState(null)
  const inThreads = mode === 'threads'
  const target = mode === 'permalink' ? byId(state.posts, postId) : null
  const channel = state.channels.find(row => row && team && row.teamId === team.id &&
    (slug ? row.name === slug : channelId ? row.id === channelId && ['D', 'G'].includes(row.type) : target && row.id === target.channelId))
  const permalinkPane = target?.rootId && channel ? { kind: 'thread', rootId: target.rootId, channelId: channel.id } : null
  const visiblePane = pane?.key === location.key ? pane.value : permalinkPane
  const openPane = value => {
    setPane({ key: location.key, value })
    setThreadFocus(null)
  }
  const closeDrawer = () => setDrawer(false)
  const closeDialog = () => setDialog(null)
  const closePane = () => {
    openPane(null)
    if (inThreads && visiblePane?.fromInbox) setThreadFocus({ key: location.key, id: visiblePane.rootId })
  }
  const goHome = () => navigate(appPath('/'))
  const openChannel = (item, { replace = false, markRead = true } = {}) => {
    if (markRead) change(updateChannelRead, item.id)
    closeDrawer()
    closePane()
    navigate(appPath(channelPath(team, item)), { replace })
  }
  const join = item => {
    if (change(joinChannel, item.id)) {
      openChannel(item, { markRead: false })
      notify('Joined ' + channelName(state, item))
    }
  }

  useEffect(() => {
    function handleKey(event) {
      if (event.defaultPrevented || dialog) return
      if (event.key === 'Escape') {
        if (drawer) closeDrawer()
        else if (visiblePane) closePane()
        else closeDrawer()
      }
      if (!event.metaKey && !event.ctrlKey) return
      const key = event.key.toLowerCase()
      if ((key === 'k' && team && user) || key === '/') {
        event.preventDefault()
        setDialog({ kind: key === '/' ? 'shortcuts' : event.shiftKey ? 'people' : 'find' })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dialog, drawer, visiblePane, location.key, team, user, inThreads])

  if (mode === 'home' && team && user) {
    const joined = state.channels.filter(row => row?.teamId === team.id && active(row) && member(state, row.id))
    const first = joined.find(row => row.isDefault || row.name === 'town-square') ?? joined[0] ??
      state.channels.find(row => row?.teamId === team.id && active(row) && canView(state, row))
    return <Navigate replace to={appPath(first ? channelPath(team, first) : browsePath(team))} />
  }

  const viewable = canView(state, channel)
  const joined = viewable && member(state, channel.id)
  const channelActions = viewable ? {
    favorite: joined && active(channel) ? () => change(channelPreference, channel.id, 'isFavorite') : undefined,
    mute: joined && active(channel) ? () => change(channelPreference, channel.id, 'muted') : undefined,
    unread: joined && active(channel) ? () => change((current, time) => updateChannelRead(current, channel.id, time, null)) : undefined,
  } : {}
  const onCategory = (category, operation) => {
    if (operation === 'delete') setDialog({ kind: 'deleteCategory', category })
    else change((current, time) => categoryCommand(current, team.id, operation, time, { category }))
  }
  const onMove = (channelId, category, beforeId) => change((current, time) =>
    categoryCommand(current, team.id, 'move', time, { category, channelId, beforeId }))
  const paneChannel = byId(state.channels, visiblePane?.channelId)
  const paneRoot = byId(state.posts, visiblePane?.rootId)
  const selectThread = root => {
    change(markThreadsRead, team.id, root.id)
    openPane({ kind: 'thread', rootId: root.id, channelId: root.channelId, fromInbox: true })
  }
  const openThread = (root, explicit) => {
    if (visiblePane?.fromInbox && visiblePane.rootId === root.id) return
    if (explicit) change(markThreadsRead, team.id, root.id)
    openPane({ kind: 'thread', rootId: root.id, channelId: root.channelId })
  }
  const jumpTo = post => {
    if (!post || !team || !canView(state, byId(state.channels, post.channelId))) return
    setPane(null)
    navigate(appPath(postPath(team, post)))
  }
  const context = { state, team, change, openDialog: setDialog, openThread, jumpTo, saveStatus }
  const paneTitle = { pins: 'Pinned messages', files: 'Files', info: 'Channel Info', saved: 'Saved messages', mentions: 'Recent mentions', search: 'Search results' }
  const activeUserTeam = Boolean(user && team)
  const showPane = activeUserTeam && visiblePane && (!visiblePane.channelId || canView(state, paneChannel) && paneChannel.teamId === team.id)
  const rightPane = showPane && (visiblePane.kind === 'thread' ? <ThreadDiscussion key={visiblePane.rootId}
    root={paneRoot?.channelId === paneChannel.id && !paneRoot.rootId ? paneRoot : null} channel={paneChannel} context={context}
    target={target && target.rootId === visiblePane.rootId && target.channelId === paneChannel.id ? target : null} inChannel={channel?.id === paneChannel.id}
    close={closePane} embedded={inThreads} /> :
    <Pane key={visiblePane.kind + (paneChannel?.id ?? '')} title={paneTitle[visiblePane.kind]} close={closePane} embedded={inThreads}>
      {visiblePane.kind === 'info' && <ChannelInfo state={state} channel={paneChannel}
        openDialog={setDialog} openPane={openPane} {...channelActions} />}
      {visiblePane.kind === 'pins' && <PinnedMessages state={state} channel={paneChannel} context={context} />}
      {visiblePane.kind === 'files' && <FilesPane state={state} channel={paneChannel} openDialog={setDialog} jumpTo={jumpTo} />}
      {visiblePane.kind === 'search' && lastSearch && <SearchResults value={lastSearch} context={context}
        clear={() => { setLastSearch(null); closePane() }} update={() => setDialog({ kind: 'search' })} />}
      {['saved', 'mentions'].includes(visiblePane.kind) && <PersonalMessages context={context} kind={visiblePane.kind} />}
    </Pane>)
  const dialogChannel = byId(state.channels, dialog?.channelId)
  const dialogPost = byId(state.posts, dialog?.postId)
  return <>
    <Topbar state={state} user={user} team={team} navigate={navigate} openDialog={setDialog} openPane={openPane} toggleDrawer={() => setDrawer(value => !value)} />
    {['failed', 'interrupted'].includes(saveStatus.phase) && <div className="save-banner">
      <p role="alert">{saveStatus.phase === 'failed' ? 'Your changes could not be saved.' : 'You have changes waiting to be saved.'}</p>
      <button type="button" className="secondary" onClick={retrySave}>Retry save</button>
    </div>}
    <div className="workspace">
      {team && user && <Sidebar state={state} team={team} channel={viewable ? channel : null} mode={mode} drawer={drawer}
        closeDrawer={closeDrawer} openDialog={setDialog} onCategory={onCategory} onMove={onMove} onSelect={item => { change(updateChannelRead, item.id); closeDrawer(); closePane() }} />}
      <main className="workspace-main">
        {!user ? <Empty title="No active user"><p>This workspace has no current user.</p></Empty> :
          !team ? <Empty title="Team unavailable" /> :
          viewable ? <>
            <ChannelHeader state={state} channel={channel} openPane={openPane} openDialog={setDialog} actions={{
              ...channelActions, menu: channelMenu({ state, channel, openDialog: setDialog, canMove: true, ...channelActions }),
            }} />
            <ChannelBookmarks state={state} channel={channel} openDialog={setDialog} />
            <Timeline key={channel.id} channel={channel} target={target} context={context} />
            {!joined && active(channel) && <div className="channel-banner"><p>You are viewing a public channel.</p>
              <button type="button" className="primary" onClick={() => join(channel)}>Join Channel</button></div>}
          </> :
          mode === 'browse' ? <BrowseChannels state={state} team={team} onOpen={openChannel} onJoin={join}
            onCreate={() => setDialog({ kind: 'create' })} /> :
          inThreads ? <ThreadsInbox context={context} selectedId={visiblePane?.fromInbox ? visiblePane.rootId : null}
            select={selectThread} pane={rightPane} focusId={threadFocus?.key === location.key ? threadFocus.id : null}
            clearFocus={() => setThreadFocus(null)} /> :
          <Empty icon={Hash} title="Channel or message unavailable"><Link to={appPath(browsePath(team))}>Browse channels</Link></Empty>}
      </main>
      {!inThreads && rightPane}
    </div>
    {dialog && (dialog.kind === 'deletePost' ? <Confirm title="Delete message" description="Delete this message?" submit="Delete"
      danger close={closeDialog} apply={() => { if (change(deletePost, dialog.postId)) notify('Message deleted'); closeDialog() }} /> :
      dialog.kind === 'file' ? <FilePreview key={dialog.fileId} state={state} ids={dialog.ids} fileId={dialog.fileId} close={closeDialog} /> :
      dialog.kind === 'emoji' ? <EmojiPicker close={closeDialog} select={dialog.select} /> :
      dialog.kind === 'copy' ? <Dialog title={dialog.title ?? "Copy Link"} close={closeDialog}><div className="content"><label className="field">
        <span>{dialog.title ?? "Message link"}</span><input data-focus readOnly value={dialog.value} onFocus={event => event.target.select()} />
      </label></div></Dialog> :
      dialog.kind === 'search' && user && team ? <SearchDialog initial={lastSearch} close={closeDialog} submit={value => {
        setLastSearch(value)
        closeDialog()
        openPane({ kind: 'search' })
      }} /> :
      dialog.kind === 'settings' && user ? <SettingsDialog state={state} initialTab={dialog.tab} close={closeDialog} change={change} /> :
      dialog.kind === 'shortcuts' ? <ShortcutsDialog close={closeDialog} /> :
      dialog.kind === 'forward' && team && dialogPost ? <ForwardDialog state={state} team={team} post={dialogPost} close={closeDialog}
        apply={(channelId, message) => {
          if (!change(sendPost, channelId, null, { message, forwardedPostId: dialogPost.id })) throw new Error('The message could not be forwarded.')
          closeDialog()
        }} /> :
      ['category', 'move'].includes(dialog.kind) && team ? <CategoryDialog state={state} team={team} category={dialog.category}
        channel={dialogChannel} close={closeDialog} apply={value => {
          if (dialogChannel) onMove(dialogChannel.id, value)
          else change((current, time) => categoryCommand(current, team.id, dialog.category ? 'rename' : 'create', time, { category: dialog.category, name: value }))
          closeDialog()
        }} /> :
      dialog.kind === 'deleteCategory' && team ? <Confirm title="Delete category" description={'Delete ' + dialog.category.name + '? Channels will return to their default categories.'}
        close={closeDialog} submit="Delete" danger apply={() => {
          change((current, time) => categoryCommand(current, team.id, 'delete', time, { category: dialog.category }))
          closeDialog()
        }} /> :
      dialog.kind === 'bookmark' && canPost(state, dialogChannel) ? <BookmarkDialog channel={dialogChannel} bookmarkId={dialog.bookmarkId}
        close={closeDialog} apply={values => {
          change((current, time) => updateBookmark(current, dialogChannel.id, time, values, dialog.bookmarkId))
          closeDialog()
        }} /> :
      dialog.kind === 'deleteBookmark' && canPost(state, dialogChannel) ? <Confirm title="Delete bookmark" description="Remove this channel bookmark?"
        close={closeDialog} submit="Delete" danger apply={() => {
          change((current, time) => updateBookmark(current, dialogChannel.id, time, null, dialog.bookmarkId))
          closeDialog()
        }} /> :
      <ChannelDialogs dialog={dialog} state={state} team={team} close={closeDialog} show={setDialog} change={change}
        openChannel={openChannel} goHome={goHome} notify={notify} />)}
  </>
}

function PinnedMessages({ state, channel, context }) {
  const pinned = activePins(state, channel.id)
  return <div className="pane-results scroll">
    {!pinned.length && <Empty icon={Pin} title="No pinned messages yet" />}
    {pinned.map(pin => <Message key={pin.id} post={byId(state.posts, pin.postId)} context={context} discussion jump />)}
  </div>
}

function ChannelBookmarks({ state, channel, openDialog }) {
  const bookmarks = (channel.bookmarks ?? []).filter(Boolean)
  const writable = canPost(state, channel)
  if (!bookmarks.length) return null
  return <nav className="channel-bookmarks" aria-label="Channel bookmarks">
    {bookmarks.map(bookmark => {
      const show = kind => openDialog({ kind, channelId: channel.id, bookmarkId: bookmark.id })
      return <Menu key={bookmark.id} icon={Link2} label={bookmark.label ?? 'Bookmark'} className="bookmark-link" items={[
        { label: 'View link', run: () => openDialog({ kind: 'copy', value: bookmark.url ?? '', title: 'Bookmark link' }) },
        writable && { label: 'Edit bookmark', run: () => show('bookmark') },
        writable && { label: 'Delete bookmark', run: () => show('deleteBookmark'), danger: true },
      ]}>{bookmark.label}</Menu>
    })}
    {writable && <IconButton icon={Plus} size={15} label="Add bookmark" onClick={() => openDialog({ kind: 'bookmark', channelId: channel.id })} />}
  </nav>
}

export function ChannelHeader({ state, channel, openPane, openDialog, actions = {} }) {
  const mine = member(state, channel.id)
  const pins = activePins(state, channel.id)
  const show = kind => openPane({ kind, channelId: channel.id })
  return <header className="channel-header">
    <div className="channel-title">
      <Menu label={channelName(state, channel) + ' channel menu'} className="channel-title-button" items={[
        { label: 'Channel Info', run: () => show('info') },
        ...(actions.menu ?? []),
        canPost(state, channel) && { label: 'Add bookmark', run: () => openDialog({ kind: 'bookmark', channelId: channel.id }) },
      ]}><ChannelIcon channel={channel} />{channelName(state, channel)}<ChevronDown size={15} /></Menu>
      {actions.favorite && <IconButton icon={Star} label={mine?.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'} className={mine?.isFavorite ? 'starred' : ''} onClick={actions.favorite} />}
    </div>
    <div className="channel-details">
      <IconButton icon={Users} size={15} label="View channel members" onClick={() => openDialog({ kind: 'members', channelId: channel.id })}>{members(state, channel.id).length}</IconButton>
      {pins.length > 0 && <IconButton icon={Pin} size={15} label="Pinned messages" onClick={() => show('pins')}>{pins.length}</IconButton>}
      <IconButton icon={FileText} size={15} label="Channel files" onClick={() => show('files')} />
      <IconButton icon={Info} size={15} label="Channel info" onClick={() => show('info')} />
      {channel.header && <span title={channel.header}>{channel.header}</span>}
    </div>
  </header>
}

export function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Workspace mode="home" />} />
    <Route path="/:teamName/channels" element={<Workspace mode="browse" />} />
    <Route path="/:teamName/channels/:channelName" element={<Workspace mode="channel" />} />
    <Route path="/:teamName/messages/:channelId" element={<Workspace mode="channel" />} />
    <Route path="/:teamName/threads" element={<Workspace mode="threads" />} />
    <Route path="/:teamName/pl/:postId" element={<Workspace mode="permalink" />} />
    <Route path="*" element={<Workspace mode="missing" />} />
  </Routes></BrowserRouter>
}
