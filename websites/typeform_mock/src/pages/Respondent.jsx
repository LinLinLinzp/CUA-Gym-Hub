import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronLeft, RotateCcw } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../state.jsx'
import { answerRecord, draftOf, endingTitle, following, items, newId, questionTitle } from '../model.js'
import { AppLink, BackHome, Empty, formPath } from '../ui.jsx'

function AnswerInput({ question, value, onChange }) {
  const type = question.type
  if (type === 'multiple_choice' || type === 'yes_no') {
    const choices = type === 'yes_no' ? [['true', 'Yes'], ['false', 'No']] :
      items(question.choices).map((choice) => [choice.id, choice.label || 'Untitled choice'])
    return <fieldset className="answer-choices"><legend className="sr-only">{questionTitle(question)}</legend>
      {choices.map(([id, label], index) => <label key={id} className={value === id ? 'selected' : ''}>
        <input type="radio" name="answer" value={id} checked={value === id} onChange={() => onChange(id)} />
        <span className="letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span><span>{label}</span>
        {value === id && <Check size={17} />}
      </label>)}
    </fieldset>
  }
  const props = {
    id: 'answer-input', value, onChange: (event) => onChange(event.target.value),
    placeholder: type === 'email' ? 'you@example.com' : type === 'number' ? 'Enter a number' : 'Type your answer here',
  }
  return type === 'long_text' ? <textarea {...props} rows={4} /> :
    <input {...props} type={type === 'number' || type === 'email' ? type : 'text'} step={type === 'number' ? 'any' : undefined} />
}

function toTyped(question, value) {
  const text = value.trim()
  if (!text) return question.required ? { error: 'An answer is required.' } : {}
  if (question.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return { error: 'Enter a valid email address.' }
  if (question.type === 'number') return Number.isFinite(Number(text)) ? { answer: Number(text) } : { error: 'Enter a valid number.' }
  if (question.type === 'yes_no') return { answer: text === 'true' }
  return { answer: text }
}

function Attempt({ form, snapshot, preview, onRestart }) {
  const { commit } = useAccount()
  const content = draftOf(snapshot)
  const { questions, endings } = content
  const [index, setIndex] = useState(0)
  const [history, setHistory] = useState([])
  const [value, setValue] = useState('')
  const [endingId, setEndingId] = useState(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const completed = useRef(false)
  const question = questions[index]
  const ending = endings.find((entry) => entry.id === endingId)
  const atEnding = index < 0
  const version = form.publishedVersion || 1

  function advance(event) {
    event.preventDefault()
    if (event.currentTarget.querySelector('input[type=number]')?.validity.badInput) return setError('Enter a valid number.')
    const result = toTyped(question, value)
    if (result.error) return setError(result.error)
    const nextHistory = [...history, { index, raw: value, answer: result.answer }]
    const answers = Object.fromEntries(nextHistory.filter((step) => step.answer !== undefined).map((step) => [questions[step.index].id, step.answer]))
    const target = following(content, index, answers)
    setHistory(nextHistory)
    setError('')
    setValue('')
    setIndex(target.type === 'ending' ? -1 : questions.findIndex((entry) => entry.id === target.id))
    if (target.type === 'ending') setEndingId(target.id)
  }

  function back() {
    const previous = history.at(-1)
    if (!previous) return
    setHistory(history.slice(0, -1))
    setIndex(previous.index)
    setValue(previous.raw)
    setError('')
    setEndingId(null)
  }

  function submit() {
    if (completed.current) return
    completed.current = true
    if (!preview && !commit((before) => {
      const active = items(before.forms).find((entry) => entry.id === form.id)
      if (active?.status !== 'published' || (active.publishedVersion || 1) !== version) return before
      return { ...before, responses: [...items(before.responses), {
        id: newId('response'), formId: form.id, formVersion: version, endingId,
        actorId: newId('respondent'), status: 'completed', createdAt: new Date().toISOString(),
        answers: history.filter((step) => step.answer !== undefined).map((step) => answerRecord(questions[step.index], step.answer)),
      }] }
    })) {
      setError('This form has changed. Reload to try again.')
      return
    }
    setDone(true)
  }

  return <section className="attempt-card">
    <div className="attempt-pattern pattern" aria-hidden="true"><span /><span /><span /></div>
    <div className="attempt-body">
      {done ? <div className="finish-state" role="status"><span className="complete-icon"><Check size={24} /></span>
        <h1>{preview ? 'Preview complete' : 'Response submitted'}</h1>
        <p>{preview ? 'You reached “' + endingTitle(ending) + '”.' : 'Thank you for taking the time to respond.'}</p>
        {preview && <button onClick={onRestart}><RotateCcw size={16} /> Restart preview</button>}
      </div> : !question && !atEnding ? <Empty title="No questions yet">{preview ? 'Add a question in Build, then return to preview.' : 'This form has no questions to answer.'}</Empty> :
        atEnding ? <div className="finish-state">
          <div className="eyebrow">{preview ? 'Preview ending' : 'Ready to submit'}</div><h1>{endingTitle(ending)}</h1>
          <p>{ending?.description || 'You have reached the end of the form.'}</p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="attempt-actions"><button className="primary" onClick={submit}>{preview ? 'Finish preview' : 'Submit'} <Check size={17} /></button>
            <button type="button" onClick={back}><ChevronLeft size={17} /> Back</button></div>
        </div> : <form key={question.id} onSubmit={advance} noValidate>
          <div className="question-progress"><span>Question {index + 1} of {questions.length}</span>{question.required && <span>Required</span>}</div>
          <h1>{['multiple_choice', 'yes_no'].includes(question.type) ? questionTitle(question) : <label htmlFor="answer-input">{questionTitle(question)}</label>}</h1>
          {question.description && <p className="prompt-description">{question.description}</p>}
          <AnswerInput question={question} value={value} onChange={(next) => { setValue(next); setError('') }} />
          {error && <p className="error" role="alert">{error}</p>}
          <div className="attempt-actions"><button className="primary">Continue <ArrowRight size={17} /></button>
            {history.length > 0 && <button type="button" onClick={back}><ChevronLeft size={17} /> Back</button>}</div>
        </form>}
    </div>
  </section>
}

function RespondentShell({ form, preview, unavailable }) {
  const [attempt, setAttempt] = useState(0)
  const snapshot = preview ? form : form?.publishedSnapshot
  return <main className="respondent">
    <header className="respondent-header">
      <AppLink to="/" className="respondent-brand">Typeform</AppLink>
      {preview && <><span className="preview-label">Draft preview</span><AppLink className="button" to={formPath(form.id)}><ArrowLeft size={16} /> Back to Build</AppLink></>}
    </header>
    <div className="respondent-content">
      {snapshot && !unavailable ? <>
        <p className="respondent-title">{snapshot.title || 'Untitled form'}</p>
        <Attempt key={preview ? attempt : form.publishedVersion || 1} form={form} snapshot={snapshot} preview={preview} onRestart={() => setAttempt(attempt + 1)} />
      </> : <section className="panel"><Empty title={unavailable} action={<BackHome />}>This link is currently unavailable for submissions.</Empty></section>}
    </div>
  </main>
}

export function Preview({ form }) {
  return <RespondentShell form={form} preview />
}

export function PublishedForm() {
  const { state } = useAccount()
  const { formId } = useParams()
  const form = items(state.forms).find((entry) => entry.id === formId)
  const unavailable = !form ? 'Form not found' : form.status === 'closed' ? 'This form is closed' :
    form.status !== 'published' || !form.publishedSnapshot ? 'This form is unpublished' : null
  return <RespondentShell key={formId} form={form} unavailable={unavailable} />
}
