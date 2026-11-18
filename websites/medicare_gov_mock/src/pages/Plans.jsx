import { createContext, useContext, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount, records, activity } from '../store.jsx'
import { AccountLink, useAccountNavigate, PageTitle, Missing, DataTable, Field, money, dateLabel, Status } from '../ui.jsx'

const SelectionContext = createContext(null)
const zipPattern = /^\d{5}$/
const planType = (type) => ({ advantage: 'Medicare Advantage', drug: 'Prescription drug plan' })[type] ?? 'Plan type unavailable'
const drugs = (plan) => plan.includesDrugCoverage === true ? 'Included' : plan.includesDrugCoverage === false ? 'Not included' : 'Unavailable'
const stars = (plan) => Number.isFinite(plan.rating) ? plan.rating + ' out of 5 stars' : 'Rating unavailable'
const planName = (plan) => plan?.name || 'Plan unavailable'
const availableIn = (plan, zip, year) => plan.status === 'available' && plan.planYear === year && records(plan.zipCodes).includes(zip)

export function PlanSelectionProvider({ children }) {
  const { state } = useAccount()
  const years = [...new Set(records(state.plans).filter((plan) => plan.status === 'available' && Number.isInteger(plan.planYear)).map((plan) => plan.planYear))].sort((a, b) => b - a)
  const [area, setArea] = useState(() => ({
    zip: state.account?.zipCode ?? '',
    year: years.includes(state.account?.shoppingPlanYear) ? state.account.shoppingPlanYear : years[0] ?? '',
  }))
  const [selected, setSelected] = useState([])
  const [message, setMessage] = useState('')
  function changeArea(nextArea) {
    if (nextArea.zip !== area.zip || nextArea.year !== area.year) {
      setSelected([])
      setMessage(selected.length ? 'Selections cleared for the new ZIP code or plan year.' : '')
    }
    setArea(nextArea)
  }
  function togglePlan(plan) {
    if (selected.includes(plan.id)) {
      setSelected(selected.filter((id) => id !== plan.id))
      setMessage('')
    } else if (selected.length === 3) {
      setMessage('You can compare up to 3 plans. Remove one before adding another.')
    } else if (availableIn(plan, area.zip, area.year)) {
      setSelected([...selected, plan.id])
      setMessage('')
    }
  }
  return <SelectionContext.Provider value={{ years, area, changeArea, selected, togglePlan, message }}>{children}</SelectionContext.Provider>
}

function SelectPlan({ plan }) {
  const { selected, togglePlan } = useContext(SelectionContext)
  const checked = selected.includes(plan.id)
  return <button type="button" className="secondary" aria-pressed={checked} onClick={() => togglePlan(plan)}>
    {checked ? 'Remove from comparison' : 'Select for comparison'}
  </button>
}

function PlanCard({ plan }) {
  const { selected } = useContext(SelectionContext)
  return <article className={'panel plan-card' + (selected.includes(plan.id) ? ' selected' : '')}>
    <small>{planType(plan.type)}</small>
    <div><h3>{planName(plan)}</h3><p>{plan.carrier || 'Carrier unavailable'}</p></div>
    <div className="premium">{money(plan.monthlyPremium)}{Number.isFinite(plan.monthlyPremium) && <small>/ month</small>}</div>
    <p className="plan-facts"><span>{stars(plan)}</span><span>Drug coverage: {drugs(plan).toLowerCase()}</span></p>
    {records(plan.benefits).length > 0 && <small>{records(plan.benefits).join(' · ')}</small>}
    <div className="actions"><AccountLink className="button secondary" to={'/plans/' + encodeURIComponent(plan.id)}>Details<span className="sr-only"> for {planName(plan)}</span></AccountLink><SelectPlan plan={plan} /></div>
  </article>
}

function ComparisonTray({ plans }) {
  const { selected, togglePlan, message } = useContext(SelectionContext)
  if (!selected.length && !message) return null
  return <section className="panel tray" aria-label="Comparison tray">
    <div className="section-head"><h2>Compare selected plans ({selected.length} of 3)</h2>
      {selected.length >= 2 && <AccountLink className="button" to="/plans/compare">Compare {selected.length} plans</AccountLink>}
    </div>
    {selected.length > 0 && <ul>{selected.map((id) => {
      const plan = plans.find((item) => item.id === id) ?? { id }
      return <li key={id}>{planName(plan)} <button type="button" className="secondary" aria-label={'Remove ' + planName(plan)} onClick={() => togglePlan(plan)}>Remove</button></li>
    })}</ul>}
    <p aria-live="polite">{message || (selected.length === 1 ? 'Select at least one more plan to compare.' : '')}</p>
  </section>
}

export function PlanWorkspace() {
  const { state } = useAccount()
  const { area, years, changeArea } = useContext(SelectionContext)
  const [zip, setZip] = useState(area.zip)
  const [year, setYear] = useState(area.year)
  const [zipError, setZipError] = useState('')
  const [type, setType] = useState('')
  const [drug, setDrug] = useState('')
  const [rating, setRating] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('')
  const plans = records(state.plans)
  const localPlans = plans.filter((plan) => availableIn(plan, area.zip, area.year))
  const search = query.trim().toLowerCase()
  const results = localPlans.filter((plan) =>
    (!type || plan.type === type) &&
    (!drug || (typeof plan.includesDrugCoverage === 'boolean' && plan.includesDrugCoverage === (drug === 'yes'))) &&
    (!rating || (Number.isFinite(plan.rating) && plan.rating >= Number(rating))) &&
    (!search || [plan.name, plan.carrier].some((value) => String(value ?? '').toLowerCase().includes(search))),
  )
  if (sort === 'premium') results.sort((a, b) => (a.monthlyPremium ?? Infinity) - (b.monthlyPremium ?? Infinity))
  if (sort === 'rating') results.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
  const saved = records(state.planComparisons).filter((entry) => entry.actorId === state.account?.id).slice().reverse()

  function updateArea(event) {
    event.preventDefault()
    if (!zipPattern.test(zip.trim())) {
      setZipError('Enter a five-digit ZIP code.')
      event.currentTarget.elements.zip.focus()
      return
    }
    setZipError('')
    setZip(zip.trim())
    changeArea({ zip: zip.trim(), year: year === '' ? '' : Number(year) })
  }

  return <>
    <PageTitle title="Compare plans" description="Explore Medicare Advantage and prescription drug plans available in your area." />
    <div className="stack">
      <section className="panel stack" aria-label="Plan search">
        <form className="form-row" noValidate onSubmit={updateArea}>
          <Field label="ZIP code" id="zip" error={zipError}><input id="zip" name="zip" inputMode="numeric" autoComplete="postal-code" value={zip} onChange={(event) => setZip(event.target.value)} aria-invalid={!!zipError} aria-describedby={zipError ? 'zip-error' : undefined} /></Field>
          <Field label="Plan year" id="plan-year"><select id="plan-year" value={year} onChange={(event) => setYear(event.target.value)}>{years.length ? years.map((value) => <option key={value}>{value}</option>) : <option value="">No years available</option>}</select></Field>
          <button type="submit">Find plans</button>
        </form>
        <div className="form-row">
          <Field label="Search plans or carriers" id="plan-search"><input id="plan-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></Field>
          <Field label="Plan type" id="plan-type"><select id="plan-type" value={type} onChange={(event) => setType(event.target.value)}><option value="">All plan types</option><option value="advantage">Medicare Advantage</option><option value="drug">Prescription drug plans</option></select></Field>
          <Field label="Drug coverage" id="drug"><select id="drug" value={drug} onChange={(event) => setDrug(event.target.value)}><option value="">Any coverage</option><option value="yes">Included</option><option value="no">Not included</option></select></Field>
          <Field label="Minimum rating" id="rating"><select id="rating" value={rating} onChange={(event) => setRating(event.target.value)}><option value="">Any rating</option>{[3, 3.5, 4, 4.5, 5].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></Field>
          <Field label="Sort by" id="plan-sort"><select id="plan-sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="">Catalog order</option><option value="premium">Lowest monthly premium</option><option value="rating">Highest star rating</option></select></Field>
        </div>
      </section>
      <section className="panel">
        <h2>Saved comparisons</h2>
        {saved.length ? <ul className="clean-list">{saved.map((entry) => <li key={entry.id}>
          <div><AccountLink to={'/plans/compare/' + encodeURIComponent(entry.id)}>{records(entry.planIds).map((id) => planName(plans.find((plan) => plan.id === id))).join(' · ') || 'Saved comparison'}</AccountLink>
          <small>{entry.zipCode || 'ZIP unavailable'} · {entry.planYear || 'Year unavailable'} · {dateLabel(entry.createdAt)}</small></div>
          <Status value={entry.status} />
        </li>)}</ul> : <p>Saved comparisons will appear here.</p>}
      </section>
      <section className="stack" aria-label="Plan results">
        <h2 aria-live="polite">{results.length} {results.length === 1 ? 'plan' : 'plans'}{area.zip && area.year ? ' for ' + area.zip + ' · ' + area.year : ''}</h2>
        {results.length ? <div className="plan-grid">{results.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div> :
          <p className="panel">{localPlans.length ? 'No plans match these filters. Try a different search or rating.' : 'No plans are available for this ZIP code and plan year.'}</p>}
      </section>
      <ComparisonTray plans={plans} />
    </div>
  </>
}

const facts = [
  ['Monthly premium', (plan) => money(plan.monthlyPremium)],
  ['Drug deductible', (plan) => plan.includesDrugCoverage === false ? 'Not applicable' : money(plan.drugDeductible)],
  ['Medical out-of-pocket maximum', (plan) => plan.type === 'drug' ? 'Not applicable' : money(plan.medicalOutOfPocketMax)],
  ['Star rating', stars],
  ['Drug coverage', drugs],
  ['Network', (plan) => plan.type === 'drug' ? 'Not applicable' : plan.network || 'Unavailable'],
  ['Benefits', (plan) => records(plan.benefits).join(', ') || 'Unavailable'],
]

export function PlanDetails() {
  const { state } = useAccount()
  const { planId } = useParams()
  const { area, message } = useContext(SelectionContext)
  const plans = records(state.plans)
  const plan = plans.find((item) => item.id === planId)
  if (!plan) return <Missing title="Plan unavailable" to="/plans" link="Back to plans" />
  return <>
    <AccountLink className="back-link" to="/plans">Back to plans</AccountLink>
    <PageTitle title={planName(plan)} description={[plan.carrier, planType(plan.type), plan.planYear].filter(Boolean).join(' · ')}><Status value={plan.status} /></PageTitle>
    <div className="stack">
      <section className="panel narrow stack">
        <h2>Costs and coverage</h2>
        <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value(plan)}</dd></div>)}
          <div><dt>Service area ZIP codes</dt><dd>{records(plan.zipCodes).join(', ') || 'Unavailable'}</dd></div></dl>
        <div className="actions">
          {plan.status === 'available' && <AccountLink className="button" to={'/enrollment/apply/' + encodeURIComponent(plan.id)}>Enroll</AccountLink>}
          {availableIn(plan, area.zip, area.year) && <SelectPlan plan={plan} />}
        </div>
        {message && <p aria-live="polite">{message}</p>}
      </section>
      <ComparisonTray plans={plans} />
    </div>
  </>
}

export function ComparePlans() {
  const { comparisonId } = useParams()
  const { area, selected } = useContext(SelectionContext)
  const { state, append } = useAccount()
  const navigate = useAccountNavigate()
  const [justSaved, setJustSaved] = useState(false)
  const saved = comparisonId ? records(state.planComparisons).find((item) => item.id === comparisonId && item.actorId === state.account?.id) : null
  if (comparisonId && !saved) return <Missing title="Comparison unavailable" to="/plans" link="Back to plans" />
  const ids = saved ? records(saved.planIds) : selected
  const planList = ids.map((id) => records(state.plans).find((plan) => plan.id === id))
  const zip = saved ? saved.zipCode : area.zip
  const year = saved ? saved.planYear : area.year

  function save() {
    const record = append('planComparisons', (current) => {
      if (!current.account?.id || !zipPattern.test(zip) || new Set(ids).size !== ids.length || ids.length < 2 || ids.length > 3 ||
        !ids.every((id) => records(current.plans).some((plan) => plan.id === id && availableIn(plan, zip, year)))) return null
      return { ...activity('comparison', current.account.id), planIds: [...ids], zipCode: zip, planYear: year, status: 'saved' }
    })
    if (record) {
      setJustSaved(true)
      navigate('/plans/compare/' + encodeURIComponent(record.id), { replace: true })
    }
  }

  return <>
    <AccountLink className="back-link" to="/plans">Back to plans</AccountLink>
    <PageTitle title={saved ? 'Saved comparison' : 'Compare selected plans'} description={[zip && 'ZIP ' + zip, year && 'Plan year ' + year].filter(Boolean).join(' · ')}>
      {saved && <Status value={saved.status} />}
    </PageTitle>
    <div className="panel stack">
      {saved && <p role="status">Comparison saved {dateLabel(saved.createdAt)}.</p>}
      {ids.length > 0 && planList.some((plan) => !plan) && <p className="notice">A plan in this comparison is unavailable. Its saved reference is still shown.</p>}
      {ids.length ? <div className="table-scroll compare-table" tabIndex={0} role="region" aria-label="Side-by-side plan comparison">
        <table><thead><tr><th scope="col">Coverage and costs</th>{ids.map((id, index) => <th scope="col" key={id}>
          {planList[index] ? <AccountLink to={'/plans/' + encodeURIComponent(id)}>{planName(planList[index])}</AccountLink> : <>Plan unavailable<small>{id}</small></>}
        </th>)}</tr></thead><tbody>{facts.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{ids.map((id, index) => <td key={id}>{planList[index] ? value(planList[index]) : 'Unavailable'}</td>)}</tr>)}</tbody></table>
      </div> : <p>{saved ? 'There are no plans in this saved comparison.' : 'Select two or three plans from the same ZIP code and plan year to compare them.'}</p>}
      {!saved && ids.length === 1 && <p>Select one more plan to save a comparison.</p>}
      {!saved && ids.length >= 2 && <div className="actions"><button type="button" onClick={save} disabled={justSaved || !state.account?.id || planList.some((plan) => !plan)}>Save comparison</button></div>}
    </div>
  </>
}
