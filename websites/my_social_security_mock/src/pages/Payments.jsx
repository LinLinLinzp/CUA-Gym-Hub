import React, { useState } from 'react'
import { useAccount } from '../account.jsx'
import { compareDates, date, money, records, show } from '../display.js'
import { PageHeading, Results, SortButton, YearFilter } from '../ui.jsx'

function paymentYear(item) {
  const value = typeof item.paidOn === 'string' ? item.paidOn.slice(0, 4) : ''
  return /^\d{4}$/.test(value) ? value : ''
}

export function Payments() {
  const { state } = useAccount()
  const [year, setYear] = useState('')
  const [order, setOrder] = useState('newest')
  const payments = records(state.payments)
  const years = [...new Set(payments.map(paymentYear).filter(Boolean))].sort((a, b) => b - a)
  const matches = payments.filter(item => !year || paymentYear(item) === year)
    .sort((a, b) => compareDates(a.paidOn, b.paidOn, a.id, b.id, order))

  return <div className="stack">
    <PageHeading title="Payment history" description="Review your benefit payments and deductions by year." />
    <section className="panel archive" aria-label="Benefit payments">
      <div className="filters"><YearFilter year={year} setYear={setYear} years={years} /></div>
      <Results count={matches.length} noun="payment" empty="No payments are available for this view." reset={year ? () => setYear('') : undefined} />
      {matches.length > 0 && <div className="table-scroll" role="region" aria-label="Payment history table" tabIndex="0">
        <table className="money-table" aria-label="Payment history">
          <thead><tr>
            <th scope="col" aria-sort={order === 'newest' ? 'descending' : 'ascending'}><SortButton order={order} setOrder={setOrder} label="Paid on" /></th>
            <th scope="col" className="text-cell">Benefit type</th>
            <th scope="col">Gross</th><th scope="col">Deductions</th><th scope="col">Net</th>
          </tr></thead>
          <tbody>{matches.map((item, index) => <tr key={item.id ?? index}>
            <th scope="row">{date(item.paidOn)}</th>
            <td className="text-cell">{show(item.benefitType)}</td><td>{money(item.gross)}</td><td>{money(item.deductions)}</td><td>{money(item.net)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </div>
}
