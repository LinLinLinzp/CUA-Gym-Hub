import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './account.jsx'
import { actorId, associatedCases, dateLabel, isTracked, latest, matchingCases, newId, normalizeReceipt, records, recordPath, STATUS, statusLabel, validReceipt } from './model.js'
import { AccountLink, Badge, CaseRows, Empty, Field, Heading, Missing, Panel } from './ui.jsx'

function TrackCase({ item }) {
  const { state, commit } = useAccount()
  if (!item.id || isTracked(state, item.id)) return null

  function track() {
    commit(current => {
      if (isTracked(current, item.id) || !records(current.cases).some(entry => entry.id === item.id)) return current
      return {
        ...current,
        trackedCases: [...records(current.trackedCases), {
          id: newId('tracked'), caseId: item.id, actorId: actorId(current), createdAt: new Date().toISOString(),
        }],
      }
    })
  }

  return <button className="button secondary" type="button" onClick={track}>Track this case</button>
}

export function Cases() {
  const { state, commit } = useAccount()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [receipt, setReceipt] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const receiptField = useRef(null)
  const tracked = associatedCases(state)
  const statusOptions = [...new Set([...Object.keys(STATUS), ...tracked.map(item => item.status).filter(Boolean)])]
  const visible = latest(tracked, 'statusUpdatedAt').filter(item => {
    const keyword = query.trim().toLowerCase()
    const text = [item.receiptNumber, item.formCode, item.formTitle].join(' ').toLowerCase()
    return (!filter || filter === item.status) && text.includes(keyword)
  })
  const found = result?.caseId && records(state.cases).find(item => item.id === result.caseId)

  function check(event) {
    event.preventDefault()
    const receiptNumber = normalizeReceipt(receipt)
    if (!validReceipt(receiptNumber)) {
      setResult(null)
      setError('Enter a receipt number with three letters followed by ten digits.')
      receiptField.current?.focus()
      return
    }
    setError('')
    let outcome
    commit(current => {
      const matches = matchingCases(current, receiptNumber)
      const item = matches.length === 1 && matches[0].id ? matches[0] : null
      outcome = {
        id: newId('check'), receiptNumber, caseId: item?.id ?? null,
        outcome: item ? 'found' : 'not_found', caseStatus: item?.status ?? null,
        actorId: actorId(current), createdAt: new Date().toISOString(),
      }
      return { ...current, caseStatusChecks: [...records(current.caseStatusChecks), outcome] }
    })
    setResult(outcome)
  }

  return <>
    <Heading title="Case status">Check a receipt number or follow the cases you track.</Heading>
    <div className="stack">
      <div id="lookup">
        <Panel title="Check case status">
          <p className="section-intro">Enter the 13-character receipt number from your case notice.</p>
          <form className="inline-form" onSubmit={check} noValidate>
            <Field id="lookup-receipt" label="Receipt number" placeholder="IOE9700000001" value={receipt}
              ref={receiptField} error={error} onChange={event => { setReceipt(event.target.value); setError('') }} />
            <button className="button" type="submit">Check case status</button>
          </form>
          <div aria-live="polite">
            {result && (found ? <div className="notice">
              <div className="record-row lookup-result">
                <div className="record-main">
                  <strong className="numeric">{result.receiptNumber}</strong>
                  <span>{found.formTitle || found.formCode || 'Case found'}</span>
                  <span><Badge status={result.caseStatus} /></span>
                </div>
                <div className="actions">
                  <AccountLink to={recordPath('/cases', found.id)}>View case details</AccountLink>
                  <TrackCase item={found} />
                  {isTracked(state, found.id) && <span className="meta">Tracked in your account</span>}
                </div>
              </div>
            </div> : <p className="notice">No case was found for <strong className="numeric">{result.receiptNumber}</strong>.</p>)}
          </div>
        </Panel>
      </div>
      <Panel title="Tracked cases">
        <div className="filters">
          <Field id="tracked-search" label="Search tracked cases" value={query} type="search" placeholder="Receipt number or form"
            onChange={event => setQuery(event.target.value)} />
          <div className="field"><label htmlFor="status-filter">Status</label>
            <select id="status-filter" value={filter} onChange={event => setFilter(event.target.value)}>
              <option value="">All statuses</option>
              {statusOptions.map(status => <option value={status} key={status}>{statusLabel(status)}</option>)}
            </select>
          </div>
        </div>
        <p className="meta list-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'case' : 'cases'}</p>
        {visible.length ? <CaseRows cases={visible} /> : <Empty>{tracked.length ? 'No tracked cases match these filters.' : 'Check a receipt number to find a case to track.'}</Empty>}
      </Panel>
    </div>
  </>
}

export function CaseDetail() {
  const { state } = useAccount()
  const { caseId } = useParams()
  const item = records(state.cases).find(entry => entry.id === caseId)
  if (!item) return <Missing title="Case unavailable" to="/cases" label="Return to case status" />
  const events = latest(records(state.caseEvents).filter(event => event.caseId === caseId), 'createdAt')
  return <>
    <Heading title={item.receiptNumber || 'Case details'} back={{ to: '/cases', label: 'Case status' }} action={<TrackCase item={item} />}>
      {[item.formCode, item.formTitle].filter(Boolean).join(' · ') || 'Case details'}
    </Heading>
    <div className="stack">
      <Panel title="Current status">
        <div className="actions"><Badge status={item.status} /><span className="meta numeric">Updated {dateLabel(item.statusUpdatedAt)}</span></div>
      </Panel>
      <Panel title="Case history">
        {events.length ? <ol className="timeline">
          {events.map((entry, index) => <li key={entry.id || index}>
            <p className="meta numeric">{dateLabel(entry.createdAt)}</p>
            <h3>{entry.title || statusLabel(entry.status)}</h3>
            {entry.description && <p>{entry.description}</p>}
          </li>)}
        </ol> : <Empty>No status history is available for this case.</Empty>}
      </Panel>
    </div>
  </>
}
