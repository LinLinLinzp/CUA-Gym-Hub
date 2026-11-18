import React, { useState } from 'react'
import { MissingApplication, useApplication } from './account'
import { IncomeFields, readIncome } from './application-form'
import { actor, appPath, dateLabel, find, makeResult, marketLabel, money, newId, replaceApp, today, validDate } from './model'
import { AppCrumb, DataList, Empty, ErrorSummary, Field, FormActions, PageTitle, RouteLink, Steps, useGo } from './ui'

const steps = ['Choose a life change', 'Enter updated income', 'Review and submit']
const sources = { job: 'Job', self_employment: 'Self-employment', unemployment: 'Unemployment', retirement: 'Retirement', other: 'Other' }
const amounts = (income) => ({ monthlyAmount: income?.monthlyAmount ?? null, annualEstimate: income?.annualEstimate ?? null })
const sameIncome = (a, b) => a.monthlyAmount === b.monthlyAmount && a.annualEstimate === b.annualEstimate

export function ReportIncome() {
  const { app, commit } = useApplication()
  if (!app) return <MissingApplication />
  if (app.status !== 'submitted') return <Empty title="Income reporting is unavailable" to={appPath(app)} action="Back to application">Submit your application before reporting a life change.</Empty>
  return <IncomeFlow key={app.id} app={app} commit={commit} />
}

function IncomeFlow({ app, commit }) {
  const go = useGo()
  const path = appPath(app)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [base] = useState(() => ({ prior: amounts(app.income), resultId: app.latestEligibilityResultId }))
  const [values, setValues] = useState(() => ({
    monthly: String(base.prior.monthlyAmount ?? ''), annual: String(base.prior.annualEstimate ?? ''), effectiveDate: '', source: '',
  }))
  const [proposed, setProposed] = useState(null)

  function move(next) {
    setErrors({})
    setStep(next)
    window.scrollTo(0, 0)
    document.getElementById('content')?.focus({ preventScroll: true })
  }

  function review(event) {
    event.preventDefault()
    const problems = {}
    const income = readIncome(values, problems)
    if (!problems.monthly && !problems.annual && sameIncome(income, base.prior)) problems.monthly = 'Change at least one income amount.'
    if (!validDate(values.effectiveDate) || values.effectiveDate > today()) problems.changeDate = 'Enter a valid change date on or before today.'
    if (!Object.hasOwn(sources, values.source)) problems.source = 'Choose an income source.'
    if (Object.keys(problems).length) return setErrors(problems)
    setProposed(income)
    move(2)
  }

  function submit(event) {
    event.preventDefault()
    const outcome = commit((state) => {
      const current = find(state.applications, app.id)
      if (current?.status !== 'submitted') return { error: 'This application is unavailable for income reporting.' }
      const previousIncome = amounts(current.income)
      if (current.latestEligibilityResultId !== base.resultId || !sameIncome(base.prior, previousIncome) || sameIncome(previousIncome, proposed)) {
        return { error: 'The application income has changed since this report started. Return to the application to start a new report.' }
      }
      const createdAt = new Date().toISOString()
      const createdBy = actor(state)
      const id = newId('inc')
      const result = makeResult(current, proposed, 'income_update', createdAt, createdBy, id)
      const update = {
        id, applicationId: current.id, ...(base.resultId ? { previousEligibilityResultId: base.resultId } : {}),
        eligibilityResultId: result.id, status: 'submitted', previousIncome, newIncome: proposed,
        effectiveDate: values.effectiveDate, source: values.source, createdAt, createdBy,
      }
      const updated = {
        ...current, income: { ...current.income, ...proposed }, latestEligibilityResultId: result.id,
        lastResubmittedAt: createdAt, updatedAt: createdAt, updatedBy: createdBy,
      }
      return {
        id: result.id,
        state: {
          ...replaceApp(state, updated),
          incomeUpdates: [...(Array.isArray(state.incomeUpdates) ? state.incomeUpdates : []), update],
          eligibilityResults: [...(Array.isArray(state.eligibilityResults) ? state.eligibilityResults : []), result],
        },
      }
    })
    if (outcome.error) return setErrors({ form: outcome.error })
    go(`${path}/eligibility/${encodeURIComponent(outcome.id)}`, { replace: true })
  }

  const change = (key, value) => setValues({ ...values, [key]: value })
  return <>
    <AppCrumb app={app} />
    <PageTitle title={['Report a life change', 'Update household income', 'Review your income update'][step]}>{marketLabel(app)}</PageTitle>
    <div className="form-grid">
      <Steps labels={steps} current={step} completed={step - 1} />
      <section className="card form-card">
        <h2>{steps[step]}</h2>
        {step === 0 && <>
          <p>Choose what changed for your household.</p>
          <div className="form-actions"><RouteLink className="button secondary" to={path}>Back</RouteLink><button type="button" onClick={() => move(1)}>Income changed</button></div>
        </>}
        {step === 1 && <form noValidate onSubmit={review}>
          <ErrorSummary errors={errors} />
          <DataList className="prior-income" items={[[ 'Previous current monthly income', money(base.prior.monthlyAmount) ], [ 'Previous expected annual income', money(base.prior.annualEstimate) ]]} />
          <IncomeFields values={values} change={change} errors={errors} />
          <Field id="changeDate" label="Date income changed" error={errors.changeDate}><input type="date" max={today()} value={values.effectiveDate} onChange={(event) => change('effectiveDate', event.target.value)} /></Field>
          <Field id="source" label="Income source" error={errors.source}><select value={values.source} onChange={(event) => change('source', event.target.value)}>
            <option value="">Choose an income source</option>{Object.entries(sources).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select></Field>
          <FormActions onBack={() => move(0)} next="Review income update"><RouteLink to={path}>Cancel</RouteLink></FormActions>
        </form>}
        {step === 2 && <form onSubmit={submit}>
          <ErrorSummary errors={errors} />
          <div className="income-compare"><table>
            <thead><tr><th scope="col">Income</th><th scope="col">Previous</th><th scope="col">Updated</th></tr></thead>
            <tbody>
              <tr><th scope="row">Current monthly income</th><td>{money(base.prior.monthlyAmount)}</td><td>{money(proposed.monthlyAmount)}</td></tr>
              <tr><th scope="row">Expected annual income</th><td>{money(base.prior.annualEstimate)}</td><td>{money(proposed.annualEstimate)}</td></tr>
            </tbody>
          </table></div>
          <DataList items={[[ 'Date income changed', dateLabel(values.effectiveDate) ], [ 'Income source', sources[values.source] ]]} />
          <FormActions onBack={() => move(1)} next="Submit income update"><RouteLink to={path}>Cancel</RouteLink></FormActions>
        </form>}
      </section>
    </div>
  </>
}
