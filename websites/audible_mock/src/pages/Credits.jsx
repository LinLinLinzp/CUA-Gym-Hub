import { Empty } from '../components/Empty.jsx'
import { Icon } from '../components/Icon.jsx'
import { orderPath, SiteLink } from '../components/links.jsx'
import { dateLabel, Heading, recentFirst } from '../components/ui.jsx'
import { useAccount } from '../state/AccountProvider.jsx'
import { creditStatus, rows, titleLabel, usableCredits } from '../state/selectors.js'

const transactionNames = { issued: 'Membership credit', redeemed: 'Credit used', refund: 'Credit refund' }

function CreditEntries({ entries, now, historical = false }) {
  return (
    <ul className="ledger-list">
      {entries.map((credit, index) => {
        const status = creditStatus(credit, now)
        return (
          <li className="ledger-row" key={credit.id ?? index}>
            <div>
              <strong>{credit.source === 'return' ? 'Returned-title credit' : 'Membership credit'}</strong>
              <span>Issued {dateLabel(credit.createdAt)}</span>
            </div>
            <div>
              <strong>{credit.expiresAt ? dateLabel(credit.expiresAt) : 'No expiration date'}</strong>
              <span>Expiration</span>
            </div>
            <div className="ledger-number">
              {historical ? <span className={`pill ${status === 'Expired' ? 'muted-danger' : ''}`}>{status}</span> : <strong>1 credit</strong>}
              {credit.purchaseId && <SiteLink to={orderPath(credit.purchaseId)}>Order details</SiteLink>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function Credits() {
  const { state } = useAccount()
  const now = new Date()
  const available = usableCredits(state, now)
  const availableSet = new Set(available)
  const historical = rows(state, 'credits').filter((credit) => !availableSet.has(credit)).sort(recentFirst)
  const transactions = rows(state, 'creditTransactions').sort(recentFirst)
  const titles = new Map(rows(state, 'titles').map((title) => [title.id, title]))

  return (
    <section>
      <Heading title="Credit summary" />
      <div className="balance-panel">
        <div className="balance-value">
          <Icon name="credit" />
          <div><strong>{available.length}</strong><span>{available.length === 1 ? 'Available credit' : 'Available credits'}</span></div>
        </div>
        <SiteLink className="button" to="/browse">Browse audiobooks</SiteLink>
      </div>
      <section className="account-section">
        <h2>Available credits</h2>
        {available.length ? <CreditEntries entries={available} now={now} />
          : <Empty title="No credits available">Available membership credits and refunds will appear here.</Empty>}
      </section>
      <section className="account-section">
        <h2>Credit activity</h2>
        {transactions.length ? (
          <ul className="ledger-list">
            {transactions.map((transaction, index) => (
              <li className="ledger-row" key={transaction.id ?? index}>
                <div>
                  <strong>{transactionNames[transaction.type] || 'Credit activity'}</strong>
                  <span>{dateLabel(transaction.createdAt)}</span>
                </div>
                <div>
                  {transaction.titleId && <strong>{titleLabel(titles.get(transaction.titleId))}</strong>}
                  {transaction.purchaseId && <SiteLink to={orderPath(transaction.purchaseId)}>Order details</SiteLink>}
                </div>
                <div className="ledger-number"><strong className={transaction.amount > 0 ? 'amount-positive' : ''}>
                  {Number.isFinite(transaction.amount) ? `${transaction.amount > 0 ? '+' : ''}${transaction.amount}` : '—'}
                </strong></div>
              </li>
            ))}
          </ul>
        ) : <Empty title="No credit activity yet" />}
      </section>
      <section className="account-section">
        <h2>Past credits</h2>
        {historical.length ? <CreditEntries entries={historical} now={now} historical />
          : <Empty title="No past credits" />}
      </section>
    </section>
  )
}
