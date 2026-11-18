import { useState } from 'react'
import { useAccount } from '../account.jsx'
import { changeCourse, finishLesson } from '../actions.js'
import { activeCourse, courseLessons, courseName, enrollmentFor, matches, nextLesson, number, records } from '../model.js'
import { AccountLink, Badge, Empty, Modal, PageHead, Progress } from '../ui.jsx'

const accents = ['lavender', 'leaf', 'peach', 'sky']

export function LanguageBadge({ course, index = 0 }) {
  const code = course?.languageCode || courseName(course).slice(0, 2)
  return <span className={'language-mark ' + accents[index % accents.length]} aria-hidden="true">{code}</span>
}

export function CurrentCourse({ state }) {
  const course = activeCourse(state)
  const enrollment = course && enrollmentFor(state, course.id)
  const next = nextLesson(state, enrollment)
  if (!course) return <Empty>No active course yet. Add your first language from the catalog.</Empty>
  return <article className="card current-course">
    <div className="inline">
      <LanguageBadge course={course} index={1} />
      <div><div className="caption">Current course</div><h2>{courseName(course)}</h2></div>
    </div>
    <div className="current-progress">
      <Progress value={enrollment.lessonsCompleted} target={courseLessons(state, course.id).length} unit="lessons" />
      <p className="caption">{number(enrollment.xp).toLocaleString()} XP earned</p>
    </div>
    <AccountLink to="/learn" className="button primary">{next ? 'Continue learning' : 'View course progress'} <span aria-hidden="true">→</span></AccountLink>
  </article>
}

export function Courses() {
  const { state, commit } = useAccount()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('alphabetical')
  const [removing, setRemoving] = useState(null)
  const currentId = activeCourse(state)?.id
  const courses = records(state.courses)
  const enrolledIds = new Set(records(state.enrollments).filter(row => row.status === 'enrolled').map(row => row.courseId))
  const otherCourses = courses.filter(course => course.id !== currentId && enrolledIds.has(course.id))
    .sort((a, b) => courseName(a).localeCompare(courseName(b)))
  const catalog = courses.filter(course => matches(query, course.name, course.languageCode, course.family, course.baseLanguage)
    && (filter === 'all' || (filter === 'enrolled') === enrolledIds.has(course.id)))
    .sort((a, b) => {
      const popularity = sort === 'popular' ? number(b.learners) - number(a.learners) : 0
      return popularity || courseName(a).localeCompare(courseName(b))
    })

  function change(course, type) {
    const messages = {
      enrolled: courseName(course) + ' added to your courses.',
      switched: 'Current course set to ' + courseName(course) + '.',
      removed: courseName(course) + ' removed.',
    }
    commit((current, now) => changeCourse(current, now, course.id, type), messages[type])
  }

  return <>
    <PageHead title="Courses">Explore languages and pick up where you left off.</PageHead>
    <CurrentCourse state={state} />
    {otherCourses.length > 0 && <div className="other-courses inline">
      <span className="caption">Also enrolled</span>
      {otherCourses.map(course => <button className="course-chip" key={course.id} onClick={() => {
        setQuery(courseName(course))
        setFilter('enrolled')
        document.getElementById('catalog-title').scrollIntoView({ block: 'start' })
        document.getElementById('course-search').focus({ preventScroll: true })
      }}>{courseName(course)}</button>)}
    </div>}
    <section className="section" aria-labelledby="catalog-title">
      <h2 id="catalog-title">Course catalog</h2>
      <div className="filters">
        <label className="search">Search courses<input id="course-search" type="search" placeholder="Language, name, or family" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label><span id="enrollment-label">Enrollment</span><select aria-labelledby="enrollment-label" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">All courses</option><option value="enrolled">Enrolled</option><option value="available">Available to add</option>
        </select></label>
        <label><span id="course-sort-label">Sort by</span><select aria-labelledby="course-sort-label" value={sort} onChange={event => setSort(event.target.value)}>
          <option value="alphabetical">Alphabetical</option><option value="popular">Popularity</option>
        </select></label>
      </div>
      <p className="caption results-count">{catalog.length} {catalog.length === 1 ? 'course' : 'courses'}</p>
      {catalog.length ? <div className="grid three">
        {catalog.map((course, index) => {
          const enrolled = enrolledIds.has(course.id)
          const active = currentId === course.id
          const entry = enrolled && enrollmentFor(state, course.id)
          return <article className="card catalog-card" key={course.id} aria-label={courseName(course)}>
            <div className="between"><LanguageBadge course={course} index={index} />
              <Badge tone={active ? 'green' : enrolled ? '' : 'neutral'}>{active ? 'Current course' : enrolled ? 'Enrolled' : 'Available'}</Badge>
            </div>
            <div><h3>{courseName(course)}</h3><p className="caption">{[course.family, course.baseLanguage && 'For ' + course.baseLanguage + ' speakers'].filter(Boolean).join(' · ') || 'Language course'}</p></div>
            <p className="muted">{course.description || 'Practice vocabulary in short lessons.'}</p>
            <p className="caption">{entry ? number(entry.xp).toLocaleString() + ' XP earned' : number(course.learners).toLocaleString() + ' learners'}</p>
            <div className="actions">
              {!enrolled && <button className="primary" onClick={() => change(course, 'enrolled')}>Add course</button>}
              {enrolled && !active && <button onClick={() => change(course, 'switched')}>Switch course</button>}
              {enrolled && <button className="danger" onClick={() => setRemoving(course)}>Remove course</button>}
            </div>
          </article>
        })}
      </div> : <Empty>{courses.length ? 'No courses match your filters.' : 'The course catalog is empty.'}</Empty>}
    </section>
    {removing && <Modal title={'Remove ' + courseName(removing) + '?'} onClose={() => setRemoving(null)}>
      <p>Your current XP and lesson progress for this course will reset. Previous lesson activity will remain in your history.</p>
      <div className="actions dialog-actions">
        <button autoFocus onClick={() => setRemoving(null)}>Cancel</button>
        <button className="primary danger" onClick={() => { change(removing, 'removed'); setRemoving(null) }}>Remove course</button>
      </div>
    </Modal>}
  </>
}

function Practice({ course, lesson, enrollment, onFinish }) {
  const [answer, setAnswer] = useState(null)
  const [checked, setChecked] = useState(false)
  const correct = answer === lesson.answerIndex
  return <article className="card stack practice">
    <div className="inline"><LanguageBadge course={course} index={1} /><div>
      <div className="caption">{courseName(course)} · Unit {number(lesson.order, number(enrollment.lessonsCompleted) + 1)}</div>
      <h2>{lesson.title || 'Vocabulary practice'}</h2>
    </div></div>
    <fieldset className="answer-list">
      <legend>{lesson.prompt}</legend>
      {lesson.options.map((option, index) => <label className={'answer' + (answer === index ? ' selected' : '')} key={index}>
        <input type="radio" name="practice-answer" checked={answer === index} disabled={checked} onChange={() => setAnswer(index)} />{option}
      </label>)}
    </fieldset>
    {checked && <div className={'answer-feedback ' + (correct ? 'correct' : 'review')} role="status">
      <strong>{correct ? 'Correct!' : 'Good practice'}</strong>
      {!correct && <p>The correct answer is {lesson.options[lesson.answerIndex]}.</p>}
      <p>Finish this lesson to earn {Math.max(0, number(lesson.xp))} XP.</p>
    </div>}
    <div className="actions">
      {checked ? <button className="primary" onClick={() => onFinish(answer)}>Finish lesson</button>
        : <button className="primary" disabled={answer === null} onClick={() => setChecked(true)}>Check answer</button>}
      <AccountLink className="button" to="/courses">Leave lesson</AccountLink>
    </div>
  </article>
}

export function Learn() {
  const { state, commit } = useAccount()
  const [finished, setFinished] = useState(null)
  const course = activeCourse(state)
  const enrollment = course && enrollmentFor(state, course.id)
  const lesson = nextLesson(state, enrollment)
  const run = number(enrollment?.run, 1)

  function complete(answer) {
    if (commit((current, now) => finishLesson(current, now, lesson.id, enrollment.id, run, answer), 'Lesson completed.')) {
      setFinished({ title: lesson.title || 'Vocabulary practice', xp: Math.max(0, number(lesson.xp)) })
    }
  }

  return <>
    <PageHead title="Learn">{course ? 'Practice ' + courseName(course) + ' one unit at a time.' : 'Choose a language to begin practicing.'}</PageHead>
    {finished ? <article className="card stack practice">
      <Badge tone="green">+{finished.xp} XP</Badge><h2>Lesson complete</h2><p>You finished {finished.title}.</p>
      <div className="actions">
        {lesson && <button className="primary" onClick={() => setFinished(null)}>Next lesson</button>}
        <AccountLink className="button" to="/courses">Back to Courses</AccountLink>
      </div>
    </article> : lesson ? <Practice key={enrollment.id + ':' + run + ':' + lesson.id} course={course} enrollment={enrollment} lesson={lesson} onFinish={complete} />
      : <article className="card stack practice">
        <h2>{course ? 'You’re caught up' : 'No active course'}</h2>
        <p>{course ? 'There are no more practice lessons available in this course.' : 'Add or switch to a course from the catalog.'}</p>
        <div><AccountLink className="button primary" to="/courses">Browse courses</AccountLink></div>
      </article>}
  </>
}
