import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBank } from '../bank'
import { BackLink, Details, Field, Icon, Missing, Notice, PageList, PageTitle, Panel, Search, SessionLink, Status } from '../ui'
import {
  accountLabel, accountPath, accountTitle, asCents, audit, changeRecord, dayLabel, dateLabel,
  disputable, disputePath, existingCase, find, isCard, isDeposit, mask, matches, money,
  newest, open, openCase, records, signedMoney, transactionPath, transactionTitle,
} from '../utils/banking'

function balanceLabel(account) {
  return isCard(account) ? 'Current balance owed' : 'Current balance'
}

function Balance({ label, value, secondary, secondaryValue }) {
  return <section className="balance-panel" aria-label={label}>
    <p className="balance-label">{label}</p>
    <p className="balance-value">{money(value)}</p>
    {secondary && <p className="balance-secondary">{secondary} <strong>{money(secondaryValue)}</strong></p>}
  </section>
}

function AccountRow({ account }) {
  return <li>
    <SessionLink className="account-row" to={accountPath(account.id)}>
      <span className="account-mark"><Icon name={account.type} /></span>
      <span className="row-main">
        <span className="row-title">{accountTitle(account)}</span>
        <span className="row-sub">{[account.nickname && account.productName, mask(account.last4)].filter(Boolean).join(' · ') || 'Account details'}</span>
      </span>
      <span><span className="amount">{money(account.currentBalance)}</span><span className="amount-label">{balanceLabel(account)}</span></span>
      <Icon name="right" size={15} />
    </SessionLink>
  </li>
}

export function Accounts() {
  const { state } = useBank()
  const [view, setView] = useState('active')
  const accounts = records(state.accounts)
  const active = accounts.filter(open)
  const activeById = new Map(active.map((item) => [item.id, item]))
  const deposits = active.filter(isDeposit)
  const total = deposits.reduce((sum, item) => sum + (asCents(item.currentBalance) ?? 0), 0) / 100
  const recent = newest(records(state.transactions).filter((item) => activeById.has(item.accountId)), 'transactionDate').slice(0, 8)
  const shown = view === 'active' ? active : accounts.filter((item) => !open(item))
  const groups = [
    ['Deposit accounts', shown.filter((item) => !isCard(item))],
    ['Credit cards', shown.filter(isCard)],
  ]
  return <>
    <PageTitle title="Accounts" description="View your balances and recent activity." />
    <div className="grid">
      <div className="stack">
        <Balance label="Total deposit balance" value={deposits.length ? total : null} />
        <Panel title="Your accounts">
          <div className="compact-field">
            <Field label="Account view">{(props) => <select {...props} value={view} onChange={(event) => setView(event.target.value)}>
              <option value="active">Active accounts</option><option value="archived">Archived accounts</option>
            </select>}</Field>
          </div>
          {!shown.length && <p className="empty">No {view} accounts to display.</p>}
          {groups.filter(([, items]) => items.length).map(([title, items]) => <div className="section-gap" key={title}>
            <h3>{title}</h3>
            <PageList key={view} items={items} size={7} label="accounts"
              render={(rows) => <ul className="collection">{rows.map((account) => <AccountRow key={account.id} account={account} />)}</ul>} />
          </div>)}
        </Panel>
      </div>
      <Panel title="Recent activity">
        {recent.length ? <ul className="collection">
          {recent.map((item) => <li key={item.id}>
            <SessionLink className="recent-row" to={transactionPath(item.accountId, item.id)}>
              <span className="row-main"><span className="row-title">{transactionTitle(item)}</span>
                <span className="row-sub">{dayLabel(item.transactionDate)} · {accountLabel(activeById.get(item.accountId))}</span></span>
              <span className="amount"><span className={Number(item.amount) > 0 ? 'positive' : undefined}>{signedMoney(item.amount)}</span>
                {item.status === 'pending' && <><br /><Status value="pending" /></>}</span>
            </SessionLink>
          </li>)}
        </ul> : <p className="empty">No recent transactions to display.</p>}
      </Panel>
    </div>
  </>
}

function Nickname({ account, close, saved }) {
  const { commit } = useBank()
  const [value, setValue] = useState(account.nickname || '')

  function submit(event) {
    event.preventDefault()
    const nickname = value.trim()
    const result = commit((state) => {
      const current = find(state.accounts, account.id)
      if (!current) return state
      const { createdAt, createdBy } = audit(state)
      return { ...state, accounts: changeRecord(state.accounts, current.id, { nickname, updatedAt: createdAt, updatedBy: createdBy }) }
    })
    if (result) saved(nickname ? 'Nickname saved.' : 'Nickname cleared.')
  }

  return <Panel title="Edit nickname">
    <form className="form" onSubmit={submit}>
      <Field label="Nickname">{(props) => <input {...props} value={value} onChange={(event) => setValue(event.target.value)} />}</Field>
      <div className="actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save nickname</button></div>
    </form>
  </Panel>
}

function Ledger({ items }) {
  const [filters, setFilters] = useState({ search: '', status: '', category: '', from: '', to: '' })
  const set = (key) => (value) => setFilters({ ...filters, [key]: value })
  const statuses = [...new Set(items.map((item) => item.status).filter(Boolean))].sort()
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))].sort()
  const filtered = newest(items.filter((item) =>
    matches(filters.search, item.merchant, item.description)
    && (!filters.status || item.status === filters.status)
    && (!filters.category || item.category === filters.category)
    && (!filters.from || (item.transactionDate && item.transactionDate >= filters.from))
    && (!filters.to || (item.transactionDate && item.transactionDate <= filters.to))), 'transactionDate')
  return <Panel title="Transactions">
    <div className="controls ledger-filters">
      <Search label="Search transactions" value={filters.search} onChange={set('search')} />
      <Field label="Status">{(props) => <select {...props} value={filters.status} onChange={(event) => set('status')(event.target.value)}>
        <option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
      </select>}</Field>
      <Field label="Category">{(props) => <select {...props} value={filters.category} onChange={(event) => set('category')(event.target.value)}>
        <option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}
      </select>}</Field>
      <Field label="From date">{(props) => <input {...props} type="date" value={filters.from} onChange={(event) => set('from')(event.target.value)} />}</Field>
      <Field label="To date">{(props) => <input {...props} type="date" value={filters.to} onChange={(event) => set('to')(event.target.value)} />}</Field>
    </div>
    <PageList key={JSON.stringify(filters)} items={filtered} label="transactions" size={10} empty="No transactions match your filters."
      render={(rows) => <table className="ledger">
        <thead><tr><th scope="col">Transaction</th><th scope="col">Date</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col">Amount</th></tr></thead>
        <tbody>{rows.map((item) => <tr key={item.id}>
          <td><SessionLink to={transactionPath(item.accountId, item.id)}>{transactionTitle(item)}</SessionLink>
            <span className="row-sub mobile-only">{dateLabel(item.transactionDate)} · {item.category || 'Uncategorized'}</span>
            <span className="mobile-only"><Status value={item.status} /></span></td>
          <td>{dateLabel(item.transactionDate)}</td><td>{item.category || '—'}</td><td><Status value={item.status} /></td>
          <td className={'amount ' + (Number(item.amount) > 0 ? 'positive' : '')}>{signedMoney(item.amount)}</td>
        </tr>)}</tbody>
      </table>} />
  </Panel>
}

export function AccountDetail() {
  const { accountId } = useParams()
  const { state } = useBank()
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const account = find(state.accounts, accountId)
  if (!account) return <Missing title="Account unavailable" />
  return <>
    <BackLink to="/accounts">All accounts</BackLink>
    <PageTitle title={accountTitle(account)}
      description={[account.nickname && account.productName, mask(account.last4), !open(account) && 'Archived'].filter(Boolean).join(' · ')}>
      <button className="secondary" onClick={() => { setEditing(!editing); setNotice('') }}>Edit nickname</button>
    </PageTitle>
    <div className="stack">
      <div>
        <Balance label={balanceLabel(account)} value={account.currentBalance}
          secondary={isCard(account) ? 'Available credit' : 'Available balance'}
          secondaryValue={isCard(account) ? account.availableCredit : account.availableBalance} />
        <Notice>{notice}</Notice>
      </div>
      {editing && <Nickname account={account} close={() => setEditing(false)} saved={(message) => { setNotice(message); setEditing(false) }} />}
      <Ledger items={records(state.transactions).filter((item) => item.accountId === account.id)} />
    </div>
  </>
}

export function TransactionDetail() {
  const { accountId, transactionId } = useParams()
  const { state } = useBank()
  const account = find(state.accounts, accountId)
  const item = find(state.transactions, transactionId)
  if (!account) return <Missing title="Account unavailable" />
  if (!item || item.accountId !== account.id) return <Missing title="Transaction unavailable" to={accountPath(account.id)} label="Back to account" />
  const related = existingCase(state, item.id)
  return <>
    <BackLink to={accountPath(account.id)}>{accountLabel(account)}</BackLink>
    <PageTitle title={transactionTitle(item)} description="Transaction details" />
    <div className="grid">
      <Panel title="Transaction">
        <p className={'balance-value ' + (Number(item.amount) > 0 ? 'positive' : '')}>{signedMoney(item.amount)}</p>
        <Details rows={[
          ['Account', accountLabel(account)], ['Date', dateLabel(item.transactionDate)],
          ['Category', item.category || '—'], ['Status', <Status value={item.status} />],
          ...(item.merchant && item.merchant !== item.description ? [['Merchant', item.merchant]] : []),
          ...(item.transferId ? [['Transfer ID', item.transferId]] : []),
        ]} />
        <div className="actions">
          {related && <SessionLink className="secondary" to={disputePath(related.id)}>View existing case</SessionLink>}
          {disputable(item, account) && !openCase(related) &&
            <SessionLink className="secondary" to={'/disputes?transaction=' + encodeURIComponent(item.id)}>Report a problem</SessionLink>}
        </div>
      </Panel>
    </div>
  </>
}
