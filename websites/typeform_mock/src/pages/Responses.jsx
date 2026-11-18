import { useMemo, useState } from 'react'
import { ArrowUpRight, BarChart3, Download, Search, Trash2 } from 'lucide-react'
import { useAccount } from '../state.jsx'
import { answerText, dateText, items, newId, questionTitle } from '../model.js'
import { Confirm, Dialog, Empty, FormHeader } from '../ui.jsx'

function responseColumns(form, responses) {
  const columns = new Map()
  const yesNo = [{ id: true, label: 'Yes' }, { id: false, label: 'No' }]
  for (const question of [...items(form.publishedSnapshot?.questions), ...items(form.questions)]) {
    if (!columns.has(question.id)) columns.set(question.id, { id: question.id, label: questionTitle(question), choices: question.type === 'yes_no' ? yesNo : items(question.choices) })
  }
  for (const response of responses) {
    for (const answer of items(response.answers)) {
      if (!columns.has(answer.questionId)) columns.set(answer.questionId, { id: answer.questionId, label: answer.questionTitle || 'Historical question', choices: answer.type === 'yes_no' ? yesNo : [] })
      const column = columns.get(answer.questionId)
      if (answer.type === 'multiple_choice' && !column.choices.some((choice) => choice.id === answer.value)) {
        column.choices = [...column.choices, { id: answer.value, label: answerText(answer) }]
      }
    }
  }
  return [...columns.values()]
}

function csvField(value) {
  let cell = String(value ?? '')
  if (typeof value === 'string' && (/^\s*[=+\-@]/.test(cell) || /^[\t\r\n]/.test(cell))) cell = "'" + cell
  return /[",\r\n]/.test(cell) ? '"' + cell.replaceAll('"', '""') + '"' : cell
}

function downloadCsv(form, responses, columns) {
  const rows = [['Response ID', 'Submitted at', 'Form version', 'Ending ID', ...columns.map(({ id, label }) => label + ' [' + id + ']')]]
  for (const response of responses) {
    const answers = new Map(items(response.answers).map((answer) => [answer.questionId, answer]))
    rows.push([response.id, response.createdAt, response.formVersion, response.endingId, ...columns.map(({ id }) => {
      const answer = answers.get(id)
      return typeof answer?.value === 'number' ? answer.value : answerText(answer)
    })])
  }
  const csv = rows.map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n'
  const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = ((form.title || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'form') + '-responses.csv'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}

function Details({ response, form, onClose, onDelete }) {
  const ending = [...items(form.publishedSnapshot?.endings), ...items(form.endings)].find((entry) => entry.id === response.endingId)
  return <Dialog title="Response details" onClose={onClose} wide>
    <dl className="response-meta"><div><dt>Submitted</dt><dd>{dateText(response.createdAt, true)}</dd></div>
      <div><dt>Version</dt><dd>{response.formVersion || '—'}</dd></div>
      {response.endingId && <div><dt>Ending</dt><dd>{ending?.title || response.endingId}</dd></div>}
      <div><dt>Response ID</dt><dd>{response.id}</dd></div>
    </dl>
    <div className="detail-answers"><h3>Answers</h3>
      {items(response.answers).length ? <dl>{items(response.answers).map((answer, index) => <div key={answer.questionId || index}>
        <dt>{answer.questionTitle || 'Untitled question'}</dt><dd>{answerText(answer) || '—'}</dd>
      </div>)}</dl> : <p className="muted">No answers were recorded.</p>}
    </div>
    <div className="dialog-actions"><button className="text-danger" onClick={onDelete}><Trash2 size={17} /> Delete response</button></div>
  </Dialog>
}

function Summary({ columns, responses, onFilter }) {
  return <section className="panel response-summary" aria-label="Response summary">
    <h2>Answer distribution</h2>
    {columns.length === 0 ? <p className="muted">Choice distributions appear when your form has choice questions.</p> : columns.map((column) => {
      const answers = responses.flatMap((response) => items(response.answers).filter((answer) => answer.questionId === column.id))
      return <div className="distribution" key={column.id}><h3>{column.label}</h3>
        {column.choices.map((choice) => {
          const count = answers.filter((answer) => answer.value === choice.id).length
          return <div className="bar-row" key={choice.id}>
            <button className="text-button" onClick={() => onFilter(column.id, choice.id)}>{choice.label || 'Untitled choice'}</button>
            <progress value={count} max={answers.length || 1} aria-label={choice.label || 'Untitled choice'} />
            <span>{count} / {answers.length}</span>
          </div>
        })}
      </div>
    })}
  </section>
}

export default function Responses({ form, workspace }) {
  const { state, admin, commit } = useAccount()
  const [search, setSearch] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [choice, setChoice] = useState('')
  const [selected, setSelected] = useState([])
  const [detailId, setDetailId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [summary, setSummary] = useState(false)
  const [notice, setNotice] = useState('')
  const responses = useMemo(() => items(state.responses).filter((response) => response.formId === form.id)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || String(b.id).localeCompare(String(a.id))), [state.responses, form.id])
  const columns = useMemo(() => responseColumns(form, responses), [form, responses])
  const choiceColumns = columns.filter((column) => column.choices.length)
  const detail = responses.find((response) => response.id === detailId)
  const needle = search.trim().toLowerCase()
  const [questionId, choiceId] = choice ? JSON.parse(choice) : []
  const shown = responses.filter((response) => {
    const date = response.createdAt?.slice(0, 10) || ''
    const answers = items(response.answers)
    return (!needle || answers.some((answer) => answerText(answer).toLowerCase().includes(needle))) &&
      (!start || date >= start) && (!end || (!!date && date <= end)) &&
      (!choice || answers.some((answer) => answer.questionId === questionId && answer.value === choiceId))
  })
  const selectedIds = new Set(selected)
  const selectedShown = shown.filter((response) => selectedIds.has(response.id))
  const allSelected = shown.length > 0 && selectedShown.length === shown.length

  function clearFilters() {
    setSearch(''); setStart(''); setEnd(''); setChoice(''); setSelected([])
  }

  function exportRows() {
    const rows = selectedShown.length ? selectedShown : shown
    if (!rows.length || (selected.length && !selectedShown.length)) return
    downloadCsv(form, rows, columns)
    if (commit((before) => ({ ...before, responseExports: [...items(before.responseExports), {
      id: newId('export'), formId: form.id, responseIds: rows.map((entry) => entry.id), format: 'csv',
      actorId: before.account?.id || 'user_morgan', createdAt: new Date().toISOString(),
    }] }))) setNotice(rows.length + (rows.length === 1 ? ' response exported.' : ' responses exported.'))
  }

  function deleteRows() {
    const ids = new Set(deleting)
    if (admin('responses_deleted', form.id, (before) => {
      const existing = items(before.responses)
      const removed = existing.filter((entry) => entry.formId === form.id && ids.has(entry.id))
      if (!removed.length) return null
      return { fields: { responses: existing.filter((entry) => entry.formId !== form.id || !ids.has(entry.id)) }, entityIds: removed.map((entry) => entry.id) }
    })) {
      setSelected((previous) => previous.filter((id) => !ids.has(id)))
      setNotice(ids.size + (ids.size === 1 ? ' response deleted.' : ' responses deleted.'))
      if (ids.has(detailId)) setDetailId(null)
    }
    setDeleting(null)
  }

  return <>
    <FormHeader form={form} workspace={workspace} />
    <div className="section-heading"><div><h2>Results <span className="count">{responses.length}</span></h2>
      <p className="muted">Review and export submissions for this form.</p></div>
      <div className="heading-actions">
        <button aria-pressed={summary} onClick={() => setSummary(!summary)}><BarChart3 size={17} />{summary ? 'Hide summary' : 'Summary'}</button>
        <button className="primary" onClick={exportRows} disabled={!shown.length || (selected.length > 0 && !selectedShown.length)}><Download size={17} />{selectedShown.length ? 'Export selected' : 'Export CSV'}</button>
      </div>
    </div>
    {summary && <Summary columns={choiceColumns} responses={responses} onFilter={(id, value) => {
      clearFilters(); setChoice(JSON.stringify([id, value])); setSummary(false)
    }} />}
    {notice && <p className="notice" role="status">{notice}</p>}
    <section className="panel" aria-label="Responses">
      <div className="toolbar response-filters">
        <label className="search"><Search size={17} /><input aria-label="Search answers" placeholder="Search answers" value={search} onChange={(event) => { setSearch(event.target.value) }} /></label>
        <label className="field date-field">From<input type="date" value={start} onChange={(event) => { setStart(event.target.value) }} /></label>
        <label className="field date-field">Through<input type="date" value={end} onChange={(event) => { setEnd(event.target.value) }} /></label>
        <label className="field choice-filter">Choice<select value={choice} onChange={(event) => { setChoice(event.target.value) }}>
          <option value="">All choices</option>
          {choiceColumns.map((column) => <optgroup key={column.id} label={column.label}>{column.choices.map((entry) =>
            <option key={entry.id} value={JSON.stringify([column.id, entry.id])}>{entry.label || 'Untitled choice'}</option>)}</optgroup>)}
        </select></label>
      </div>
      {start && end && start > end && <p className="error filter-error" role="alert">Choose an end date on or after the start date.</p>}
      {selected.length > 0 && <div className="selection-bar"><span>{selectedShown.length} selected{selectedShown.length < selected.length && ' in current results'}</span>
        {selectedShown.length > 0 && <button className="text-danger" onClick={() => setDeleting(selectedShown.map((response) => response.id))}><Trash2 size={16} /> Delete selected</button>}
        <button className="text-button" onClick={() => setSelected([])}>Clear selection</button>
      </div>}
      {shown.length > 0 ? <div className="table-scroll"><table className="response-table">
        <thead><tr><th><input type="checkbox" aria-label="Select all shown responses" checked={allSelected} onChange={() => setSelected(allSelected ? [] : shown.map((response) => response.id))} /></th>
          <th scope="col">Submitted</th><th scope="col">Answers</th><th scope="col">Version</th><th><span className="sr-only">Open</span></th></tr></thead>
        <tbody>{shown.map((response) => {
          const summaryText = items(response.answers).map(answerText).filter(Boolean).slice(0, 2).join(' · ')
          return <tr key={response.id}>
            <td><input type="checkbox" aria-label={'Select response ' + response.id} checked={selectedIds.has(response.id)} onChange={() =>
              setSelected((previous) => selectedIds.has(response.id) ? previous.filter((id) => id !== response.id) : [...previous, response.id])} /></td>
            <td>{dateText(response.createdAt, true)}</td>
            <td className="answer-summary"><span title={summaryText}>{summaryText || 'No answers'}</span></td>
            <td className="muted">{response.formVersion || '—'}</td>
            <td><button className="text-button" aria-label={'View response ' + response.id} onClick={() => setDetailId(response.id)}>View <ArrowUpRight size={14} /></button></td>
          </tr>
        })}</tbody>
      </table></div> : <Empty title={responses.length ? 'No matching responses' : 'No responses yet'}
        action={responses.length ? <button onClick={clearFilters}>Clear filters</button> : undefined}>
        {responses.length ? 'Try a different search, date range, or choice.' : 'Submissions will appear when people complete the published form.'}
      </Empty>}
      {shown.length > 0 && <footer className="table-footer">Showing {shown.length} of {responses.length} responses</footer>}
    </section>
    {detail && !deleting && <Details response={detail} form={form} onClose={() => setDetailId(null)} onDelete={() => setDeleting([detail.id])} />}
    {deleting && <Confirm title={deleting.length === 1 ? 'Delete response?' : 'Delete selected responses?'}
      description={deleting.length + (deleting.length === 1 ? ' response will be removed from this form.' : ' responses will be removed from this form.')}
      label={deleting.length === 1 ? 'Delete response' : 'Delete responses'} onClose={() => setDeleting(null)} onConfirm={deleteRows} />}
  </>
}
