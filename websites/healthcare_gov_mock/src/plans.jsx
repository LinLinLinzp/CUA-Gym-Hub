import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { MissingApplication, useApplication } from './account'
import { useStore } from './store'
import { actor, appPath, byUpdated, canShop, currentSelection, dateLabel, effectiveDate, find, hasMatchingPlans, ids, isAmount, latestResult, linked, marketLabel, matchingPlans, money, newId, pricing, records, replaceApp, selectionPath } from './model'
import { AppCrumb, Chip, DataList, Empty, ErrorSummary, Field, FormActions, Missing, PageTitle, RouteLink, useGo } from './ui'

const listPath = (app) => `${appPath(app)}/plans`
const planPath = (app, plan) => `${listPath(app)}/${encodeURIComponent(plan.id)}`
const reviewPath = (app, plan, result) => `${planPath(app, plan)}/review?result=${encodeURIComponent(result.id)}`
const costRows = [
  ['Gross monthly premium', 'monthlyPremium'],
  ['Deductible', 'deductible'],
  ['Out-of-pocket maximum', 'outOfPocketMax'],
  ['Primary care copay', 'primaryCareCopay'],
]

function planFacts(plan, result) {
  return [
    ['After-credit monthly premium', money(pricing(plan, result).netMonthlyPremium)],
    ...costRows.map(([label, key]) => [label, money(plan[key])]),
    ['Network type', plan.network],
  ]
}

function memberNames(app, memberIds) {
  return ids(memberIds).map((id) => find(app.householdMembers, id)?.fullName || id).join(', ') || 'None listed'
}

export function Catalog() {
  const { state } = useStore()
  const applications = records(state.applications).filter((app) => app.id).sort(byUpdated)
  const eligible = applications.filter((app) => hasMatchingPlans(state, app, latestResult(state, app)))
  const draft = applications.find((app) => app.status === 'draft')
  const plans = records(state.plans).filter((plan) => plan.id)
  return <>
    <PageTitle title="Plans">Explore sample Marketplace plans or shop with an application to see after-credit prices.</PageTitle>
    <section className="card catalog-context">
      <h2>Shop with an application</h2>
      {eligible.length > 0 ? <ul className="market-links">{eligible.map((app) => <li key={app.id}>
        <RouteLink to={listPath(app)}>{marketLabel(app)} <span>{app.id}</span></RouteLink>
      </li>)}</ul> : <>
        <p>Use an eligible application to compare prices for your household and select a plan.</p>
        <RouteLink className="button" to={draft ? `${appPath(draft)}/edit` : '/applications/new'}>{draft ? 'Continue application' : 'Start an application'}</RouteLink>
      </>}
    </section>
    <PlanList plans={plans} />
  </>
}

export function ApplicationPlans() {
  const { app, state } = useApplication()
  if (!app) return <MissingApplication />
  const result = latestResult(state, app)
  const plans = matchingPlans(state, app)
  return <>
    <AppCrumb app={app} />
    <PageTitle title="Compare health plans">{marketLabel(app)} · {app.id}</PageTitle>
    {!canShop(result) ? <Empty title="Plan shopping unavailable" to={appPath(app)} action="Back to application">An eligibility result with eligible household members is required to shop.</Empty> :
      plans.length === 0 ? <Empty title="No plans in this market" to={appPath(app)} action="Back to application">The catalog has no plans for this coverage year and state.</Empty> :
        <>
          <p className="context-note">Sample monthly tax credit <strong>{money(result.monthlyTaxCredit)}</strong>. Premiums reflect the credit available for this application.</p>
          <PlanList key={`${app.id}-${result.id}`} plans={plans} app={app} result={result} />
        </>}
  </>
}

function PlanList({ plans, app, result }) {
  const [query, setQuery] = useState('')
  const [metal, setMetal] = useState('')
  const [network, setNetwork] = useState('')
  const [sort, setSort] = useState('premium')
  const [selected, setSelected] = useState([])
  const [comparing, setComparing] = useState(false)
  const selectedPlans = selected.map((id) => find(plans, id)).filter(Boolean)
  const compareVisible = comparing && selectedPlans.length >= 2
  const values = (key) => [...new Set(plans.map((plan) => plan[key]).filter(Boolean))].sort()
  const cost = (plan) => {
    const amount = sort === 'deductible' ? plan.deductible : app ? pricing(plan, result).netMonthlyPremium : plan.monthlyPremium
    return isAmount(amount) ? amount : Number.MAX_VALUE
  }
  const matches = plans.filter((plan) => [plan.name, plan.insurer].join(' ').toLowerCase().includes(query.trim().toLowerCase()) &&
    (!metal || plan.metal === metal) && (!network || plan.network === network)).sort((a, b) => cost(a) - cost(b) || String(a.name || '').localeCompare(String(b.name || '')))
  function toggle(id) {
    if (selected.includes(id)) {
      const remaining = selected.filter((item) => item !== id)
      setSelected(remaining)
      if (remaining.length < 2) setComparing(false)
    } else if (selected.length < 3) setSelected([...selected, id])
  }

  if (plans.length === 0) return <Empty title="No plans available">The plan catalog is empty.</Empty>
  return <section className="plan-results" aria-label="Plan results">
    <div className="card filters plan-filters">
      <Field id="plan-search" label="Search plans"><input type="search" placeholder="Plan or insurer name" value={query} onChange={(event) => setQuery(event.target.value)} /></Field>
      <Field id="plan-metal" label="Metal category"><select value={metal} onChange={(event) => setMetal(event.target.value)}><option value="">All categories</option>{values('metal').map((value) => <option key={value}>{value}</option>)}</select></Field>
      <Field id="plan-network" label="Network type"><select value={network} onChange={(event) => setNetwork(event.target.value)}><option value="">All networks</option>{values('network').map((value) => <option key={value}>{value}</option>)}</select></Field>
      <Field id="plan-sort" label="Sort by"><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="premium">{app ? 'After-credit monthly premium' : 'Gross monthly premium'}</option><option value="deductible">Deductible</option></select></Field>
    </div>
    <div className="result-tools">
      <p className="results-count" aria-live="polite">{matches.length} {matches.length === 1 ? 'plan' : 'plans'}</p>
      {app && <div className="compare-tools">
        <span aria-live="polite">{selectedPlans.length} of 3 selected</span>
        <button className="secondary" type="button" disabled={selectedPlans.length < 2} aria-expanded={compareVisible} onClick={() => setComparing(!comparing)}>{compareVisible ? 'Hide comparison' : 'Compare selected plans'}</button>
        {selectedPlans.length > 0 && <button className="text-button" type="button" onClick={() => { setSelected([]); setComparing(false) }}>Clear comparison</button>}
      </div>}
    </div>
    {compareVisible && <div className="card comparison">
      <h2>Plan comparison</h2>
      <div className="comparison-scroll" role="region" aria-label="Plan comparison table" tabIndex="0"><table>
        <thead><tr><th scope="col">Plan features</th>{selectedPlans.map((plan) => <th key={plan.id} scope="col"><RouteLink to={planPath(app, plan)}>{plan.name || plan.id}</RouteLink><button className="text-button" type="button" aria-label={`Remove ${plan.name || plan.id} from comparison`} onClick={() => toggle(plan.id)}>Remove</button></th>)}</tr></thead>
        <tbody>{planFacts(selectedPlans[0], result).map(([label], index) => <tr key={label}><th scope="row">{label}</th>{selectedPlans.map((plan) => <td key={plan.id}>{planFacts(plan, result)[index][1] ?? 'Unavailable'}</td>)}</tr>)}</tbody>
      </table></div>
    </div>}
    {matches.length === 0 ? <Empty title="No matching plans">Change the search or filters to see more plans.</Empty> :
      <div className="plan-grid">{matches.map((plan) => <PlanCard key={plan.id} plan={plan} app={app} result={result}
        checked={selected.includes(plan.id)} limit={selected.length >= 3} onToggle={() => toggle(plan.id)} />)}</div>}
  </section>
}

function PlanCard({ plan, app, result, checked, limit, onToggle }) {
  const price = pricing(plan, result)
  return <article className="card plan-card" aria-label={plan.name || plan.id}>
    <div className="plan-heading">
      <div><p className="kicker">{[plan.metal, plan.network].filter(Boolean).join(' · ') || 'Health plan'}</p>
        <h2>{app ? <RouteLink to={planPath(app, plan)}>{plan.name || plan.id}</RouteLink> : (plan.name || plan.id)}</h2>
        <p>{[plan.insurer, !app && (plan.coverageYear || ''), !app && plan.stateCode].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="plan-price"><span>{app ? 'After-credit monthly premium' : 'Gross monthly premium'}</span><strong>{money(app ? price.netMonthlyPremium : price.grossMonthlyPremium)}</strong></div>
    </div>
    <DataList className="plan-metrics" items={costRows.filter(([label]) => app || label !== 'Gross monthly premium').map(([label, key]) => [label, money(plan[key])])} />
    {app && <div className="card-actions">
      <label className="check"><input type="checkbox" aria-label={`Compare ${plan.name || plan.id}`} checked={checked} disabled={limit && !checked} onChange={onToggle} /> Compare</label>
      <RouteLink className="button secondary" to={planPath(app, plan)}>View plan details</RouteLink>
      {isAmount(price.netMonthlyPremium) && <RouteLink className="button" to={reviewPath(app, plan, result)}>Select plan</RouteLink>}
    </div>}
  </article>
}

function usePlan() {
  const { app, state, commit } = useApplication()
  const { planId } = useParams()
  const plan = app && find(matchingPlans(state, app), planId)
  const result = app && latestResult(state, app)
  return { app, plan, result, commit }
}

const PlanUnavailable = ({ app }) => <Missing title="Plan unavailable for this application" to={listPath(app)} action="Back to plans" />

export function PlanDetail() {
  const { app, plan, result } = usePlan()
  if (!app) return <MissingApplication />
  if (!plan || !canShop(result)) return <PlanUnavailable app={app} />
  return <>
    <AppCrumb app={app} />
    <PageTitle title={plan.name || plan.id}>{[plan.insurer, plan.metal, marketLabel(app)].filter(Boolean).join(' · ')}</PageTitle>
    <section className="card reading-card"><h2>Sample plan costs</h2>
      <DataList items={planFacts(plan, result)} />
      <div className="form-actions">
        <RouteLink className="button secondary" to={listPath(app)}>Back to plans</RouteLink>
        {isAmount(pricing(plan, result).netMonthlyPremium) && <RouteLink className="button" to={reviewPath(app, plan, result)}>Select plan</RouteLink>}
      </div>
    </section>
  </>
}

export function PlanReview() {
  const { app, plan, result, commit } = usePlan()
  const [params] = useSearchParams()
  const go = useGo()
  const [errors, setErrors] = useState({})
  if (!app) return <MissingApplication />
  if (!plan || !canShop(result)) return <PlanUnavailable app={app} />
  const price = pricing(plan, result)
  const date = effectiveDate(app.coverageYear)
  const requested = params.get('result')
  const stale = requested && requested !== result.id

  function confirm(event) {
    event.preventDefault()
    const outcome = commit((state) => {
      const current = find(state.applications, app.id)
      const eligibility = current && latestResult(state, current)
      if (current?.status !== 'submitted' || !canShop(eligibility) || result.id !== eligibility.id || stale) return { error: 'Eligibility changed. Return to your plan options and review prices again.' }
      const livePlan = find(matchingPlans(state, current), plan.id)
      const currentPrice = pricing(livePlan, eligibility)
      if (!livePlan || !isAmount(currentPrice.netMonthlyPremium)) return { error: 'Pricing is unavailable for this selection.' }
      const previous = currentSelection(state, current)
      if (previous?.planId === plan.id && previous.eligibilityResultId === eligibility.id && previous.status !== 'replaced') return { selection: previous }
      const createdAt = new Date().toISOString()
      const createdBy = actor(state)
      const selection = {
        id: newId('sel'), applicationId: current.id, planId: livePlan.id, eligibilityResultId: eligibility.id,
        coveredMemberIds: ids(eligibility.eligibleMemberIds), status: currentPrice.netMonthlyPremium > 0 ? 'pending_first_premium' : 'confirmed',
        effectiveDate: effectiveDate(current.coverageYear), ...currentPrice, createdAt, createdBy,
      }
      const selections = Array.isArray(state.planSelections) ? state.planSelections : []
      return {
        selection,
        state: {
          ...replaceApp(state, { ...current, selectedPlanSelectionId: selection.id, updatedAt: createdAt, updatedBy: createdBy }),
          planSelections: [...selections.map((item) => item === previous ? { ...item, status: 'replaced', replacedAt: createdAt, replacedBySelectionId: selection.id } : item), selection],
        },
      }
    })
    if (outcome.error) return setErrors({ form: outcome.error })
    go(selectionPath(app, outcome.selection), { replace: true })
  }

  return <>
    <AppCrumb app={app} />
    <PageTitle title="Review your plan selection">{marketLabel(app)}</PageTitle>
    <section className="card reading-card">
      <h2>{plan.name || plan.id}</h2>
      <DataList items={[
        ['Insurer', plan.insurer], ['Covered household members', memberNames(app, result.eligibleMemberIds)],
        ['Sample effective date', dateLabel(date)], ['Gross monthly premium', money(price.grossMonthlyPremium)],
        ['Applied monthly tax credit', money(price.appliedMonthlyTaxCredit)], ['After-credit monthly premium', money(price.netMonthlyPremium)],
      ]} />
      {stale ? <div className="context-note"><p>Eligibility changed since you opened this review. Check the latest options before confirming.</p><RouteLink to={listPath(app)}>Back to plans</RouteLink></div> :
        isAmount(price.netMonthlyPremium) && app.status === 'submitted' ? <form onSubmit={confirm}>
          <ErrorSummary errors={errors} />
          <FormActions back={planPath(app, plan)} next="Confirm plan selection"><RouteLink to={listPath(app)}>Cancel</RouteLink></FormActions>
        </form> : <p>Plan selection is unavailable. <RouteLink to={listPath(app)}>Back to plans</RouteLink></p>}
    </section>
  </>
}

export function Receipt() {
  const { app, state } = useApplication()
  const { selectionId } = useParams()
  if (!app) return <MissingApplication />
  const selection = linked(state.planSelections, app, selectionId)
  if (!selection) return <Missing title="Plan selection unavailable" to={appPath(app)} action="Back to application" />
  const plan = find(state.plans, selection.planId)
  const result = linked(state.eligibilityResults, app, selection.eligibilityResultId)
  const replacement = linked(state.planSelections, app, selection.replacedBySelectionId)
  return <>
    <AppCrumb app={app} />
    <PageTitle title={selection.status === 'replaced' ? 'Prior plan selection' : 'Plan selection receipt'}>{marketLabel(app)} <Chip status={selection.status} /></PageTitle>
    <section className="card reading-card">
      <h2>{plan?.name || selection.planId || 'Selected plan'}</h2>
      {selection.status === 'pending_first_premium' && <p>Pay your first premium directly to your insurer to start coverage.</p>}
      {selection.status === 'replaced' && <p>Replaced on {dateLabel(selection.replacedAt)}. {replacement && <RouteLink to={selectionPath(app, replacement)}>View replacement selection</RouteLink>}</p>}
      <DataList items={[
        ['Selection reference', selection.id], ['Application reference', app.id], ['Selected on', dateLabel(selection.createdAt)],
        ['Covered household members', memberNames(app, selection.coveredMemberIds)], ['Effective date', dateLabel(selection.effectiveDate)],
        ['Gross monthly premium', money(selection.grossMonthlyPremium)], ['Applied monthly tax credit', money(selection.appliedMonthlyTaxCredit)],
        ['After-credit monthly premium', money(selection.netMonthlyPremium)],
      ]} />
      <div className="form-actions"><RouteLink className="button secondary" to={appPath(app)}>Back to application</RouteLink>
        {result && <RouteLink to={`${appPath(app)}/eligibility/${encodeURIComponent(result.id)}`}>View linked eligibility result</RouteLink>}
      </div>
    </section>
  </>
}
