import { useState } from 'react'
import { useWorkspace, upsert } from '../context/Workspace'
import { effective, find, inCourse, isScore, list, nameOf, roster } from '../data/views'
import { Badge, Dialog, Field } from './UI'

export function GradeEditor({ item, studentId, user, submission, onClose }) {
  const { state, commit, notify } = useWorkspace()
  const grade = inCourse(state.grades, item.courseId).find(row => row.gradeItemId === item.id && row.studentId === studentId)
  const mode = submission ? 'activity' : item.assignmentId ? 'override' : 'manual'
  const selected = mode === 'override' ? effective(grade) : grade
  const [score, setScore] = useState(isScore(selected?.score) ? String(selected.score) : '')
  const [feedback, setFeedback] = useState(selected?.feedback ?? '')
  const [error, setError] = useState('')
  const learner = nameOf(user)
  const title = (mode === 'activity' ? 'Grade ' : 'Edit grade for ') + learner + ' · ' + (item.name || 'Untitled item')

  function save(remove = false) {
    const value = score.trim() === '' ? null : Number(score)
    if (!remove && (value !== null && (!isScore(value) || value < 0 || value > item.maxPoints))) {
      setError('Enter a score from 0 to ' + item.maxPoints + ', or leave it blank.')
      return
    }

    const changed = commit((current, time) => {
      if (!roster(current, item.courseId).some(row => row.userId === studentId)) return current
      const liveItem = find(current.gradeItems, item.id)
      if (!liveItem || (!remove && (!isScore(liveItem.maxPoints) || liveItem.maxPoints <= 0 || value > liveItem.maxPoints))) return current
      const rows = list(current.grades)
      const existing = rows.find(row => row.courseId === item.courseId && row.gradeItemId === item.id && row.studentId === studentId)
      const actor = current.account.userId
      const identity = { courseId: item.courseId, gradeItemId: item.id, studentId }
      const base = { submissionId: null, score: null, feedback: '', gradedBy: null, gradedAt: null, override: null, ...existing }
      let fields
      if (mode === 'override') {
        if (remove && !existing?.override) return current
        fields = { ...base, override: remove ? null : {
          score: value, feedback: feedback.trim(), actorId: actor, createdAt: existing?.override?.createdAt ?? time, updatedAt: time,
        } }
      } else {
        const liveSubmission = submission && find(current.submissions, submission.id)
        if (mode === 'activity' && (liveSubmission?.status !== 'submitted' || liveSubmission.courseId !== item.courseId || liveSubmission.assignmentId !== item.assignmentId || liveSubmission.studentId !== studentId)) return current
        fields = {
          ...base, submissionId: liveSubmission?.id ?? null, score: value, feedback: feedback.trim(), gradedBy: actor, gradedAt: time,
          override: mode === 'activity' ? base.override : null,
        }
      }
      return { ...current, grades: upsert(rows, existing, { ...fields, ...identity }, actor, time, 'grd').rows }
    })
    if (!changed) {
      setError('This grade could not be saved. Check the item and enrolment.')
      return
    }
    onClose()
    notify(remove ? 'Grade override removed.' : mode === 'override' ? 'Grade override saved.' : 'Grade saved.')
  }

  return <Dialog title={title} onClose={onClose}>
    <form className="form-fields" onSubmit={event => { event.preventDefault(); if (event.currentTarget.elements.points.validity.badInput) setError('Enter a numeric score.'); else save() }} noValidate>
      {submission && <div className="panel details"><h3>Online text</h3><p className="text-block">{submission.text || 'No text available.'}</p></div>}
      {grade?.override && <p><Badge tone="attention">Override</Badge> Effective score {isScore(grade.override.score) ? grade.override.score : '—'} / {item.maxPoints ?? '—'}</p>}
      {mode === 'override' && <p className="muted">Activity score {isScore(grade?.score) ? grade.score : '—'} / {item.maxPoints ?? '—'}</p>}
      <Field label="Points" error={error}>{props => <input {...props} name="points" type="number" step="any" min="0" max={item.maxPoints} value={score}
        onChange={event => { setScore(event.target.value); setError('') }} aria-describedby={error ? props['aria-describedby'] : 'score-description'} />}</Field>
      <small id="score-description">Maximum {item.maxPoints ?? '—'} points. Leave blank for an ungraded score.</small>
      <Field label="Feedback">{props => <textarea {...props} value={feedback} onChange={event => setFeedback(event.target.value)} />}</Field>
      <div className="actions"><button type="submit">{mode === 'override' ? 'Save override' : 'Save grade'}</button>
        {mode === 'override' && grade?.override && <button type="button" className="secondary" onClick={() => save(true)}>Remove override</button>}
        <button type="button" className="secondary" onClick={onClose}>Cancel</button>
      </div>
    </form>
  </Dialog>
}
