import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, ChevronRight, LockKeyhole, MessageCircle, Pin, PinOff, Trash2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AppLink, Avatar, Mark } from '../components/Shell.jsx'
import { ActionMenu, Badge, Empty, Missing } from '../components/UI.jsx'
import { buildThread, canComment, canRead, createComment, isPublisher, moderateComment } from '../state/comments.js'
import { useStore, nameOf } from '../state/Store.jsx'
import { cleanHtml } from '../utils/articleHtml.js'
import { articlePath, audienceLabels, date, plural, postPath, sortTime } from '../utils/format.js'
import { RemoveCommentDialog } from './Moderation.jsx'
import { PostThumb } from './Home.jsx'

function ReaderBar() {
  const { state } = useStore()
  return <header className="reader-bar"><div>
    <AppLink className="reader-publication" to="/publication"><Mark />{state.publication.name}</AppLink>
    {isPublisher(state) && <AppLink className="publication-link" to="/publish">Publisher dashboard <ArrowUpRight size={15} /></AppLink>}
  </div></header>
}

export function Publication() {
  const { state } = useStore()
  const posts = state.posts.filter(post => post.status === 'published' && post.slug).sort(sortTime('publishedAt'))
  return <div className="reader">
    <ReaderBar />
    <main className="reader-column publication-archive">
      <div className="publication-banner"><Mark /><h1>{state.publication.name}</h1>{state.publication.description && <p>{state.publication.description}</p>}</div>
      <section aria-labelledby="archive-label">
        <h2 id="archive-label">Archive</h2>
        {posts.length ? <ul className="archive-list">{posts.map(post => <li key={post.id}>
          <AppLink to={articlePath(post)}><div><h3>{post.title || 'Untitled'}</h3>
            {post.subtitle && <p>{post.subtitle}</p>}<small>{date(post.publishedAt)} · {nameOf(state, post.authorId)}</small></div>
            {post.thumbnailPath ? <PostThumb post={post} /> : <ArrowRight size={17} />}
          </AppLink>
        </li>)}</ul> : <Empty title="No articles have been published" />}
      </section>
    </main>
  </div>
}

export function Article() {
  const { slug } = useParams()
  const { state } = useStore()
  const post = state.posts.find(item => item.slug === slug && item.status === 'published')
  if (!post) return <div className="reader"><ReaderBar /><Missing title="Article not found" to="/publication" action="Back to the publication" /></div>
  return <ReaderArticle post={post} key={post.id} />
}

function ReaderArticle({ post }) {
  const { state } = useStore()
  const comments = state.comments.filter(comment => comment.postId === post.id)
  const visibleCount = comments.filter(comment => comment.status === 'visible').length
  const author = nameOf(state, post.authorId)
  const entitled = canRead(state, post)
  return <div className="reader">
    <ReaderBar />
    <main className="reader-column">
      <article className="reader-article">
        <div className="article-nav"><AppLink to="/publication"><ArrowLeft size={15} /> Archive</AppLink>
          {isPublisher(state) && <AppLink to={postPath(post)}>Edit post</AppLink>}
        </div>
        <h1 className="article-title">{post.title || 'Untitled'}</h1>
        {post.subtitle && <p className="article-subtitle">{post.subtitle}</p>}
        <div className="reader-byline"><Avatar name={author} /><div><strong>{author}</strong><small>{date(post.publishedAt)}</small></div></div>
        {entitled ? <>
          <div className="article-body" dangerouslySetInnerHTML={{ __html: cleanHtml(post.bodyHtml, true) }} />
          <AppLink className="discussion-link" to={articlePath(post) + '#comments'}><MessageCircle size={17} /> {plural(visibleCount, 'comment')}</AppLink>
        </> : <div className="reader-locked"><LockKeyhole size={20} /> This article is for {(audienceLabels[post.audience] || 'subscribers').toLowerCase()}.</div>}
      </article>
      {entitled && <Discussion post={post} comments={comments} />}
    </main>
  </div>
}

function Discussion({ post, comments }) {
  const { state } = useStore()
  const [replyTo, setReplyTo] = useState(null)
  const thread = useMemo(() => buildThread(comments), [comments])
  const canWrite = canComment(state, post)
  const visibleCount = comments.filter(comment => comment.status === 'visible').length
  return <section className="discussion" id="comments" aria-labelledby="discussion-title">
    <h2 id="discussion-title">{visibleCount} {visibleCount === 1 ? 'comment' : 'comments'}</h2>
    {canWrite ? <CommentForm postId={post.id} /> : <p className="comment-closed">Comments are closed for your account on this post.</p>}
    <div className="thread">
      {thread.roots.map(comment => <CommentBranch key={comment.id} comment={comment} replies={thread.replies} postId={post.id}
        canWrite={canWrite} replyTo={replyTo} onReply={setReplyTo} depth={0} />)}
    </div>
    {visibleCount === 0 && <p className="muted">No comments yet.</p>}
  </section>
}

function CommentForm({ postId, parentId, onClose }) {
  const { state, commit } = useStore()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!body.trim()) { setError('Enter a comment before submitting.'); return }
    const result = commit(previous => createComment(previous, postId, parentId, body), parentId ? 'Reply posted' : 'Comment posted')
    if (!result) { setError('Discussion is unavailable for this comment.'); return }
    setBody('')
    setError('')
    onClose?.()
  }
  return <form className="comment-form" onSubmit={submit}>
    <Avatar name={nameOf(state, state.currentUserId)} />
    <div>
      <textarea aria-label={parentId ? 'Write a reply' : 'Write a comment'} placeholder={parentId ? 'Write a reply…' : 'Write a comment…'}
        rows={2} value={body} onChange={event => { setBody(event.target.value); setError('') }} autoFocus={Boolean(parentId)} />
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="toolbar"><button className="button primary" type="submit">{parentId ? 'Post reply' : 'Post comment'}</button>
        {onClose && <button className="button" type="button" onClick={onClose}>Cancel</button>}</div>
    </div>
  </form>
}

function CommentBranch({ comment, replies, postId, canWrite, replyTo, onReply, depth }) {
  const { state, commit } = useStore()
  const [removing, setRemoving] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const visible = comment.status === 'visible'
  const branch = replies.get(comment.id) || []
  const author = nameOf(state, comment.authorId)
  return <div className="comment-branch" id={`comment-${comment.id}`}>
    <div className="comment-row">
      <Avatar name={visible ? author : '?'} />
      <div className="comment-content">
        {visible ? <>
          <div className="comment-meta"><strong>{author}</strong><small>{date(comment.createdAt, true)}</small>
            {comment.pinnedAt && !comment.parentId && <Badge tone="accent">Pinned</Badge>}</div>
          <p className="comment-text">{comment.body}</p>
        </> : <p className="muted">Comment {comment.status === 'removed' ? 'removed' : 'unavailable'}.</p>}
        <div className="comment-controls">
          {visible && canWrite && <button className="text-button" onClick={() => onReply(replyTo === comment.id ? null : comment.id)}>Reply</button>}
          {branch.length > 0 && <button className="text-button" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />} {collapsed ? 'Show replies' : 'Hide replies'}
          </button>}
        </div>
      </div>
      {visible && isPublisher(state) && <ActionMenu label={`Actions for comment by ${author}`}>
        {!comment.parentId && <button onClick={() => commit(previous => moderateComment(previous, comment.id, comment.pinnedAt ? 'unpinned' : 'pinned'),
          comment.pinnedAt ? 'Comment unpinned' : 'Comment pinned')}>
          {comment.pinnedAt ? <PinOff size={15} /> : <Pin size={15} />}{comment.pinnedAt ? 'Unpin' : 'Pin'}
        </button>}
        {!comment.parentId && <hr />}
        <button className="destructive" onClick={() => setRemoving(true)}><Trash2 size={15} /> Remove</button>
      </ActionMenu>}
    </div>
    {removing && <RemoveCommentDialog comment={comment} onClose={() => setRemoving(false)} />}
    {visible && canWrite && replyTo === comment.id && <CommentForm postId={postId} parentId={comment.id} onClose={() => onReply(null)} />}
    {!collapsed && branch.length > 0 && <div className={`thread-replies ${depth >= 4 ? 'flat-replies' : ''}`}>{branch.map(reply => <CommentBranch
      key={reply.id} comment={reply} replies={replies} postId={postId} canWrite={canWrite} replyTo={replyTo} onReply={onReply} depth={depth + 1} />)}</div>}
  </div>
}

