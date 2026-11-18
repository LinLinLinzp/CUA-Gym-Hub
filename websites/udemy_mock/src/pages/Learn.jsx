import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../context/Workspace.jsx'
import { changeEnrollment } from '../data/actions.js'
import { byId, completedIds, curriculumFor, enrollmentFor, profileName, progressFor } from '../data/selectors.js'
import { Artwork, Empty, Missing, PageTitle, Progress, RouteLink } from '../components/Parts.jsx'
import { CourseMenu } from './Library.jsx'
import { LearnerQuestions, Thread } from './Questions.jsx'

function Syllabus({ curriculum, complete, selected, onSelect, compact = false }) {
  return <section className={'panel syllabus' + (compact ? ' compact' : '')} aria-label={compact ? 'Lesson outline' : 'Course curriculum'}>
    <div className="panel-head"><h2>{compact ? 'Lesson outline' : 'Curriculum'}</h2></div>
    {curriculum.length ? curriculum.map(section => <div className="syllabus-section" key={section.id}>
      <h3>{section.title || 'Untitled section'}</h3>
      {section.lessons.length ? <ul>{section.lessons.map(lecture => <li key={lecture.id}>
        <button className={selected?.id === lecture.id ? 'selected' : ''} aria-current={selected?.id === lecture.id ? 'true' : undefined} onClick={() => onSelect(lecture)}>
          <span className={'lesson-indicator' + (complete.includes(lecture.id) ? ' complete' : '')} aria-label={complete.includes(lecture.id) ? 'Completed' : undefined}>{complete.includes(lecture.id) ? '✓' : '▷'}</span>
          <span>{lecture.title || 'Untitled lesson'}{Boolean(lecture.durationMinutes) && <small>{lecture.durationMinutes} min</small>}</span>
        </button>
      </li>)}</ul> : <p className="panel-note">No lessons in this section.</p>}
    </div>) : <p className="panel-note">This course has no lessons yet.</p>}
  </section>
}

export function Learn() {
  const { courseId, questionId } = useParams()
  const [params] = useSearchParams()
  const { state, commit } = useStore()
  const [selectedId, setSelectedId] = useState(null)
  const course = byId(state.courses, courseId)
  const enrollment = enrollmentFor(state, courseId)
  if (!course || !enrollment) return <Missing title="Course unavailable">Return to My learning to choose an enrolled course.</Missing>

  const curriculum = curriculumFor(state, courseId)
  const lessons = curriculum.flatMap(section => section.lessons)
  const savedLecture = lessons.find(lecture => lecture.id === enrollment.lastLectureId)
  const resume = savedLecture || lessons[0]
  const selected = lessons.find(lecture => lecture.id === selectedId) || resume
  const complete = completedIds(enrollment, lessons)
  const base = '/learn/' + courseId
  const tab = questionId ? 'qa' : ['curriculum', 'qa'].includes(params.get('tab')) ? params.get('tab') : 'overview'
  function start(lesson, type = 'start') {
    setSelectedId(lesson.id)
    commit((state, meta) => changeEnrollment(state, meta, enrollment.id, type, lesson.id), 'Lesson opened.')
  }

  return <>
    <RouteLink className="back-link" to={enrollment.status === 'archived' ? '/my-learning?view=archived' : '/my-learning'}>← My learning</RouteLink>
    <PageTitle title={course.title || 'Untitled course'} actions={<>
      {enrollment.status === 'archived' && <span className="badge archived">Archived</span>}
      <CourseMenu enrollment={enrollment} course={course} />
    </>}>
      {course.category || 'General'} · {profileName(state, course.instructorId, 'Instructor unavailable')}
    </PageTitle>
    <div className="course-progress"><Progress {...progressFor(enrollment, lessons)} /></div>
    <nav className="tabs" aria-label="Course sections">
      {[['overview', 'Overview'], ['curriculum', 'Curriculum'], ['qa', 'Q&A']].map(([key, label]) =>
        <RouteLink key={key} className={tab === key ? 'selected' : undefined} aria-current={tab === key ? 'page' : undefined} to={base + (key === 'overview' ? '' : '?tab=' + key)}>{label}</RouteLink>)}
    </nav>
    {tab === 'qa' ? (questionId
      ? <Thread questionId={questionId} course={course} mode="learner" back={base + '?tab=qa'} />
      : <LearnerQuestions course={course} currentLesson={selected} />)
      : <div className="workspace-grid course-workspace">
        <div className="side-stack">
          {tab === 'curriculum' && <Syllabus curriculum={curriculum} complete={complete} selected={selected} onSelect={start} />}
          {selected ? <article className="panel lesson-panel" aria-label="Current lesson">
            <Artwork category={course.category} wide variant={selected.position || 0} />
            <div className="lesson-body">
              <p className="course-category">Current lesson{selected.durationMinutes ? ' · ' + selected.durationMinutes + ' min' : ''}</p>
              <h2>{selected.title || 'Untitled lesson'}</h2>
              <p className="body-copy">{selected.content || 'Written material is currently unavailable for this lesson.'}</p>
              <div className="actions">
                <button className="primary" onClick={() => start(selected, 'resume')}>{savedLecture ? 'Resume lesson' : 'Start lesson'}</button>
                <button onClick={() => commit((state, meta) => changeEnrollment(state, meta, enrollment.id, 'complete', selected.id),
                  complete.includes(selected.id) ? 'Lesson marked incomplete.' : 'Lesson completed.')}>
                  {complete.includes(selected.id) ? 'Mark incomplete' : 'Mark complete'}
                </button>
              </div>
            </div>
          </article> : <Empty title="No lessons available">You can still read the course overview and browse Q&A.</Empty>}
          {tab === 'overview' && <article className="panel about-panel"><h2>About this course</h2>
            {course.subtitle && <h3>{course.subtitle}</h3>}<p className="body-copy">{course.description || 'A course description has not been added.'}</p>
          </article>}
        </div>
        {tab === 'overview' && <Syllabus curriculum={curriculum} complete={complete} selected={selected} onSelect={start} compact />}
      </div>}
  </>
}
