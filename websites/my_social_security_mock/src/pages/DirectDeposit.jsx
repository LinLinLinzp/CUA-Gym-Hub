import React, { useEffect, useRef, useState } from 'react'
import { newId, useAccount } from '../account.jsx'
import { accountType, compareDates, date, mask, records, show } from '../display.js'
import { Facts, Icon, PageHeading, SortButton } from '../ui.jsx'

const emptyDraft = { bankName: '', accountType: '', routing: '', account: '', confirmAccount: '' }
const fields = [
  ['bankName', 'Bank or credit union name'],
  ['accountType', 'Account type'],
  ['routing', 'Routing number', 'Enter 9 digits.'],
  ['account', 'Account number', 'Enter 4 to 17 digits.'],
  ['confirmAccount', 'Confirm account number'],
]

function validate(draft) {
  const errors = {}
  if (!draft.bankName.trim()) errors.bankName = 'Enter a bank or credit union name.'
  if (!['checking', 'savings'].includes(draft.accountType)) errors.accountType = 'Select an account type.'
  if (!/^\d{9}$/.test(draft.routing)) errors.routing = 'Enter a 9-digit routing number.'
  if (!/^\d{4,17}$/.test(draft.account)) errors.account = 'Enter an account number with 4 to 17 digits.'
  if (!draft.confirmAccount || draft.confirmAccount !== draft.account) errors.confirmAccount = 'The account numbers must match.'
  return errors
}

function maskedDestination(destination) {
  const { id, beneficiaryId, bankName, accountType, accountLast4, status, updatedAt } = destination
  return { id, beneficiaryId, bankName, accountType, accountLast4, status, updatedAt }
}

export function DirectDeposit() {
  const { state, commit } = useAccount()
  const [step, setStep] = useState('home')
  const [draft, setDraft] = useState(emptyDraft)
  const [errors, setErrors] = useState({})
  const [receipt, setReceipt] = useState(null)
  const [order, setOrder] = useState('newest')
  const stepHeading = useRef(null)
  const actionButton = useRef(null)
  const returnFocus = useRef(false)
  const form = useRef(null)
  const current = state.directDeposit
  const active = current?.status === 'active'
  const eligible = state.profile?.directDepositEligible === true
  const action = active ? 'Change direct deposit' : 'Set up direct deposit'
  const history = records(state.directDepositChanges).sort((a, b) => compareDates(a.createdAt, b.createdAt, a.id, b.id, order))

  useEffect(() => {
    if (step !== 'home') stepHeading.current?.focus()
    else if (returnFocus.current) actionButton.current?.focus()
  }, [step])

  useEffect(() => {
    const first = Object.keys(errors)[0]
    if (first) form.current?.elements.namedItem(first)?.focus()
  }, [errors])

  function review(event) {
    event.preventDefault()
    const nextErrors = validate(draft)
    setErrors(nextErrors)
    if (!Object.keys(nextErrors).length) setStep('review')
  }

  function closeForm() {
    setDraft(emptyDraft)
    setErrors({})
    setReceipt(null)
    returnFocus.current = true
    setStep('home')
  }

  function confirm() {
    const createdAt = new Date().toISOString()
    const beneficiaryId = state.profile?.id ?? null
    const newDestination = {
      id: newId('destination'), beneficiaryId, bankName: draft.bankName.trim(),
      accountType: draft.accountType, accountLast4: draft.account.slice(-4), status: 'active', updatedAt: createdAt,
    }
    const record = {
      id: newId('ddc'), beneficiaryId,
      previousDestination: active ? maskedDestination(current) : null,
      newDestination, changeType: active ? 'change' : 'setup', status: 'confirmed',
      actorId: beneficiaryId, createdAt,
    }
    commit(previous => ({
      ...previous,
      directDeposit: newDestination,
      directDepositChanges: [...previous.directDepositChanges, record],
    }))
    setReceipt(record)
    setDraft(emptyDraft)
    setStep('receipt')
  }

  function fieldValue(event) {
    const { name, value } = event.target
    setDraft(previous => ({ ...previous, [name]: value }))
  }

  const inForm = eligible && (step === 'edit' || step === 'review')

  return <div className="stack">
    <PageHeading title="Direct deposit" description="Manage the bank account that receives your benefit payments." />
    <section className="panel">
      <div className="section-heading">
        <h2>Current destination</h2>
        <span className={'pill ' + (active ? 'success' : 'neutral')}>{active ? 'Active' : 'Not enrolled'}</span>
      </div>
      {active ? <Facts items={[
        ['Financial institution', show(current.bankName)], ['Account type', accountType(current.accountType)],
        ['Account ending', mask(current.accountLast4)], ['Last updated', date(current.updatedAt)],
      ]} /> : <p>No bank account is currently enrolled for direct deposit.</p>}
      {!eligible && <p className="callout">Online direct deposit setup or changes are unavailable for your current benefit status.</p>}
      {eligible && step === 'home' && <button type="button" ref={actionButton} className="button primary" onClick={() => setStep('edit')}>{action}</button>}
    </section>

    {inForm && step === 'edit' && <section className="panel step-panel">
      <h2 ref={stepHeading} tabIndex="-1">{action}</h2>
      <p className="muted">Enter sample bank details for this account.</p>
      <form ref={form} onSubmit={review} noValidate autoComplete="off">
        <div className="form-fields">
          {fields.map(([name, label, hint]) => {
            const id = 'deposit-' + name
            const error = errors[name]
            const info = [
              hint && id + '-hint', error && id + '-error',
            ].filter(Boolean).join(' ') || undefined
            const input = {
              id, name, value: draft[name], onChange: fieldValue, required: true,
              'aria-invalid': error ? true : undefined, 'aria-describedby': info,
            }
            return <div className="field" key={name}>
              <label htmlFor={id}>{label}</label>
              {name === 'accountType' ? <select {...input}>
                <option value="">Choose account type</option><option value="checking">Checking</option><option value="savings">Savings</option>
              </select> : <input {...input}
                type={name === 'bankName' || name === 'routing' ? 'text' : 'password'}
                inputMode={name === 'bankName' ? undefined : 'numeric'}
                maxLength={name === 'bankName' ? 120 : undefined}
              />}
              {hint && <p className="field-hint" id={id + '-hint'}>{hint}</p>}
              {error && <p className="error-text" id={id + '-error'}>{error}</p>}
            </div>
          })}
        </div>
        <div className="button-row">
          <button className="button primary" type="submit">Review details</button>
          <button className="button secondary" type="button" onClick={closeForm}>Cancel</button>
        </div>
      </form>
    </section>}

    {inForm && step === 'review' && <section className="panel step-panel">
      <h2 ref={stepHeading} tabIndex="-1">Review direct deposit</h2>
      <p>Confirm the destination for your benefit payments.</p>
      <Facts items={[
        ['Financial institution', draft.bankName.trim()], ['Account type', accountType(draft.accountType)],
        ['Routing number', mask(draft.routing.slice(-4))], ['Account number', mask(draft.account.slice(-4))],
      ]} />
      <div className="button-row">
        <button className="button primary" type="button" onClick={confirm}>Confirm</button>
        <button className="button secondary" type="button" onClick={() => setStep('edit')}>Back to edit</button>
        <button className="button secondary" type="button" onClick={closeForm}>Cancel</button>
      </div>
    </section>}

    {step === 'receipt' && receipt && <section className="panel step-panel receipt">
      <h2 ref={stepHeading} tabIndex="-1"><Icon name="check" />Direct deposit confirmed</h2>
      <p role="status">Your payment destination has been saved.</p>
      <Facts items={[
        ['Reference ID', receipt.id], ['Financial institution', receipt.newDestination.bankName],
        ['Account ending', mask(receipt.newDestination.accountLast4)], ['Confirmed', date(receipt.createdAt)],
      ]} />
      <button className="button secondary" type="button" onClick={closeForm}>Done</button>
    </section>}

    <section className="panel archive" aria-label="Direct deposit change history">
      <h2>Change history</h2>
      {history.length ? <table className="archive-table" aria-label="Direct deposit changes">
        <thead><tr>
          <th scope="col">Destination</th><th scope="col">Change</th>
          <th scope="col" aria-sort={order === 'newest' ? 'descending' : 'ascending'}><SortButton order={order} setOrder={setOrder} /></th>
        </tr></thead>
        <tbody>{history.map((item, index) => <tr key={item.id ?? index}>
          <th scope="row">{show(item.newDestination?.bankName)}<span className="row-subtitle">{mask(item.newDestination?.accountLast4)}</span></th>
          <td>{({ setup: 'Setup', change: 'Change' })[item.changeType] ?? 'Unavailable'}{item.status === 'confirmed' && <span className="row-subtitle">Confirmed</span>}</td>
          <td>{date(item.createdAt)}</td>
        </tr>)}</tbody>
      </table> : <p className="empty">No direct deposit changes are available.</p>}
    </section>
  </div>
}
