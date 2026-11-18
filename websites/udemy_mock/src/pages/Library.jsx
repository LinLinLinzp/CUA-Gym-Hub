import { useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../context/Workspace.jsx'
import { changeEnrollment, saveList, toggleMembership, deleteOwned } from '../data/actions.js'
import {
  byId, compareText, curriculumFor, ids, learnerEnrollments, learnerLists, matches,
  profileName, progressFor, relativeDate, time,
} from '../data/selectors.js'
import {
  Artwork, ConfirmDialog, Empty, FormDialog, Missing, Modal, PageTitle, Progress,
  RouteLink, Search, Select, useRouteNavigate,
} from '../components/Parts.jsx'

const listFields = [
  { name: 'name', label: 'List name', required: true, prompt: 'a list name' },
  { name: 'description', label: 'Description', optional: true, type: 'textarea' },
]

function ListSelector({ course, onClose }) {
  const { state, commit } = useStore()
  const lists = learnerLists(state)
  return <Modal title="Add to lists" onClose={onClose}>
    <p className="dialog-description">{course.title}</p>
    {lists.length ? <div className="checks">{lists.map((list, index) => <label key={list.id}>
      <input type="checkbox" data-initial-focus={index === 0 ? '' : undefined} checked={ids(list.courseIds).includes(course.id)}
        onChange={event => {
          const checked = event.target.checked
          commit((state, meta) => toggleMembership(state, meta, list.id, course.id, checked), checked ? 'Course added to list.' : 'Course removed from list.')
        }} />
      <span><strong>{list.name || 'Untitled list'}</strong>{list.description && <small>{list.description}</small>}</span>
    </label>)}</div> : <Empty title="You have no lists yet">Create a list in My learning, then add this course.</Empty>}
    <div className="dialog-actions"><button className="primary" data-initial-focus={lists.length ? undefined : ''} onClick={onClose}>Done</button></div>
  </Modal>
}

export function CourseMenu({ enrollment, course }) {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const trigger = useRef(null)
  const { commit } = useStore()
  const archived = enrollment.status === 'archived'
  return <>
    <div className="course-menu" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={event => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current.focus()
      }
    }}>
      <button ref={trigger} type="button" className="icon-button" aria-expanded={open} aria-label={'Course actions for ' + (course.title || 'untitled course')} onClick={() => setOpen(!open)}>···</button>
      {open && <div className="dropdown">
        {!archived && <button onClick={() => { trigger.current.focus(); setOpen(false); setSelecting(true) }}>Add to lists</button>}
        <button onClick={() => {
          setOpen(false)
          commit((state, meta) => changeEnrollment(state, meta, enrollment.id, archived ? 'restore' : 'archive'), archived ? 'Course restored.' : 'Course archived.')
        }}>{archived ? 'Restore course' : 'Archive course'}</button>
      </div>}
    </div>
    {selecting && <ListSelector course={course} onClose={() => setSelecting(false)} />}
  </>
}

function CourseRow({ entry, variant }) {
  const { course, enrollment, progress, instructor } = entry
  return <li className="course-row">
    <RouteLink to={'/learn/' + course.id} className="course-row-link">
      <Artwork category={course.category} variant={variant} />
      <div className="course-row-info">
        <div className="course-category">{course.category || 'General'}</div>
        <h3>{course.title || 'Untitled course'}</h3>
        <p>{instructor}</p>
      </div>
    </RouteLink>
    <Progress {...progress} />
    <CourseMenu enrollment={enrollment} course={course} />
  </li>
}

function ResumePanel({ entry }) {
  const { commit } = useStore()
  const navigate = useRouteNavigate()
  if (!entry) return null
  const { course, enrollment, progress, lessons } = entry
  const savedLecture = lessons.find(lesson => lesson.id === enrollment.lastLectureId)
  const lecture = savedLecture || lessons[0]
  if (!lecture) return null
  return <section className="panel resume-panel">
    <div className="panel-head"><h2>Pick up where you left off</h2></div>
    <Artwork category={course.category} wide />
    <div className="resume-details">
      <p className="course-category">{course.category || 'General'}</p>
      <h3>{course.title || 'Untitled course'}</h3>
      <p>{lecture.title || 'Untitled lesson'}</p>
      <Progress {...progress} />
      <button className="primary" onClick={() => {
        commit((state, meta) => changeEnrollment(state, meta, enrollment.id, 'resume', lecture.id), 'Lesson opened.')
        navigate('/learn/' + course.id)
      }}>{savedLecture ? 'Resume course' : 'Start course'} <span aria-hidden="true">→</span></button>
    </div>
  </section>
}

export function Library() {
  const { state, commit } = useStore()
  const navigate = useRouteNavigate()
  const { listId } = useParams()
  const [params] = useSearchParams()
  const archived = !listId && params.get('view') === 'archived'
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [progressFilter, setProgressFilter] = useState('')
  const [sort, setSort] = useState('recent')
  const [dialog, setDialog] = useState('')
  const lists = learnerLists(state)
  const list = lists.find(record => record.id === listId)
  const all = learnerEnrollments(state).flatMap(enrollment => {
    const course = byId(state.courses, enrollment.courseId)
    if (!course) return []
    const lessons = curriculumFor(state, course.id).flatMap(section => section.lessons)
    return [{
      enrollment, course, lessons, progress: progressFor(enrollment, lessons),
      instructor: profileName(state, course.instructorId, 'Instructor unavailable'),
    }]
  })
  const available = all.filter(({ enrollment, course }) => (
    (enrollment.status === 'archived') === archived && (!list || ids(list.courseIds).includes(course.id))
  ))
  const categoryOptions = [...new Set(available.map(entry => entry.course.category).filter(Boolean))].sort(compareText)
  const effectiveCategory = categoryOptions.includes(category) ? category : ''
  const filtered = available.filter(({ course, instructor, progress }) => (
    matches(query, course.title, instructor) && (!effectiveCategory || course.category === effectiveCategory) &&
    (!progressFilter || progressFilter === (progress.done === 0 ? 'unstarted' : progress.done === progress.total ? 'completed' : 'in-progress'))
  )).sort((a, b) => sort === 'title' ? compareText(a.course.title, b.course.title) :
    time(b.enrollment.lastAccessedAt) - time(a.enrollment.lastAccessedAt) || compareText(a.course.title, b.course.title))
  const resume = all.filter(entry => entry.enrollment.status !== 'archived' &&
    entry.lessons.length && entry.progress.done < entry.progress.total)
    .sort((a, b) => time(b.enrollment.lastAccessedAt) - time(a.enrollment.lastAccessedAt))[0]
  const clearFilters = () => { setQuery(''); setCategory(''); setProgressFilter(''); setSort('recent') }
  const filteredView = Boolean(query || effectiveCategory || progressFilter)
  const close = () => setDialog('')
  if (listId && !list) return <Missing title="List unavailable">The list may have been deleted or belong to another account.</Missing>

  return <>
    {list && <RouteLink className="back-link" to="/my-learning">← My learning</RouteLink>}
    <PageTitle title={list ? (list.name || 'Untitled list') : 'My learning'} actions={list
      ? <><button onClick={() => setDialog('edit')}>Edit list</button><button className="quiet-danger" onClick={() => setDialog('delete')}>Delete list</button></>
      : <button onClick={() => setDialog('new')}><span aria-hidden="true">+</span> New list</button>}>
      {list ? list.description : 'Your courses, saved lists, and learning progress.'}
    </PageTitle>
    <nav className="tabs" aria-label="Learning library">
      <RouteLink className={!archived && !list ? 'selected' : undefined} aria-current={!archived && !list ? 'page' : undefined} to="/my-learning">All courses</RouteLink>
      <RouteLink className={archived ? 'selected' : undefined} aria-current={archived ? 'page' : undefined} to="/my-learning?view=archived">Archived</RouteLink>
      {list && <RouteLink className="selected" aria-current="page" to={'/my-learning/lists/' + list.id}>{list.name || 'Untitled list'}</RouteLink>}
    </nav>
    <div className="workspace-grid">
      <section className="library-main" aria-label={archived ? 'Archived courses' : 'Enrolled courses'}>
        <div className="filter-bar">
          <Search label="Search courses" value={query} onChange={setQuery} placeholder="Course title or instructor" />
          <Select label="Category" value={effectiveCategory} onChange={setCategory} options={['', ...categoryOptions].map(value => [value, value || 'All categories'])} />
          <Select label="Progress" value={progressFilter} onChange={setProgressFilter} options={[['', 'Any progress'], ['unstarted', 'Unstarted'], ['in-progress', 'In progress'], ['completed', 'Completed']]} />
          <Select label="Sort by" value={sort} onChange={setSort} options={[['recent', 'Recent activity'], ['title', 'Course title']]} />
        </div>
        <div className="result-line">
          <span>{filtered.length} {filtered.length === 1 ? 'course' : 'courses'}</span>
          {filteredView && <button className="text-button" onClick={clearFilters}>Clear filters</button>}
        </div>
        {filtered.length ? <ul className="course-list">{filtered.map((entry, index) => <CourseRow key={entry.enrollment.id} entry={entry} variant={index} />)}</ul>
          : <Empty title={filteredView ? 'No matching courses' : archived ? 'No archived courses' : list ? 'This list is empty' : 'No courses in your library'}>
            {filteredView ? 'Try a different search or clear your filters.' : list ? 'Use a course’s actions to add it to this list.' : archived ? 'Courses you archive will appear here.' : 'Courses you enroll in will appear here.'}
          </Empty>}
      </section>
      <aside className="side-stack">
        {!archived && !list && <ResumePanel entry={resume} />}
        <section className="panel list-panel">
          <div className="panel-head"><h2>My lists</h2>{list && <button className="text-button" onClick={() => setDialog('new')}>New list</button>}</div>
          {lists.length ? <ul>{lists.map(item => {
            const count = all.filter(entry => entry.enrollment.status !== 'archived' && ids(item.courseIds).includes(entry.course.id)).length
            return <li key={item.id}><RouteLink className={item.id === listId ? 'selected' : undefined} aria-current={item.id === listId ? 'page' : undefined} to={'/my-learning/lists/' + item.id}>
              <span className="list-icon" aria-hidden="true">☷</span><span>{item.name || 'Untitled list'}<small>{count} {count === 1 ? 'course' : 'courses'}</small></span><span aria-hidden="true">›</span>
            </RouteLink></li>
          })}</ul> : <p className="panel-note">Create a list to organize your courses.</p>}
        </section>
      </aside>
    </div>
    {(dialog === 'new' || dialog === 'edit') && <FormDialog title={dialog === 'new' ? 'New list' : 'Edit list'} fields={listFields}
      initial={dialog === 'edit' ? list : undefined} submitLabel={dialog === 'new' ? 'Create list' : 'Save list'} onClose={close} onSave={values => {
        const id = dialog === 'edit' ? list.id : null
        const next = commit((state, meta) => saveList(state, meta, id, values), id ? 'List updated.' : 'List created.')
        if (!id && next !== state) navigate('/my-learning/lists/' + next.courseLists.at(-1).id)
      }} />}
    {dialog === 'delete' && <ConfirmDialog title="Delete list?" label="Delete list" onClose={close} onConfirm={() => {
      commit((state, meta) => deleteOwned(state, meta, 'courseLists', list.id), 'List deleted.')
      navigate('/my-learning')
    }}>“{list.name}” will be removed from My lists.</ConfirmDialog>}
  </>
}
