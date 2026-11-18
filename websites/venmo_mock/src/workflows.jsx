import { useRef, useState } from 'react'
import { useAccount } from './store'
import {
  addSplit, amountCents, changeRequest, dollars, eligibleFunding, equalShares, find,
  fundingLabel, match, money, nameOf, records, send,
} from './model'
import { Avatar, Empty, Facts, Field, Icon, Sheet, Switch } from './ui'

function ContactPicker({ state, ids, onChange, error }) {
  const [query, setQuery] = useState('')
  const search = useRef(null)
  const contacts = records(state.contacts).filter((contact) => contact.id && contact.id !== state.account.id)
  const phoneQuery = query.trim().replace(/\D/g, '')
  const matches = contacts.filter((contact) => !ids.includes(contact.id) &&
    (match(query, contact.name, contact.handle, '@' + (contact.handle || ''), contact.email, contact.phone) ||
      (phoneQuery && /^[+\d .()-]+$/.test(query.trim()) && String(contact.phone || '').replace(/\D/g, '').includes(phoneQuery))))
  return <div className="contact-picker">
    {ids.length > 0 && <ul className="selected-contacts" aria-label="Selected contacts">
      {ids.map((id) => <li key={id}>{nameOf(state, id)}<button type="button" aria-label={'Remove ' + nameOf(state, id)} onClick={() => onChange(ids.filter((entry) => entry !== id))}><Icon name="close" /></button></li>)}
    </ul>}
      <Field label="Search contacts" id="contact-search" error={error}>
        <input ref={search} id="contact-search" type="search" placeholder="Name, handle, email, or phone" value={query}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'contact-search-error' : undefined} onChange={(event) => setQuery(event.target.value)} />
      </Field>
      {matches.length ? <ul className="contact-results" aria-label="Matching contacts">
        {matches.map((contact) => <li key={contact.id}><button type="button" onClick={() => {
          onChange([...ids, contact.id])
          setQuery('')
          search.current?.focus()
        }}>
          <Avatar person={contact} /><span className="row-main"><strong>{contact.name || 'Unknown contact'}</strong>{contact.handle && <small>@{contact.handle}</small>}</span><Icon name="plus" />
        </button></li>)}
      </ul> : <Empty title="No contacts found" />}
  </div>
}

function FundingField({ sources, value, onChange }) {
  return sources.length
    ? <Field label="Funding source" id="funding-source"><select id="funding-source" value={value} onChange={(event) => onChange(event.target.value)}>
      {sources.map((source) => <option key={source.id} value={source.id}>{fundingLabel(source)}</option>)}
    </select></Field>
    : <p className="error" role="alert">No funding source can cover this payment.</p>
}

function AmountField({ id, label = 'Amount', value, onChange, error }) {
  return <Field id={id} label={label} error={error}>
    <div className="currency-input"><span aria-hidden="true">$</span><input id={id} inputMode="decimal" placeholder="0.00" value={value}
      aria-invalid={Boolean(error)} aria-describedby={error ? id + '-error' : undefined} onChange={(event) => onChange(event.target.value)} /></div>
  </Field>
}

function NoteField({ id, note, setNote, error }) {
  return <Field id={id} label="Note" error={error}>
    <textarea id={id} rows="2" placeholder="What’s it for?" value={note} aria-invalid={Boolean(error)}
      aria-describedby={error ? id + '-error' : undefined} onChange={(event) => setNote(event.target.value)} />
  </Field>
}

function useConfirmation() {
  const locked = useRef(false)
  const [error, setError] = useState('')
  async function confirm(action) {
    if (locked.current) return
    locked.current = true
    setError('')
    try {
      await action()
    } catch (failure) {
      locked.current = false
      setError(failure.message)
    }
  }
  return { confirm, error }
}

export function Composer({ options, close, finish }) {
  const { state, commit } = useAccount()
  const request = find(state.requests, options.requestId)
  const payingRequest = Boolean(options.requestId)
  const [mode, setMode] = useState(options.mode || 'pay')
  const [ids, setIds] = useState([])
  const [amounts, setAmounts] = useState({})
  const [note, setNote] = useState('')
  const [review, setReview] = useState(payingRequest)
  const [attempted, setAttempted] = useState(false)
  const [fundingId, setFundingId] = useState('')
  const { confirm, error } = useConfirmation()
  const recipients = payingRequest
    ? [{ id: request?.requesterId, amount: amountCents(request?.amount) }]
    : ids.map((id) => ({ id, amount: amountCents(amounts[id]) }))
  const total = recipients.reduce((sum, item) => sum + item.amount, 0)
  const sources = mode === 'pay' && total > 0 ? eligibleFunding(state, total) : []
  const effectiveFunding = find(sources, fundingId)?.id || sources[0]?.id || ''
  const reviewNote = payingRequest ? request?.note || '—' : note.trim()
  const actionName = mode === 'pay' ? 'Pay' : 'Request'
  const amountError = 'Enter a positive amount with up to two decimal places.'
  const totalError = !Number.isSafeInteger(total)

  function selectContacts(nextIds) {
    if (!ids.length && nextIds.length) {
      const id = nextIds[0]
      setAmounts((previous) => ({ ...previous, [id]: previous[id] ?? previous[''] ?? '' }))
    }
    setIds(nextIds)
  }

  function advance(event) {
    event.preventDefault()
    setAttempted(true)
    if (ids.length && !totalError && recipients.every((item) => item.amount > 0) && note.trim()) {
      setFundingId('')
      setReview(true)
    }
  }

  function submit() {
    confirm(async () => {
      let result
      await commit((latest) => {
        result = payingRequest
          ? changeRequest(latest, options.requestId, 'paid', effectiveFunding)
          : send(latest, mode, recipients, note.trim(), effectiveFunding)
        return result.state
      })
      finish((mode === 'pay' ? '/activity/' : '/requests/') + encodeURIComponent(result.id), mode === 'pay' ? 'Payment sent.' : 'Request sent.')
    })
  }

  return <Sheet title={review ? 'Review ' + (mode === 'pay' ? 'payment' : 'request') : 'Pay or request'} close={close} footer={review ? <>
    <button className="secondary" onClick={() => payingRequest ? close() : setReview(false)}>{payingRequest ? 'Go back' : 'Edit details'}</button>
    <button className="primary" disabled={mode === 'pay' && !effectiveFunding} onClick={submit}>{actionName} {money(dollars(total))}</button>
  </> : <>
    <button className="secondary" onClick={close}>Cancel</button><button className="primary" type="submit" form="composer-form">Review {mode === 'pay' ? 'payment' : 'request'}</button>
  </>}>
    {review ? <div className="review">
      <Facts entries={[
        ['To', recipients.length === 1 ? nameOf(state, recipients[0]?.id) : null], ['Note', reviewNote], ['Total', money(dollars(total))],
      ]} />
      {recipients.length > 1 && <ul className="share-list" aria-label="Recipient amounts">
        {recipients.map(({ id, amount }) => <li key={id}><span>{nameOf(state, id)}</span><strong>{money(dollars(amount))}</strong></li>)}
      </ul>}
      {mode === 'pay' && <FundingField sources={sources} value={effectiveFunding} onChange={setFundingId} />}
      {error && <p className="error" role="alert">{error}</p>}
    </div> : <form id="composer-form" className="form-stack" onSubmit={advance} noValidate>
      <Switch label="Payment or request" value={mode} options={[[ 'pay', 'Pay' ], [ 'request', 'Request' ]]} onChange={setMode} />
      <ContactPicker state={state} ids={ids} onChange={selectContacts} error={attempted && !ids.length ? 'Select a recipient.' : ''} />
      {(ids.length ? ids : ['']).map((id, index) => <AmountField key={id}
        label={ids.length > 1 ? nameOf(state, id) + ' amount (USD)' : 'Amount (USD)'}
        id={'composer-amount-' + index} value={amounts[id] || ''}
        onChange={(value) => setAmounts((previous) => ({ ...previous, [id]: value }))}
        error={attempted && !amountCents(amounts[id]) ? amountError : ''} />)}
      {attempted && totalError && <p className="error" role="alert">The combined amount is too large.</p>}
      <NoteField id="composer-note" note={note} setNote={setNote} error={attempted && !note.trim() ? 'Enter a note.' : ''} />
    </form>}
  </Sheet>
}

export function SplitComposer({ payment, close, finish }) {
  const { state, commit } = useAccount()
  const [ids, setIds] = useState([])
  const [includeOwner, setIncludeOwner] = useState(true)
  const [amount, setAmount] = useState(payment ? String(payment.amount ?? '') : '')
  const [note, setNote] = useState(payment?.note || '')
  const [method, setMethod] = useState('equal')
  const [custom, setCustom] = useState({})
  const [attempted, setAttempted] = useState(false)
  const [review, setReview] = useState(false)
  const { confirm, error } = useConfirmation()
  const participantIds = includeOwner ? [state.account.id, ...ids] : ids
  const total = amountCents(amount)
  const allocated = equalShares(total, participantIds.length)
  const participants = participantIds.map((id, index) => ({ id, amount: method === 'equal' ? allocated[index] : amountCents(custom[id]) }))
  const sharesTotal = participants.reduce((sum, entry) => sum + entry.amount, 0)
  const toRequest = participants.reduce((sum, entry) => sum + (entry.id === state.account.id ? 0 : entry.amount), 0)
  const participantError = !ids.length || participants.length < 2 ? 'Select enough contacts for at least two participants.' : ''
  const amountError = !total ? 'Enter a positive total with up to two decimal places.' : ''
  const sharesError = total && participants.length && (sharesTotal !== total || participants.some((entry) => entry.amount <= 0))
    ? 'Each share must be positive and the shares must add up to the total.' : ''

  function advance(event) {
    event.preventDefault()
    setAttempted(true)
    if (!participantError && !amountError && !sharesError && note.trim()) setReview(true)
  }

  function submit() {
    confirm(async () => {
      let result
      await commit((latest) => {
        result = addSplit(latest, participants, total, note.trim(), method, payment?.id)
        return result.state
      })
      finish('/splits/' + encodeURIComponent(result.id), 'Split requests sent.')
    })
  }

  const personLabel = (id) => id === state.account.id ? 'You' : nameOf(state, id)
  return <Sheet title={review ? 'Review split' : payment ? 'Split payment' : 'Split an expense'} close={close} footer={review ? <>
    <button className="secondary" onClick={() => setReview(false)}>Edit details</button>
    <button className="primary" onClick={submit}>Send split requests</button>
  </> : <>
    <button className="secondary" onClick={close}>Cancel</button><button className="primary" type="submit" form="split-form">Review split</button>
  </>}>
    {review ? <div className="review">
      <Facts entries={[[ 'Note', note.trim() ], [ 'Method', method === 'equal' ? 'Equal' : 'Custom' ], [ 'Expense total', money(dollars(total)) ]]} />
      <h3>Participant shares</h3>
      <ul className="share-list">{participants.map(({ id, amount: share }) => <li key={id}><span>{personLabel(id)}</span><strong>{money(dollars(share))}</strong></li>)}</ul>
      <div className="review-total"><span>Total to request</span><strong>{money(dollars(toRequest))}</strong></div>
      {error && <p className="error" role="alert">{error}</p>}
    </div> : <form className="form-stack" id="split-form" onSubmit={advance} noValidate>
      <ContactPicker state={state} ids={ids} onChange={setIds} error={attempted && participantError} />
      <label className="checkbox"><input type="checkbox" checked={includeOwner} onChange={(event) => setIncludeOwner(event.target.checked)} />Include yourself</label>
      <AmountField id="split-total" label="Total amount (USD)" value={amount} onChange={setAmount} error={attempted && amountError} />
      <NoteField id="split-note" note={note} setNote={setNote} error={attempted && !note.trim() ? 'Enter a note.' : ''} />
      <div><p className="field-label">Split method</p><Switch label="Split method" value={method} options={[[ 'equal', 'Equal' ], [ 'custom', 'Custom' ]]} onChange={setMethod} /></div>
      {method === 'custom' ? participants.map(({ id }, index) => <AmountField key={id} id={'share-' + index}
        label={personLabel(id) + ' share'} value={custom[id] || ''} onChange={(value) => setCustom({ ...custom, [id]: value })} />)
        : total > 0 && participants.length > 0 && <ul className="share-list">{participants.map(({ id, amount: share }) => <li key={id}><span>{personLabel(id)}</span><strong>{money(dollars(share))}</strong></li>)}</ul>}
      {attempted && sharesError && <p className="error" role="alert">{sharesError}</p>}
    </form>}
  </Sheet>
}
