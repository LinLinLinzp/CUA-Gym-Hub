import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../store.jsx'
import { activeLoan, balance, createRecordId, date, eligible, estimate, find, idPath, latest, list, loanName, money, validIncome, validSize, words } from '../domain.js'
import { A, Badge, Check, Empty, Facts, Field, Heading, InlineError, Missing, Options, Problem, Table, Wizard, errorProps, focusError, focusStep, useGo } from '../ui.jsx'

const scenarioPath = id => idPath('/repayment/scenarios', id)
const requestPath = id => idPath('/idr', id)
const planName = (state, id) => find(state.repaymentPlans, id)?.name || 'Plan unavailable'
const servicerName = (state, id) => find(state.servicers, id)?.name || 'Servicer unavailable'
const types = [
  ['enter_plan', 'Enter a plan'], ['change_plan', 'Change my plan'], ['recertify', 'Recertify income'], ['recalculate', 'Recalculate payment'],
]
const requestSteps = [['plan', 'Plan & loans'], ['income', 'Income information'], ['review', 'Review & sign']]

function numericInputs(annualIncome, familySize) {
  return {
    ...(validIncome(annualIncome) ? { annualIncome: Number(annualIncome) } : {}),
    ...(validSize(familySize) ? { familySize: Number(familySize) } : {}),
  }
}

function eligibleCohorts(state, plan, loans) {
  const byServicer = new Map()
  for (const loan of loans) {
    if (!loan.servicerId || !find(state.servicers, loan.servicerId)) continue
    const group = byServicer.get(loan.servicerId) || []
    group.push(loan)
    byServicer.set(loan.servicerId, group)
  }
  return [...byServicer].filter(([, group]) => !eligible(plan, group))
}

export function Repayment() {
  const { state, commit } = useAccount()
  const go = useGo()
  const loans = list(state.loans).filter(activeLoan)
  const plans = list(state.repaymentPlans)
  const [loanIds, setLoanIds] = useState(() => loans.map(loan => loan.id))
  const [annualIncome, setIncome] = useState('')
  const [familySize, setSize] = useState('1')
  const [name, setName] = useState('')
  const [comparison, setComparison] = useState(null)
  const [errors, setErrors] = useState({})
  const selected = loans.filter(loan => loanIds.includes(loan.id))
  const scenarios = [...list(state.repaymentScenarios)].sort(latest)

  function change(setter, value) {
    setter(value)
    setComparison(null)
    setErrors({})
  }
  function compare(event) {
    event.preventDefault()
    const found = {}
    if (!selected.length) found.selectLoans = 'Select at least one active loan.'
    if (!validIncome(annualIncome)) found.annualIncome = 'Enter an annual income of zero or more.'
    if (!validSize(familySize)) found.familySize = 'Enter a whole family size of at least one.'
    setErrors(found)
    if (Object.keys(found).length) return focusError(found)
    const inputs = numericInputs(annualIncome, familySize)
    setComparison({ inputs, loanIds: selected.map(loan => loan.id), estimates: plans.map(plan => estimate(plan, selected, inputs)) })
  }
  function save() {
    if (!comparison) return
    const id = createRecordId('scenario')
    const record = {
      ...comparison, id, name: name.trim() || 'Repayment comparison',
      loanCount: comparison.loanIds.length, status: 'saved', actorId: state.profile?.id ?? null,
      createdAt: new Date().toISOString(),
    }
    commit(previous => ({ ...previous, repaymentScenarios: [...list(previous.repaymentScenarios), record] }))
    go(scenarioPath(id))
  }

  return <>
    <Heading title="Repayment" description="Compare estimated payments, save an estimate, or prepare an income-driven request." />
    <div className="rep-layout">
      <form className="panel form-stack" onSubmit={compare} noValidate>
        <h2>Loan Simulator</h2>
        <Problem errors={errors} />
        <div className="section-heading" style={{ marginBottom: 0 }}>
          <h3>Loans to compare ({selected.length})</h3>
          {loans.length > 0 && <button id="selectLoans" type="button" onClick={() => change(setLoanIds, selected.length === loans.length ? [] : loans.map(loan => loan.id))}>{selected.length === loans.length ? 'Clear all' : 'Select all'}</button>}
        </div>
        {loans.length ? <div className="scroll-list">{loans.map(loan =>
          <Check key={loan.id} checked={loanIds.includes(loan.id)} onChange={event => change(setLoanIds, event.target.checked ? [...loanIds, loan.id] : loanIds.filter(id => id !== loan.id))}>
            {loanName(loan)} · {loan.id}<br /><small>{money(balance(loan))} · {servicerName(state, loan.servicerId)}</small>
          </Check>
        )}</div> : <p className="muted">There are no active loans to compare.</p>}
        <Field label="Annual income ($)"><input id="annualIncome" {...errorProps(errors, 'annualIncome')} type="number" min="0" step="0.01" value={annualIncome} onChange={event => change(setIncome, event.target.value)} /><InlineError errors={errors} name="annualIncome" /></Field>
        <Field label="Family size"><input id="familySize" {...errorProps(errors, 'familySize')} type="number" min="1" value={familySize} onChange={event => change(setSize, event.target.value)} /><InlineError errors={errors} name="familySize" /></Field>
        <Field label="Scenario name (optional)"><input value={name} onChange={event => setName(event.target.value)} /></Field>
        <button className="primary" disabled={!loans.length || !plans.length}>Compare plans</button>
      </form>
      <section aria-label="Estimated repayment plans">
        {comparison ? <><EstimateResults comparison={comparison} /><button className="primary" onClick={save}>Save comparison</button></> :
          <Empty title={plans.length ? 'Your plan estimates will appear here.' : 'There are no repayment plans to compare.'}>
            {plans.length > 0 && 'Select loans and enter household information to compare estimated payments.'}
          </Empty>}
      </section>
    </div>
    <section><div className="section-heading"><h2>Saved comparisons</h2></div>
      {scenarios.length ? <Table label="Saved comparisons" columns={['Name', 'Loans', 'Saved on']} rows={scenarios.map(item => [
        item.id, <A to={scenarioPath(item.id)}>{item.name || 'Repayment comparison'}</A>, item.loanCount ?? list(item.loanIds).length, date(item.createdAt),
      ])} /> : <Empty title="You have no saved comparisons." />}
    </section>
  </>
}

function EstimateResults({ comparison }) {
  const { state } = useAccount()
  const [sort, setSort] = useState('monthlyPayment')
  const [requestedPlan, setRequestedPlan] = useState(null)
  const results = [...list(comparison.estimates)].sort((a, b) => Number(Boolean(b.eligible)) - Number(Boolean(a.eligible)) ||
    (a[sort] ?? Infinity) - (b[sort] ?? Infinity) || String(a.planName || '').localeCompare(String(b.planName || '')))
  const loans = list(state.loans).filter(loan => list(comparison.loanIds).includes(loan.id) && activeLoan(loan))
  const requestPlan = requestedPlan && find(state.repaymentPlans, requestedPlan)
  return <>
    <div className="section-heading">
      <div><h2>Estimated repayment plans</h2><small>Illustrative estimates based on the selected loans and household inputs.</small></div>
      {results.length > 0 && <Field label="Sort estimates by"><select value={sort} onChange={event => setSort(event.target.value)}>
        <option value="monthlyPayment">Monthly payment</option><option value="totalPaid">Total paid</option><option value="termMonths">Shortest term</option>
      </select></Field>}
    </div>
    {!results.length && <Empty title="No plan estimates are available for this comparison." />}
    <div className="grid two">{results.map(result => {
      const catalog = find(state.repaymentPlans, result.planId)
      const canApply = result.eligible && catalog?.category === 'income_driven'
      const available = canApply && eligibleCohorts(state, catalog, loans).length > 0
      return <article className="panel" key={result.planId}>
        <h3>{result.planName || catalog?.name || 'Plan unavailable'}</h3>
        {catalog?.description && <p className="muted">{catalog.description}</p>}
        {result.eligible ? <>
          <div><strong className="total">{money(result.monthlyPayment)}</strong> <small>/ month</small></div>
          <Facts entries={[[ 'Estimated total paid', money(result.totalPaid)], ['Sample term', Number.isFinite(result.termMonths) ? result.termMonths + ' months' : 'Unavailable']]} />
          {canApply && <>
            <button aria-expanded={requestedPlan === catalog.id} disabled={!available} onClick={() => setRequestedPlan(requestedPlan === catalog.id ? null : catalog.id)}>Apply for this plan</button>
            {!available && <small>No eligible loans with an available servicer.</small>}
          </>}
        </> : <p className="muted">{result.ineligibleReason || 'Eligibility is unavailable for this estimate.'}</p>}
      </article>
    })}</div>
    {requestPlan && <StartRequest key={requestedPlan} comparison={comparison} plan={requestPlan} cohorts={eligibleCohorts(state, requestPlan, loans)} />}
  </>
}

function StartRequest({ comparison, plan, cohorts }) {
  const { state, commit } = useAccount()
  const go = useGo()
  const [servicerId, setServicerId] = useState('')
  const startHeading = useRef(null)
  useEffect(() => { startHeading.current?.focus() }, [])
  const selectedId = servicerId || (cohorts.length === 1 ? cohorts[0][0] : '')
  const selected = cohorts.find(([id]) => id === selectedId)?.[1] || []

  function start(event) {
    event.preventDefault()
    if (!selected.length) return
    const now = new Date().toISOString()
    const id = createRecordId('request')
    const record = {
      id, status: 'draft', planId: plan.id, loanIds: selected.map(loan => loan.id), servicerId: selectedId,
      ...(comparison.id ? { scenarioId: comparison.id } : {}),
      actorId: state.profile?.id ?? null, inputs: numericInputs(comparison.inputs?.annualIncome, comparison.inputs?.familySize),
      lastSavedStep: 'plan', createdAt: now, updatedAt: now,
    }
    commit(previous => ({ ...previous, repaymentRequests: [...list(previous.repaymentRequests), record] }))
    go(requestPath(id))
  }

  return <form className="panel form-stack" onSubmit={start}>
    <h2 ref={startHeading} tabIndex={-1}>Start an income-driven request</h2>
    <p>{plan.name || 'Selected plan'}</p>
    <Field label="Loan servicer"><select value={selectedId} onChange={event => setServicerId(event.target.value)}>
      <option value="">Choose one servicer</option><Options values={cohorts.map(([id, group]) => [id, servicerName(state, id) + ' · ' + group.length + ' loan' + (group.length === 1 ? '' : 's')])} />
    </select></Field>
    {selected.length > 0 && <ul className="clean">{selected.map(loan => <li key={loan.id}>{loanName(loan)} · {loan.id}</li>)}</ul>}
    <div className="actions"><button className="primary" disabled={!selected.length}>Start request</button></div>
  </form>
}

export function Scenario() {
  const { id } = useParams()
  const { state } = useAccount()
  const scenario = find(state.repaymentScenarios, id)
  if (!scenario) return <Missing title="Comparison unavailable" to="/repayment" label="Return to Repayment" />
  return <>
    <Heading title={scenario.name || 'Repayment comparison'} description={'Saved estimate · ' + date(scenario.createdAt)} back="/repayment" backLabel="Repayment" actions={<Badge status={scenario.status} />} />
    <section className="panel"><h2>Comparison inputs</h2><Facts entries={[
      ['Annual income', money(scenario.inputs?.annualIncome)], ['Family size', scenario.inputs?.familySize ?? 'Unavailable'],
      ['Loans included', scenario.loanCount ?? list(scenario.loanIds).length],
    ]} />
      {list(scenario.loanIds).length > 0 && <ul>{scenario.loanIds.map(id => <li key={id}>{find(state.loans, id) ?
        <A to={idPath('/my-loans', id)}>{loanName(find(state.loans, id))} · {id}</A> : 'Loan unavailable · ' + id}</li>)}</ul>}
    </section>
    <section className="estimate-section"><EstimateResults key={id} comparison={scenario} /></section>
  </>
}

function LoanLinks({ ids, state }) {
  return list(ids).length ? <ul>{ids.map(id => {
    const loan = find(state.loans, id)
    return <li key={id}>{loan ? <A to={idPath('/my-loans', id)}>{loanName(loan)} · {id}</A> : 'Loan unavailable · ' + id}</li>
  })}</ul> : <p>No loans are linked to this request.</p>
}

export function Request() {
  const { id } = useParams()
  const { state } = useAccount()
  const request = find(state.repaymentRequests, id)
  if (!request) return <Missing title="Repayment request unavailable" to="/my-activity" label="Return to My Activity" />
  if (request.status === 'draft') return <RequestWizard key={id} request={request} />
  return <>
    <Heading title="Income-driven repayment request" description={request.id} back="/my-activity" backLabel="My Activity" />
    <div className={'notice ' + (request.status === 'in_review' ? 'success' : '')}>
      <Badge status={request.status} />
      {request.submittedAt && <p>Request submitted on {date(request.submittedAt)}. <A to="/my-activity">View in My Activity</A></p>}
    </div>
    <section className="panel"><h2>Request details</h2><Facts entries={[
      ['Requested plan', planName(state, request.planId)], ['Servicer', servicerName(state, request.servicerId)],
      ['Request type', types.find(([id]) => id === request.requestType)?.[1] || words(request.requestType)],
      ['Annual income', money(request.inputs?.annualIncome)], ['Family size', request.inputs?.familySize ?? 'Unavailable'],
      ['Income consent', request.inputs?.incomeConsent ? 'Provided' : 'Pending'],
      ['Signed', date(request.signedAt)],
    ]} /><LoanLinks ids={request.loanIds} state={state} />
      {find(state.repaymentScenarios, request.scenarioId) && <A to={scenarioPath(request.scenarioId)}>Open saved comparison</A>}
    </section>
  </>
}

function RequestWizard({ request }) {
  const { state, commit } = useAccount()
  const go = useGo()
  const [step, setStep] = useState(requestSteps.some(([key]) => key === request.lastSavedStep) ? request.lastSavedStep : 'plan')
  const [requestType, setType] = useState(request.requestType || '')
  const [annualIncome, setIncome] = useState(request.inputs?.annualIncome ?? '')
  const [familySize, setSize] = useState(request.inputs?.familySize ?? '')
  const [consent, setConsent] = useState(Boolean(request.inputs?.incomeConsent))
  const [signature, setSignature] = useState(false)
  const [errors, setErrors] = useState({})
  const index = requestSteps.findIndex(([key]) => key === step)
  const plan = find(state.repaymentPlans, request.planId)
  const loanIds = list(request.loanIds)
  const loans = loanIds.map(id => find(state.loans, id))
  const available = plan?.category === 'income_driven' && find(state.servicers, request.servicerId) &&
    loans.length && loans.every(loan => loan && activeLoan(loan) && loan.servicerId === request.servicerId) && !eligible(plan, loans)
  function validation(key) {
    const found = {}
    if (key === 'plan') {
      if (!available) found.requestType = 'The selected plan, loans, or servicer are unavailable. Start a new comparison to select an eligible group.'
      else if (!types.some(([type]) => type === requestType)) found.requestType = 'Choose a request type.'
    }
    if (key === 'income') {
      if (!validIncome(annualIncome)) found.annualIncome = 'Enter an annual income of zero or more.'
      if (!validSize(familySize)) found.familySize = 'Enter a whole family size of at least one.'
      if (!consent) found.incomeConsent = 'Provide consent to use sample income information.'
    }
    if (key === 'review' && !signature) found.requestSignature = 'Sign the repayment request.'
    return found
  }
  function save(next, submit = false) {
    const now = new Date().toISOString()
    const inputs = { ...request.inputs, ...numericInputs(annualIncome, familySize), incomeConsent: consent }
    if (!validIncome(annualIncome)) delete inputs.annualIncome
    if (!validSize(familySize)) delete inputs.familySize
    commit(previous => ({ ...previous, repaymentRequests: list(previous.repaymentRequests).map(item => item.id === request.id && item.status === 'draft' ? {
      ...item, ...(requestType ? { requestType } : {}), inputs, lastSavedStep: next, updatedAt: now,
      ...(submit ? { signedAt: now, submittedAt: now, status: 'in_review' } : {}),
    } : item) }))
  }
  function move(next) {
    setErrors({})
    setStep(next)
    focusStep()
  }
  function advance(event) {
    event.preventDefault()
    const keys = step === 'review' ? requestSteps.map(([key]) => key) : [step]
    for (const key of keys) {
      const found = validation(key)
      if (Object.keys(found).length) {
        setStep(key)
        setErrors(found)
        focusError(found)
        return
      }
    }
    if (step === 'review') {
      save('review', true)
      focusStep()
    } else {
      const next = requestSteps[index + 1][0]
      save(next)
      move(next)
    }
  }
  const summary = [['Requested plan', planName(state, request.planId)], ['Servicer', servicerName(state, request.servicerId)]]

  return <>
    <Heading title="Income-driven repayment request" description={request.id} back="/my-activity" backLabel="My Activity" actions={<Badge status={request.status} />} />
    <Wizard steps={requestSteps} step={step} onStep={move}>
      <form className="form-stack" noValidate onSubmit={advance}>
        <Problem errors={errors} />
        {step === 'plan' && <>
          {!available && <div className="notice">The selected plan, loans, or servicer are unavailable. <A to="/repayment">Start a new comparison</A></div>}
          <Facts entries={summary} /><div><h3>Loans included</h3><LoanLinks ids={loanIds} state={state} /></div>
          <Field label="Request type"><select id="requestType" {...errorProps(errors, 'requestType')} value={requestType} onChange={event => setType(event.target.value)}>
            <option value="">Choose a request type</option><Options values={types} />
          </select><InlineError errors={errors} name="requestType" /></Field>
        </>}
        {step === 'income' && <>
          <Field label="Annual income ($)"><input id="annualIncome" {...errorProps(errors, 'annualIncome')} type="number" min="0" step="0.01" value={annualIncome} onChange={event => setIncome(event.target.value)} /><InlineError errors={errors} name="annualIncome" /></Field>
          <Field label="Family size"><input id="familySize" {...errorProps(errors, 'familySize')} type="number" min="1" value={familySize} onChange={event => setSize(event.target.value)} /><InlineError errors={errors} name="familySize" /></Field>
          <Check id="incomeConsent" {...errorProps(errors, 'incomeConsent')} checked={consent} onChange={event => setConsent(event.target.checked)}>I consent to use sample income information for this request.</Check>
          <InlineError errors={errors} name="incomeConsent" />
        </>}
        {step === 'review' && <>
          <Facts entries={[...summary, ['Request type', types.find(([id]) => id === requestType)?.[1] || 'Unavailable'],
            ['Annual income', money(numericInputs(annualIncome, familySize).annualIncome)], ['Family size', familySize || 'Unavailable'], ['Income consent', consent ? 'Provided' : 'Pending'],
          ]} />
          <div><h3>Loans included</h3><LoanLinks ids={loanIds} state={state} /></div>
          <Check id="requestSignature" {...errorProps(errors, 'requestSignature')} checked={signature} onChange={event => setSignature(event.target.checked)}>I sign this repayment request.</Check>
          <InlineError errors={errors} name="requestSignature" />
        </>}
        <div className="actions">
          <button className="primary" disabled={!available}>{step === 'review' ? 'Submit request' : 'Save and continue'}</button>
          <button type="button" onClick={() => { save(step); go('/my-activity') }}>Save and exit</button>
          {index > 0 && <button type="button" onClick={() => move(requestSteps[index - 1][0])}>Back</button>}
        </div>
      </form>
    </Wizard>
  </>
}
