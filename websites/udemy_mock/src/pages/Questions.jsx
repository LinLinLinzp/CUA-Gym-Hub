import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../context/Workspace.jsx'
import { addReply, deleteOwned, saveQuestion, selectAnswer, setQuestionFlag } from '../data/actions.js'
import {
  actorId, byId, compareText, isActive, matches, ownedCourses, profileName, questionFlag,
  relativeDate, repliesFor, rows, time, topAnswer,
} from '../data/selectors.js'
import { ConfirmDialog, Empty, FormDialog, RouteLink, Search, Select, useRouteNavigate } from '../components/Parts.jsx'

const questionFields = [
  { name: 'title', label: 'Question title', required: true, prompt: 'a question title' },
  { name: 'body', label: 'Details', optional: true, type: 'textarea' },
]

function discussionRows(state, courseMap) {
  return rows(state.questions).filter(question => isActive(question) && courseMap.has(question.courseId)).map(question => {
    const replies = repliesFor(state, question.id)
    const lecture = byId(state.lectures, question.lectureId)
    const section = byId(state.sections, lecture?.sectionId)
    return {
      question, replies, answered: Boolean(topAnswer(question, replies)),
      course: courseMap.get(question.courseId),
      lecture: section?.courseId === question.courseId ? lecture : undefined,
      activity: Math.max(time(question.updatedAt ?? question.createdAt), ...replies.map(reply => time(reply.updatedAt ?? reply.createdAt))),
      following: Boolean(questionFlag(state, 'questionFollows', question.id)?.following),
      read: Boolean(questionFlag(state, 'questionReads', question.id)?.isRead),
    }
  })
}

function ThreadList({ items, state, mode, currentId, onOpen }) {
  return <ul className="thread-list">{items.map(item => {
    const { question, course, lecture, replies, answered, read } = item
    const instructor = mode === 'instructor'
    const path = instructor ? '/instructor/questions/' : '/learn/' + course.id + '/questions/'
    return <li key={question.id}>
      <RouteLink className={'thread-link' + (currentId === question.id ? ' selected' : '')}
        aria-current={currentId === question.id ? 'page' : undefined} to={path + question.id}
        onClick={onOpen ? event => {
          if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.button === 0) onOpen(question.id)
        } : undefined}>
        <div className="thread-meta">
          {instructor && !read && <span className="unread-label"><span aria-hidden="true" />Unread</span>}
          <span>{instructor ? (course.title || 'Untitled course') : (lecture?.title || 'Course discussion')}</span>
        </div>
        <h3>{question.title || 'Untitled question'}</h3>
        {question.body && <p className="thread-preview">{question.body}</p>}
        <div className="thread-meta"><span>{profileName(state, question.authorId)}</span><span>{relativeDate(question.createdAt)}</span>
          <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
          <span className={'badge ' + (answered ? 'published' : 'neutral')}>{answered ? 'Answered' : 'Unanswered'}</span>
        </div>
      </RouteLink>
    </li>
  })}</ul>
}

export function LearnerQuestions({ course, currentLesson }) {
  const { state, commit } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [asking, setAsking] = useState(false)
  const navigate = useRouteNavigate()
  const items = discussionRows(state, new Map([[course.id, course]]))
    .filter(({ question, following, answered, replies }) => (
      matches(query, question.title, question.body, ...replies.map(reply => reply.body)) &&
      (!filter || (filter === 'lecture' ? question.lectureId === currentLesson?.id
        : filter === 'followed' ? following : !answered))
    )).sort((a, b) => b.activity - a.activity)
  const effectiveFilter = Boolean(query || filter)
  return <section className="discussion">
    <div className="section-heading"><div><h2>Course Q&A</h2><p>Ask about a lesson or join a discussion.</p></div><button className="primary" onClick={() => setAsking(true)}>Ask a question</button></div>
    <div className="filter-bar question-filters">
      <Search label="Search questions" value={query} onChange={setQuery} placeholder="Question, detail, or reply" />
      <Select label="Show" value={filter} onChange={setFilter} options={[
        ['', 'All questions'], ...(currentLesson ? [['lecture', 'Current lecture']] : []), ['followed', 'Followed'], ['unanswered', 'Unanswered'],
      ]} />
    </div>
    <div className="result-line"><span>{items.length} {items.length === 1 ? 'question' : 'questions'}</span>
      {effectiveFilter && <button className="text-button" onClick={() => { setQuery(''); setFilter('') }}>Clear filters</button>}</div>
    {items.length ? <ThreadList items={items} mode="learner" state={state} /> : <Empty title={effectiveFilter ? 'No matching questions' : 'No questions yet'}>
      {effectiveFilter ? 'Try another search or filter.' : 'Start the discussion by asking a question.'}
    </Empty>}
    {asking && <FormDialog title="Ask a question" fields={questionFields} submitLabel="Publish question" onClose={() => setAsking(false)}
      onSave={values => {
        const next = commit((state, meta) => saveQuestion(state, meta, course.id, null, { ...values, lectureId: currentLesson?.id ?? null }), 'Question published.')
        if (next !== state) navigate('/learn/' + course.id + '/questions/' + next.questions.at(-1).id)
      }} />}
  </section>
}

function Reply({ answer, isTop, canSelect, state, onSelect }) {
  return <li className={'reply' + (isTop ? ' top-reply' : '')}>
    <div className="reply-head"><strong>{profileName(state, answer.authorId)}</strong><span>{relativeDate(answer.createdAt)}</span>
      {isTop && <span className="badge published">Top answer</span>}</div>
    <p className="body-copy">{answer.body || 'No reply text available.'}</p>
    {canSelect && <button className="text-button" onClick={() => onSelect(isTop ? null : answer.id)}>{isTop ? 'Clear top answer' : 'Select as top answer'}</button>}
  </li>
}

export function Thread({ questionId, course, mode, back }) {
  const { state, commit } = useStore()
  const navigate = useRouteNavigate()
  const [dialog, setDialog] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState(false)
  const question = byId(state.questions, questionId)
  const instructor = mode === 'instructor'
  const backLink = <RouteLink className="back-link" to={back}>← {instructor ? 'All instructor questions' : 'Course Q&A'}</RouteLink>
  if (!isActive(question) || !course || question.courseId !== course.id) {
    return <section>{backLink}<Empty title="Question unavailable">This question may have been deleted or belong to another course.</Empty></section>
  }
  const actor = actorId(state)
  const isAuthor = question.authorId === actor
  const canSelect = isAuthor || (actor && course.instructorId === actor)
  const replies = repliesFor(state, questionId)
  const top = topAnswer(question, replies)
  const order = top ? [top, ...replies.filter(answer => answer.id !== top.id)] : replies
  const following = Boolean(questionFlag(state, 'questionFollows', questionId)?.following)
  const read = Boolean(questionFlag(state, 'questionReads', questionId)?.isRead)
  const lesson = byId(state.lectures, question.lectureId)
  const section = byId(state.sections, lesson?.sectionId)
  function postReply(event) {
    event.preventDefault()
    const value = body.trim()
    if (!value) { setError(true); return }
    const next = commit((state, meta) => addReply(state, meta, questionId, value), 'Reply posted.')
    if (next !== state) { setBody(''); setError(false) }
  }

  return <section className="thread-view" aria-label="Question thread">
    {backLink}
    <article className="panel question-panel">
      <div className="thread-meta">
        <span>{course.title || 'Untitled course'}</span><span>{section?.courseId === course.id ? lesson?.title || 'Course discussion' : 'Course discussion'}</span>
        <span className={'badge ' + (top ? 'published' : 'neutral')}>{top ? 'Answered' : 'Unanswered'}</span>
      </div>
      <h2>{question.title || 'Untitled question'}</h2>
      <div className="thread-meta"><strong>{profileName(state, question.authorId)}</strong><span>{relativeDate(question.createdAt)}</span></div>
      {question.body && <p className="body-copy">{question.body}</p>}
      <div className="actions discussion-actions">
        <button aria-pressed={following} onClick={() => commit((state, meta) => setQuestionFlag(state, meta, questionId, 'following', !following),
          following ? 'You stopped following replies.' : 'You are following replies.')}>{following ? 'Unfollow replies' : 'Follow replies'}</button>
        {instructor && <button onClick={() => commit((state, meta) => setQuestionFlag(state, meta, questionId, 'isRead', !read),
          read ? 'Marked unread.' : 'Marked read.')}>{read ? 'Mark unread' : 'Mark read'}</button>}
        {isAuthor && <><button onClick={() => setDialog('edit')}>Edit question</button><button className="quiet-danger" onClick={() => setDialog('delete')}>Delete question</button></>}
      </div>
    </article>
    <div className="section-heading replies-heading"><h2>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</h2></div>
    {order.length ? <ul className="replies">{order.map(answer => <Reply key={answer.id} answer={answer} isTop={answer.id === top?.id} state={state} canSelect={canSelect}
      onSelect={id => commit((state, meta) => selectAnswer(state, meta, questionId, id), id ? 'Top answer selected.' : 'Top answer cleared.')} />)}</ul>
      : <Empty title="No replies yet">You can be the first to reply.</Empty>}
    <form className="panel reply-form" onSubmit={postReply}>
      <label htmlFor="reply-body">Your reply</label>
      <textarea id="reply-body" rows={4} value={body} aria-required="true" aria-invalid={error} aria-describedby={error ? 'reply-error' : undefined}
        onChange={event => { setBody(event.target.value); setError(false) }} />
      {error && <div id="reply-error" className="error">Enter a reply before posting.</div>}
      <button type="submit" className="primary">Post reply</button>
    </form>
    {dialog === 'edit' && <FormDialog title="Edit question" fields={questionFields} initial={question} submitLabel="Save question" onClose={() => setDialog('')}
      onSave={values => commit((state, meta) => saveQuestion(state, meta, course.id, question.id, values), 'Question updated.')} />}
    {dialog === 'delete' && <ConfirmDialog title="Delete question?" label="Delete question" onClose={() => setDialog('')} onConfirm={() => {
      commit((state, meta) => deleteOwned(state, meta, 'questions', question.id), 'Question deleted.')
      navigate(back)
    }}>The question and its replies will be removed from the discussion.</ConfirmDialog>}
  </section>
}

export function InstructorQuestions() {
  const { state, commit } = useStore()
  const { questionId } = useParams()
  const [courseFilter, setCourseFilter] = useState('')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('recent')
  const courses = ownedCourses(state).sort((a, b) => compareText(a.title, b.title))
  const courseMap = new Map(courses.map(course => [course.id, course]))
  const items = discussionRows(state, courseMap).filter(item => (
    (!courseFilter || item.course.id === courseFilter) && (!filter || (filter === 'unread' ? !item.read : !item.answered))
  )).sort((a, b) => sort === 'oldest' ? time(a.question.createdAt) - time(b.question.createdAt) : b.activity - a.activity)
  const current = byId(state.questions, questionId)

  return <div className={'inbox-grid' + (questionId ? ' has-thread' : '')}>
    <section className="inbox-queue" aria-label="Question inbox">
      <div className="filter-bar inbox-filters">
        <Select label="Course" value={courseFilter} onChange={setCourseFilter} options={[['', 'All my courses'], ...courses.map(course => [course.id, course.title || 'Untitled course'])]} />
        <Select label="Show" value={filter} onChange={setFilter} options={[['', 'All questions'], ['unread', 'Unread'], ['unanswered', 'Unanswered']]} />
        <Select label="Sort by" value={sort} onChange={setSort} options={[['recent', 'Recent activity'], ['oldest', 'Oldest first']]} />
      </div>
      <div className="result-line"><span>{items.length} {items.length === 1 ? 'question' : 'questions'}</span>
        {(courseFilter || filter || sort !== 'recent') && <button className="text-button" onClick={() => { setCourseFilter(''); setFilter(''); setSort('recent') }}>Clear filters</button>}</div>
      {items.length ? <ThreadList items={items} state={state} mode="instructor" currentId={questionId}
        onOpen={id => commit((state, meta) => setQuestionFlag(state, meta, id, 'isRead', true))} />
        : <Empty title={courseFilter || filter ? 'No matching questions' : 'No questions in your inbox'}>
          {courseFilter || filter ? 'Choose another course or clear your filters.' : 'Questions from your courses will appear here.'}
        </Empty>}
    </section>
    {questionId ? <Thread key={questionId} questionId={questionId} course={courseMap.get(current?.courseId)} mode="instructor" back="/instructor/questions" />
      : <div className="inbox-placeholder"><Empty title="Open a question">Select a thread to read replies and respond.</Empty></div>}
  </div>
}
