import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MissingApplication, useApplication } from './account'
import { useStore } from './store'
import { actor, appPath, cents, find, isAmount, makeResult, marketLabel, money, newId, records, replaceApp, stateNames, today, validDate } from './model'
import { AppCrumb, DataList, ErrorSummary, Field, FormActions, PageTitle, RouteLink, Steps, useGo } from './ui'

const stepKeys = ['coverage', 'contact', 'household', 'income', 'review']
const stepNames = ['Coverage location', 'Contact information', 'Household members', 'Household income', 'Review and submit']
const relationships = { self: 'Self', spouse: 'Spouse', child: 'Child', other: 'Other' }
const editPath = (app, step) => `${appPath(app)}/edit${step ? `?step=${step}` : ''}`
const resumeIndex = (app) => Math.min(4, Math.max(0, stepKeys.indexOf(app.lastCompletedStep) + 1))
const stringValue = (value) => typeof value === 'string' || typeof value === 'number' ? String(value) : ''
const coverageValues = (app) => ({ year: stringValue(app.coverageYear), state: stringValue(app.stateCode), zip: stringValue(app.zipCode) })
const contactValues = (contact) => ({ name: stringValue(contact?.fullName), email: stringValue(contact?.email), phone: stringValue(contact?.phone) })
const incomeValues = (income) => ({ monthly: stringValue(income?.monthlyAmount), annual: stringValue(income?.annualEstimate) })
const memberFields = (members) => records(members).map((member) => ({ ...member, fullName: stringValue(member.fullName), relationship: stringValue(member.relationship), birthDate: stringValue(member.birthDate), requestsCoverage: Boolean(member.requestsCoverage) }))
const blankMember = () => ({ fullName: '', relationship: '', birthDate: '', requestsCoverage: true })
const testMoney = (value) => /^\d+(\.\d{1,2})?$/.test(value.trim()) && isAmount(Number(value)) && Number(value) <= Number.MAX_SAFE_INTEGER / 100
export function readIncome(values, errors) {
  if (!testMoney(values.monthly)) errors.monthly = 'Enter current monthly income as a nonnegative amount with up to two decimals.'
  if (!testMoney(values.annual)) errors.annual = 'Enter expected annual income as a nonnegative amount with up to two decimals.'
  return { monthlyAmount: cents(Number(values.monthly)), annualEstimate: cents(Number(values.annual)) }
}

function readCoverage(values, errors) {
  if (!/^20\d\d$/.test(values.year)) errors.year = 'Enter a four-digit coverage year from 2000 to 2099.'
  if (!Object.hasOwn(stateNames, values.state)) errors.state = 'Choose a state.'
  if (!/^\d{5}$/.test(values.zip.trim())) errors.zip = 'Enter a five-digit ZIP code.'
  return { coverageYear: Number(values.year), stateCode: values.state, zipCode: values.zip.trim() }
}

function readContact(values, errors) {
  if (!values.name.trim()) errors.name = 'Enter a contact name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter an email address in the format name@example.com.'
  if (!/^[+\d().\s-]+$/.test(values.phone) || !/^1?\d{10}$/.test(values.phone.replace(/\D/g, ''))) errors.phone = 'Enter a valid 10-digit phone number.'
  return { fullName: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() }
}

function readMembers(members, errors) {
  if (!members.some((member) => member.requestsCoverage)) errors.coverageMembers = 'Choose at least one household member who needs coverage.'
  return members.map((member, index) => {
    const prefix = `member-${index}`
    if (!member.fullName.trim()) errors[`${prefix}-name`] = `Enter a name for household member ${index + 1}.`
    if (!Object.hasOwn(relationships, member.relationship)) errors[`${prefix}-relationship`] = `Choose a relationship for household member ${index + 1}.`
    if (!validDate(member.birthDate) || member.birthDate > today()) errors[`${prefix}-birth`] = `Enter a valid birth date for household member ${index + 1}.`
    return { ...member, fullName: member.fullName.trim() }
  })
}

export function IncomeFields({ values, change, errors }) {
  return <>
    <Field id="monthly" label="Current monthly income" error={errors.monthly} hint="Enter 0 if your household has no current monthly income.">
      <input inputMode="decimal" value={values.monthly} onChange={(event) => change('monthly', event.target.value)} />
    </Field>
    <Field id="annual" label="Expected annual income" error={errors.annual} hint="Estimate the total for the coverage year.">
      <input inputMode="decimal" value={values.annual} onChange={(event) => change('annual', event.target.value)} />
    </Field>
  </>
}

function CoverageFields({ values, change, errors }) {
  return <>
    <Field id="year" label="Coverage year" error={errors.year}><input inputMode="numeric" maxLength={4} value={values.year} onChange={(event) => change('year', event.target.value)} /></Field>
    <Field id="state" label="State" error={errors.state}><select value={values.state} onChange={(event) => change('state', event.target.value)}>
      <option value="">Choose a state</option>{Object.entries(stateNames).sort((a, b) => a[1].localeCompare(b[1])).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
    </select></Field>
    <Field id="zip" label="ZIP code" error={errors.zip}><input inputMode="numeric" autoComplete="postal-code" maxLength={5} value={values.zip} onChange={(event) => change('zip', event.target.value)} /></Field>
  </>
}

function ContactFields({ values, change, errors }) {
  return <>
    <Field id="name" label="Full name" error={errors.name}><input autoComplete="name" value={values.name} onChange={(event) => change('name', event.target.value)} /></Field>
    <Field id="email" label="Email address" error={errors.email}><input type="email" autoComplete="email" value={values.email} onChange={(event) => change('email', event.target.value)} /></Field>
    <Field id="phone" label="Phone number" error={errors.phone}><input type="tel" autoComplete="tel" value={values.phone} onChange={(event) => change('phone', event.target.value)} /></Field>
  </>
}

function MemberFields({ members, setMembers, errors }) {
  function change(index, key, value) {
    setMembers(members.map((member, row) => index === row ? { ...member, [key]: value } : member))
  }
  return <>
    <p>Include household members and indicate who needs coverage.</p>
    <div id="coverageMembers" tabIndex="-1">
      {errors.coverageMembers && <p className="field-error">{errors.coverageMembers}</p>}
      {members.map((member, index) => {
        const prefix = `member-${index}`
        return <fieldset key={index} className="member">
          <legend>Household member {index + 1}</legend>
          <Field id={`${prefix}-name`} label="Full name" error={errors[`${prefix}-name`]}><input value={member.fullName} onChange={(event) => change(index, 'fullName', event.target.value)} /></Field>
          <Field id={`${prefix}-relationship`} label="Relationship" error={errors[`${prefix}-relationship`]}><select value={member.relationship} onChange={(event) => change(index, 'relationship', event.target.value)}>
            <option value="">Choose a relationship</option>{Object.entries(relationships).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></Field>
          <Field id={`${prefix}-birth`} label="Date of birth" error={errors[`${prefix}-birth`]}><input type="date" max={today()} value={member.birthDate} onChange={(event) => change(index, 'birthDate', event.target.value)} /></Field>
          <label className="check"><input type="checkbox" checked={member.requestsCoverage} onChange={(event) => change(index, 'requestsCoverage', event.target.checked)} /> Needs health coverage</label>
          <button className="text-button" type="button" onClick={() => setMembers(members.filter((_, row) => row !== index))}>Remove member {index + 1}</button>
        </fieldset>
      })}
    </div>
    <button className="secondary" type="button" onClick={() => setMembers([...members, blankMember()])}>Add household member</button>
  </>
}

function FormLayout({ title, subtitle, app, step, completed, children }) {
  return <>
    {app && <AppCrumb app={app} />}
    <PageTitle title={title}>{subtitle}</PageTitle>
    <div className="form-grid">
      <Steps labels={stepNames} current={step} completed={completed} />
      <section className="card form-card"><h2>{stepNames[step]}</h2>{children}</section>
    </div>
  </>
}

export function NewApplication() {
  const { state, commit } = useStore()
  const go = useGo()
  const [errors, setErrors] = useState({})
  const [values, setValues] = useState(() => {
    const active = records(state.plans).filter((plan) => plan.coverageYear && plan.stateCode).sort((a, b) => b.coverageYear - a.coverageYear)[0]
    return { year: String(active?.coverageYear || new Date().getFullYear()), state: active?.stateCode || '', zip: '' }
  })
  function save(event) {
    event.preventDefault()
    const problems = {}
    const coverage = readCoverage(values, problems)
    if (Object.keys(problems).length) return setErrors(problems)
    const result = commit((current) => {
      const createdAt = new Date().toISOString()
      const createdBy = actor(current)
      const app = {
        id: newId(`app-${coverage.coverageYear}-${coverage.stateCode.toLowerCase()}`), accountId: createdBy, ...coverage,
        status: 'draft', householdMembers: [], lastCompletedStep: 'coverage', createdAt, createdBy, updatedAt: createdAt, updatedBy: createdBy,
      }
      return { state: { ...current, applications: [...(current.applications || []), app] }, app }
    })
    go(editPath(result.app), { replace: true })
  }
  return <FormLayout title="Start an application" subtitle="Choose a coverage year and tell us where you live." step={0}>
    <form noValidate onSubmit={save}>
      <ErrorSummary errors={errors} />
      <CoverageFields values={values} change={(key, value) => setValues({ ...values, [key]: value })} errors={errors} />
      <FormActions back="/applications" next="Save and continue" />
    </form>
  </FormLayout>
}

export function EditApplication() {
  const { app, state, commit } = useApplication()
  const [params] = useSearchParams()
  if (!app) return <MissingApplication />
  if (app.status !== 'draft') return <>
    <AppCrumb app={app} /><PageTitle title="Application submitted">{app.id}</PageTitle>
    <div className="form-actions"><RouteLink className="button" to={`${appPath(app)}/eligibility`}>View eligibility results</RouteLink><RouteLink to={appPath(app)}>View application</RouteLink></div>
  </>
  const requested = stepKeys.indexOf(params.get('step'))
  const step = requested >= 0 ? Math.min(requested, resumeIndex(app)) : resumeIndex(app)
  const fromReview = params.get('from') === 'review' && resumeIndex(app) === 4
  return <DraftStep key={`${app.id}-${step}-${fromReview}`} app={app} account={state.account} commit={commit} step={step} fromReview={fromReview} />
}

function DraftStep({ app, account, commit, step, fromReview }) {
  const go = useGo()
  const [errors, setErrors] = useState({})
  const [accepted, setAccepted] = useState(false)
  const [members, setMembers] = useState(() => {
    const saved = memberFields(app.householdMembers)
    return saved.length ? saved : [{ ...blankMember(), fullName: app.contact?.fullName || '', relationship: 'self' }]
  })
  const [values, setValues] = useState(() => [
    () => coverageValues(app),
    () => contactValues(app.contact || account),
    () => ({}),
    () => incomeValues(app.income),
    () => ({}),
  ][step]())
  const change = (key, value) => setValues({ ...values, [key]: value })
  const fields = { values, change, errors }

  function save(event) {
    event.preventDefault()
    const problems = {}
    const changes = [
      () => readCoverage(values, problems),
      () => ({ contact: readContact(values, problems) }),
      () => ({ householdMembers: readMembers(members, problems) }),
      () => ({ income: readIncome(values, problems) }),
    ][step]()
    if (Object.keys(problems).length) return setErrors(problems)
    const result = commit((state) => {
      const current = find(state.applications, app.id)
      if (current?.status !== 'draft') return { error: 'This draft is no longer available.' }
      if (changes.householdMembers) changes.householdMembers = changes.householdMembers.map((member) => ({ ...member, id: member.id || newId('mem') }))
      if (changes.contact) changes.contact = { ...current.contact, ...changes.contact }
      if (changes.income) changes.income = { ...current.income, ...changes.income }
      const lastCompletedStep = stepKeys[Math.max(step, stepKeys.indexOf(current.lastCompletedStep))]
      const updated = { ...current, ...changes, lastCompletedStep, updatedAt: new Date().toISOString(), updatedBy: actor(state) }
      return { state: replaceApp(state, updated), app: updated }
    })
    if (result.error) return setErrors({ form: result.error })
    go(editPath(result.app, fromReview ? 'review' : stepKeys[step + 1]))
  }

  function submit(event) {
    event.preventDefault()
    if (!accepted) return setErrors({ attestation: 'Confirm the attestation before submitting.' })
    const result = commit((state) => {
      const current = find(state.applications, app.id)
      if (current?.status === 'submitted') return { app: current, id: current.latestEligibilityResultId }
      if (current?.status !== 'draft') return { error: 'This draft is no longer available.' }
      const problems = {}
      readCoverage(coverageValues(current), problems)
      readContact(contactValues(current.contact), problems)
      readMembers(memberFields(current.householdMembers), problems)
      const income = readIncome(incomeValues(current.income), problems)
      if (Object.keys(problems).length) return { error: 'Review and complete each section before submitting.' }
      const updatedAt = new Date().toISOString()
      const updatedBy = actor(state)
      const eligibility = makeResult(current, income, 'initial_application', updatedAt, updatedBy)
      const updated = {
        ...current, status: 'submitted', submittedAt: updatedAt, updatedAt, updatedBy,
        latestEligibilityResultId: eligibility.id, lastCompletedStep: 'review',
      }
      return { state: { ...replaceApp(state, updated), eligibilityResults: [...(state.eligibilityResults || []), eligibility] }, app: updated, id: eligibility.id }
    })
    if (result.error) return setErrors({ form: result.error })
    go(`${appPath(result.app)}/eligibility${result.id ? `/${encodeURIComponent(result.id)}` : ''}`, { replace: true })
  }

  return <FormLayout title={step === 4 ? 'Review your application' : 'Continue application'} subtitle={marketLabel(app)} app={app} step={step} completed={stepKeys.indexOf(app.lastCompletedStep)}>
    <form noValidate onSubmit={step === 4 ? submit : save}>
      <ErrorSummary errors={errors} />
      {step === 0 && <CoverageFields {...fields} />}
      {step === 1 && <ContactFields {...fields} />}
      {step === 2 && <MemberFields members={members} setMembers={setMembers} errors={errors} />}
      {step === 3 && <IncomeFields {...fields} />}
      {step === 4 && <>
        <ReviewSections app={app} />
        <label className="check attestation"><input id="attestation" type="checkbox" checked={accepted} aria-invalid={Boolean(errors.attestation)} aria-describedby={errors.attestation ? 'attestation-error' : undefined} onChange={(event) => setAccepted(event.target.checked)} /> I attest that the information in this application is accurate to the best of my knowledge.</label>
        {errors.attestation && <p className="field-error" id="attestation-error">{errors.attestation}</p>}
      </>}
      <FormActions back={fromReview ? editPath(app, 'review') : step ? editPath(app, stepKeys[step - 1]) : appPath(app)} next={step === 4 ? 'Submit application' : 'Save and continue'} />
    </form>
  </FormLayout>
}

function ReviewSections({ app }) {
  const members = records(app.householdMembers)
  const summaries = [
    [['Coverage', marketLabel(app)]],
    [['Full name', app.contact?.fullName], ['Email address', app.contact?.email], ['Phone number', app.contact?.phone]],
    [['Household', members.map((member) => `${member.fullName || 'Unnamed member'} · ${relationships[member.relationship] || 'Relationship unavailable'} · ${member.requestsCoverage ? 'Needs coverage' : 'No coverage requested'}`).join('; ') || 'No members listed']],
    [['Current monthly income', money(app.income?.monthlyAmount)], ['Expected annual income', money(app.income?.annualEstimate)]],
  ]
  return summaries.map((summary, index) => <section className="review-section" key={stepKeys[index]}>
    <div className="section-heading"><h3>{stepNames[index]}</h3><RouteLink to={`${editPath(app, stepKeys[index])}&from=review`} aria-label={`Edit ${stepNames[index].toLowerCase()}`}>Edit</RouteLink></div>
    <DataList items={summary} />
  </section>)
}
