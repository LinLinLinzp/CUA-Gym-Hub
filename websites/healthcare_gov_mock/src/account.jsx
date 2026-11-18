import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from './store'
import { appPath, byUpdated, currentSelection, dateLabel, find, hasMatchingPlans, ids, latestResult, linked, marketLabel, money, records, selectionPath, stateName, statusText } from './model'
import { AppCrumb, ApplicationTable, Chip, DataList, Empty, Field, Missing, PageTitle, RouteLink } from './ui'

const newPath = '/applications/new'
const start = <RouteLink className="button" to={newPath}>Start an application</RouteLink>
const applicationsFor = (state) => records(state.applications).filter((app) => app.id).sort(byUpdated)
export const useApplication = () => {
  const { applicationId } = useParams()
  const { state, commit } = useStore()
  return { app: find(state.applications, applicationId), state, commit }
}
export const MissingApplication = () => <Missing title="Application unavailable" to="/applications" action="View applications" />

function nextAction(state, app) {
  if (!app) return { label: 'Start an application', to: newPath, detail: 'Start an application to check eligibility and explore coverage options.' }
  const path = appPath(app)
  if (app.status === 'draft') return { label: 'Continue application', to: `${path}/edit`, detail: `Finish your ${app.coverageYear || ''} application when you’re ready.` }
  const result = latestResult(state, app)
  const selection = currentSelection(state, app)
  if (hasMatchingPlans(state, app, result) && selection?.eligibilityResultId !== result.id) {
    return { label: 'Compare plans', to: `${path}/plans`, detail: 'Review available plans and find an option for your household.' }
  }
  if (selection) return { label: 'View plan selection', to: selectionPath(app, selection), detail: 'Review your selected plan and monthly premium.' }
  if (result) return { label: 'View eligibility results', to: `${path}/eligibility`, detail: 'Check your household’s eligibility and next steps.' }
  return { label: 'View application', to: path, detail: 'Review the information in your application.' }
}

export function Overview() {
  const { state } = useStore()
  const applications = applicationsFor(state)
  const current = applications[0]
  const next = nextAction(state, current)
  const withCoverage = applications.find((app) => currentSelection(state, app))
  const coverage = withCoverage && currentSelection(state, withCoverage)
  const selectedPlan = find(state.plans, coverage?.planId)
  const ready = applications.find((app) => !currentSelection(state, app) && hasMatchingPlans(state, app, latestResult(state, app)))
  return <>
    <section className="hero">
      <div className="hero-art" aria-hidden="true"><i /><i /><i /></div>
      <div className="hero-content">
        <p className="kicker">Marketplace account</p>
        <h1>Your coverage overview</h1>
        <p>{next.detail}{current && <> <RouteLink to={appPath(current)}>{current.id}</RouteLink></>}</p>
        <RouteLink className="button" to={next.to}>{next.label}</RouteLink>
      </div>
    </section>
    <div className="overview-grid">
      <section>
        <div className="section-heading"><h2>Recent applications</h2><RouteLink to="/applications">View all applications <span aria-hidden="true">↗</span></RouteLink></div>
        {applications.length ? <ApplicationTable applications={applications.slice(0, 4)} compact /> :
          <Empty title="No applications yet" to={newPath} action="Start an application">Save your progress and return when you’re ready.</Empty>}
        {applications.length > 0 && <div className="section-actions"><RouteLink className="button secondary" to={newPath}>Start an application</RouteLink></div>}
      </section>
      <aside className="overview-aside">
        <section className="card next-card">
          <h2>Coverage summary</h2>
          {coverage ? <>
            <p className="coverage-name">{selectedPlan?.name || 'Selected health plan'}</p>
            <Chip status={coverage.status} />
            <DataList items={[[ 'Coverage year', withCoverage.coverageYear ], [ 'Monthly premium', money(coverage.netMonthlyPremium) ]]} />
            <RouteLink to={selectionPath(withCoverage, coverage)}>View plan selection</RouteLink>
          </> : <p>Your selected plan will appear here after you confirm it.</p>}
        </section>
        {(ready || withCoverage) && <section className="card quick-card">
          <h2>Next steps</h2>
          <ul className="link-list">
            {ready && <li><RouteLink to={`${appPath(ready)}/plans`}>Compare plans for {ready.coverageYear || 'your application'}</RouteLink></li>}
            {withCoverage?.status === 'submitted' && <li><RouteLink to={`${appPath(withCoverage)}/report-income`}>Report a life change</RouteLink></li>}
          </ul>
        </section>}
      </aside>
    </div>
  </>
}

export function Applications() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('')
  const [status, setStatus] = useState('')
  const applications = applicationsFor(state)
  const years = [...new Set(applications.map((app) => app.coverageYear).filter(Boolean))].sort((a, b) => b - a)
  const matches = applications.filter((app) => {
    const names = records(app.householdMembers).map((member) => member.fullName)
    const haystack = [app.id, app.contact?.fullName, ...names].join(' ').toLowerCase()
    return haystack.includes(query.trim().toLowerCase()) && (!year || String(app.coverageYear) === year) && (!status || app.status === status)
  })
  return <>
    <PageTitle title="Applications" action={start}>Start a new application or manage one you’ve saved or submitted.</PageTitle>
    {applications.length === 0 ? <Empty title="No applications yet" to={newPath} action="Start an application">Start by choosing your coverage year and where you live.</Empty> : <>
      <div className="card filters">
        <Field id="app-search" label="Search applications"><input type="search" placeholder="Reference or name" value={query} onChange={(event) => setQuery(event.target.value)} /></Field>
        <Field id="app-year" label="Coverage year"><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">All years</option>{years.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field id="app-status" label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="draft">Draft</option><option value="submitted">Submitted</option></select></Field>
      </div>
      <p className="results-count" aria-live="polite">{matches.length} {matches.length === 1 ? 'application' : 'applications'} · Newest updated first</p>
      {matches.length ? <ApplicationTable applications={matches} /> : <Empty title="No matching applications">Change the search or filters to see more applications.</Empty>}
    </>}
  </>
}

export function ApplicationDetail() {
  const { state, app } = useApplication()
  if (!app) return <MissingApplication />
  const path = appPath(app)
  const result = latestResult(state, app)
  const selection = currentSelection(state, app)
  const plan = find(state.plans, selection?.planId)
  const pastResults = records(state.eligibilityResults).filter((item) => item.id && item.applicationId === app.id && item.id !== result?.id)
  const pastSelections = records(state.planSelections).filter((item) => item.id && item.applicationId === app.id && item.id !== selection?.id)
  return <>
    <AppCrumb app={app} />
    <PageTitle title={app.status === 'draft' ? 'Application draft' : 'Application details'} action={app.status === 'draft' && <RouteLink className="button" to={`${path}/edit`}>Continue application</RouteLink>}>
      {marketLabel(app)} <Chip status={app.status} />
    </PageTitle>
    <div className="detail-grid">
      <section className="card">
        <h2>Application summary</h2>
        <DataList items={[
          ['Application reference', app.id], ['Last updated', dateLabel(app.updatedAt)],
          ...(app.status === 'submitted' ? [['Submitted', dateLabel(app.submittedAt)]] : []),
          ['Contact name', app.contact?.fullName], ['Household members', records(app.householdMembers).length],
          ['Current monthly income', money(app.income?.monthlyAmount)], ['Expected annual income', money(app.income?.annualEstimate)],
        ]} />
      </section>
      <section className="card">
        <h2>Coverage and next steps</h2>
        {result ? <>
          <p><Chip status={result.status} /></p>
          <div className="stack-links"><RouteLink to={`${path}/eligibility`}>View eligibility results</RouteLink>
          {hasMatchingPlans(state, app, result) && <RouteLink to={`${path}/plans`}>{selection?.eligibilityResultId === result.id ? 'Review plans' : 'Compare plans'}</RouteLink>}</div>
        </> : <p>{app.status === 'draft' ? 'Submit your application to see eligibility results.' : 'Eligibility results are unavailable.'}</p>}
        {selection && <div className="subsection"><p>{plan?.name || 'Selected plan'} · {statusText(selection.status)}</p><RouteLink to={selectionPath(app, selection)}>View plan selection</RouteLink></div>}
        {app.status === 'submitted' && <div className="subsection"><RouteLink to={`${path}/report-income`}>Report a life change</RouteLink></div>}
      </section>
    </div>
    {(pastResults.length > 0 || pastSelections.length > 0) && <section className="card history">
      <h2>Application history</h2>
      {pastResults.length > 0 && <><h3>Prior eligibility results</h3><ul className="link-list">{pastResults.map((item) => <li key={item.id}><RouteLink to={`${path}/eligibility/${encodeURIComponent(item.id)}`}>{dateLabel(item.createdAt)} · {item.trigger === 'income_update' ? 'Income update' : 'Initial submission'} · {item.id}</RouteLink></li>)}</ul></>}
      {pastSelections.length > 0 && <><h3>Prior plan selections</h3><ul className="link-list">{pastSelections.map((item) => <li key={item.id}><RouteLink to={selectionPath(app, item)}>{find(state.plans, item.planId)?.name || item.planId || 'Plan selection'} · {dateLabel(item.createdAt)} · {statusText(item.status)}</RouteLink></li>)}</ul></>}
    </section>}
  </>
}

export function Eligibility() {
  const { state, app } = useApplication()
  const { resultId } = useParams()
  if (!app) return <MissingApplication />
  const path = appPath(app)
  const latest = latestResult(state, app)
  const result = resultId ? linked(state.eligibilityResults, app, resultId) : latest
  if (!result) return <Missing title="Eligibility result unavailable" to={path} action="Back to application" />
  const current = latest?.id === result.id
  const selection = currentSelection(state, app)
  const applicants = ids(result.eligibleMemberIds).map((id) => find(app.householdMembers, id)?.fullName || id)
  const market = [result.coverageYear || app.coverageYear, stateName(app.stateCode)].filter(Boolean).join(' · ')
  return <>
    <AppCrumb app={app} />
    <PageTitle title={result.trigger === 'income_update' && current ? 'Updated eligibility results' : 'Eligibility results'}>{market} <Chip status={result.status} /></PageTitle>
    <section className="card reading-card">
      <h2>{result.trigger === 'income_update' ? 'Income update received' : 'Application submitted'}</h2>
      <p>Application reference <strong>{app.id}</strong></p>
      {!current && <p>This is a prior result. {latest && <RouteLink to={`${path}/eligibility`}>View current eligibility</RouteLink>}</p>}
      <DataList items={[
        ['Result date', dateLabel(result.createdAt)], ['Eligible household members', applicants.join(', ') || 'None listed'],
        ['Expected annual income', money(result.annualIncomeEstimate)], ['Sample monthly tax credit', money(result.monthlyTaxCredit)],
      ]} />
      <div className="form-actions">
        <RouteLink className="button secondary" to={path}>View application</RouteLink>
        {current && hasMatchingPlans(state, app, result) && <RouteLink className="button" to={`${path}/plans`}>{selection?.eligibilityResultId === result.id ? 'Review plans' : 'Compare plans'}</RouteLink>}
        {current && !hasMatchingPlans(state, app, result) && selection && <RouteLink to={selectionPath(app, selection)}>Review your plan</RouteLink>}
      </div>
    </section>
  </>
}
