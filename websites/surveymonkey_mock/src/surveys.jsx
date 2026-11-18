import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useWorkspace } from './state.jsx'
import {
  actorFor, created, displayDate, groupCount, hasAnswer, idFor, questionTypes, questionsFor,
  removeRecords, replaceRecord, surveyPath, surveyStatus, titleFor, updated,
} from './model.js'
import {
  Badge, Confirm, Empty, Icon, Modal, Pager, Search, Select, SiteLink, Table, TextField, useSiteNavigate,
} from './ui.jsx'

const pageSize = 10
const metrics = [
  ['All surveys', 'plum'],
  ['Collecting surveys', 'green'],
  ['Responses', 'sand'],
]

function useLibraryRows(state) {
  return useMemo(() => {
    const collectorGroups = new Map()
    for (const collector of state.collectors) {
      if (!collectorGroups.has(collector.surveyId)) collectorGroups.set(collector.surveyId, [])
      collectorGroups.get(collector.surveyId).push(collector)
    }
    const responseCounts = groupCount(state.responses, 'surveyId')
    const owners = new Map(state.users.map(user => [user.id, user.name]))
    return state.surveys.map(survey => ({
      survey, name: titleFor(survey), owner: owners.get(survey.ownerId) || 'Unknown owner',
      status: surveyStatus(collectorGroups.get(survey.id)), count: responseCounts.get(survey.id) ?? 0,
    }))
  }, [state.surveys, state.users, state.collectors, state.responses])
}

const sorts = {
  modified: (a, b) => (Date.parse(b.survey.updatedAt) || 0) - (Date.parse(a.survey.updatedAt) || 0),
  title: (a, b) => a.name.localeCompare(b.name),
  responses: (a, b) => b.count - a.count,
}

function SurveyActions({ survey, onCopy, onDelete }) {
  const popoverId = 'actions-' + survey.id
  const name = titleFor(survey)
  function choose(event, action) {
    const menu = event.currentTarget.closest('[popover]')
    menu.hidePopover()
    document.getElementById('trigger-' + popoverId)?.focus()
    action(survey)
  }

  return <>
    <button id={'trigger-' + popoverId} popovertarget={popoverId} className="icon-button row-action" aria-label={'Actions for ' + name}
      onClick={event => {
        const box = event.currentTarget.getBoundingClientRect()
        const menu = document.getElementById(popoverId)
        menu.style.setProperty('--right', Math.max(8, window.innerWidth - box.right) + 'px')
        menu.style.setProperty('--top', (box.bottom + 116 <= window.innerHeight ? box.bottom + 4 : box.top - 108) + 'px')
      }}><Icon name="ellipsis" size={18}/></button>
    <div popover="auto" id={popoverId} className="row-menu" aria-label={'Actions for ' + name}>
      <button onClick={event => choose(event, onCopy)}>Make a copy</button>
      <button className="destructive-text" onClick={event => choose(event, onDelete)}>Delete survey</button>
    </div>
  </>
}

export function Library() {
  const { state, change } = useWorkspace()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [owner, setOwner] = useState('')
  const [sort, setSort] = useState('modified')
  const [page, setPage] = useState(1)
  const [action, setAction] = useState(null)
  const rows = useLibraryRows(state)

  const filtered = rows.filter(row => (
    row.name.toLowerCase().includes(query.trim().toLowerCase()) &&
    (!status || status === row.status) && (!owner || owner === row.survey.ownerId)
  )).sort((a, b) => sorts[sort](a, b) || a.name.localeCompare(b.name))
  const activePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
  const counts = [rows.length, rows.filter(row => row.status === 'Collecting').length, state.responses.length]
  const resetPage = setter => value => { setter(value); setPage(1) }
  const dismiss = () => setAction(null)

  function deleteSurvey() {
    const id = action.survey.id
    change(current => {
      if (!current.surveys.some(survey => survey.id === id)) return current
      const collectorIds = current.collectors.filter(collector => collector.surveyId === id).map(collector => collector.id)
      const linked = new Set(collectorIds)
      const responseIds = current.responses.filter(response => response.surveyId === id || linked.has(response.collectorId)).map(response => response.id)
      return removeRecords(current, 'deleteSurvey', id, id, [id], collectorIds, responseIds)
    })
    dismiss()
  }

  const targetId = action?.survey.id
  const affectedCollectors = targetId ? state.collectors.filter(record => record.surveyId === targetId) : []
  const affectedIds = new Set(affectedCollectors.map(collector => collector.id))
  const affectedResponses = targetId ? state.responses.filter(record => record.surveyId === targetId || affectedIds.has(record.collectorId)).length : 0
  return <>
    <header className="page-intro">
      <h1>Surveys</h1><p className="muted">Design questionnaires, manage collectors, and review responses.</p>
    </header>
    <section className="metrics" aria-label="Workspace counts">
      {metrics.map(([label, tone], index) => <article className="metric" key={label}>
        <div><p>{label}</p><strong>{counts[index].toLocaleString('en-US')}</strong></div>
        <span className={'metric-art ' + tone} aria-hidden="true"><i/></span>
      </article>)}
    </section>
    <section className="library surface" aria-labelledby="library-title">
      <div className="library-heading"><h2 id="library-title">Survey library</h2></div>
      <div className="filters">
        <Search label="Search surveys" placeholder="Search by survey title" value={query} onChange={resetPage(setQuery)}/>
        <Select label="Status" value={status} onChange={resetPage(setStatus)}>
          <option value="">All statuses</option>{['Draft', 'Collecting', 'Closed'].map(value => <option key={value}>{value}</option>)}
        </Select>
        <Select label="Owner" value={owner} onChange={resetPage(setOwner)}>
          <option value="">All owners</option>{state.users.map(user => <option key={user.id} value={user.id}>{user.name || 'Unknown owner'}</option>)}
        </Select>
        <Select label="Sort by" value={sort} onChange={resetPage(setSort)}>
          <option value="modified">Last modified</option><option value="title">Survey title</option><option value="responses">Response count</option>
        </Select>
        <button className="button text" disabled={!query && !status && !owner && sort === 'modified'} onClick={() => {
          setQuery(''); setStatus(''); setOwner(''); setSort('modified'); setPage(1)
        }}>Clear filters</button>
      </div>
      <Table label="Surveys" headers={['Survey title', 'Owner', 'Status', 'Responses', 'Last modified', 'Actions']}
        empty={!filtered.length && <Empty title={rows.length ? 'No matching surveys' : 'No surveys yet'}>
          {rows.length ? 'Try another search or clear the filters.' : 'Create a survey to start designing a questionnaire.'}
        </Empty>}>
        {filtered.slice((activePage - 1) * pageSize, activePage * pageSize).map(({ survey, name, owner, status, count }) => <tr key={survey.id}>
          <td><div className="survey-cell"><span className="file-mark" aria-hidden="true"/><SiteLink to={surveyPath(survey.id)}>{name}</SiteLink></div></td>
          <td>{owner}</td><td><Badge>{status}</Badge></td><td>{count}</td><td className="date-cell">{displayDate(survey.updatedAt)}</td>
          <td><SurveyActions survey={survey} onCopy={record => setAction({ type: 'copy', survey: record })} onDelete={record => setAction({ type: 'delete', survey: record })}/></td>
        </tr>)}
      </Table>
      <Pager page={activePage} count={filtered.length} size={pageSize} onChange={setPage} noun="surveys"/>
    </section>
    {action?.type === 'copy' && <SurveyDialog source={action.survey} onClose={dismiss}/>}
    {action?.type === 'delete' && <Confirm title="Delete survey" label="Delete survey" onClose={dismiss} onConfirm={deleteSurvey}
      message={`Delete “${titleFor(action.survey)}” and its ${affectedCollectors.length} collector(s) and ${affectedResponses} response(s)? This action is permanent.`}/>}
  </>
}

function distinctCopyTitle(surveys, source) {
  const existing = new Set(surveys.map(survey => titleFor(survey).toLowerCase()))
  const base = titleFor(source) + ' (copy'
  let number = 1
  let candidate = base + ')'
  while (existing.has(candidate.toLowerCase())) {
    number += 1
    candidate = base + ' ' + number + ')'
  }
  return candidate
}

export function SurveyDialog({ source, survey, onClose }) {
  const { state, change } = useWorkspace()
  const navigate = useSiteNavigate()
  const [title, setTitle] = useState(source ? distinctCopyTitle(state.surveys, source) : survey?.title ?? '')
  const [description, setDescription] = useState((source ?? survey)?.description ?? '')
  const [error, setError] = useState('')
  const label = source ? 'Make a copy' : survey ? 'Edit survey details' : 'Create survey'

  function submit(event) {
    event.preventDefault()
    const name = title.trim()
    if (!name || (source && state.surveys.some(record => titleFor(record).toLowerCase() === name.toLowerCase()))) {
      setError(!name ? 'Enter a survey title.' : 'Choose a title that is distinct from existing surveys.')
      event.currentTarget.querySelector('#survey-title')?.focus()
      return
    }

    const fields = { title: name, description: description.trim() }
    if (survey) {
      change(current => {
        const live = current.surveys.find(record => record.id === survey.id)
        if (!live || (live.title === fields.title && (live.description ?? '') === fields.description)) return current
        return replaceRecord(current, 'surveys', survey.id, record => ({ ...record, ...fields, ...updated(current) }))
      })
      onClose()
      return
    }

    const id = idFor('sv')
    const saved = change(current => {
      const original = source && current.surveys.find(record => record.id === source.id)
      if (source && (!original || current.surveys.some(record => titleFor(record).toLowerCase() === name.toLowerCase()))) return current
      const questions = original ? questionsFor(original).map(question => ({
        ...question, id: idFor('q'),
        ...(question.options && { options: question.options.map(option => ({ ...option, id: idFor('opt') })) }),
      })) : []
      return {
        ...current, surveys: [...current.surveys, {
          id, ...fields, ownerId: actorFor(current), questions, ...created(current),
          ...(original && { copiedFromId: original.id }),
        }],
      }
    })
    if (saved) { onClose(); navigate(surveyPath(id)) }
  }

  return <Modal title={label} onClose={onClose}>
    <form className="stack" onSubmit={submit} noValidate>
      <TextField id="survey-title" label="Survey title" value={title} required onChange={value => { setTitle(value); setError('') }} error={error}/>
      <TextField id="survey-description" label="Description (optional)" value={description} onChange={setDescription} multiline rows={3}/>
      <div className="dialog-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="button primary">{survey ? 'Save details' : source ? 'Create copy' : 'Create survey'}</button></div>
    </form>
  </Modal>
}

const choiceTypes = new Set(['multipleChoice', 'checkboxes'])
const emptyOption = () => ({ id: idFor('opt'), label: '' })

function QuestionDialog({ question, type: initialType, onSave, onClose }) {
  const [type, setType] = useState(initialType)
  const [prompt, setPrompt] = useState(question?.prompt ?? '')
  const [required, setRequired] = useState(Boolean(question?.required))
  const [options, setOptions] = useState(() => (question?.options?.length ? question.options.map(option => ({ ...option })) : [emptyOption(), emptyOption()]))
  const [errors, setErrors] = useState({})
  const showChoices = choiceTypes.has(type)

  function submit(event) {
    event.preventDefault()
    const labels = options.map(option => option.label.trim())
    const validChoices = labels.length >= 2 && labels.every(Boolean) && new Set(labels.map(label => label.toLowerCase())).size === labels.length
    const nextErrors = {
      prompt: prompt.trim() ? '' : 'Enter a question prompt.',
      options: showChoices && !validChoices ? 'Enter at least two choices. Each choice must be nonempty and distinct.' : '',
    }
    if (nextErrors.prompt || nextErrors.options) {
      setErrors(nextErrors)
      event.currentTarget.querySelector(nextErrors.prompt ? '#question-prompt' : '#choice-0')?.focus()
      return
    }
    onSave({
      id: question?.id ?? idFor('q'), prompt: prompt.trim(), type, required,
      ...(showChoices && { options: options.map((option, index) => ({ ...option, label: labels[index] })) }),
    })
  }

  return <Modal title={question ? 'Edit question' : 'Add question'} onClose={onClose}>
    <form className="stack" onSubmit={submit} noValidate>
      <TextField id="question-prompt" label="Question prompt" required value={prompt} onChange={setPrompt} error={errors.prompt}/>
      <Select label="Question type" value={type} onChange={setType}>
        {Object.entries(questionTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      <label className="check-label"><input type="checkbox" checked={required} onChange={event => setRequired(event.target.checked)}/>Required question</label>
      {showChoices && <fieldset className="option-editor">
        <legend>Answer choices</legend>
        {options.map((option, index) => <div className="choice-edit" key={option.id}>
          <TextField id={'choice-' + index} label={'Choice ' + (index + 1)} value={option.label} onChange={label => setOptions(current => current.map(item => item.id === option.id ? { ...item, label } : item))}
            aria-describedby={errors.options ? 'option-error' : undefined} aria-invalid={errors.options ? true : undefined}/>
          <button className="icon-button" type="button" aria-label={'Remove choice ' + (index + 1)} disabled={options.length <= 2} onClick={() => setOptions(current => current.filter(item => item.id !== option.id))}><Icon name="close" size={16}/></button>
        </div>)}
        {errors.options && <p className="error" id="option-error">{errors.options}</p>}
        <button type="button" className="button secondary" onClick={() => setOptions(current => [...current, emptyOption()])}><Icon name="plus" size={16}/> Add choice</button>
      </fieldset>}
      <div className="dialog-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary">Save question</button></div>
    </form>
  </Modal>
}

function answeredQuestionIds(state, surveyId) {
  return new Set(state.responses.filter(response => response.surveyId === surveyId)
    .flatMap(response => Object.entries(response.answers ?? {}).filter(([, value]) => hasAnswer(value)).map(([id]) => id)))
}

export function Design() {
  const survey = useOutletContext()
  const { state, change } = useWorkspace()
  const [editor, setEditor] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [notice, setNotice] = useState('')
  const questions = questionsFor(survey)
  const locked = answeredQuestionIds(state, survey.id)

  function updateQuestions(transform, lockedId) {
    return change(current => {
      if (lockedId && answeredQuestionIds(current, survey.id).has(lockedId)) return current
      const record = current.surveys.find(item => item.id === survey.id)
      if (!record) return current
      const original = questionsFor(record)
      const next = transform(original)
      if (next === original || JSON.stringify(next) === JSON.stringify(original)) return current
      return replaceRecord(current, 'surveys', survey.id, item => ({ ...item, questions: next, ...updated(current) }))
    })
  }

  function move(id, amount) {
    if (updateQuestions(items => {
      const index = items.findIndex(item => item.id === id)
      const destination = index + amount
      if (index < 0 || destination < 0 || destination >= items.length) return items
      const reordered = [...items]
      reordered.splice(destination, 0, ...reordered.splice(index, 1))
      return reordered
    })) setNotice('Question order saved.')
  }

  return <>
    <section className="surface design-details between">
      <div><h2>Survey details</h2><p className="muted">{survey.description || 'No description'}</p></div>
      <div className="inline"><button className="button secondary" onClick={() => setEditingDetails(true)}>Edit details</button>
        <SiteLink className="button primary" to={surveyPath(survey.id, 'preview')}>Preview survey</SiteLink></div>
    </section>
    <div className="editor-grid">
      <section className="stack question-list" aria-labelledby="question-heading">
        <div className="between"><h2 id="question-heading">Questions</h2><span className="meta">{questions.length} {questions.length === 1 ? 'question' : 'questions'}</span></div>
        {!questions.length && <div className="surface"><Empty title="Add your first question">Choose a question type to start building this survey.</Empty></div>}
        {questions.map((question, index) => {
          const isLocked = locked.has(question.id)
          return <article className="surface question-card" key={question.id}>
            <div className="question-index" aria-label={'Question ' + (index + 1)}>{String(index + 1).padStart(2, '0')}</div>
            <div className="question-content">
              <p className="meta">{questionTypes[question.type] || 'Question'}{question.required ? ' · Required' : ''}</p>
              <h3>{question.prompt || 'Untitled question'}</h3>
              {question.options?.length > 0 && <ul className="option-list">{question.options.map(option => <li key={option.id}>{option.label || 'Untitled choice'}</li>)}</ul>}
              {question.type === 'rating' && <p className="meta">Scale from 1 to 5</p>}
              {isLocked && <p className="meta">Answer history prevents editing or removal.</p>}
              <div className="inline question-actions">
                <button className="button text" disabled={isLocked} onClick={() => setEditor({ type: question.type, question })}>Edit question</button>
                <button className="button text destructive-text" disabled={isLocked} onClick={() => setRemoving(question)}>Remove question</button>
              </div>
            </div>
            <div className="inline reorder">
              <button className="icon-button" disabled={index === 0} aria-label={'Move question ' + (index + 1) + ' up'} onClick={() => move(question.id, -1)}><Icon name="up" size={16}/></button>
              <button className="icon-button" disabled={index === questions.length - 1} aria-label={'Move question ' + (index + 1) + ' down'} onClick={() => move(question.id, 1)}><Icon name="down" size={16}/></button>
            </div>
          </article>
        })}
      </section>
      <aside className="surface type-panel">
        <h2>Add question</h2>
        {Object.entries(questionTypes).map(([type, label]) => <button key={type} type="button" className="button secondary" onClick={() => setEditor({ type })}><Icon name="plus" size={16}/>{label}</button>)}
      </aside>
    </div>
    {notice && <p className="save-notice" role="status">{notice}</p>}
    {editingDetails && <SurveyDialog survey={survey} onClose={() => setEditingDetails(false)}/>}
    {editor && <QuestionDialog {...editor} onClose={() => setEditor(null)} onSave={record => {
      const saved = updateQuestions(items => editor.question ? items.map(item => item.id === record.id ? record : item) : [...items, record], editor.question?.id)
      if (saved) setNotice('Question saved.')
      setEditor(null)
    }}/>}
    {removing && <Confirm title="Remove question" label="Remove question" message={`Remove “${removing.prompt || 'Untitled question'}” from this survey?`} onClose={() => setRemoving(null)} onConfirm={() => {
      if (updateQuestions(items => items.filter(item => item.id !== removing.id), removing.id)) setNotice('Question removed.')
      setRemoving(null)
    }}/>}
  </>
}
