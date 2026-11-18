import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpRight, Clipboard, Copy, FileQuestion, Plus, Radio, Trash2 } from 'lucide-react'
import { useAccount } from '../state.jsx'
import { copyQuestion, defaultEnding, draftOf, endingTitle, isPending, items, newId, questionTitle, reorder, types, validRule } from '../model.js'
import { Confirm, Empty, FormHeader, respondentPath } from '../ui.jsx'

function QuestionFields({ question, onSave }) {
  const [title, setTitle] = useState(question.title || '')
  const [description, setDescription] = useState(question.description || '')
  const [type, setType] = useState(question.type || 'short_text')
  const [required, setRequired] = useState(!!question.required)
  const [choices, setChoices] = useState(items(question.choices))
  const [error, setError] = useState('')

  function save(event) {
    event.preventDefault()
    const options = type === 'multiple_choice' ? choices.map((choice) => ({ ...choice, label: (choice.label || '').trim() })) : []
    if (!title.trim()) return setError('Enter a question prompt.')
    if (options.some((choice) => !choice.label) || (type === 'multiple_choice' && options.length < 2)) {
      return setError('Provide at least two labeled choices.')
    }
    if (new Set(options.map((choice) => choice.label.toLowerCase())).size !== options.length) {
      return setError('Give each choice a different label.')
    }
    setError('')
    onSave({ ...question, title: title.trim(), description: description.trim(), type, required, choices: options })
  }

  return <form className="editor-fields" onSubmit={save} noValidate>
    <label className="field">Question type<select value={type} onChange={(event) => {
      const next = event.target.value
      setType(next)
      if (next === 'multiple_choice' && !choices.length) setChoices([1, 2].map(() => ({ id: newId('c'), label: '' })))
    }}>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field">Question prompt<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={220} /></label>
    <label className="field">Description <small>Optional</small><textarea value={description} rows={3} onChange={(event) => setDescription(event.target.value)} /></label>
    {type === 'multiple_choice' && <fieldset className="choices-editor">
      <legend>Answer choices</legend>
      {choices.map((choice, index) => <div className="choice-editor-row" key={choice.id}>
        <span aria-hidden="true">{index + 1}</span>
        <input aria-label={'Choice ' + (index + 1)} value={choice.label || ''} onChange={(event) => setChoices(choices.map((entry) => entry.id === choice.id ? { ...entry, label: event.target.value } : entry))} />
        <button type="button" className="icon-button" aria-label={'Remove choice ' + (index + 1)} onClick={() => setChoices(choices.filter((entry) => entry.id !== choice.id))}><Trash2 size={16} /></button>
      </div>)}
      <button type="button" onClick={() => setChoices([...choices, { id: newId('c'), label: '' }])}><Plus size={16} /> Add choice</button>
    </fieldset>}
    <label className="checkbox"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> Required question</label>
    {error && <p className="error" role="alert">{error}</p>}
    <div><button className="primary">Save question</button></div>
  </form>
}

function EndingFields({ ending, onSave }) {
  const [title, setTitle] = useState(ending.title || '')
  const [description, setDescription] = useState(ending.description || '')
  const [error, setError] = useState('')
  return <form className="editor-fields" noValidate onSubmit={(event) => {
    event.preventDefault()
    if (!title.trim()) return setError('Enter an ending title.')
    setError('')
    onSave({ ...ending, title: title.trim(), description: description.trim() })
  }}>
    <label className="field">Ending title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={220} /></label>
    <label className="field">Ending message<textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <div><button className="primary">Save ending</button></div>
  </form>
}

export default function Build({ form, workspace }) {
  const { editForm } = useAccount()
  const { questions, endings, logic } = draftOf(form)
  const [selection, setSelection] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [linkVisible, setLinkVisible] = useState(false)
  const question = questions.find((entry) => entry.id === selection) || (selection === null ? questions[0] : undefined)
  const ending = endings.find((entry) => entry.id === selection)
  const questionIndex = questions.indexOf(question)
  const endingIndex = endings.indexOf(ending)
  const closed = form.status === 'closed'
  const pending = isPending(form)
  const link = respondentPath(form.id)

  function changeRecords(key, records, ids, options = {}) {
    setError('')
    const updatedQuestions = key === 'questions' ? records : questions
    const updatedEndings = key === 'endings' ? records : endings
    const removed = logic.filter((rule) => {
      const condition = rule.condition
      const removedId = options.removedId
      const hitRemovedRecord = removedId && [rule.sourceQuestionId, condition?.questionId, rule.destination?.id].includes(removedId)
      const hitChangedOperand = condition && (condition.questionId === options.typeChanged ||
        (condition.questionId === options.choiceQuestionId && options.removedChoiceIds?.includes(condition.value)))
      return hitRemovedRecord || hitChangedOperand ||
        (validRule(rule, questions, endings) && !validRule(rule, updatedQuestions, updatedEndings))
    })
    function apply() {
      if (editForm(form.id, key + '_updated', (current) => {
        if (JSON.stringify(items(current[key])) === JSON.stringify(records) && !removed.length) return null
        return {
          fields: { [key]: records, ...(removed.length ? { logic: items(current.logic).filter((rule) => !removed.includes(rule)) } : {}) },
          entityIds: [...ids, ...removed.map((rule) => rule.id)],
        }
      })) {
        setMessage(key === 'questions' ? 'Questions saved.' : 'Endings saved.')
        if (Object.hasOwn(options, 'select')) setSelection(options.select)
      }
      setConfirm(null)
    }

    if (options.deleteLabel || removed.length) setConfirm({
      title: options.deleteLabel || 'Remove affected branch rules?',
      description: [options.description, removed.length ? removed.length + ' branch ' + (removed.length === 1 ? 'rule will' : 'rules will') + ' be removed from the draft.' : ''].filter(Boolean).join(' '),
      label: options.deleteLabel ? (key === 'questions' ? 'Delete question' : 'Delete ending') : 'Save and remove rules',
      apply,
    })
    else apply()
  }

  function addQuestion() {
    const entry = { id: newId('q'), title: 'Untitled question', description: '', type: 'short_text', required: false, choices: [] }
    changeRecords('questions', [...questions, entry], [entry.id], { select: entry.id })
  }

  function saveQuestion(entry) {
    const removedChoiceIds = items(question.choices).map((choice) => choice.id)
      .filter((id) => !entry.choices.some((choice) => choice.id === id))
    changeRecords('questions', questions.map((old) => old.id === entry.id ? entry : old), [entry.id], {
      typeChanged: question.type !== entry.type ? entry.id : undefined, choiceQuestionId: entry.id, removedChoiceIds,
    })
  }

  function publish() {
    setMessage('')
    if (!questions.length) return setError('Add at least one question before publishing.')
    if (questions.some((q) => !q.title?.trim() || !Object.hasOwn(types, q.type) ||
      (q.type === 'multiple_choice' && (items(q.choices).length < 2 || items(q.choices).some((choice) => !choice.label?.trim()))))) {
      return setError('Check that every question has a prompt, a supported type, and at least two labeled choices where required.')
    }
    const fallbacks = new Set()
    if (!endings.length || endings.some((entry) => !entry.title?.trim())) return setError('Add an ending with a title before publishing.')
    if (logic.some((rule) => {
      if (!validRule(rule, questions, endings) || fallbacks.has(rule.sourceQuestionId)) return true
      if (rule.condition === null) fallbacks.add(rule.sourceQuestionId)
      return false
    })) return setError('Resolve invalid branch rules in Logic before publishing.')

    if (editForm(form.id, 'form_published', (current, date) => ({
      fields: { status: 'published', publishedAt: date, publishedVersion: (Number(current.publishedVersion) || 0) + 1, publishedSnapshot: { ...current.publishedSnapshot, ...draftOf(current) } },
    }))) {
      setError('')
      setMessage('Form published.')
      setLinkVisible(true)
    }
  }

  function toggleResponses() {
    const next = closed ? 'published' : 'closed'
    if (editForm(form.id, closed ? 'form_reopened' : 'form_closed', () => ({ fields: { status: next } }))) {
      setError('')
      setMessage(closed ? 'Form reopened.' : 'Form closed to new responses.')
    }
  }

  return <>
    <FormHeader form={form} workspace={workspace}>
      {form.publishedSnapshot && <button onClick={() => setLinkVisible(!linkVisible)} aria-expanded={linkVisible}><ArrowUpRight size={17} /> Respondent link</button>}
      <button className="primary" onClick={publish} disabled={!!form.publishedSnapshot && !pending}><Radio size={17} />{form.publishedSnapshot ? 'Publish changes' : 'Publish'}</button>
    </FormHeader>
    {(form.publishedSnapshot || error || message || linkVisible) && <div className="build-status">
      {form.publishedSnapshot && <div className="publish-meta"><span>{closed ? 'Closed to new responses' : 'Published version ' + (form.publishedVersion || 1)}</span>
        {pending && <span className="status draft">Unpublished changes</span>}
        <button onClick={toggleResponses}>{closed ? 'Reopen form' : 'Close responses'}</button>
      </div>}
      {linkVisible && <div className="respondent-link">
        <label className="field">Local respondent link<input readOnly value={window.location.origin + link} onFocus={(event) => event.target.select()} /></label>
        {navigator.clipboard && <button onClick={async () => {
          try { await navigator.clipboard.writeText(window.location.origin + link); setMessage('Respondent link copied.') }
          catch { setMessage('Select the link to copy it.') }
        }}><Clipboard size={16} /> Copy link</button>}
        <a href={link} target="_blank" rel="noreferrer" className="button">Open form <ArrowUpRight size={16} /></a>
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}
    </div>}
    <div className="build-grid">
      <aside className="panel editor-index">
        <div className="index-heading"><h2>Questions</h2><span className="count">{questions.length}</span></div>
        <ol>{questions.map((entry, index) => <li key={entry.id}><button className={question?.id === entry.id ? 'active' : ''}
          aria-pressed={question?.id === entry.id} onClick={() => setSelection(entry.id)}><span>{String(index + 1).padStart(2, '0')}</span><span>{questionTitle(entry)}</span></button></li>)}</ol>
        <button className="index-add" onClick={addQuestion}><Plus size={16} /> Add question</button>
        <div className="index-heading endings-heading"><h2>Endings</h2><span className="count">{endings.length}</span></div>
        <ol>{endings.map((entry, index) => <li key={entry.id}><button className={ending?.id === entry.id ? 'active' : ''}
          aria-pressed={ending?.id === entry.id} onClick={() => setSelection(entry.id)}><span>{index + 1}</span><span>{endingTitle(entry)}{index === 0 && <small>Default</small>}</span></button></li>)}</ol>
        <button className="index-add" onClick={() => {
          const entry = defaultEnding()
          changeRecords('endings', [...endings, entry], [entry.id], { select: entry.id })
        }}><Plus size={16} /> Add ending</button>
      </aside>
      <section className="panel editor">
        {question && <>
          <header className="editor-heading"><div><div className="eyebrow">Question {questionIndex + 1}</div><h2>Edit question</h2></div>
            <div className="editor-actions">
              <button className="icon-button" aria-label="Move question up" disabled={questionIndex === 0} onClick={() => changeRecords('questions', reorder(questions, questionIndex, questionIndex - 1), [question.id])}><ArrowUp size={17} /></button>
              <button className="icon-button" aria-label="Move question down" disabled={questionIndex === questions.length - 1} onClick={() => changeRecords('questions', reorder(questions, questionIndex, questionIndex + 1), [question.id])}><ArrowDown size={17} /></button>
              <button className="icon-button" aria-label="Duplicate question" onClick={() => {
                const copy = copyQuestion(question)
                changeRecords('questions', [...questions.slice(0, questionIndex + 1), copy, ...questions.slice(questionIndex + 1)], [copy.id], { select: copy.id })
              }}><Copy size={17} /></button>
              <button className="icon-button text-danger" aria-label="Delete question" onClick={() => changeRecords('questions',
                questions.filter((entry) => entry.id !== question.id), [question.id], {
                  select: null, removedId: question.id, deleteLabel: 'Delete question?', description: '“' + questionTitle(question) + '” will be removed from the draft.',
                })}><Trash2 size={17} /></button>
            </div>
          </header>
          <QuestionFields key={question.id} question={question} onSave={saveQuestion} />
        </>}
        {ending && <>
          <header className="editor-heading"><div><div className="eyebrow">Ending {endingIndex + 1}</div><h2>Edit ending</h2></div>
            <div className="editor-actions">
              {endingIndex > 0 && <button onClick={() => changeRecords('endings', reorder(endings, endingIndex, 0), [ending.id])}>Make default</button>}
              <button className="icon-button text-danger" aria-label="Delete ending" onClick={() => changeRecords('endings',
                endings.filter((entry) => entry.id !== ending.id), [ending.id], {
                  select: null, removedId: ending.id, deleteLabel: 'Delete ending?', description: '“' + endingTitle(ending) + '” will be removed from the draft.',
                })}><Trash2 size={17} /></button>
            </div>
          </header>
          <EndingFields key={ending.id} ending={ending} onSave={(entry) => changeRecords('endings', endings.map((old) => old.id === entry.id ? entry : old), [entry.id])} />
        </>}
        {!question && !ending && <Empty title="Add your first question" action={<button className="primary" onClick={addQuestion}><FileQuestion size={17} /> Add question</button>}>
          Choose a question type to start building your form.
        </Empty>}
      </section>
    </div>
    {confirm && <Confirm {...confirm} onConfirm={confirm.apply} onClose={() => setConfirm(null)} danger={confirm.label.startsWith('Delete')} />}
  </>
}
