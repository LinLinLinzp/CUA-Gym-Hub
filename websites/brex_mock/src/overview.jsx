import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isRecorded, memberName, receiptFor, records, sumSpend } from './model.js'
import { Badge, CalendarDate, Filter, Icon, Ledger, Money, PageTitle, recordPath, useSiteLink } from './ui.jsx'
import { useWorkspace } from './workspace.jsx'

export function Overview() {
  const { state } = useWorkspace()
  const siteLink = useSiteLink()
  const defaultCurrency = state.workspace?.currency || 'USD'
  const [currency, setCurrency] = useState(defaultCurrency)
  const expenses = records(state.expenses)
  const currencies = [...new Set([defaultCurrency, ...expenses.map(item => item.currency).filter(Boolean)])].sort()
  const scoped = expenses.filter(item => item.currency === currency)
  const recorded = scoped.filter(isRecorded)
  const pending = scoped.filter(item => item.status === 'pending_review')
  const missing = scoped.filter(item => !receiptFor(state, item.id))
  const recent = [...scoped].sort((a, b) => String(b.transactionDate ?? '').localeCompare(String(a.transactionDate ?? ''))).slice(0, 7)
  const groups = Map.groupBy(recorded, item => item.category || 'Uncategorized')
  const chart = [...groups].map(([name, items]) => ({ name, total: sumSpend(items) })).sort((a, b) => b.total - a.total)
  const max = Math.max(1, ...chart.map(item => item.total))
  const columns = [
    ['Merchant', item => item.id ? <Link className="record-link" to={siteLink(recordPath('/expenses', item.id))}>{item.merchant || 'Untitled expense'}</Link> : item.merchant || 'Untitled expense'],
    ['Employee', item => memberName(state, item.employeeId)],
    ['Date', item => <CalendarDate value={item.transactionDate} />],
    ['Status', item => <Badge value={item.status} />],
    ['Amount', item => <Money amount={item.amount} currency={item.currency} />, true],
  ]

  return <div className="page overview">
    <PageTitle title="Overview" description={state.workspace?.name || 'Workspace'}>
      <Filter name="Currency" value={currency} onChange={setCurrency} options={currencies.map(value => ({ value, label: value }))} />
    </PageTitle>
    <div className="summary-grid">
      <section className="summary summary-spend"><div className="summary-top"><span>Recorded spend</span><span className="summary-icon"><Icon name="expenses" /></span></div>
        <div className="summary-figure"><Money amount={sumSpend(recorded)} currency={currency} /></div>
        <Link to={siteLink('/expenses', { currency })}>View expense ledger <Icon name="arrow" size={15} /></Link>
      </section>
      <section className="panel summary"><div className="summary-top"><span>Pending review</span><span className="summary-icon"><Icon name="clock" /></span></div>
        <div className="summary-figure">{pending.length}</div>
        <Link to={siteLink('/expenses', { currency, status: 'pending_review' })}>Review expenses <Icon name="arrow" size={15} /></Link>
      </section>
      <section className="panel summary"><div className="summary-top"><span>Missing receipts</span><span className="summary-icon"><Icon name="receipt" /></span></div>
        <div className="summary-figure">{missing.length}</div>
        <Link to={siteLink('/expenses', { currency, receipt: 'missing' })}>View missing receipts <Icon name="arrow" size={15} /></Link>
      </section>
    </div>
    <div className="overview-grid">
      <section className="panel recent">
        <header className="section-header"><h2>Recent expenses</h2><Link to={siteLink('/expenses', { currency })}>All expenses <Icon name="arrow" size={15} /></Link></header>
        <Ledger columns={columns} rows={recent} empty={<><strong>No expenses in {currency}</strong><p>Expenses in this currency will appear here.</p></>} />
      </section>
      <div className="overview-side">
        <section className="panel spend-chart">
          <header className="section-header"><h2>Spend by category</h2><span className="currency-tag">{currency}</span></header>
          {chart.length > 0 ? <ul className="chart-list">{chart.map(item => <li key={item.name}>
            <div><span>{item.name}</span><Money amount={item.total} currency={currency} /></div>
            <div className="chart-track" aria-hidden="true"><span style={{ width: `${Math.max(0, item.total / max * 100)}%` }} /></div>
          </li>)}</ul> : <p className="chart-empty muted">No recorded spend in {currency}.</p>}
        </section>
        <section className="panel shortcuts" aria-label="Workspace shortcuts">
          <Link to={siteLink('/cards')}><span className="summary-icon"><Icon name="card" /></span><span>Cards</span><Icon name="arrow" /></Link>
          <Link to={siteLink('/limits')}><span className="summary-icon"><Icon name="limits" /></span><span>Spend limits</span><Icon name="arrow" /></Link>
        </section>
      </div>
    </div>
  </div>
}
