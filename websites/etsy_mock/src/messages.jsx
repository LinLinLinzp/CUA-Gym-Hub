import React, { useState } from 'react'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LocalLink, pathFor, useAction, useLocalNavigate, useStore } from './store.jsx'
import { byId, chronological, date, list, newest, owned, readThread, sendMessage } from './model.js'
import { ButtonLink, Empty, ErrorNote, Field, Heading, Missing, artist, matches } from './ui.jsx'

export function ConversationLink({ id, ...props }) {
  const { commit } = useStore()
  return <LocalLink to={pathFor('messages', id)} {...props} onClick={(event) => {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      commit((state, at) => readThread(state, id, at))
    }
  }} />
}

function ContextLink({ listingId, orderId, state }) {
  const listing = byId(state.listings, listingId)
  const order = byId(state.orders, orderId)
  if (order) return <LocalLink className="text-link" to={pathFor('purchases', orderId)}>Order {order.orderNumber || order.id}</LocalLink>
  if (listing) return <LocalLink className="text-link" to={pathFor('listing', listingId)}>{listing.title || 'View listing'}</LocalLink>
  return null
}

function Composer({ listing, shop, thread }) {
  const { state, commit, notify } = useStore()
  const [body, setBody] = useState('')
  const { run, error } = useAction()
  const navigate = useLocalNavigate()
  const onSubmit = (event) => {
    event.preventDefault()
    run(() => {
      const result = commit((current, at) => sendMessage(current, thread ? { threadId: thread.id, body } : {
        shopId: shop.id, listingId: listing?.id, body, subject: listing?.title ? 'Question about ' + listing.title : 'Message to ' + shop.name,
      }, at))
      setBody('')
      notify('Message sent.')
      if (!thread) navigate(pathFor('messages', result.threadId), { replace: true })
    })
  }
  return <form className="stack message-form" onSubmit={onSubmit} noValidate>
    {!thread && listing && <ContextLink listingId={listing.id} state={state} />}
    <Field label={thread ? 'Reply' : 'Message'}><textarea rows="4" maxLength="4000" required value={body} onChange={(event) => setBody(event.target.value)} /></Field>
    <ErrorNote>{error}</ErrorNote>
    <div><button className="button"><Send size={16} aria-hidden="true" /> Send</button></div>
  </form>
}

function Conversation({ thread }) {
  const { state, commit } = useStore()
  const name = artist(state, thread.shopId)
  const messages = chronological(list(state.messages).filter((row) => row.threadId === thread.id))
  return <section className="panel conversation">
    <header><span className="section-icon"><Mail size={20} /></span><div><h2>{name}</h2><p>{thread.subject || 'Conversation'}</p></div></header>
    <ContextLink listingId={thread.listingId} orderId={thread.orderId} state={state} />
    {thread.unread && <button className="button secondary" onClick={() => commit((current, at) => readThread(current, thread.id, at))}>Mark as read</button>}
    <div className="bubbles">{messages.length ? messages.map((message) => <article className={message.actorType === 'buyer' ? 'bubble sent' : 'bubble'} key={message.id}>
      <small>{message.actorType === 'buyer' ? 'You' : name} · {date(message.createdAt, true)}</small><p>{message.body || 'Message unavailable'}</p>
    </article>) : <p>No messages in this conversation yet.</p>}</div>
    <Composer thread={thread} />
  </section>
}

export function Messages() {
  const { threadId } = useParams()
  const [params] = useSearchParams()
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [unread, setUnread] = useState(false)
  const listingId = params.get('listing')
  const shopId = params.get('shop')
  const listing = byId(state.listings, listingId)
  const shop = byId(state.shops, listing?.shopId || shopId)
  const composing = !threadId && Boolean(listingId || shopId)
  const threads = newest(owned(state.threads, state.buyer), 'updatedAt')
  const selected = byId(threads, threadId)
  const filtered = threads.filter((thread) => (!unread || thread.unread) &&
    matches(query, artist(state, thread.shopId), thread.subject, byId(state.messages, thread.lastMessageId)?.body))
  if ((threadId && !selected) || (composing && (!shop || (listingId && !listing)))) {
    return <Missing title="Conversation unavailable" to="/messages" label="Back to messages" />
  }
  return <>
    <Heading title="Messages" />
    {(selected || composing) && <LocalLink className="back-link inbox-back" to="/messages"><ArrowLeft size={17} /> Back to messages</LocalLink>}
    <div className={'message-grid ' + (selected || composing ? 'thread-view' : '')}>
      <section className="panel inbox">
        <Field label="Search messages"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Shop or subject" /></Field>
        <div className="tabs"><button aria-pressed={!unread} onClick={() => setUnread(false)}>All</button>
          <button aria-pressed={unread} onClick={() => setUnread(true)}>Unread</button></div>
        {filtered.length ? <div className="inbox-list">{filtered.map((thread) =>
          <ConversationLink key={thread.id} id={thread.id} aria-current={thread.id === threadId ? 'page' : undefined}>
            <strong>{artist(state, thread.shopId)}{thread.unread && <span className="unread-dot" aria-label="Unread" />}</strong>
            <span>{thread.subject || 'Conversation'}</span><small>{byId(state.messages, thread.lastMessageId)?.body || date(thread.updatedAt)}</small>
          </ConversationLink>)}</div> : <p>No matching conversations.</p>}
      </section>
      {selected ? <Conversation key={selected.id} thread={selected} /> : composing
        ? <section className="panel conversation"><header><span className="section-icon"><Mail size={20} /></span><h2>Message {shop.name || 'shop'}</h2></header>
          <Composer key={listing?.id || shop.id} shop={shop} listing={listing} /></section>
        : <div className="inbox-placeholder"><Empty title="Select a conversation"><p>Choose a shop conversation to read and reply.</p>
          {!threads.length && <ButtonLink to="/search" secondary>Find a shop</ButtonLink>}</Empty></div>}
    </div>
  </>
}
