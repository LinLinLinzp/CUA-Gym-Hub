import { useState } from 'react'
import { ArrowRight, ClipboardList } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { active, attemptsFor, byId, hasAccess, list, outline, own, usableQuiz, validId } from '../data/learning.js'
import { Back, Confirm, Empty, Missing, PageHeading, SelectField, SiteLink, Status, assignmentPath, coursePath, dateText, duration } from '../components/ui.jsx'

function quizStatus(history) {
  if (history.some(row => row.status === 'passed')) return 'passed'
  return history.some(row => row.status === 'failed') ? 'failed' : 'not_started'
}

export function AssignmentDesk() {
  const { state } = useWorkspace()
  const [courseId, setCourse] = useState('')
  const [status, setStatus] = useState('')
  const enrollments = own(state, 'enrollments').filter(hasAccess)
  const rows = enrollments.flatMap(enrollment => {
    const course = byId(state.courses, enrollment.courseId)
    return outline(state, course).requirements.filter(row => row.kind === 'assignment' && row.item).map(({ item }) => {
      const history = attemptsFor(state, enrollment, item.id)
      const display = history.find(row => row.status === 'passed') || history[0]
      return { item, course, enrollment, display, status: quizStatus(history) }
    })
  })
  const options = [...new Map(rows.map(row => [row.course.id, row.course.title || 'Course']))].sort((a, b) => a[1].localeCompare(b[1]))
  const results = rows.filter(row => (!courseId || row.course.id === courseId) && (!status || row.status === status))
    .sort((a, b) => String(a.item.dueAt || '9999').localeCompare(String(b.item.dueAt || '9999')))
  return <>
    <PageHeading title="Assignments" subtitle="Check your coursework, review grades and pick up where you left off." />
    <div className="filters">
      <SelectField label="Filter by course" value={courseId} setValue={setCourse} options={[[ '', 'All courses'], ...options]} />
      <SelectField label="Filter by assignment status" value={status} setValue={setStatus} options={[[ '', 'All statuses'], ['not_started', 'Not started'], ['failed', 'Needs attention'], ['passed', 'Passed']]} />
    </div>
    <p className="result-count" aria-live="polite">{results.length} {results.length === 1 ? 'assignment' : 'assignments'}</p>
    {results.length ? <div className="record-list">
      {results.map(row => <article className="record assignment-record" key={row.enrollment.id + ':' + row.item.id}>
        <span className="row-icon"><ClipboardList size={21} aria-hidden="true" /></span>
        <div className="record-main"><h3><SiteLink to={assignmentPath(row.course.id, row.item.id)}>{row.item.title || 'Quiz'}</SiteLink></h3>
          <p>{row.course.title || 'Course'}{dateText(row.item.dueAt) && ' · Due ' + dateText(row.item.dueAt)}</p>
        </div>
        <div className="record-progress"><Status value={row.status} />{Number.isFinite(row.display?.scorePercent) && <span className="muted">Grade {row.display.scorePercent}%</span>}</div>
        <SiteLink className="button secondary" to={assignmentPath(row.course.id, row.item.id)}>
          {row.status === 'passed' || !active(row.enrollment) || !usableQuiz(row.item) ? 'Review quiz' : row.status === 'failed' ? 'Review or retake' : 'Start quiz'}<ArrowRight size={16} />
        </SiteLink>
      </article>)}
    </div> : <Empty title={rows.length ? 'No assignments match' : 'No assignments available'} description={rows.length ? 'Try changing the course or status filter.' : 'Assignments appear here when your enrolled courses include quizzes.'} to={rows.length ? undefined : '/'} action="Back to My Learning" />}
  </>
}

export function Quiz() {
  const { courseId, assignmentId } = useParams()
  return <QuizView key={courseId + ':' + assignmentId} courseId={courseId} assignmentId={assignmentId} />
}

function QuizView({ courseId, assignmentId }) {
  const { state, dispatch } = useWorkspace()
  const [answers, setAnswers] = useState({})
  const [retaking, setRetaking] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const course = byId(state.courses, courseId)
  if (!course) return <Missing to="/assignments" action="Back to Assignments" />
  const quiz = outline(state, course).requirements.find(row => row.kind === 'assignment' && row.id === assignmentId)?.item
  if (!quiz) return <Missing to={coursePath(courseId)} action="Back to course outline" />
  const enrollment = own(state, 'enrollments').find(row => row.courseId === courseId)
  if (!hasAccess(enrollment)) return <Empty title="Enrollment required" description="Enroll or re-enroll to open this assignment." to={coursePath(courseId)} action="View course" />
  const history = attemptsFor(state, enrollment, assignmentId)
  const result = history[0]
  const passed = history.some(row => row.status === 'passed')
  const canSubmit = usableQuiz(quiz) && active(enrollment) && validId(enrollment.id) && !passed
  const formOpen = canSubmit && (!result || retaking)
  const questions = list(quiz.questions)
  return <>
    <Back to={coursePath(courseId)}>Course outline</Back>
    <PageHeading title={quiz.title || 'Course quiz'} subtitle={course.title || 'Course'} eyebrow={'Quiz · ' + duration(quiz.estimatedMinutes)} />
    <div className="quiz-layout">
      <div>
        <section className="panel quiz-panel">
          <h2>{formOpen ? (retaking ? 'New attempt' : 'Take the quiz') : result ? 'Latest result' : 'Quiz overview'}</h2>
          <p>{quiz.instructions || 'Select one answer for each question.'}</p>
          <p className="muted">{Number.isFinite(quiz.passingPercent) ? 'Passing score ' + quiz.passingPercent + '%' : 'Passing score unavailable'}
            {dateText(quiz.dueAt) && ' · Due ' + dateText(quiz.dueAt)}</p>
          {result && !formOpen && <div className="quiz-result" aria-live="polite">
            <strong>{Number.isFinite(result.scorePercent) ? result.scorePercent + '%' : 'Score unavailable'}</strong>
            <Status value={result.status} label={result.status === 'failed' ? 'Failed' : undefined} />
          </div>}
          {!usableQuiz(quiz) && <p className="info-note">Submission is unavailable because this quiz is missing questions or grading information.</p>}
          {canSubmit && result && !formOpen && <button onClick={() => { setAnswers({}); setInvalid(false); setRetaking(true) }}>Retake quiz</button>}
          {formOpen ? <form onSubmit={event => {
            event.preventDefault()
            if (questions.some(question => !Object.hasOwn(answers, question.id))) { setInvalid(true); return }
            setInvalid(false)
            setConfirm(true)
          }}>
            {questions.map((question, index) => <fieldset key={question.id}>
              <legend>{index + 1}. {question.prompt || 'Question'}</legend>
              {list(question.options).map(option => <label className="option" key={option.id}>
                <input type="radio" name={'question-' + index} value={option.id} checked={answers[question.id] === option.id}
                  onChange={() => setAnswers(previous => ({ ...previous, [question.id]: option.id }))} />
                <span>{option.label || 'Answer option'}</span>
              </label>)}
            </fieldset>)}
            {invalid && <p className="form-error" role="alert">Select an answer for every question before submitting.</p>}
            <button type="submit">Submit quiz</button>
          </form> : questions.length > 0 && <div className="question-review">
            <h3>{result ? 'Submitted answers' : 'Questions'}</h3>
            <ol>{questions.map((question, index) => {
              const chosen = list(result?.answers).find(row => row.questionId === question.id)
              const option = list(question.options).find(row => row.id === chosen?.optionId)
              return <li key={question.id || index}>{question.prompt || 'Question'}{result && <p>{option?.label || 'Answer unavailable'}</p>}</li>
            })}</ol>
          </div>}
        </section>
      </div>
      <aside className="panel quiz-history">
        <h2>Attempt history</h2>
        {history.length ? <ol>{history.map((row, index) => <li key={row.id || index}>
          <div><strong>Attempt {row.attemptNumber ?? '—'}</strong><span>{dateText(row.createdAt)}</span></div>
          <div><strong>{Number.isFinite(row.scorePercent) ? row.scorePercent + '%' : '—'}</strong><Status value={row.status} label={row.status === 'failed' ? 'Failed' : undefined} /></div>
        </li>)}</ol> : <p>Your submitted attempts will appear here.</p>}
      </aside>
    </div>
    {confirm && <Confirm title="Submit this quiz?" description="Your answers will be graded and this attempt will be saved." label="Submit quiz"
      onClose={() => setConfirm(false)} onConfirm={async () => {
        setConfirm(false)
        if (await dispatch({ type: 'submitQuiz', courseId, assignmentId, answers }, 'Quiz submitted. Your result is ready.')) {
          setRetaking(false)
          setAnswers({})
        }
      }} />}
  </>
}
