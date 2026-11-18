import { useEffect, useState } from 'react'
import { useLocation, useOutletContext, useParams } from 'react-router-dom'
import { articlePath, contributorName, dateLabel, newId, newestFirst, oldestFirst, posted } from '../data/records.js'
import { ButtonLink, SiteLink, useSiteNavigate } from '../navigation.jsx'
import { useWorkspace } from '../workspace.js'

const threadLink = (article, topicId) => articlePath(article) + '/talk/' + encodeURIComponent(topicId)

function Composer({ topic, submit, cancel }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  return <form className="stack" onSubmit={event => {
    event.preventDefault()
    if (topic && !subject.trim()) return setError('Enter a subject for your topic.')
    if (!body.trim()) return setError('Enter a message before posting.')
    if (!submit(body.trim(), subject.trim())) setError('This discussion is unavailable. Your draft is still here.')
  }}>
    {topic && <label className="field">Subject<input autoFocus value={subject} onChange={event => setSubject(event.target.value)} /></label>}
    <label className="field">{topic ? 'Message' : 'Reply message'}
      <textarea autoFocus={!topic} rows={4} value={body} onChange={event => setBody(event.target.value)} />
    </label>
    {error && <p className="feedback error" role="alert">{error}</p>}
    <div className="actions">
      <button className="primary" type="submit">{topic ? 'Publish topic' : 'Post reply'}</button>
      <button type="button" onClick={cancel}>Cancel</button>
    </div>
  </form>
}

export function Talk() {
  const article = useOutletContext()
  return <Topics key={article.id} article={article} />
}

function Topics({ article }) {
  const { state, commit } = useWorkspace()
  const navigate = useSiteNavigate()
  const [composing, setComposing] = useState(false)
  const topics = state.talkTopics.filter(item => item.articleId === article.id).sort((a, b) =>
    newestFirst({ ...a, createdAt: a.updatedAt || a.createdAt }, { ...b, createdAt: b.updatedAt || b.createdAt }))
  const counts = new Map()
  for (const item of state.talkComments) {
    if (item.articleId === article.id && posted(item)) counts.set(item.topicId, (counts.get(item.topicId) ?? 0) + 1)
  }

  function publish(body, subject) {
    const topicId = newId('topic')
    const accepted = commit(current => {
      const actorId = current.account?.id
      if (!actorId || !current.articles.some(item => item.id === article.id)) return current
      const articleId = article.id
      const createdAt = new Date().toISOString()
      return {
        ...current,
        talkTopics: [...current.talkTopics, { id: topicId, articleId, subject, actorId, createdAt, updatedAt: createdAt, status: 'open' }],
        talkComments: [...current.talkComments, { id: newId('comment'), topicId, articleId, parentCommentId: null, actorId, body, createdAt, status: 'posted' }],
      }
    })
    if (accepted) navigate(threadLink(article, topicId))
    return accepted
  }

  return <div className="stack">
    <section className="paper">
      <div className="panel-heading"><h2>Talk topics</h2><button className="primary" type="button" disabled={composing || !state.account?.id}
        onClick={() => setComposing(true)}>Add topic</button></div>
      {topics.length ? <ul className="ruled">{topics.map(topic => {
        const replies = Math.max((counts.get(topic.id) ?? 0) - 1, 0)
        return <li key={topic.id}>
          <SiteLink to={threadLink(article, topic.id)}>{topic.subject || 'Untitled topic'}</SiteLink>
          <div className="metadata">{contributorName(state, topic.actorId)} · {replies} {replies === 1 ? 'reply' : 'replies'} · {dateLabel(topic.updatedAt || topic.createdAt)}</div>
        </li>
      })}</ul> : <p className="metadata">There are no topics on this talk page yet.</p>}
    </section>
    {composing && <section className="paper"><h2>New topic</h2><Composer topic submit={publish} cancel={() => setComposing(false)} /></section>}
  </div>
}

function orderComments(comments) {
  const ids = new Set(comments.map(comment => comment.id))
  const children = new Map()
  for (const comment of comments) {
    const parent = ids.has(comment.parentCommentId) ? comment.parentCommentId : null
    if (!children.has(parent)) children.set(parent, [])
    children.get(parent).push(comment)
  }
  const ordered = []
  const seen = new Set()
  for (const root of [...(children.get(null) ?? []), ...comments]) {
    const pending = [{ comment: root, depth: 0 }]
    while (pending.length) {
      const row = pending.pop()
      if (seen.has(row.comment.id)) continue
      seen.add(row.comment.id)
      ordered.push(row)
      const replies = children.get(row.comment.id) ?? []
      for (let i = replies.length - 1; i >= 0; i--) {
        pending.push({ comment: replies[i], depth: Math.min(row.depth + 1, 3) })
      }
    }
  }
  return ordered
}

export function Thread() {
  const article = useOutletContext()
  const { topicId } = useParams()
  const { state } = useWorkspace()
  const topic = state.talkTopics.find(item => item.id === topicId && item.articleId === article.id)
  if (!topic) return <section className="paper"><h2>Topic unavailable</h2>
    <ButtonLink to={articlePath(article) + '/talk'}>Back to talk topics</ButtonLink>
  </section>
  return <Discussion key={topic.id} topic={topic} article={article} />
}

function Discussion({ topic, article }) {
  const { state, commit } = useWorkspace()
  const { hash } = useLocation()
  const [replyTo, setReplyTo] = useState(null)
  const [status, setStatus] = useState('')
  const comments = state.talkComments.filter(item => item.topicId === topic.id && item.articleId === article.id && posted(item)).sort(oldestFirst)

  useEffect(() => {
    if (!hash) return
    try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView() } catch { /* malformed fragment */ }
  }, [hash, topic.id])

  function reply(body, parentCommentId) {
    const accepted = commit(current => {
      const actorId = current.account?.id
      const topicId = topic.id
      const articleId = article.id
      const parent = current.talkComments.find(item => item.id === parentCommentId && item.topicId === topicId && item.articleId === articleId && posted(item))
      if (!actorId || !parent || !current.talkTopics.some(item => item.id === topicId && item.articleId === articleId)) return current
      const createdAt = new Date().toISOString()
      return {
        ...current,
        talkTopics: current.talkTopics.map(item => item.id === topicId ? { ...item, updatedAt: createdAt } : item),
        talkComments: [...current.talkComments, { id: newId('comment'), topicId, articleId, parentCommentId, actorId, body, createdAt, status: 'posted' }],
      }
    })
    if (accepted) {
      setReplyTo(null)
      setStatus('Your reply was posted.')
    }
    return accepted
  }

  return <section className="paper">
    <SiteLink to={articlePath(article) + '/talk'}>All talk topics</SiteLink>
    <h2>{topic.subject || 'Untitled topic'}</h2>
    {status && <p className="feedback success" role="status">{status}</p>}
    {comments.length ? <div className="comments">{orderComments(comments).map(({ comment, depth }) => <article
      className="comment" key={comment.id} id={'comment-' + comment.id} style={{ '--depth': depth }}>
      <div className="align-row"><strong>{contributorName(state, comment.actorId)}</strong><span className="metadata">{dateLabel(comment.createdAt)}</span></div>
      <p className="comment-body">{comment.body || 'Message unavailable.'}</p>
      {replyTo === comment.id ? <Composer submit={body => reply(body, comment.id)} cancel={() => setReplyTo(null)} />
        : <button type="button" disabled={!state.account?.id} onClick={() => { setReplyTo(comment.id); setStatus('') }}>Reply</button>}
    </article>)}</div> : <p className="metadata">There are no messages in this topic.</p>}
  </section>
}
