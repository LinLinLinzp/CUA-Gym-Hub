import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MessageCircle, MessageSquare, Pin, Plus } from 'lucide-react'
import { AppLink, messagePath, projectPath, useAppNavigate, useQuery } from '../components/navigation.jsx'
import { Avatar, PeoplePicker, personName } from '../components/people.jsx'
import { ActionMenu, Breadcrumbs, Empty, FieldError, PageHeading, TrashDialog, Unavailable } from '../components/ui.jsx'
import { Comments } from '../components/Comments.jsx'
import { cleanHtml, RichBody, RichEditor } from '../components/richText.jsx'
import { useProject, useStore } from '../store.jsx'
import { active, array, boardMessages, boardOf, byId, byPosition, commentsOf, hasId, idOrder, matches, membersOf, orderedMessages, sameId, textOf } from '../utils/records.js'
import { formatInstant, validZone } from '../utils/dates.js'

const boardPath = (project) => projectPath(project) + '/message-board'
const subject = (message) => message.subject || 'Untitled message'
const categoriesOf = (state, board) => array(state.messageCategories)
  .filter((category) => sameId(category.boardId, board.id)).sort(byPosition)
const boardTitle = (board) => board.title || 'Message Board'

function BoardBreadcrumbs({ board, tail }) {
  const project = useProject()
  const items = [{ label: project.name || 'Project', to: projectPath(project) },
    { label: boardTitle(board), to: tail ? boardPath(project) : null }]
  if (tail) items.push({ label: tail })
  return <Breadcrumbs items={items} />
}

function MissingBoard() {
  const project = useProject()
  return <Unavailable title="Message Board unavailable" to={projectPath(project)} label="Back to project" />
}

function Category({ category }) {
  return category ? <span className="badge">{category.emoji && <span aria-hidden="true">{category.emoji} </span>}{category.name}</span> : null
}

export function MessageBoard() {
  const project = useProject()
  const { state, update } = useStore()
  const board = boardOf(state, project)
  const [params, setQuery] = useQuery()
  if (!board) return <MissingBoard />
  const base = boardPath(project)
  const categories = categoriesOf(state, board)
  const categoryId = params.get('category') ?? ''
  const query = params.get('q') ?? ''
  const sort = ['newest', 'latest_comment', 'alphabetical'].includes(board.sortOrder) ? board.sortOrder : 'newest'
  const messages = orderedMessages(state, project, board).flatMap((message) => {
    const category = byId(categories, message.categoryId)
    if (categoryId === 'uncategorized' && category || categoryId && categoryId !== 'uncategorized' && !sameId(categoryId, category?.id)) return []
    const excerpt = textOf(message.bodyHtml)
    return matches(query, message.subject, excerpt, category?.name) ? [{ message, category, excerpt }] : []
  })
  const zone = validZone(state.workspace?.timeZone)
  return <>
    <BoardBreadcrumbs board={board} />
    <PageHeading title={boardTitle(board)} icon={MessageSquare} action={<>
      <AppLink to={base + '/drafts'} className="button secondary">Drafts</AppLink>
      <AppLink to={base + '/new'} className="button primary"><Plus size={16} />New message</AppLink>
    </>} />
    <div className="filters">
      <label>Search messages<input type="search" placeholder="Search the board…" value={query}
        onChange={(event) => setQuery({ q: event.target.value })} /></label>
      <label>Category<select value={categoryId} onChange={(event) => setQuery({ category: event.target.value })}>
        <option value="">All categories</option><option value="uncategorized">Uncategorized</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select></label>
      <label>Sort by<select value={sort} onChange={(event) => update('messageBoards', board.id, { sortOrder: event.target.value })}>
        <option value="newest">Newest first</option><option value="latest_comment">Latest comment</option>
        <option value="alphabetical">A–Z</option>
      </select></label>
    </div>
    {messages.length ? <ul className="card message-list">{messages.map(({ message, category, excerpt }) => {
      const author = byId(state.people, message.createdById)
      const replies = commentsOf(state, message, 'message').length
      return <li key={message.id}>
        <AppLink className="message-row" to={messagePath(project, message)}>
          <Avatar person={author} />
          <span className="message-summary">
            <span className="message-title">{subject(message)} {message.pinnedAt && <span className="badge pinned"><Pin size={12} />Pinned</span>}</span>
            <span className="small muted">{personName(state.people, message.createdById)} · {formatInstant(message.publishedAt ?? message.createdAt, zone)}</span>
            {excerpt && <span className="message-excerpt">{excerpt}</span>}
          </span>
          <span className="message-row-meta"><Category category={category} />
            <span className="reply-count" aria-label={`${replies} ${replies === 1 ? 'reply' : 'replies'}`}><MessageCircle size={15} />{replies}</span></span>
        </AppLink>
      </li>
    })}</ul> : <Empty>{query || categoryId ? 'No messages match these filters.' : 'There are no published messages yet.'}</Empty>}
  </>
}

function canRead(state, message) {
  return active(message) || message?.status === 'draft' && sameId(state.workspace?.currentUserId, message.createdById)
}

function canEdit(state, message) {
  return sameId(state.workspace?.currentUserId, message.createdById)
    || active(message) && byId(state.people, state.workspace?.currentUserId)?.isAdmin === true
}

function MissingMessage() {
  const project = useProject()
  return <Unavailable title="Message unavailable" to={boardPath(project)} label="Back to Message Board" />
}

export function Drafts() {
  const project = useProject()
  const { state } = useStore()
  const board = boardOf(state, project)
  if (!board) return <MissingBoard />
  const drafts = boardMessages(state, project, board).filter((message) => message.status === 'draft' && canRead(state, message))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || idOrder(a, b))
  return <>
    <BoardBreadcrumbs board={board} tail="Drafts" />
    <PageHeading title="Drafts" action={<AppLink to={boardPath(project) + '/new'} className="button primary"><Plus size={16} />New message</AppLink>} />
    {drafts.length ? <ul className="card message-list">{drafts.map((draft) => <li key={draft.id}>
      <AppLink className="message-row" to={messagePath(project, draft)}>
        <span className="message-summary"><span className="message-title">{subject(draft)}</span>
          <span className="message-excerpt">{textOf(draft.bodyHtml)}</span></span>
        <span className="badge">Draft</span>
      </AppLink>
    </li>)}</ul> : <Empty>You have no drafts for this project.</Empty>}
  </>
}

export function MessageEditor() {
  const { messageId } = useParams()
  const project = useProject()
  const { state } = useStore()
  const board = boardOf(state, project)
  if (!board) return <MissingBoard />
  const message = byId(boardMessages(state, project, board), messageId)
  if (messageId && (!canRead(state, message) || !canEdit(state, message))) return <MissingMessage />
  return <Composer key={message ? 'message:' + message.id : 'new'} board={board} message={message} />
}

function Composer({ board, message }) {
  const project = useProject()
  const { state, add, update } = useStore()
  const navigate = useAppNavigate()
  const categories = categoriesOf(state, board)
  const people = membersOf(state, project)
  const published = active(message)
  const [title, setTitle] = useState(message?.subject ?? '')
  const [categoryChoice, setCategoryChoice] = useState()
  const [recipientChoice, setRecipientChoice] = useState()
  const [notifyChoice, setNotifyChoice] = useState()
  const categoryId = categoryChoice ?? String(message?.categoryId ?? '')
  const recipients = recipientChoice ?? array(message?.notifyRecipientIds)
  const allMembersSelected = recipients.length === people.length && people.every((person) => hasId(recipients, person.id))
  const notify = notifyChoice ?? (recipients.length ? (allMembersSelected ? 'everyone' : 'specific') : 'none')
  const [errors, setErrors] = useState({})
  const editor = useRef(null)

  function save(draft) {
    const bodyHtml = cleanHtml(editor.current.innerHTML)
    const body = textOf(bodyHtml)
    const subject = title.trim()
    const errors = {}
    if (!subject && (!draft || !body)) errors.title = draft ? 'Enter a subject or write a message.' : 'Enter a subject.'
    if (!draft && !body) errors.body = 'Write a message.'
    setErrors(errors)
    if (Object.keys(errors).length) return

    const fields = { subject, bodyHtml, status: draft ? 'draft' : 'active' }
    if (!message || categoryChoice !== undefined) fields.categoryId = categoryId || null
    if (!message || notifyChoice !== undefined || recipientChoice !== undefined) {
      fields.notifyRecipientIds = notify === 'everyone' ? [...new Set(people.map((person) => String(person.id)))]
        : notify === 'specific' ? recipients : []
    }
    let id = message?.id
    if (message) {
      update('messages', id, (stamp) => ({
        ...fields, ...(published ? {} : { publishedAt: draft ? null : stamp.updatedAt }),
      }))
    } else {
      id = add('messages', 'message', (stamp) => ({
        ...fields, projectId: String(project.id), boardId: String(board.id),
        publishedAt: draft ? null : stamp.updatedAt, pinnedAt: null, pinnedById: null,
      }))
    }
    if (id != null) navigate(draft ? boardPath(project) + '/drafts' : messagePath(project, { id }))
  }

  const titleText = published ? 'Edit message' : message ? 'Edit draft' : 'New message'
  return <div className="reading-width">
    <BoardBreadcrumbs board={board} tail={titleText} />
    <PageHeading title={titleText} />
    <form className="card form" noValidate onSubmit={(event) => { event.preventDefault(); save(false) }}>
      <fieldset>
        <legend>Category</legend>
        <div className="category-choices">
          <label><input type="radio" name="message-category" value="" checked={!categoryId}
            onChange={() => setCategoryChoice('')} /><span>No category</span></label>
          {categoryId && !byId(categories, categoryId) && <label>
            <input type="radio" name="message-category" value={categoryId} checked readOnly />
            <span>Unavailable category</span>
          </label>}
          {categories.map((category) => <label key={category.id}>
            <input type="radio" name="message-category" value={category.id} checked={sameId(category.id, categoryId)}
              onChange={(event) => setCategoryChoice(event.target.value)} />
            <span>{category.emoji && <span aria-hidden="true">{category.emoji} </span>}{category.name}</span>
          </label>)}
        </div>
      </fieldset>
      <label><span>Subject</span><input autoFocus placeholder="Message subject" value={title}
        aria-invalid={Boolean(errors.title)} onChange={(event) => setTitle(event.target.value)} />
        <FieldError>{errors.title}</FieldError></label>
      <RichEditor label="Message body" editorRef={editor} initial={message?.bodyHtml} error={errors.body} />
      <label><span>Notify</span><select value={notify} onChange={(event) => setNotifyChoice(event.target.value)}>
        <option value="none">No one</option><option value="everyone">Everyone on the project</option>
        <option value="specific">Specific people</option>
      </select></label>
      {notify === 'specific' && <PeoplePicker label="Notify specific people" people={people} selected={recipients} onChange={setRecipientChoice} />}
      <div className="actions">
        <button className="button primary">{published ? 'Save changes' : 'Post this message'}</button>
        {!published && <button className="button secondary" type="button" onClick={() => save(true)}>Save as a draft</button>}
        <AppLink className="button secondary" to={message ? messagePath(project, message) : boardPath(project)}>Cancel</AppLink>
      </div>
    </form>
  </div>
}

export function MessageDetail() {
  const { messageId } = useParams()
  const project = useProject()
  const { state } = useStore()
  const board = boardOf(state, project)
  if (!board) return <MissingBoard />
  const message = byId(boardMessages(state, project, board), messageId)
  if (!canRead(state, message)) return <MissingMessage />
  return <MessageArticle key={message.id} board={board} message={message} />
}

function MessageArticle({ board, message }) {
  const project = useProject()
  const { state, update } = useStore()
  const navigate = useAppNavigate()
  const [trashing, setTrashing] = useState(false)
  const draft = message.status === 'draft'
  const editable = canEdit(state, message)
  const title = subject(message)
  return <div className="reading-width">
    <BoardBreadcrumbs board={board} tail={title} />
    <article className="card message-article">
      <div className="actions">
        <Category category={byId(categoriesOf(state, board), message.categoryId)} />
        {draft && <span className="badge">Draft</span>}
        {message.pinnedAt && <span className="badge pinned"><Pin size={12} />Pinned</span>}
      </div>
      <PageHeading title={title} action={<>
        {editable && <AppLink className="button secondary" to={messagePath(project, message) + '/edit'}>{draft ? 'Edit draft' : 'Edit'}</AppLink>}
        <ActionMenu label="Message options">
          {!draft && <button type="button" onClick={() => update('messages', message.id, (stamp) =>
            message.pinnedAt ? { pinnedAt: null, pinnedById: null } : { pinnedAt: stamp.updatedAt, pinnedById: stamp.updatedById })}>
            {message.pinnedAt ? 'Unpin' : 'Pin'}
          </button>}
          {editable && <button type="button" className="destructive" onClick={() => setTrashing(true)}>Put in the trash</button>}
        </ActionMenu>
      </>} />
      <div className="byline">
        <Avatar person={byId(state.people, message.createdById)} />
        <div><strong>{personName(state.people, message.createdById)}</strong>
          <time dateTime={message.publishedAt ?? message.createdAt}>{formatInstant(message.publishedAt ?? message.createdAt, validZone(state.workspace?.timeZone), {
            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
          })}</time></div>
      </div>
      <RichBody html={message.bodyHtml} />
    </article>
    {!draft && <Comments parent={message} type="message" />}
    {trashing && <TrashDialog title={title} onClose={() => setTrashing(false)} onConfirm={() => {
      update('messages', message.id, { status: 'trashed', pinnedAt: null, pinnedById: null })
      navigate(boardPath(project) + (draft ? '/drafts' : ''))
    }} />}
  </div>
}
