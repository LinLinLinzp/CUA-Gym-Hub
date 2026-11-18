import { useState } from 'react'
import { ArrowRight, Award, BookOpen, ClipboardList, Clock, Layers3 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { active, byId, certificateFor, courseProgress, enrollmentFor, fulfilled, hasAccess, list, outline, usableQuiz, validId } from '../data/learning.js'
import { Artwork, Back, Confirm, Empty, Missing, PageHeading, Progress, SiteLink, Status, certificatePath, coursePath, duration, requirementPath } from '../components/ui.jsx'

const confirmations = {
  enroll: ['Enroll in this course?', 'This course will be added to My Learning and its activities will open.', 'Enroll', 'You’re enrolled. Your course is ready.'],
  reenroll: ['Re-enroll in this course?', 'You can resume your saved progress and assignment attempts.', 'Re-enroll', 'You’re enrolled again. Your progress is available.'],
  withdraw: ['Unenroll from this course?', 'Access to course work will pause. Your reading progress and quiz attempts will be available if you re-enroll.', 'Unenroll', 'You’ve unenrolled from the course.'],
  finish: ['Finish this course?', 'Your course will be marked completed.', 'Finish course', 'Course completed.'],
}

export function Course() {
  const { courseId } = useParams()
  return <CourseView key={courseId} courseId={courseId} />
}

function CourseView({ courseId }) {
  const { state, dispatch } = useWorkspace()
  const [confirmation, setConfirmation] = useState(null)
  const course = byId(state.courses, courseId)
  if (!course) return <Missing to="/browse" action="Back to Explore" />

  const enrollment = enrollmentFor(state, courseId)
  const certificate = certificateFor(state, courseId)
  const progress = courseProgress(state, course, enrollment)
  const { modules, requirements } = outline(state, course)
  const enrolling = !enrollment || enrollment.status === 'withdrawn'
  const canAct = validId(state.learner?.id) && (!enrollment || validId(enrollment.id))
  const action = confirmations[confirmation]
  return <>
    <Back to={enrollment ? '/' : '/browse'}>{enrollment ? 'My Learning' : 'Explore courses'}</Back>
    <section className="course-hero">
      <div>
        <PageHeading title={course.title || 'Course'} eyebrow={course.topic} subtitle={course.issuerName || 'Course provider'} />
        <p className="description">{course.description || 'See the course outline for available activities.'}</p>
        <div className="course-facts">
          <span><Clock size={17} />{duration(course.estimatedMinutes)}</span>
          <span><Layers3 size={17} />{course.level || 'Level unavailable'}</span>
          <span><Award size={17} />{course.certificateEligible ? 'Course certificate' : 'Certificate unavailable'}</span>
        </div>
      </div>
      <Artwork variant={course.artworkKey} />
    </section>
    <section className="course-status panel" aria-label="Enrollment">
      <div>
        <h2>{enrollment ? 'Your enrollment' : 'Start learning'}</h2>
        {enrollment ? <div className="enrollment-progress"><Status value={enrollment.status} /><Progress value={enrollment.progressPercent ?? (enrollment.status === 'completed' ? 100 : progress.percent)} /></div>
          : <p>Enroll to open the readings and submit coursework.</p>}
      </div>
      <div className="actions">
        {enrolling && canAct && <button onClick={() => setConfirmation(enrollment ? 'reenroll' : 'enroll')}>{enrollment ? 'Re-enroll' : 'Enroll'}</button>}
        {active(enrollment) && progress.next && <SiteLink className="button" to={requirementPath(courseId, progress.next)}>Continue learning <ArrowRight size={16} /></SiteLink>}
        {active(enrollment) && progress.ready && canAct && <button onClick={() => setConfirmation('finish')}>Finish course</button>}
        {certificate && validId(certificate.id) && <SiteLink className="button" to={certificatePath(certificate.id)}>View certificate <ArrowRight size={16} /></SiteLink>}
        {active(enrollment) && canAct && <button className="secondary" onClick={() => setConfirmation('withdraw')}>Unenroll</button>}
        {!canAct && <p>Enrollment actions require an available learner and enrollment record.</p>}
      </div>
    </section>
    <section className="section" aria-labelledby="outline-heading">
      <div className="section-heading"><h2 id="outline-heading">Course outline</h2><span>{requirements.length} {requirements.length === 1 ? 'activity' : 'activities'}</span></div>
      {(progress.missing || !requirements.length) && <p className="info-note">Some course content is unavailable. Finishing the course requires a complete outline.</p>}
      {modules.map((module, index) => <section className="module panel" key={module.id || index}>
        <h3>{module.title || 'Course module'}</h3>
        {module.requirements.length === 0 && <p>No activities are listed in this module.</p>}
        {module.requirements.map((row, rowIndex) => {
          const Icon = row.kind === 'lesson' ? BookOpen : ClipboardList
          const done = fulfilled(state, enrollment, row)
          const available = row.item && hasAccess(enrollment)
          return <div className="requirement" key={row.kind + row.id + rowIndex}>
            <span className="row-icon"><Icon size={19} aria-hidden="true" /></span>
            <div className="record-main">
              <h4>{available ? <SiteLink to={requirementPath(courseId, row)}>{row.item.title || 'Course activity'}</SiteLink>
                : row.item?.title || 'Unavailable course activity'}</h4>
              <p>{row.kind === 'lesson' ? 'Reading' : 'Quiz'}{row.item && ' · ' + duration(row.item.estimatedMinutes)}</p>
            </div>
            {done ? <Status value={row.kind === 'lesson' ? 'completed' : 'passed'} /> : !row.item ? <Status value="unavailable" />
              : available ? <Status value="not_started" label={row.kind === 'assignment' && !usableQuiz(row.item) ? 'Review only' : 'To do'} /> : <span className="muted">Enrollment required</span>}
          </div>
        })}
      </section>)}
    </section>
    {action && <Confirm title={action[0]} description={action[1] + (confirmation === 'finish' && course.certificateEligible ? ' You can view your certificate from this course and Accomplishments.' : '')}
      label={action[2]} danger={confirmation === 'withdraw'} onClose={() => setConfirmation(null)}
      onConfirm={() => { dispatch({ type: confirmation, courseId }, action[3]); setConfirmation(null) }} />}
  </>
}

export function Lesson() {
  const { courseId, lessonId } = useParams()
  const { state, dispatch } = useWorkspace()
  const course = byId(state.courses, courseId)
  if (!course) return <Missing to="/browse" action="Back to Explore" />
  const entry = outline(state, course).requirements.find(row => row.kind === 'lesson' && row.id === lessonId)
  if (!entry?.item) return <Missing to={coursePath(courseId)} action="Back to course outline" />
  const enrollment = enrollmentFor(state, courseId)
  if (!hasAccess(enrollment)) return <Empty title="Enrollment required" description="Enroll or re-enroll in this course to open the reading." to={coursePath(courseId)} action="View course" />
  const lesson = entry.item
  const done = fulfilled(state, enrollment, entry)
  const progress = courseProgress(state, course, enrollment)
  return <>
    <Back to={coursePath(courseId)}>Course outline</Back>
    <PageHeading title={lesson.title || 'Course reading'} subtitle={course.title || 'Course'} eyebrow={'Reading · ' + duration(lesson.estimatedMinutes)} />
    <article className="reading panel">
      {list(lesson.paragraphs).length ? list(lesson.paragraphs).map((paragraph, index) => <p key={index}>{paragraph}</p>)
        : <p>The reading text is unavailable.</p>}
      <div className="actions">
        {done ? <Status value="completed" label="Reading complete" /> : active(enrollment) && validId(enrollment.id) && list(lesson.paragraphs).length > 0
          ? <button onClick={() => dispatch({ type: 'completeLesson', courseId, lessonId }, 'Reading marked complete.')}>Mark complete</button>
          : <p>Completion is unavailable for this reading.</p>}
        {done && <SiteLink className="button secondary" to={progress.next ? requirementPath(courseId, progress.next) : coursePath(courseId)}>
          {progress.next ? 'Next activity' : 'Back to course outline'} <ArrowRight size={16} />
        </SiteLink>}
      </div>
    </article>
  </>
}
