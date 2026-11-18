import { useRef, useState } from 'react'
import { Confirm, Field, Modal, Tabs } from '../components/UI.jsx'
import { accessFor, relevantGrant } from '../state/access.js'
import { compDurations, endComp, grantComp, planComp } from '../state/comps.js'
import { useStore } from '../state/Store.jsx'
import { addSubscribers, exportSubscribers, readImport, removalRefunds, removeSubscribers, subscriberCsv, validateImport } from '../state/subscribers.js'
import { accessLabels, date, money, plural, stamp } from '../utils/format.js'

export function AddSubscribersDialog({ onClose }) {
  const { state, commit } = useStore()
  const [source, setSource] = useState('manual')
  const [input, setInput] = useState('')
  const [csv, setCsv] = useState(null)
  const [trial, setTrial] = useState('')
  const [welcome, setWelcome] = useState(false)
  const [review, setReview] = useState(null)
  const [fileError, setFileError] = useState('')
  const [formError, setFormError] = useState('')
  const [reading, setReading] = useState(false)
  const fileRead = useRef(0)
  const accepted = review?.filter(row => !row.issue) ?? []
  const rejected = review?.filter(row => row.issue) ?? []
  async function loadFile(file) {
    const currentRead = ++fileRead.current
    setCsv(null)
    setFileError('')
    setFormError('')
    setReading(Boolean(file))
    if (!file) return
    try {
      const text = await file.text()
      if (currentRead === fileRead.current) setCsv(text)
    } catch {
      if (currentRead === fileRead.current) setFileError('The file could not be read.')
    } finally {
      if (currentRead === fileRead.current) setReading(false)
    }
  }
  function submit(event) {
    event.preventDefault()
    if (reading) return
    setFormError('')
    if (review) {
      const result = commit(previous => addSubscribers(previous, accepted, source, trial, welcome), next =>
        `${plural(next.events.at(-1).details.quantity, 'subscriber')} added`)
      if (result) onClose()
      else setFormError('No unique subscribers remain in this batch.')
      return
    }
    if (source === 'csv' && csv === null) { setFormError('Choose a CSV file to review.'); return }
    const parsed = readImport(source, source === 'manual' ? input : csv)
    if (parsed.error || !parsed.rows.length) { setFormError(parsed.error || (source === 'csv' ? 'The CSV has no subscriber rows.' : 'Enter at least one email address.')); return }
    if (source === 'csv') loadFile()
    setReview(validateImport(parsed.rows, state.subscribers))
  }
  return <Modal title="Add subscribers" wide onClose={onClose} footer={<>
    <button type="button" className="button" onClick={review ? () => { setReview(null); setFormError('') } : onClose}>{review ? 'Back' : 'Cancel'}</button>
    <button type="submit" className="button primary" form="add-subscribers-form" disabled={reading || Boolean(review && !accepted.length)}>
      {review ? `Add ${plural(accepted.length, 'subscriber')}` : 'Review subscribers'}
    </button>
  </>}>
    <form id="add-subscribers-form" className="stack-form" onSubmit={submit}>
      {!review && <>
        <Tabs label="Import source" items={[[ 'manual', 'Enter emails' ], [ 'csv', 'Import CSV' ]]} value={source} onChange={value => {
          if (value === source) return
          if (source === 'csv') loadFile()
          setSource(value)
          setFormError('')
        }} />
        {source === 'manual' ? <Field label="Email addresses" hint="Separate multiple addresses with commas or new lines.">
          <textarea rows={4} value={input} onChange={event => { setInput(event.target.value); setFormError('') }} placeholder="reader@example.com" />
        </Field> : <Field label="CSV file" hint="Use an email header and an optional name header."><input type="file" accept=".csv,text/csv" onChange={event => loadFile(event.target.files?.[0])} /></Field>}
        {source === 'csv' && (reading || fileError) && <p role="status">{reading ? 'Reading CSV…' : fileError}</p>}
      </>}
      {review && <section className="import-review" aria-label="Import review">
        <h3>{accepted.length} accepted · {rejected.length} rejected</h3>
        <div className="import-review-scroll"><ul>{review.map((row, index) => <li key={index}>
          <span>{row.email || `Row ${row.rowNumber ?? index + 1}`}{row.name ? <small>{row.name}</small> : null}</span>
          <span className={row.issue ? 'field-error' : 'accepted'}>{row.issue || 'Accepted'}</span>
        </li>)}</ul></div>
      </section>}
      <Field label="Subscription type"><select value={trial} onChange={event => setTrial(event.target.value)}>
        <option value="">Free subscription</option><option value="7d">1 week trial</option><option value="1mo">1 month trial</option>
        <option value="3mo">3 month trial</option><option value="6mo">6 month trial</option><option value="1y">1 year trial</option>
      </select></Field>
      <label className="checkbox-field"><input type="checkbox" checked={welcome} onChange={event => setWelcome(event.target.checked)} /> Send a welcome email</label>
      {formError && <p className="field-error" role="alert">{formError}</p>}
    </form>
  </Modal>
}

export function RemoveSubscribersDialog({ ids, onClose, onRemoved }) {
  const { state, commit } = useStore()
  const rows = state.subscribers.filter(row => ids.includes(row.id) && row.status === 'active')
  const refunds = removalRefunds(state, rows)
  function confirm() {
    const result = commit(previous => removeSubscribers(previous, ids), next =>
      `${plural(next.events.at(-1).details.quantity, 'subscriber')} removed`)
    if (result) onRemoved()
    else onClose()
  }
  return <Confirm title="Remove subscribers?" label={`Remove ${plural(rows.length, 'subscriber')}`} danger onClose={onClose} onConfirm={confirm}>
    <div className="stack-form">
      <p>Remove {plural(rows.length, 'subscriber')} from this publication’s active list. Any current or upcoming complimentary subscriptions for these readers will end.</p>
      {refunds.length > 0 && <div>
        <h3>Simulated prorated refunds</h3>
        <ul className="dialog-list">{refunds.map(refund => {
          const row = rows.find(item => item.id === refund.subscriberId)
          return <li key={refund.subscriberId}><span>{row.name || row.email || 'Subscriber'}</span><strong>{money(refund.amount, refund.currency)}</strong></li>
        })}</ul>
      </div>}
    </div>
  </Confirm>
}

export function ExportSubscribersDialog({ all, filtered, displayed, supported, read, onClose }) {
  const { commit } = useStore()
  const [scope, setScope] = useState('filtered')
  const [columnSet, setColumnSet] = useState('display')
  const rows = scope === 'all' ? all : filtered
  const columns = columnSet === 'all' ? supported : displayed
  function download(event) {
    event.preventDefault()
    if (!rows.length) return
    const filename = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    const csv = subscriberCsv(rows, columns, read)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    commit(previous => exportSubscribers(previous, rows.map(row => row.id), scope, columns, filename),
      `Exported ${plural(rows.length, 'subscriber')}`)
    onClose()
  }
  return <Modal title="Export subscribers" onClose={onClose} footer={<>
    <button type="button" className="button" onClick={onClose}>Cancel</button>
    <button type="submit" className="button primary" form="export-subscribers-form" disabled={!rows.length}>Download CSV</button>
  </>}>
    <form id="export-subscribers-form" className="stack-form" onSubmit={download}>
      <Field label="Subscribers"><select value={scope} onChange={event => setScope(event.target.value)}>
        <option value="filtered">Filtered results ({filtered.length})</option><option value="all">All subscribers ({all.length})</option>
      </select></Field>
      <Field label="Columns"><select value={columnSet} onChange={event => setColumnSet(event.target.value)}>
        <option value="display">Displayed columns</option><option value="all">All supported columns</option>
      </select></Field>
      <p className="muted">{plural(rows.length, 'subscriber')} will be included in the CSV.</p>
    </form>
  </Modal>
}

export function CompSubscribersDialog({ ids, onClose }) {
  const { state, commit, setNotice } = useStore()
  const [duration, setDuration] = useState('30d')
  const [founding, setFounding] = useState(false)
  const now = new Date()
  const rows = state.subscribers.filter(row => ids.includes(row.id) && row.status === 'active')
  const plans = rows.map(row => {
    const existing = relevantGrant(state.compSubscriptions, row.id, now)
    return { row, existing, ...planComp(row, existing, now, duration, founding) }
  })
  function confirm(event) {
    event.preventDefault()
    const result = commit(previous => grantComp(previous, ids, duration, founding), next => {
      const changed = next.events.length - state.events.length
      return `Complimentary access updated for ${plural(changed, 'subscriber')}`
    })
    if (!result) setNotice('Complimentary access is already up to date')
    onClose()
  }
  return <Modal title="Comp subscription" onClose={onClose} footer={<>
    <button type="button" className="button" onClick={onClose}>Cancel</button>
    <button type="submit" form="comp-subscribers-form" className="button primary" disabled={!rows.length}>Comp {plural(rows.length, 'subscriber')}</button>
  </>}>
    <form id="comp-subscribers-form" className="stack-form" onSubmit={confirm}>
      <p>Give or extend complimentary paid access for {plural(rows.length, 'subscriber')}.</p>
      <Field label="Duration"><select value={duration} onChange={event => setDuration(event.target.value)}>
        {Object.entries(compDurations).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
      </select></Field>
      <label className="checkbox-field"><input type="checkbox" checked={founding} onChange={event => setFounding(event.target.checked)} /> Set to Founding</label>
      {plans.length > 0 && <ul className="dialog-list comp-plan">{plans.map(({ row, existing, startsAt, endsAt, unchanged }) => <li key={row.id}>
        <span>{row.name || row.email || 'Subscriber'}</span>
        <small>{unchanged ? 'Already has lifetime access' : existing ? (endsAt ? `Extend to ${date(endsAt)}` : 'Lifetime access')
          : `${stamp(startsAt) <= now ? 'Starts now' : `Starts ${date(startsAt)}`} · ${endsAt ? `Ends ${date(endsAt)}` : 'Forever'}`}</small>
      </li>)}</ul>}
    </form>
  </Modal>
}

export function EndCompDialog({ grantId, onClose }) {
  const { state, commit } = useStore()
  const grant = state.compSubscriptions.find(item => item.id === grantId)
  const subscriber = grant && state.subscribers.find(item => item.id === grant.subscriberId)
  const remaining = subscriber ? accessFor(subscriber, null).type : 'free'
  return <Confirm title="End comp subscription?" label="End comp" danger onClose={onClose} onConfirm={() => {
    commit(previous => endComp(previous, grantId), 'Complimentary access ended')
    onClose()
  }}>
    <p>End complimentary access for {subscriber?.name || subscriber?.email || 'this subscriber'}. They remain subscribed with {accessLabels[remaining].toLowerCase()} access.</p>
  </Confirm>
}
