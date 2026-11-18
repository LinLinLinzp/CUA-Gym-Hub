import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { addStatementActivity, useAccount } from '../account.jsx'
import { compareDates, date, money, records, show } from '../display.js'
import { PageHeading, Results, SortButton, StatementLink, Unavailable, YearFilter } from '../ui.jsx'
import { DocumentView } from '../documents.jsx'

const statementKinds = {
  social_security_statement: 'Social Security Statements',
  tax_benefit_statement: 'Tax benefit statements',
}

export function Statements() {
  const { state } = useAccount()
  const [kind, setKind] = useState('social_security_statement')
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('')
  const [order, setOrder] = useState('newest')
  const statements = records(state.statements).filter(item => item.kind === kind)
  const years = [...new Set(statements.map(item => item.year).filter(Number.isInteger))].sort((a, b) => b - a)
  const term = query.trim().toLowerCase()
  const matches = statements.filter(item =>
    (!year || String(item.year) === year) && [item.title, item.year, item.form].join(' ').toLowerCase().includes(term),
  ).sort((a, b) => compareDates(a.issuedOn, b.issuedOn, a.id, b.id, order))

  function resetFilters() {
    setYear('')
    setQuery('')
  }

  return <div className="stack">
    <PageHeading title="Benefit statements" description="Find your Social Security Statements and tax benefit statements by year." />
    <section className="panel archive" aria-label="Statements archive">
      <div className="switcher" role="group" aria-label="Statement type">
        {Object.entries(statementKinds).map(([value, label]) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => {
          setKind(value)
          resetFilters()
        }}>{label}</button>)}
      </div>
      <div className="filters">
        <label>Search statements<input type="search" value={query} placeholder="Title, year or form" onChange={event => setQuery(event.target.value)} /></label>
        <YearFilter year={year} setYear={setYear} years={years} />
      </div>
      <Results count={matches.length} noun="statement" empty={statements.length ? 'No statements match your filters.' : 'No statements of this type are available.'} reset={term || year ? resetFilters : undefined} />
      {matches.length > 0 && <table className="archive-table" aria-label={statementKinds[kind]}>
        <thead><tr>
          <th scope="col">Statement</th>
          <th scope="col" aria-sort={order === 'newest' ? 'descending' : 'ascending'}><SortButton order={order} setOrder={setOrder} label="Issued" /></th>
        </tr></thead>
        <tbody>{matches.map((item, index) => <tr key={item.id ?? index}>
          <th scope="row"><StatementLink statement={item}>{item.title || 'Benefit statement'}</StatementLink>
            {item.form && <span className="row-subtitle">{item.form}</span>}
          </th>
          <td>{date(item.issuedOn)}</td>
        </tr>)}</tbody>
      </table>}
    </section>
  </div>
}

export function StatementDetail() {
  const { statementId } = useParams()
  const { state, commit } = useAccount()
  const statement = records(state.statements).find(item => item.id === statementId)
  if (!statement) return <Unavailable title="Statement unavailable" to="/statements" linkText="Back to benefit statements" />

  const tax = statement.kind === 'tax_benefit_statement'
  const earnings = records(state.earnings).filter(row =>
    statement.beneficiaryId && row.beneficiaryId === statement.beneficiaryId &&
    Number.isInteger(row.year) && Number.isInteger(statement.earningsThroughYear) && row.year <= statement.earningsThroughYear,
  ).sort((a, b) => b.year - a.year || String(a.id ?? '').localeCompare(String(b.id ?? '')))
  const estimates = records(statement.estimates).sort((a, b) => a.age - b.age)
  const doc = {
    title: statement.title || 'Benefit statement',
    date: date(statement.issuedOn),
    facts: tax ? [
      ['Tax year', show(statement.year)], ['Form', show(statement.form)],
      ['Benefits paid', money(statement.benefitsPaid)], ['Benefits repaid', money(statement.benefitsRepaid)],
      ['Net benefits', money(statement.netBenefits)],
    ] : [['Statement year', show(statement.year)], ['Earnings through', show(statement.earningsThroughYear)]],
    tables: tax ? [] : [
      {
        heading: 'Estimated monthly benefits', columns: ['Claiming age', 'Monthly estimate'],
        rows: estimates.map(item => [show(item.age), money(item.monthlyAmount)]),
      },
      {
        heading: 'Earnings record', columns: ['Year', 'Social Security earnings', 'Medicare earnings'],
        rows: earnings.map(item => [show(item.year), money(item.socialSecurityEarnings), money(item.medicareEarnings)]),
      },
    ],
  }

  return <DocumentView doc={doc} backTo="/statements" backText="Back to benefit statements"
    filename={statement.id} onAction={action => addStatementActivity(commit, statement, action)} />
}
