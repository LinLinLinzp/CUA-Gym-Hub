import { useState } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useWorkspace } from './workspace.jsx'
import { ActionDialog, choices, optionsFor } from './forms.jsx'
import { label, limitSpend, lookup, matches, memberName, numeric, receiptFor, records, roundMoney } from './model.js'
import { Badge, CalendarDate, Filter, Filters, Icon, Ledger, Money, PageTitle, Search, recordPath } from './ui.jsx'

const pageSize = 12
const ledgerInfo = {
  card: { collection: 'cards', action: 'Issue virtual card', command: 'card.issued', description: 'Manage team cards and their spending assignments.', search: 'Card name, cardholder or last four digits' },
  expense: { collection: 'expenses', action: 'Submit reimbursement', command: 'expense.submitted', description: 'Review card activity and team reimbursements.', search: 'Merchant, employee, category or memo' },
  receipt: { collection: 'receipts', action: 'Upload receipt', command: 'receipt.uploaded', description: 'Organize receipt files and match them to expenses.', search: 'Filename, merchant or employee' },
  limit: { collection: 'limits', action: 'Create spend limit', command: 'limit.created', description: 'Manage spend caps, owners and requests for increases.', search: 'Limit name or owner' },
}

export const infoFor = entity => ledgerInfo[entity]

export function LedgerPage({ section }) {
  const { state } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const [dialog, setDialog] = useState(null)
  const { entity, name, path } = section
  const info = infoFor(entity)
  const q = params.get('q') ?? ''
  const status = params.get('status') ?? ''
  const card = params.get('card') ?? ''
  const limit = params.get('limit') ?? ''
  const currency = params.get('currency') ?? ''
  const receipt = params.get('receipt') ?? ''
  const format = params.get('format') ?? ''
  const recurrence = params.get('recurrence') ?? ''
  const sort = params.get('sort') ?? 'latest'
  const expenseList = records(state.expenses)
  const nameOf = id => memberName(state, id)
  const expenseFor = id => lookup(state.expenses, id)
  const rows = records(state[info.collection]).filter(item => {
    if (status && item.status !== status) return false
    switch (entity) {
      case 'card':
        return (!format || item.format === format) && (!limit || item.limitId === limit)
          && matches(q, item.name, nameOf(item.holderId), item.last4)
      case 'expense':
        return (!receipt || (receipt === 'missing' ? !receiptFor(state, item.id) : Boolean(receiptFor(state, item.id))))
          && (!card || card === item.cardId) && (!limit || limit === item.limitId) && (!currency || currency === item.currency)
          && matches(q, item.merchant, nameOf(item.employeeId), item.category, item.memo)
      case 'receipt': {
        const linked = expenseFor(item.expenseId)
        return item.status !== 'removed' && matches(q, item.filename, linked?.merchant, linked && nameOf(linked.employeeId), item.expenseId)
      }
      case 'limit':
        return (!recurrence || recurrence === item.recurrence) && matches(q, item.name, nameOf(item.ownerId))
      default:
        return true
    }
  })

  if (entity === 'expense') {
    rows.sort((a, b) => {
      if (sort === 'high' || sort === 'low') return ((Number(a.amount) || 0) - (Number(b.amount) || 0)) * (sort === 'high' ? -1 : 1)
      return String(b.transactionDate ?? '').localeCompare(String(a.transactionDate ?? '')) * (sort === 'oldest' ? -1 : 1)
    })
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const requestedPage = Number.parseInt(params.get('page'), 10) || 1
  const page = Math.max(1, Math.min(requestedPage, pageCount))
  const start = (page - 1) * pageSize
  const displayRows = rows.slice(start, start + pageSize)

  function update(key, value, replace = false) {
    const next = new URLSearchParams(params)
    if (key !== 'page') next.delete('page')
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace, preventScrollReset: true })
  }

  function clear() {
    setParams(params.has('sid') ? { sid: params.get('sid') } : {}, { preventScrollReset: true })
  }

  const hasFilters = [...params.keys()].some(key => !['sid', 'page'].includes(key))
  const detail = (item, text) => item.id ? <Link className="record-link" to={`${recordPath(path, item.id)}${search}`}>{text}</Link> : text
  const columns = {
    card: [
      ['Card', item => detail(item, item.name || 'Untitled card')],
      ['Cardholder', item => nameOf(item.holderId)],
      ['Last four', item => <span className="numbers">{item.last4 ? `•••• ${item.last4}` : '—'}</span>],
      ['Format', item => label(item.format)],
      ['Spend limit', item => lookup(state.limits, item.limitId)?.name || '—'],
      ['Status', item => <Badge value={item.status} />],
    ],
    expense: [
      ['Merchant', item => detail(item, item.merchant || 'Untitled expense')],
      ['Employee', item => nameOf(item.employeeId)],
      ['Date', item => <CalendarDate value={item.transactionDate} />],
      ['Category', item => item.category || '—'],
      ['Receipt', item => receiptFor(state, item.id) ? 'Attached' : <span className="missing-receipt">Missing</span>],
      ['Status', item => <Badge value={item.status} />],
      ['Amount', item => <Money amount={item.amount} currency={item.currency} />, true],
    ],
    receipt: [
      ['Filename', item => detail(item, item.filename || 'Untitled receipt')],
      ['Upload date', item => <CalendarDate value={item.createdAt} />],
      ['Expense', item => expenseFor(item.expenseId)?.merchant || '—'],
      ['Status', item => <Badge value={item.status} />],
    ],
    limit: [
      ['Spend limit', item => detail(item, item.name || 'Untitled limit')],
      ['Owner', item => nameOf(item.ownerId)],
      ['Recurrence', item => label(item.recurrence)],
      ['Status', item => <Badge value={item.status} />],
      ['Cap', item => <Money amount={item.amount} currency={item.currency} />, true],
      ['Recorded spend', item => <Money amount={limitSpend(state, item)} currency={item.currency} />, true],
      ['Remaining', item => <Money amount={numeric(item.amount) ? roundMoney(Number(item.amount) - limitSpend(state, item)) : null} currency={item.currency} />, true],
    ],
  }[entity]

  const filter = (caption, key, value, options, placeholder) => <Filter name={caption} value={value} options={options} placeholder={placeholder} onChange={next => update(key, next)} />
  const availableCurrencies = [...new Set(expenseList.map(item => item.currency).filter(Boolean))].sort()
  if (currency && !availableCurrencies.includes(currency)) availableCurrencies.push(currency)

  return <>
    <div className="page">
      <PageTitle title={name} description={info.description} action={<button type="button" className="primary" onClick={() => setDialog({ command: info.command })}><Icon name="plus" />{info.action}</button>} />
      <section className="panel ledger" aria-label={`${name} ledger`}>
        {entity === 'receipt' && <div className="tabs" role="group" aria-label="Receipt status">
          {[['', 'All'], ['unmatched', 'Unmatched'], ['attached', 'Attached']].map(([value, caption]) =>
            <button key={caption} type="button" aria-pressed={status === value} onClick={() => update('status', value)}>{caption}</button>)}
        </div>}
        <Filters>
          <Search value={q} onChange={value => update('q', value, true)} placeholder={info.search} />
          {entity === 'card' && <>
            {filter('Status', 'status', status, choices(['active', 'locked', 'canceled']), 'All statuses')}
            {filter('Format', 'format', format, choices(['virtual', 'physical']), 'All formats')}
            {filter('Spend limit', 'limit', limit, optionsFor(records(state.limits)), 'All limits')}
          </>}
          {entity === 'expense' && <>
            {filter('Status', 'status', status, choices(['pending_review', 'approved', 'denied']), 'All statuses')}
            {filter('Receipt', 'receipt', receipt, [{ value: 'missing', label: 'Missing' }, { value: 'attached', label: 'Attached' }], 'All receipts')}
            {filter('Card', 'card', card, optionsFor(records(state.cards), item => `${item.name || 'Untitled card'}${item.last4 ? ` · ${item.last4}` : ''}`), 'All cards')}
            {(limit || currency) && filter('Spend limit', 'limit', limit, optionsFor(records(state.limits)), 'All limits')}
            {(availableCurrencies.length > 1 || currency) && filter('Currency', 'currency', currency, choices(availableCurrencies), 'All currencies')}
            {filter('Sort by', 'sort', sort, [{value: 'latest', label: 'Date, newest'}, {value: 'oldest', label: 'Date, oldest'}, {value: 'high', label: 'Amount, highest'}, {value: 'low', label: 'Amount, lowest'}])}
          </>}
          {entity === 'limit' && <>
            {filter('Status', 'status', status, choices(['active', 'archived']), 'All statuses')}
            {filter('Recurrence', 'recurrence', recurrence, choices(['monthly', 'quarterly', 'one_time']), 'All recurrences')}
          </>}
          {hasFilters && <button type="button" className="text-button clear-filters" onClick={clear}>Clear filters</button>}
        </Filters>
        <Ledger columns={columns} rows={displayRows} empty={<><strong>No {name.toLowerCase()} to display</strong><p>{hasFilters ? 'Clear filters or try a different search.' : `Select ${info.action} to add a record.`}</p></>} />
        <footer className="ledger-footer">
          <span>{rows.length ? `${start + 1}–${start + displayRows.length} of ${rows.length}` : '0 records'}</span>
          {pageCount > 1 && <div className="pagination"><button type="button" aria-label="Previous page" className="icon-button" disabled={page === 1} onClick={() => update('page', page - 1)}><Icon name="left" /></button>
            <span>Page {page} of {pageCount}</span>
            <button type="button" aria-label="Next page" className="icon-button" disabled={page === pageCount} onClick={() => update('page', page + 1)}><Icon name="right" /></button></div>}
        </footer>
      </section>
    </div>
    <Outlet />
    {dialog && <ActionDialog action={dialog} close={() => setDialog(null)} />}
  </>
}
