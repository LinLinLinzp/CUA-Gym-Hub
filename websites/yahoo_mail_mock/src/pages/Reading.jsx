import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Forward, Image, Reply, ReplyAll, Search, ShieldBan, Star } from 'lucide-react'
import { useStore } from '../store.jsx'
import { array, displayAddress, emailValid, isDraft, lower, shortDate, subjectOf } from '../data/model.js'
import { mailboxLocation, mailScope, mailboxRows, readGroup } from '../data/mailbox.js'
import { renderMessageBody } from '../data/body.js'
import { Avatar, IconButton, Menu, MenuItem, NotFound, Redirect, draftPath, useInterface, useMailNavigation } from '../components/ui.jsx'
import { MailTools, useMailActions, useOpenMail } from '../components/mailActions.jsx'
import Mailbox from './Mailbox.jsx'
import { SenderContactActions } from './Contacts.jsx'
import { MessageAttachments } from '../components/attachments.jsx'
import { ComposeEditor } from './Compose.jsx'
import { useDraftActions } from '../components/draftActions.jsx'
import { useSenderActions } from '../components/senderActions.jsx'

export default function Reading() {
  const { messageId } = useParams()
  const { state } = useStore()
  const message = array(state.messages).find(item => item.id === messageId)
  if (!message) return <NotFound title="This message is unavailable" />
  if (isDraft(message)) return <Redirect to={draftPath(message.id)} />
  return <Conversation key={messageId} message={message} />
}

function Conversation({ message }) {
  const { state } = useStore()
  const { go, back, location } = useMailNavigation()
  const { change, remove } = useMailActions()
  const { block } = useSenderActions()
  const { confirm } = useInterface()
  const blocked = array(state.blockedAddresses).some(item => lower(item.email) === lower(message.from?.email))
  function blockSender() {
    confirm({ title: 'Block sender?', text: 'Move messages from ' + displayAddress(message.from) + ' to Trash and block the address?', action: 'Block sender', danger: true, onConfirm: () => block(message.from.email, 'message', message.id) })
  }
  const open = useOpenMail()
  const [moveOpen, setMoveOpen] = useState(false)
  const [inlineId, setInlineId] = useState(null)
  const { startReply } = useDraftActions()
  const inline = array(state.messages).find(item => item.id === inlineId && isDraft(item))
  async function reply(original, type) {
    const created = await startReply(original, type)
    if (created) setInlineId(created.id)
  }
  const thread = readGroup(state, message)
  const scopedIds = array(location.state?.scope)
  const scopedMessages = thread.filter(item => scopedIds.includes(item.id))
  const targets = scopedMessages.length ? scopedMessages : [message]
  const ids = targets.map(item => item.id)
  const layout = state.settings?.appearance?.messageLayout
  const mailbox = mailboxLocation(back)
  const mailboxKind = { folders: 'folder', search: 'search', starred: 'starred', unread: 'unread', inbox: 'inbox' }[mailbox.route]
  const source = mailboxKind ? mailboxRows(state, mailScope(state, mailbox)) : []
  const index = source.findIndex(row => row.ids.includes(message.id))
  const previous = index > 0 ? source[index - 1] : null
  const next = index >= 0 ? source[index + 1] : null
  function advance(action) {
    if (!['move', 'delete', 'spam', 'archive', 'restore', 'not_spam'].includes(action)) return
    const preference = state.settings?.viewing?.afterMove
    const target = preference === 'previous' ? previous : preference === 'list' ? null : next
    // Navigation after mutation never implicitly reads the next message.
    if (target) go('/n/message/' + encodeURIComponent(target.message.id), { state: { back, scope: target.ids } })
    else go(back)
  }
  useEffect(() => {
    async function shortcut(event) {
      const key = event.detail.key
      const replyType = { r: 'reply', a: 'replyAll', f: 'forward' }[key]
      if (replyType) reply(message, replyType)
      if (key === 'd') setMoveOpen(true)
      const action = { k: 'read', K: 'unread', l: 'star', L: 'unstar', e: 'archive', E: 'restore', Delete: 'delete' }[key]
      if (action === 'delete' && message.folderId === 'trash') remove(ids)
      else if (action && await change(ids, action)) advance(action)
    }
    window.addEventListener('mail-action-shortcut', shortcut)
    return () => window.removeEventListener('mail-action-shortcut', shortcut)
  })
  const showSplit = (layout === 'right' || layout === 'bottom') && mailboxKind
  const reading = <section className="reading">
    <div className="reading-toolbar mail-toolbar">
      <IconButton label="Back" icon={ArrowLeft} onClick={() => go(back)} />
      <MailTools ids={ids} messages={targets} onAction={advance} moveOpen={moveOpen} setMoveOpen={setMoveOpen} extra={close => emailValid(message.from?.email) && <MenuItem icon={ShieldBan} disabled={blocked} onClick={() => { close(); blockSender() }}>{blocked ? 'Sender blocked' : 'Block sender'}</MenuItem>} />
      <IconButton icon={Reply} label="Reply" onClick={() => reply(message, 'reply')} />
      <IconButton icon={ReplyAll} label="Reply all" onClick={() => reply(message, 'replyAll')} />
      <IconButton icon={Forward} label="Forward" onClick={() => reply(message, 'forward')} />
      <div className="toolbar-spacer" />
      <IconButton icon={ChevronLeft} label="Previous message" disabled={!previous} onClick={() => open(previous.message, back, previous.ids)} />
      <IconButton icon={ChevronRight} label="Next message" disabled={!next} onClick={() => open(next.message, back, next.ids)} />
    </div>
    <div className="reading-content">
      <h1>{subjectOf(message)}</h1>
      {message.summary && state.settings?.ai?.messageSummaries !== false && <details className="message-summary"><summary>Message summary</summary><p>{message.summary}</p></details>}
      {thread.map(item => <MessageCard key={item.id} message={item} reply={reply} inline={inline?.inReplyToId === item.id || inline?.forwardedFromId === item.id ? inline : null} closeInline={() => setInlineId(current => current === inlineId ? null : current)} />)}
    </div>
  </section>
  return showSplit ? <div className={'reading-split ' + layout}><Mailbox kind={mailboxKind} scope={back} embedded />{reading}</div> : reading
}

function MessageCard({ message, reply, inline, closeInline }) {
  const { state } = useStore()
  const { unsubscribe } = useSenderActions()
  const unsubscribed = array(state.unsubscribes).some(item => lower(item.senderEmail) === lower(message.from?.email))
  const { change } = useMailActions()
  const { go, back } = useMailNavigation()
  const [expanded, setExpanded] = useState(false)
  const [imagesRevealed, setImagesRevealed] = useState(false)
  const imagePreference = state.settings?.viewing?.showImages || 'ask'
  const showImages = imagePreference === 'always' || imagePreference === 'ask' && imagesRevealed
  const { content, hasLocalImages, hasBlockedImages } = renderMessageBody(message.bodyHtml, showImages)
  const offerImages = imagePreference === 'ask' && hasLocalImages && !showImages
  const reportBlocked = imagePreference !== 'never' && (hasBlockedImages || message.hasImages && !hasLocalImages)
  const person = displayAddress(message.from)
  const recipients = [['To', message.to], ['Cc', message.cc], ...(message.status === 'sent' ? [['Bcc', message.bcc]] : [])]
  const inlineRef = useRef(null)
  useEffect(() => { if (inline) inlineRef.current?.scrollIntoView({ block: 'nearest' }) }, [inline?.id])
  return <article className="message-card">
    <header className="message-header">
      <Avatar name={person} email={message.from?.email} size={40} />
      <div className="message-names">
        <Menu icon={ChevronDown} text={person} label={'Sender details for ' + person} align="left">{close => <>
          <p className="padded small">{message.from?.email}</p>
          <MenuItem icon={Search} onClick={() => { close(); go('/n/search?' + new URLSearchParams({ from: message.from?.email || person }), { state: { back } }) }}>Search messages from sender</MenuItem>
          <SenderContactActions message={message} close={close} />
        </>}</Menu>
        <button className="recipient-disclosure" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>To {array(message.to).map(displayAddress).join(', ') || '—'} <ChevronDown size={13} /></button>
      </div>
      <time>{shortDate(message.date || message.createdAt)}</time>
      <IconButton icon={Star} className={message.isStarred ? 'filled-star' : ''} label={message.isStarred ? 'Remove star' : 'Star'} aria-pressed={Boolean(message.isStarred)} onClick={() => change([message.id], message.isStarred ? 'unstar' : 'star')} />
    </header>
    {expanded && <dl className="recipient-detail">{[['From', [message.from]], ...recipients].map(([label, addresses]) => array(addresses).length > 0 && <div key={label}><dt>{label}</dt><dd>{array(addresses).map(address => [address?.name, address?.email && '<' + address.email + '>'].filter(Boolean).join(' ')).join(', ')}</dd></div>)}</dl>}
    {message.listUnsubscribe && emailValid(message.from?.email) && <button className="link-button" disabled={unsubscribed} onClick={() => unsubscribe(message)}>{unsubscribed ? 'Unsubscribed' : 'Unsubscribe'}</button>}
    {(offerImages || reportBlocked) && <div className="mail-notice"><Image size={16} />
      {reportBlocked && <span>Remote images are blocked.</span>}
      {offerImages && <button type="button" className="link-button" onClick={() => setImagesRevealed(true)}>Show images</button>}
    </div>}
    {message.bodyHtml ? <div className="message-body" dangerouslySetInnerHTML={{ __html: content }} /> : <div className="message-body plain">{message.body || ''}</div>}
    {message.quotedText && <details className="message-quote" open={message.replyType === 'forward'}><summary>{message.replyType === 'forward' ? 'Forwarded message' : 'Show quoted message'}</summary><pre>{message.quotedText}</pre></details>}
    <MessageAttachments message={message} />
    {inline ? <div ref={inlineRef}><ComposeEditor key={inline.id} draft={inline} inline onClose={closeInline} /></div> : <div className="reply-bar">
      {[['reply', 'Reply', Reply], ['replyAll', 'Reply all', ReplyAll], ['forward', 'Forward', Forward]].map(([type, label, Icon]) => <button className="secondary" key={type} onClick={() => reply(message, type)}><Icon size={16} />{label}</button>)}
    </div>}
  </article>
}
