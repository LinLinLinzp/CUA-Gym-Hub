import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { categories } from './data/seed.js'
import { activeLimits, currencies, label, lookup, matches, memberName, money, receiptFor, records } from './model.js'
import { Icon, Search, recordPath, useSiteLink } from './ui.jsx'
import { withSid } from './utils/dataManager.js'
import { useWorkspace } from './workspace.jsx'

export const optionsFor = (items, display = item => item.name) => items.filter(item => item.id).map(item => ({ value: item.id, label: display(item) || 'Untitled record' }))
export const choices = values => values.map(value => ({ value, label: label(value) }))

const actionLabels = {
  'card.issued': ['Issue virtual card', 'Issue card', 'Virtual card issued.', '/cards'],
  'card.locked': ['Lock card', 'Lock card', 'Card locked.', null, 'New purchases will be blocked until the card is unlocked.'],
  'card.unlocked': ['Unlock card', 'Unlock card', 'Card unlocked.', null, 'This card can be used for new purchases again.'],
  'card.canceled': ['Cancel card', 'Cancel card', 'Card canceled.', null, 'Canceling is permanent. The card’s expense history stays available.'],
  'card.limit_changed': ['Change spend limit', 'Save spend limit', 'Card spend limit updated.'],
  'expense.submitted': ['Submit reimbursement', 'Submit reimbursement', 'Reimbursement submitted for review.', '/expenses'],
  'expense.memo_updated': ['Edit memo', 'Save memo', 'Memo updated.'],
  'expense.approved': ['Approve expense', 'Approve expense', 'Expense approved.', null, 'Confirm approval for this expense.'],
  'expense.denied': ['Deny expense', 'Deny expense', 'Expense denied.'],
  'receipt.uploaded': ['Upload receipt', 'Upload receipt', 'Receipt uploaded.', '/receipts'],
  'receipt.attached': ['Attach receipt', 'Attach receipt', 'Receipt attached.'],
  'receipt.matched': ['Match to expense', 'Match receipt', 'Receipt matched.'],
  'receipt.removed': ['Remove receipt', 'Remove receipt', 'Receipt removed.', null, 'The receipt will leave the active queue. Any linked expense will show that its receipt is missing.'],
  'limit.created': ['Create spend limit', 'Create spend limit', 'Spend limit created.', '/limits'],
  'limit.updated': ['Edit spend limit', 'Save changes', 'Spend limit updated.'],
  'limit.archived': ['Archive spend limit', 'Archive spend limit', 'Spend limit archived.', null, 'The limit will be unavailable for new assignments. Its card and expense history stays available.'],
  'limit.increase_requested': ['Request increase', 'Request increase', 'Increase requested.'],
  'limit.increase_approved': ['Approve increase', 'Approve increase', 'Increase approved.'],
  'limit.increase_denied': ['Deny increase', 'Deny increase', 'Increase denied.'],
}

function Field({ name, caption, value, change, options, multiline, required = true, type = 'text', readOnly = false }) {
  const id = useId()
  const props = { id, name, value: value ?? '', onChange: event => change(name, event.target.value), required }
  return <div className="field">
    <label htmlFor={id}>{caption}</label>
    {options ? <select {...props}><option value="">Choose {caption.toLowerCase()}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : multiline ? <textarea {...props} rows={3} />
        : <input {...props} type={type === 'amount' ? 'text' : type} inputMode={type === 'amount' ? 'decimal' : undefined} readOnly={readOnly} />}
  </div>
}

const contentTypes = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }
function fileError(files) {
  if (files.length !== 1) return 'Choose one receipt file.'
  const file = files[0]
  const extension = file.name.split('.').pop().toLowerCase()
  const expectedType = Object.hasOwn(contentTypes, extension) ? contentTypes[extension] : undefined
  if (!expectedType || (file.type && file.type !== expectedType)) return 'Choose a PDF, JPEG, or PNG file.'
  if (!file.size || file.size > 10 * 1024 * 1024) return 'The file must be between 1 byte and 10 MB.'
  return ''
}

function ReceiptPicker({ file, selectFile }) {
  const [dragging, setDragging] = useState(false)
  return <label className={`drop-zone${dragging ? ' dragging' : ''}`}
    onDragOver={event => { event.preventDefault(); setDragging(true) }}
    onDragLeave={() => setDragging(false)} onDrop={event => {
      event.preventDefault()
      setDragging(false)
      selectFile(event.dataTransfer.files)
    }}>
    <Icon name="upload" size={25} />
    <strong>{file?.name || 'Choose or drop a receipt'}</strong>
    <small>PDF, JPEG or PNG up to 10 MB</small>
    <input type="file" aria-label="Receipt file" accept=".pdf,.jpeg,.jpg,.png,application/pdf,image/jpeg,image/png" onChange={event => {
      if (event.target.files.length) selectFile(event.target.files)
      event.target.value = ''
    }} />
  </label>
}

export function ActionDialog({ action, close }) {
  const { command, record, request } = action
  const { state, latest, commit, setNotice } = useWorkspace()
  const navigate = useNavigate()
  const siteLink = useSiteLink()
  const dialog = useRef(null)
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [query, setQuery] = useState('')
  const [data, setData] = useState(() => command === 'limit.created' ? { currency: state.workspace?.currency || 'USD', recurrence: 'monthly' }
    : command === 'limit.updated' || command === 'expense.memo_updated' ? { ...record } : {})
  const [title, submitLabel, success, nextPath, description] = actionLabels[command]

  useEffect(() => {
    const node = dialog.current
    const trigger = document.activeElement
    node.showModal()
    return () => {
      node.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
      else document.querySelector('.detail-header .icon-button')?.focus()
    }
  }, [])

  const upload = command === 'receipt.uploaded' || command === 'receipt.attached'
  const limits = optionsFor(activeLimits(state).filter(item => command !== 'card.limit_changed' || item.id !== record?.limitId))
  const members = optionsFor(records(state.members))
  const eligible = command === 'receipt.matched' ? records(state.expenses).filter(item => item.id && !receiptFor(state, item.id)) : []
  const requiresMember = ['card.issued', 'limit.created', 'limit.updated'].includes(command)
  const requiresLimit = ['card.issued', 'card.limit_changed', 'expense.submitted'].includes(command)
  const blocked = requiresMember && !members.length ? 'Add a team member before using this action.'
    : requiresLimit && !limits.length ? 'An eligible active spend limit is needed.'
      : command === 'receipt.matched' && !eligible.length ? 'There are no expenses without receipts.' : ''
  const change = (key, value) => { setData(previous => ({ ...previous, [key]: value })); setError('') }
  const field = (name, caption, props = {}) => <Field name={name} caption={caption} value={data[name]} change={change} {...props} />
  const selectedLimit = lookup(state.limits, data.limitId)
  const destructive = ['card.canceled', 'receipt.removed', 'limit.archived', 'expense.denied', 'limit.increase_denied'].includes(command)

  function fields() {
    switch (command) {
      case 'card.issued':
        return <>{field('name', 'Card name')}{field('holderId', 'Cardholder', { options: members })}{field('limitId', 'Spend limit', { options: limits })}</>
      case 'card.limit_changed':
        return field('limitId', 'Spend limit', { options: limits })
      case 'expense.submitted':
        return <>{field('merchant', 'Merchant')}{field('limitId', 'Spend limit', { options: limits })}
          <div className="field-pair">{field('amount', selectedLimit?.currency ? `Amount (${selectedLimit.currency})` : 'Amount', { type: 'amount' })}{field('transactionDate', 'Transaction date', { type: 'date' })}</div>
          {field('category', 'Category', { options: choices(categories) })}{field('memo', 'Business memo', { multiline: true })}</>
      case 'expense.memo_updated':
        return field('memo', 'Memo', { multiline: true, required: false })
      case 'receipt.uploaded':
      case 'receipt.attached':
        return <ReceiptPicker file={file} selectFile={files => { if (busy.current) return; const problem = fileError(files); setError(problem); setFile(problem ? null : files[0]) }} />
      case 'receipt.matched': {
        const results = eligible.filter(item => matches(query, item.merchant, memberName(state, item.employeeId)))
        return <><Search value={query} onChange={setQuery} placeholder="Find a merchant or employee" />
          <fieldset className="match-options"><legend>Eligible expenses</legend>
            {results.map(item => <label key={item.id} className="match-option"><input type="radio" name="expenseId" checked={data.expenseId === item.id} onChange={() => change('expenseId', item.id)} />
              <span><strong>{item.merchant || 'Untitled expense'}</strong><small>{memberName(state, item.employeeId)}</small></span><span className="numbers">{money(item.amount, item.currency)}</span>
            </label>)}
            {results.length === 0 && <p className="muted">No eligible expenses match your search.</p>}
          </fieldset></>
      }
      case 'limit.created':
      case 'limit.updated':
        return <>{field('name', 'Limit name')}{field('ownerId', 'Owner', { options: members })}
          <div className="field-pair">{field('amount', 'Amount', { type: 'amount' })}{command === 'limit.created'
            ? field('currency', 'Currency', { options: choices(currencies) }) : field('currency', 'Currency', { readOnly: true, required: false })}</div>
          {field('recurrence', 'Recurrence', { options: choices(['monthly', 'quarterly', 'one_time']) })}</>
      case 'limit.increase_requested':
        return <>{field('amount', record.currency ? `Additional amount (${record.currency})` : 'Additional amount', { type: 'amount' })}{field('reason', 'Reason', { multiline: true })}</>
      case 'limit.increase_approved':
        return <p className="dialog-description">Add {money(request?.additionalAmount, request?.currency)} to {record?.name || 'this spend limit'}.</p>
      case 'card.locked':
      case 'card.canceled':
      case 'expense.denied':
      case 'limit.increase_denied':
        return field('reason', command.endsWith('denied') ? 'Denial reason' : 'Reason', { multiline: true })
      default:
        return null
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (busy.current || blocked) return
    busy.current = true
    setPending(true)
    setError('')
    try {
      let uploaded
      if (upload) {
        if (!file) throw new Error('Choose a receipt file.')
        if (command === 'receipt.attached' && (!lookup(latest.current.expenses, record?.id) || receiptFor(latest.current, record?.id))) {
          throw new Error('This expense cannot accept a receipt.')
        }
        const body = new FormData()
        body.append('file', file)
        const response = await fetch(withSid('/upload'), { method: 'POST', body })
        if (!response.ok) throw new Error('The receipt could not upload. Try again.')
        const result = await response.json()
        uploaded = result.files?.[0]
        if (!result.success || !uploaded) throw new Error('The receipt could not upload. Try again.')
      }
      const id = commit(command, { ...data, id: record?.id, requestId: request?.id, file: uploaded })
      setNotice(uploaded ? `${success} ${uploaded.original_name}` : success)
      close()
      if (nextPath) navigate(siteLink(recordPath(nextPath, id)))
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'This action could not be completed.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return createPortal(<dialog ref={dialog} className="action-dialog" aria-labelledby="action-title" onCancel={event => {
    event.preventDefault()
    if (!busy.current) close()
  }}>
    <form noValidate onSubmit={submit} aria-busy={pending}>
      <header className="dialog-header"><h2 id="action-title">{title}</h2>
        <button type="button" className="icon-button" aria-label="Close dialog" onClick={close} disabled={pending}><Icon name="x" /></button>
      </header>
      <div className="dialog-body">
        {description && <p className="dialog-description">{description}</p>}
        {fields()}
        {blocked && <p className="muted">{blocked}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <footer className="dialog-footer"><button type="button" className="secondary" onClick={close} disabled={pending}>Back</button>
        <button type="submit" className={destructive ? 'danger' : 'primary'} disabled={pending || Boolean(blocked)}>{pending ? 'Saving…' : submitLabel}</button>
      </footer>
    </form>
  </dialog>, document.body)
}
