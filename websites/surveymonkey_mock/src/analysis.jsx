import { useMemo, useState } from 'react'
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { AnswerFields, focusAnswerError } from './answers.jsx'
import {
  actorFor, cleanAnswers, displayAnswer, displayDate, hasAnswer, idFor, nameFor, questionsFor,
  removeRecords, replaceRecord, respondentName, responsePath, surveyPath, updated, validateAnswers,
} from './model.js'
import { useWorkspace } from './state.jsx'
import { Badge, Confirm, Empty, Icon, Missing, Pager, Search, Select, SiteLink, Table, useSiteNavigate } from './ui.jsx'

const pageSize = 10
const emptyFilters = { collectorId: null, status: null, query: '' }
const statusName = response => response.status === 'completed' ? 'Completed' : response.status === 'partial' ? 'Partial' : 'Unknown'
const responseDate = response => response.submittedAt ?? response.createdAt

function Summary({ questions, responses }) {
  if (!questions.length) return <div className="surface"><Empty title="No questions yet">Add questions in Design survey to see summaries here.</Empty></div>
  if (!responses.length) return <div className="surface"><Empty title="No responses match">Answers will appear when someone responds or you change the filters.</Empty></div>
  return <section className="stack" aria-label="Question summaries">
    {questions.map((question, index) => {
      const answered = responses.filter(response => hasAnswer(response.answers?.[question.id]))
      const values = answered.map(response => response.answers[question.id])
      const counts = new Map()
      for (const value of values) {
        for (const answer of new Set(Array.isArray(value) ? value : [value])) {
          counts.set(answer, (counts.get(answer) ?? 0) + 1)
        }
      }
      const options = question.type === 'rating' ? [1, 2, 3, 4, 5].map(id => ({ id, label: String(id) })) : question.options ?? []
      const known = new Set(options.map(option => option.id))
      const unavailable = values.filter(value => (Array.isArray(value) ? value : [value]).some(answer => !known.has(answer))).length
      return <article className="surface summary-card" key={question.id}>
        <div className="between"><h3>{index + 1}. {question.prompt || 'Untitled question'}</h3><p className="meta">{answered.length} answered · {responses.length - answered.length} skipped</p></div>
        {question.type === 'openText'
          ? (values.length ? <ul className="text-results">{answered.map(response => <li key={response.id}>{String(response.answers[question.id])}</li>)}</ul> : <p className="muted">No text answers.</p>)
          : <div className="stack">
            {options.map(option => <ResultBar key={option.id} label={option.label || 'Untitled choice'} count={counts.get(option.id) ?? 0} total={answered.length}/>)}
            {unavailable > 0 && <ResultBar label="Unavailable choice" count={unavailable} total={answered.length}/>}
            {!options.length && !unavailable && <p className="muted">No choices available.</p>}
          </div>}
      </article>
    })}
  </section>
}

function ResultBar({ label, count, total }) {
  const share = total ? Math.round(count / total * 100) : 0
  return <div className="result">
    <div className="between"><span>{label}</span><span className="meta">{count} ({share}%)</span></div>
    <div className="bar-track" aria-hidden="true"><span style={{ width: share + '%' }}/></div>
  </div>
}

function ResponseTable({ survey, responses, collectors, page, setPage }) {
  const activePage = Math.min(page, Math.max(1, Math.ceil(responses.length / pageSize)))
  return <div className="stack">
    <Table label="Individual responses" headers={['Respondent', 'Collector', 'Status', 'Date', 'Details']}
      empty={!responses.length && <Empty title="No responses match">Try adjusting your filters or check back after collecting responses.</Empty>}>
      {responses.slice((activePage - 1) * pageSize, activePage * pageSize).map(response => <tr key={response.id}>
        <td><div className="respondent-cell"><strong>{respondentName(response)}</strong>
          {response.respondent?.name && response.respondent?.email && <span className="meta">{response.respondent.email}</span>}</div></td>
        <td>{nameFor(collectors.get(response.collectorId))}</td><td><Badge>{statusName(response)}</Badge></td>
        <td className="date-cell">{displayDate(responseDate(response))}</td>
        <td><SiteLink className="details-link" to={responsePath(survey.id, response.id)} aria-label={'View response from ' + respondentName(response)}>View response</SiteLink></td>
      </tr>)}
    </Table>
    <Pager page={activePage} count={responses.length} size={pageSize} onChange={setPage} noun="responses"/>
  </div>
}

function csvCell(value) {
  let text = String(value ?? '')
  if (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}

function downloadResponseCsv(survey, responses, collectorMap) {
  const questions = questionsFor(survey)
  const fields = ['Response ID', 'Collector', 'Status', 'Name', 'Email', 'Submitted at', 'Created at', ...questions.map(question => question.prompt || 'Untitled question')]
  const records = responses.map(response => [
    response.id, nameFor(collectorMap.get(response.collectorId)), response.status, response.respondent?.name, response.respondent?.email,
    response.submittedAt, response.createdAt, ...questions.map(question => {
      const value = response.answers?.[question.id]
      return hasAnswer(value) ? displayAnswer(question, value) : ''
    }),
  ])
  const csv = [fields, ...records].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'survey-responses.csv'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Analyze() {
  const survey = useOutletContext()
  const { state, change } = useWorkspace()
  const { responseId } = useParams()
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const view = params.get('view') === 'individual' ? 'individual' : 'summary'
  const collectors = useMemo(() => state.collectors.filter(collector => collector.surveyId === survey.id), [state.collectors, survey.id])
  const collectorMap = useMemo(() => new Map(collectors.map(collector => [collector.id, collector])), [collectors])
  const surveyResponses = useMemo(() => state.responses.filter(response => response.surveyId === survey.id), [state.responses, survey.id])
  const query = filters.query.trim().toLowerCase()
  const filtered = surveyResponses.filter(response => (
    (!filters.collectorId || response.collectorId === filters.collectorId) &&
    (!filters.status || response.status === filters.status) &&
    (!query || [response.respondent?.name, response.respondent?.email, respondentName(response)].some(field => field?.toLowerCase().includes(query)))
  )).sort((a, b) => (Date.parse(responseDate(b)) || 0) - (Date.parse(responseDate(a)) || 0) || a.id.localeCompare(b.id))

  const individualPath = surveyPath(survey.id, 'analyze') + '?view=individual'
  if (responseId) {
    const response = surveyResponses.find(record => record.id === responseId)
    return response
      ? <ResponseDetail key={responseId} survey={survey} response={response} collector={collectorMap.get(response.collectorId)} back={individualPath}/>
      : <Missing title="Response unavailable" to={individualPath} label="Back to responses"/>
  }

  function update(key, value) {
    setFilters(current => ({ ...current, [key]: value }))
    setPage(1)
    setNotice('')
  }

  function switchView(value) {
    setParams(current => {
      const next = new URLSearchParams(current)
      if (value === 'individual') next.set('view', 'individual')
      else next.delete('view')
      return next
    }, { replace: true })
  }

  function exportCsv() {
    downloadResponseCsv(survey, filtered, collectorMap)
    change(current => ({ ...current, exports: [...current.exports, {
      id: idFor('exp'), surveyId: survey.id, format: 'csv', filters: { ...filters, query: filters.query.trim() },
      responseIds: filtered.map(response => response.id), createdAt: new Date().toISOString(), createdBy: actorFor(current),
    }] }))
    setNotice('CSV downloaded.')
  }

  return <div className="stack analysis">
    <div className="between"><div><h2>Results</h2><p className="muted">{filtered.length} of {surveyResponses.length} responses</p></div>
      <button className="button secondary" onClick={exportCsv}><Icon name="download" size={17}/> Download CSV</button></div>
    <section className="surface stack">
      <div className="filters">
        <Search label="Search responses" value={filters.query} onChange={value => update('query', value)} placeholder="Search by name or email"/>
        <Select label="Collector" value={filters.collectorId ?? ''} onChange={value => update('collectorId', value || null)}>
          <option value="">All collectors</option>{collectors.map(collector => <option key={collector.id} value={collector.id}>{nameFor(collector)}</option>)}
        </Select>
        <Select label="Completion" value={filters.status ?? ''} onChange={value => update('status', value || null)}>
          <option value="">All responses</option><option value="completed">Completed</option><option value="partial">Partial</option>
        </Select>
        <button className="button text" disabled={!filters.query && !filters.collectorId && !filters.status} onClick={() => {
          setFilters(emptyFilters); setPage(1); setNotice('')
        }}>Clear filters</button>
      </div>
      <div className="tabs analysis-tabs" role="group" aria-label="Results views">
        <button aria-pressed={view === 'summary'} onClick={() => switchView('summary')}>Question summaries</button>
        <button aria-pressed={view === 'individual'} onClick={() => switchView('individual')}>Individual responses</button>
      </div>
    </section>
    {notice && <p role="status" className="success-text">{notice}</p>}
    {view === 'summary' ? <Summary questions={questionsFor(survey)} responses={filtered}/>
      : <ResponseTable survey={survey} responses={filtered} collectors={collectorMap} page={page} setPage={setPage}/>}
  </div>
}

function ResponseEditor({ response, survey, onClose }) {
  const { change } = useWorkspace()
  const questions = questionsFor(survey)
  const [originalAnswers] = useState(() => response.answers ?? {})
  const [answers, setAnswers] = useState(originalAnswers)
  const [errors, setErrors] = useState({})
  const completed = response.status === 'completed'

  function submit(event) {
    event.preventDefault()
    const nextErrors = validateAnswers(questions, answers, completed)
    // Preserve historical values with missing option references if the answer was left alone.
    for (const [id, message] of Object.entries(nextErrors)) {
      if (message !== 'Please answer this question.' && JSON.stringify(answers[id]) === JSON.stringify(originalAnswers[id])) delete nextErrors[id]
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      focusAnswerError(event.currentTarget, nextErrors)
      return
    }
    change(current => {
      const live = current.responses.find(record => record.id === response.id && record.surveyId === survey.id)
      if (!live) return current
      const normalized = cleanAnswers(questions, answers)
      const nextAnswers = { ...live.answers }
      for (const { id } of questions) {
        if (JSON.stringify(answers[id]) === JSON.stringify(originalAnswers[id])) continue
        if (hasAnswer(answers[id])) nextAnswers[id] = normalized[id]
        else delete nextAnswers[id]
      }
      if (JSON.stringify(live.answers ?? {}) === JSON.stringify(nextAnswers)) return current
      return replaceRecord(current, 'responses', response.id, record => ({ ...record, answers: nextAnswers, ...updated(current) }))
    })
    onClose()
  }

  return <form className="surface stack" onSubmit={submit} noValidate>
    <h3>Edit answers</h3>
    <AnswerFields questions={questions} answers={answers} errors={errors} allowClear={question => !completed || !question.required} onChange={(id, value) => {
      setAnswers(current => ({ ...current, [id]: value }))
      setErrors(current => ({ ...current, [id]: undefined }))
    }}/>
    <div className="inline"><button className="button primary">Save response</button><button type="button" className="button secondary" onClick={onClose}>Cancel</button></div>
  </form>
}

function ResponseDetail({ response, survey, collector, back }) {
  const { change } = useWorkspace()
  const navigate = useSiteNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function erase() {
    const removed = change(current => current.responses.some(record => record.id === response.id && record.surveyId === survey.id)
      ? removeRecords(current, 'deleteResponse', response.id, survey.id, [], [], [response.id]) : current)
    if (removed) navigate(back, { replace: true })
    else setDeleting(false)
  }

  return <section className="response-detail stack">
    <div><SiteLink className="back-link" to={back}><Icon name="left" size={15}/> All responses</SiteLink>
      <div className="between"><h2>Response details</h2><Badge>{statusName(response)}</Badge></div>
    </div>
    <div className="surface stack">
      <dl className="detail-grid">
        <div><dt>Respondent</dt><dd>{respondentName(response)}</dd>
          {response.respondent?.email && response.respondent?.name && <dd className="meta">{response.respondent.email}</dd>}</div>
        <div><dt>Collector</dt><dd>{nameFor(collector)}</dd></div>
        <div><dt>Created</dt><dd>{displayDate(response.createdAt)}</dd></div>
        <div><dt>Submitted</dt><dd>{displayDate(response.submittedAt)}</dd></div>
      </dl>
      <div className="inline">
        <button className="button secondary" disabled={editing || !questionsFor(survey).length} onClick={() => setEditing(true)}>Edit response</button>
        <button className="button secondary destructive-text" onClick={() => setDeleting(true)}>Delete response</button>
      </div>
    </div>
    {editing ? <ResponseEditor response={response} survey={survey} onClose={() => setEditing(false)}/> : <div className="surface stack">
      <h3>Answers</h3>
      {!questionsFor(survey).length && <p className="muted">No questions available.</p>}
      <dl className="detail-answers">
        {questionsFor(survey).map((question, index) => <div key={question.id}>
          <dt>{index + 1}. {question.prompt || 'Untitled question'}</dt><dd>{displayAnswer(question, response.answers?.[question.id])}</dd>
        </div>)}
      </dl>
    </div>}
    {deleting && <Confirm title="Delete response" label="Delete response" message="Permanently delete this response?" onClose={() => setDeleting(false)} onConfirm={erase}/>}
  </section>
}
