import { useLayoutEffect, useRef, useState } from 'react'
import { Bookmark, CheckCheck, MessageSquare, MoreHorizontal, Pin, Reply, SmilePlus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { active, activePins, byId, canPost, canView, channelName, channelPosts, member, ownSave, ownThread, replies,
  rootPost, unreadPosts, userName } from '../data/selectors.js'
import { updateChannelRead } from '../data/channelActions.js'
import { editPost, markThreadsRead, setFollowing, setPin, toggleReaction, toggleSave } from '../data/postActions.js'
import { appPath, browsePath, postPath } from '../utils/routes.js'
import { Composer } from './Composer.jsx'
import { emojiGlyph } from './Emoji.jsx'
import { useFeedback } from './Feedback.jsx'
import { FileCard } from './Files.jsx'
import { MessageMarkdown } from './Markdown.jsx'
import { Avatar, Empty, IconButton, Menu, Pane } from './UI.jsx'

const timestamp = value => {
  const date = new Date(value ?? '')
  return Number.isNaN(date.getTime()) ? null : date
}
const clock = (value, format) => timestamp(value)?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: format !== '24h' }) ?? ''
export function dayLabel(value) {
  const date = timestamp(value)
  if (!date) return ''
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  today.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function useMessageScroll({ jumpId, lastId }) {
  const node = useRef(null)
  const location = useLocation()
  const priorLast = useRef(null)
  useLayoutEffect(() => {
    const container = node.current
    if (!container) return
    const target = jumpId && [...container.querySelectorAll('[data-post-id]')].find(item => item.dataset.postId === jumpId)
    if (target) target.scrollIntoView({ block: 'center' })
    else if (!priorLast.current || priorLast.current !== lastId && container.scrollHeight - container.scrollTop - container.clientHeight < 250) {
      container.scrollTop = container.scrollHeight
    }
    priorLast.current = lastId
  }, [jumpId, lastId, location.key])
  return node
}

function ReplySummary({ state, root, open }) {
  const rows = replies(state, root).filter(row => !row.deletedAt)
  if (!rows.length) return null
  const own = ownThread(state, root.id)
  const ids = [...new Set(rows.map(row => row.userId))].slice(0, 4)
  const unread = own?.following && unreadPosts(rows, own.lastReadPostId, own.lastReadAt, state.currentUserId).length > 0
  return <button type="button" className="reply-summary" onClick={() => open(root, true)}>
    {unread && <span className="unread-dot" aria-label="Unread" />}
    <span className="avatar-stack">{ids.map(id => <Avatar size={17} user={byId(state.users, id)} key={id} />)}</span>
    <strong>{rows.length} {rows.length === 1 ? 'reply' : 'replies'}</strong>
    {own?.following && <span className="following-chip">Following</span>}
    <small>Last reply {dayLabel(rows.at(-1)?.createdAt)}</small>
  </button>
}

function ReactionPills({ state, post, writable, change, pick }) {
  const rows = state.reactions.filter(row => row?.postId === post.id && active(row))
  if (!rows.length) return null
  const groups = Map.groupBy ? Map.groupBy(rows, row => row.emojiName) : rows.reduce((map, row) =>
    map.set(row.emojiName, [...(map.get(row.emojiName) ?? []), row]), new Map())
  return <div className="reactions">{[...groups].map(([name, items]) => {
    const own = items.some(row => row.userId === state.currentUserId)
    return <button type="button" key={name} className={'reaction' + (own ? ' own' : '')} disabled={!writable}
      aria-pressed={own} aria-label={name + ', ' + items.length + ' reactions'}
      title={items.map(row => userName(byId(state.users, row.userId))).join(', ')} onClick={() => change(toggleReaction, post.id, name)}>
      {emojiGlyph(name)} <span>{items.length}</span>
    </button>
  })}{writable && <IconButton icon={SmilePlus} size={15} label="Add reaction" onClick={pick} />}</div>
}

export function Message({ post, context, highlight = false, discussion = false, source = false, jump = false, terms = [] }) {
  const { state, team, openThread, change, openDialog, jumpTo, saveStatus } = context
  const { preferences, notify } = useFeedback()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const channel = byId(state.channels, post.channelId)
  const author = byId(state.users, post.userId)
  const own = post.userId === state.currentUserId
  const allowed = canPost(state, channel)
  const pending = saveStatus.postIds.includes(post.id)
  const writable = !pending && !post.deletedAt && allowed
  const joined = member(state, post.channelId)
  const root = rootPost(state, post)
  const pin = !post.deletedAt && activePins(state, post.channelId).some(row => row.postId === post.id)
  const saved = ownSave(state, post.id)
  const following = root && ownThread(state, root.id)?.following
  const files = (post.fileIds ?? []).map(id => byId(state.files, id)).filter(file => file?.status === 'posted' && file.postId === post.id)
  const forwarded = byId(state.posts, post.forwardedPostId)
  const original = forwarded && !forwarded.deletedAt && canView(state, byId(state.channels, forwarded.channelId)) ? forwarded : null
  const pick = () => openDialog({ kind: 'emoji', select: name => change(toggleReaction, post.id, name) })
  const reply = () => root && openThread(root, true)
  const save = () => change(toggleSave, post.id)
  const pinAction = () => { if (change(setPin, post.id, !pin)) notify(pin ? 'Message unpinned' : 'Message pinned') }
  const item = (label, run) => ({ label, run })

  async function copyLink() {
    const value = new URL(appPath(postPath(team, post)), window.location.origin).href
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
      else {
        const input = document.createElement('textarea')
        const previous = document.activeElement
        input.value = value
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.append(input)
        input.select()
        const copied = document.execCommand('copy')
        input.remove()
        previous?.focus()
        if (!copied) throw new Error('Copy unavailable')
      }
      notify('Link copied')
    } catch { openDialog({ kind: 'copy', value }) }
  }

  const menu = [
    root && item('Reply in thread', reply),
    root && joined && item(following ? 'Unfollow thread' : 'Follow thread', () => change(setFollowing, root.id, !following)),
    joined && active(channel) && item('Mark as Unread', () => change((current, time) => updateChannelRead(current, post.channelId, time, post.id))),
    item(saved ? 'Remove from Saved' : 'Save message', save),
    writable && item(pin ? 'Unpin from channel' : 'Pin to channel', pinAction),
    item('Copy Link', copyLink),
    item('Forward', () => openDialog({ kind: 'forward', postId: post.id })),
    writable && own && item('Edit', () => { setValue(post.message ?? ''); setError(''); setEditing(true) }),
    writable && own && { ...item('Delete', () => openDialog({ kind: 'deletePost', postId: post.id })), danger: true },
  ]

  return <article className={'message' + (highlight ? ' highlighted' : '') + (pin ? ' pinned' : '')}
    data-post-id={post.id}>
    {pin && <div className="pin-strip"><Pin size={13} /> Pinned</div>}
    <Avatar user={author} presence={author?.presence} />
    <div className="message-content">
      <div className="message-meta"><strong>{userName(author)}</strong>
        {pending ? <span role="status">{saveStatus.phase === 'saving' ? 'Sending…' : 'Send pending'}</span> :
          <time dateTime={post.createdAt || undefined} title={timestamp(post.createdAt)?.toLocaleString()}>{clock(post.createdAt, preferences?.clockFormat)}</time>}
        {source && <span className="message-source">{channelName(state, channel)} · {dayLabel(post.createdAt)}</span>}
        {post.editedAt && !post.deletedAt && <small>(edited)</small>}
      </div>
      {post.deletedAt ? <p className="tombstone">Message deleted</p> : editing ? <form className="inline-edit" onSubmit={event => {
        event.preventDefault()
        try { change(editPost, post.id, value); setEditing(false) } catch (failure) { setError(failure.message) }
      }}>
        <textarea aria-label="Edit message" autoFocus value={value} onChange={event => setValue(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setEditing(false) } }} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div><button className="secondary" type="button" onClick={() => setEditing(false)}>Cancel</button><button className="primary">Save</button></div>
      </form> : <>
        {terms.length ? <p className="search-message"><Highlight value={post.message} terms={terms} /></p> : <MessageMarkdown message={post.message} />}
        {post.forwardedPostId && <blockquote className="forwarded">
          <strong>Forwarded message{original && ' · ' + userName(byId(state.users, original.userId))}</strong>
          {original ? <><MessageMarkdown message={original.message} /><button className="text-button" type="button" onClick={() => jumpTo(original)}>Jump to original</button></> :
            <p>Original message unavailable</p>}
        </blockquote>}
        {files.length > 0 && <div className="message-files">{files.map(file => <FileCard key={file.id} file={file}
          onPreview={() => openDialog({ kind: 'file', ids: files.map(item => item.id), fileId: file.id })} />)}</div>}
        <ReactionPills state={state} post={post} writable={writable} change={change} pick={pick} />
      </>}
      {!discussion && !post.rootId && <ReplySummary state={state} root={post} open={openThread} />}
      {jump && <button className="text-button source-jump" type="button" onClick={() => jumpTo(post)}>Jump to message</button>}
    </div>
    {!pending && !post.deletedAt && !editing && <div className="message-tools">
      {writable && <IconButton icon={SmilePlus} size={16} label="Add reaction" onClick={pick} />}
      {root && <IconButton icon={Reply} size={17} label="Reply in thread" onClick={reply} />}
      <IconButton icon={Bookmark} size={16} className={saved ? 'saved' : ''} label={saved ? 'Remove from Saved' : 'Save message'} onClick={save} />
      <Menu icon={MoreHorizontal} label="More message actions" items={menu} />
    </div>}
  </article>
}

export function Highlight({ value, terms }) {
  const content = String(value ?? '')
  const escaped = terms.filter(Boolean).sort((a, b) => b.length - a.length).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!escaped.length) return content
  const pattern = new RegExp('(' + escaped.join('|') + ')', 'gi')
  return content.split(pattern).map((piece, index) => index % 2 === 1 ? <mark key={index}>{piece}</mark> : piece)
}

export function Timeline({ channel, target, context }) {
  const { state, change, openDialog } = context
  const all = channelPosts(state, channel.id)
  const roots = all.filter(row => !row.rootId)
  const own = member(state, channel.id)
  const unread = own ? unreadPosts(all, own.lastReadPostId, own.lastViewedAt) : []
  const firstUnread = unread.find(post => !post.rootId)?.id
  const node = useMessageScroll({ jumpId: target?.rootId ?? target?.id, lastId: roots.at(-1)?.id })
  return <>
    <div className="timeline scroll" ref={node} aria-label="Channel messages">
      {!roots.length && <Empty icon={MessageSquare} title={'Beginning of ' + channelName(state, channel)} />}
      {roots.map((post, index) => {
        const day = dayLabel(post.createdAt)
        return <div key={post.id}>
          {day && day !== dayLabel(roots[index - 1]?.createdAt) && <div className="separator"><span>{day}</span></div>}
          {firstUnread === post.id && <div className="separator new-messages"><span>New Messages</span></div>}
          <Message context={context} post={post} highlight={target?.id === post.id} />
        </div>
      })}
    </div>
    {canPost(state, channel) ? <Composer key={channel.id} state={state} channel={channel} change={change} openDialog={openDialog} inChannel /> :
      (member(state, channel.id) || !active(channel)) && <div className="channel-banner">{!active(channel) ? 'This channel is archived.' : 'This channel is read-only.'}</div>}
  </>
}

export function ThreadDiscussion({ root, channel, target, context, close, embedded = false, inChannel = false }) {
  const { state, change, openDialog } = context
  const rows = replies(state, root)
  const count = rows.filter(post => !post.deletedAt).length
  const own = ownThread(state, root?.id)
  const unread = own ? unreadPosts(rows, own.lastReadPostId, own.lastReadAt, state.currentUserId) : []
  const node = useMessageScroll({ jumpId: target?.id, lastId: rows.at(-1)?.id ?? root?.id })
  return <Pane title="Thread" source={channelName(state, channel)} close={close} embedded={embedded} controls={
    root && member(state, channel.id) && <button className={'secondary follow-button' + (own?.following ? ' following' : '')}
      type="button" onClick={() => change(setFollowing, root.id, !own?.following)}>{own?.following ? 'Following' : 'Follow'}</button>
  }>
    {!root ? target ? <div className="thread-body scroll" ref={node} aria-label="Thread messages">
      <Empty title="Original message unavailable" />
      <Message context={context} post={target} discussion highlight />
    </div> : <Empty title="Original message unavailable" /> : <>
      <div className="thread-body scroll" ref={node} aria-label="Thread messages">
        <Message context={context} post={root} discussion highlight={target?.id === root.id} />
        {!!rows.length && <div className="thread-divider"><span>{count} {count === 1 ? 'reply' : 'replies'}</span></div>}
        {rows.map(row => <div key={row.id}>
          {unread[0]?.id === row.id && <div className="separator new-messages"><span>New Messages</span></div>}
          <Message context={context} post={row} discussion highlight={target?.id === row.id} />
        </div>)}
      </div>
      {canPost(state, channel) && <Composer key={root.id} state={state} channel={channel} rootId={root.id}
        change={change} openDialog={openDialog} inChannel={inChannel} />}
    </>}
  </Pane>
}

export function ThreadsInbox({ context, selectedId, select, pane, focusId, clearFocus }) {
  const { state, team, change } = context
  const [unreadOnly, setUnreadOnly] = useState(false)
  const focusCard = useRef(null)
  const unreadsTab = useRef(null)
  useLayoutEffect(() => {
    if (focusId) (focusCard.current ?? unreadsTab.current)?.focus()
  }, [focusId])
  const list = state.threadMemberships.filter(row => row?.following && row.userId === state.currentUserId)
    .map(row => {
      const root = byId(state.posts, row.threadId)
      const channel = byId(state.channels, root?.channelId)
      if (!root || root.rootId || channel?.teamId !== team.id || !canView(state, channel) || !member(state, channel.id)) return null
      const all = replies(state, root)
      const rows = all.filter(post => !post.deletedAt)
      return { root, channel, rows, last: rows.at(-1)?.createdAt ?? root.createdAt, unread: unreadPosts(all, row.lastReadPostId, row.lastReadAt, state.currentUserId).length > 0 }
    }).filter(Boolean).sort((a, b) => String(b.last ?? '').localeCompare(String(a.last ?? '')))
  const activePane = (!selectedId || list.some(item => item.root.id === selectedId)) && pane
  const shown = unreadOnly ? list.filter(item => item.unread || item.root.id === selectedId || item.root.id === focusId) : list

  return <div className={'thread-inbox' + (activePane ? ' has-pane' : '')}>
    <div className="thread-list">
      <div className="view-header thread-tabs">
        <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>Followed threads</button>
        <button type="button" ref={unreadsTab} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unreads</button>
        <IconButton icon={CheckCheck} label="Mark all as read" disabled={!list.some(item => item.unread)}
          onClick={() => change(markThreadsRead, team.id, null)} />
      </div>
      <div className="scroll">
        {!shown.length && <Empty icon={MessageSquare} title={unreadOnly ? 'No unread threads' : 'No followed threads yet'}>
          <Link to={appPath(browsePath(team))}>Browse channels</Link></Empty>}
        {shown.map(({ root, channel, rows, last, unread }) => <button type="button" key={root.id}
          ref={root.id === focusId ? focusCard : null} onBlur={root.id === focusId ? clearFocus : undefined}
          className={'thread-card' + (root.id === selectedId ? ' selected' : '')} onClick={() => select(root)}>
          <span className="card-meta">{unread && <span className="unread-dot" aria-label="Unread" />}
            <strong>{userName(byId(state.users, root.userId))}</strong><span>{channelName(state, channel)}</span><time>{dayLabel(last)}</time></span>
          <span className="card-preview">{root.deletedAt ? 'Message deleted' : root.message || 'Attachment'}</span>
          <span className="card-meta"><span className="avatar-stack">{[...new Set(rows.map(row => row.userId))].slice(0, 4)
            .map(id => <Avatar key={id} size={16} user={byId(state.users, id)} />)}</span>
            {rows.length} {rows.length === 1 ? 'reply' : 'replies'}</span>
        </button>)}
      </div>
    </div>
    {activePane || <Empty icon={MessageSquare} title="Select a thread" />}
  </div>
}
