import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from '../store.jsx'
import { createRecordId, currentForms, date, draft, editions, find, formGroup, idPath, list, matches, money, supportedYears, validIncome, validSize, words, yearLabel } from '../domain.js'
import { A, Badge, Check, Empty, Facts, Field, Heading, InlineError, Missing, Options, Problem, Table, Wizard, errorProps, focusError, focusStep, useGo } from '../ui.jsx'

const steps = [['student', 'Student information'], ['financial', 'Financial information'], ['schools', 'Schools'], ['review', 'Review & sign']]
const statuses = ['draft', 'in_progress', 'action_required', 'in_review', 'processed', 'closed']
const path = id => idPath('/fafsa', id)
const canCorrect = form => ['processed', 'action_required'].includes(form.status)

export function Fafsa() {
  const { state, commit } = useAccount()
  const go = useGo()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [year, setYear] = useState('')
  const [showStart, setShowStart] = useState(false)
  const all = currentForms(list(state.fafsaForms))
  const visible = all.filter(form => (!status || form.status === status) &&
    matches(query, form.awardYear, yearLabel(form.awardYear), form.id, words(form.status)))
  const availableYears = [...new Set([...supportedYears, ...all.map(form => form.awardYear).filter(Boolean)])].sort().reverse()
  const selectedYear = year || availableYears.find(item => !all.some(form => form.awardYear === item)) || availableYears[0]
  const reset = () => { setQuery(''); setStatus('') }

  function start(event) {
    event.preventDefault()
    const existing = all.find(form => form.awardYear === selectedYear)
    if (existing) return go(path(existing.id))
    const now = new Date().toISOString()
    const id = createRecordId('fafsa')
    const record = {
      id, groupId: 'fafsa-' + selectedYear, awardYear: selectedYear, revision: 1, status: 'draft',
      actorId: state.profile?.id ?? null, answers: {}, schoolIds: [], contributors: [],
      lastSavedStep: 'student', createdAt: now, updatedAt: now,
    }
    commit(previous => ({ ...previous, fafsaForms: [...list(previous.fafsaForms), record] }))
    go(path(id))
  }

  return <>
    <Heading title="FAFSA" description="Start, resume, and review your federal student aid forms." actions={
      <button className="primary" aria-expanded={showStart} onClick={() => setShowStart(!showStart)}>Start a new FAFSA</button>
    } />
    {showStart && <form className="panel inline-start" onSubmit={start}>
      <h2>Choose an award year</h2>
      <Field label="Award year"><select value={selectedYear} onChange={event => setYear(event.target.value)}>
        {availableYears.map(item => <option key={item} value={item}>{yearLabel(item)}{all.some(form => form.awardYear === item) ? ' · Existing form' : ''}</option>)}
      </select></Field>
      <button className="primary">{all.some(form => form.awardYear === selectedYear) ? 'Open existing form' : 'Start form'}</button>
    </form>}
    <section aria-label="Your FAFSA forms">
      <div className="panel filters">
        <div className="search"><Field label="Search forms"><input type="search" placeholder="Award year or form ID" value={query} onChange={event => setQuery(event.target.value)} /></Field></div>
        <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><Options values={statuses} /></select></Field>
        {(query || status) && <button onClick={reset}>Clear filters</button>}
      </div>
      <p className="count">{visible.length} {visible.length === 1 ? 'award year' : 'award years'}</p>
      {visible.length ? <Table label="FAFSA forms" columns={['Award year', 'Status', 'Last updated', 'Action']} rows={visible.map(form => [
        form.id, yearLabel(form.awardYear), <Badge status={form.status} />, date(form.updatedAt || form.createdAt),
        <A to={path(form.id)}>{draft(form) ? 'Resume FAFSA' : 'View FAFSA'}</A>,
      ])} /> : <Empty title={all.length ? 'No forms match your filters.' : 'You have no FAFSA forms.'} />}
    </section>
  </>
}

export function FafsaDetail() {
  const { id } = useParams()
  const { state } = useAccount()
  const form = find(state.fafsaForms, id)
  if (!form) return <Missing title="FAFSA form unavailable" to="/fafsa" label="Return to FAFSA" />
  return draft(form) ? <FafsaWizard key={form.id} form={form} /> : <FafsaSummary form={form} />
}

const schoolLabel = (state, id) => find(state.schools, id)?.name || 'School unavailable'
function ReviewFacts({ answers, schoolIds, state }) {
  return <Facts entries={[
    ['Student name', answers.studentName || 'Unavailable'], ['State', answers.state || 'Unavailable'],
    ['Dependency', words(answers.dependencyStatus)], ['Household size', answers.householdSize ?? 'Unavailable'],
    ['Annual income', money(answers.annualIncome)], ['Tax information consent', answers.taxConsent ? 'Provided' : 'Pending'],
    ['Schools', schoolIds.length ? schoolIds.map(id => schoolLabel(state, id)).join(', ') : 'None selected'],
  ]} />
}

function FafsaHistory({ form, history }) {
  if (history.length < 2) return null
  return <section><div className="section-heading"><h2>Edition history</h2></div>
    <Table label="FAFSA edition history" columns={['Edition', 'Status', 'Last updated']} rows={history.map(item => [
      item.id, item.id === form.id ? 'Edition ' + (item.revision ?? 'unavailable') + ' (viewing)' : <A to={path(item.id)}>Edition {item.revision ?? 'unavailable'}</A>,
      <Badge status={item.status} />, date(item.updatedAt || item.createdAt),
    ])} />
  </section>
}

const formHistory = (state, form) => editions(list(state.fafsaForms).filter(item => formGroup(item) === formGroup(form)))

function FafsaSummary({ form }) {
  const { state, commit } = useAccount()
  const go = useGo()
  const history = formHistory(state, form)
  const latest = history[0]
  const source = draft(latest) ? find(history, latest.previousFormId) : latest
  const correction = draft(latest) && latest.previousFormId === form.id
  const offerCorrection = canCorrect(form) && source?.id === form.id

  function correct() {
    if (correction) return go(path(latest.id))
    const now = new Date().toISOString()
    const id = createRecordId('fafsa')
    const answers = { ...form.answers }
    delete answers.signedAt
    const contributors = list(form.contributors).map(person => {
      const reset = { ...person, status: 'pending' }
      delete reset.signedAt
      return reset
    })
    const record = {
      id, groupId: formGroup(form), awardYear: form.awardYear, revision: (form.revision || 1) + 1,
      previousFormId: form.id, status: 'draft', actorId: state.profile?.id ?? null,
      answers, contributors, schoolIds: list(form.schoolIds), lastSavedStep: 'student', createdAt: now, updatedAt: now,
    }
    commit(previous => ({ ...previous, fafsaForms: [...list(previous.fafsaForms), record] }))
    go(path(id))
  }

  return <>
    <Heading title={yearLabel(form.awardYear) + ' FAFSA'} back="/fafsa" backLabel="All FAFSA forms"
      description={'Edition ' + (form.revision ?? 'unavailable')}
      actions={offerCorrection && <button className="primary" onClick={correct}>{correction ? 'Resume correction' : 'Make a correction'}</button>} />
    <div className={'notice ' + (form.status === 'in_review' ? 'success' : '')}>
      <Badge status={form.status} />
      {form.status === 'in_review' && <p>FAFSA submitted on {date(form.submittedAt)}. Your form is in review. <A to="/my-activity">View in My Activity</A></p>}
      {form.status === 'action_required' && <p>Review your reported information and make a correction if it needs to be updated.</p>}
    </div>
    {form.summary && <section className="panel"><h2>Eligibility estimate</h2><Facts entries={[
      ['Student Aid Index', form.summary.studentAidIndex ?? 'Unavailable'], ['Pell Grant estimate', money(form.summary.pellGrantEstimate)],
      ['Direct Loan estimate', money(form.summary.directLoanEstimate)],
    ]} /></section>}
    <section className="panel"><h2>Reported information</h2><ReviewFacts answers={form.answers || {}} schoolIds={list(form.schoolIds)} state={state} />
      {!!list(form.contributors).length && <Facts entries={form.contributors.map((person, index) => [
        'Contributor ' + (index + 1), [person.name || words(person.role), words(person.status)].join(' · '),
      ])} />}
    </section>
    <section className="panel"><h2>Next steps</h2>{list(form.summary?.nextSteps).length ?
      <ul>{form.summary.nextSteps.map((step, index) => <li key={index}>{step}</li>)}</ul> :
      <p>Check <A to="/my-activity">My Activity</A> for your form status.</p>}</section>
    <FafsaHistory form={form} history={history} />
  </>
}

function FafsaWizard({ form }) {
  const { state, commit } = useAccount()
  const go = useGo()
  const [step, setStep] = useState(steps.some(([key]) => key === form.lastSavedStep) ? form.lastSavedStep : 'student')
  const [answers, setAnswers] = useState(form.answers || {})
  const [schoolIds, setSchoolIds] = useState(list(form.schoolIds))
  const [contributors, setContributors] = useState(list(form.contributors))
  const [signature, setSignature] = useState(false)
  const [query, setQuery] = useState('')
  const [errors, setErrors] = useState({})
  const requiredParent = answers.dependencyStatus === 'dependent'
  const requiredContributors = contributors.filter(person => requiredParent || person.role !== 'parent')
  if (requiredParent && !requiredContributors.some(person => person.role === 'parent')) {
    requiredContributors.push({ id: form.id + '-parent', role: 'parent', status: 'pending' })
  }
  const contributorFields = requiredContributors.map((person, index) => ({
    person, title: words(person.role) + ' contributor',
    prefix: person.role === 'parent' && requiredContributors.length === 1 ? 'parent' : 'contributor-' + index + '-',
  }))
  const index = steps.findIndex(([key]) => key === step)
  const schoolMatches = list(state.schools).filter(school => !schoolIds.includes(school.id) &&
    matches(query, school.name, school.city, school.state, school.federalSchoolCode))
  const results = query.trim() ? schoolMatches : schoolMatches.slice(0, 8)

  function change(key, value) {
    setAnswers(previous => ({ ...previous, [key]: value }))
  }
  function updateContributor(person, fields) {
    const next = { ...person, ...fields }
    if ('name' in fields || 'consent' in fields) {
      next.status = 'pending'
      delete next.signedAt
    }
    setContributors(previous => previous.some(item => item.id === person.id)
      ? previous.map(item => item.id === person.id ? next : item)
      : [...previous, next])
  }
  function validation(key) {
    const found = {}
    if (key === 'student') {
      if (!answers.studentName?.trim()) found.studentName = 'Enter the student’s name.'
      if (!/^[a-z]{2}$/i.test(answers.state?.trim() || '')) found.state = 'Enter a two-letter state or territory code.'
      if (!['dependent', 'independent'].includes(answers.dependencyStatus)) found.dependencyStatus = 'Choose a dependency status.'
    }
    if (key === 'financial') {
      if (!validIncome(answers.annualIncome)) found.annualIncome = 'Enter an annual income of zero or more.'
      if (!validSize(answers.householdSize)) found.householdSize = 'Enter a whole household size of at least one.'
      if (!answers.taxConsent) found.taxConsent = 'Provide student tax information consent.'
    }
    if (key === 'schools') {
      if (!schoolIds.length) found.schoolSearch = 'Add at least one school.'
      else if (schoolIds.some(id => !find(state.schools, id))) {
        found.schoolSearch = 'Remove unavailable schools before continuing.'
      }
    }
    if (key === 'review') {
      for (const { person, title, prefix } of contributorFields) {
        if (!person.name?.trim()) found[prefix + 'Name'] = 'Enter the ' + title.toLowerCase() + '’s name.'
        if (!person.consent) found[prefix + 'Consent'] = 'Provide the ' + title.toLowerCase() + '’s consent.'
        if (person.status !== 'signed') found[prefix + 'Signature'] = 'Sign for the ' + title.toLowerCase() + '.'
      }
      if (!signature) found.studentSignature = 'Sign the FAFSA form.'
    }
    return found
  }
  function save(next, submit = false) {
    const now = new Date().toISOString()
    const savedAnswers = { ...answers }
    if (typeof answers.studentName === 'string') savedAnswers.studentName = answers.studentName.trim()
    if (typeof answers.state === 'string') savedAnswers.state = answers.state.trim().toUpperCase()
    for (const key of ['annualIncome', 'householdSize']) {
      if (answers[key] !== undefined) {
        savedAnswers[key] = answers[key] == null || answers[key] === '' ? null : Number(answers[key])
      }
    }
    if (submit) savedAnswers.signedAt = now
    const savedContributors = requiredContributors.map(person => {
      if (person.status === 'signed' && person.consent && person.name?.trim()) return { ...person, signedAt: person.signedAt || now }
      const pending = { ...person, status: 'pending' }
      delete pending.signedAt
      return pending
    })
    commit(previous => ({ ...previous, fafsaForms: list(previous.fafsaForms).map(item => item.id === form.id && draft(item) ? {
      ...item, answers: savedAnswers, schoolIds, contributors: savedContributors, lastSavedStep: next, updatedAt: now,
      ...(submit ? { status: 'in_review', submittedAt: now } : {}),
    } : item) }))
  }
  function move(next) {
    setErrors({})
    setStep(next)
    focusStep()
  }
  function advance(event) {
    event.preventDefault()
    const submitting = step === 'review'
    const keys = submitting ? steps.map(([key]) => key) : [step]
    for (const key of keys) {
      const found = validation(key)
      if (Object.keys(found).length) {
        setStep(key)
        setErrors(found)
        focusError(found)
        return
      }
    }
    if (submitting) {
      save('review', true)
      focusStep()
    } else {
      const next = steps[index + 1][0]
      save(next)
      move(next)
    }
  }
  const field = (name, label, attributes = {}) => <Field label={label}>
    <input id={name} {...errorProps(errors, name)} value={answers[name] ?? ''} onChange={event => change(name, event.target.value)} {...attributes} />
    <InlineError errors={errors} name={name} />
  </Field>

  return <>
    <Heading title={yearLabel(form.awardYear) + ' FAFSA'} back="/fafsa" backLabel="All FAFSA forms"
      description={form.previousFormId ? 'Correction · Edition ' + (form.revision ?? 'unavailable') : 'Federal student aid application'}
      actions={<Badge status={form.status} />} />
    <Wizard steps={steps} step={step} onStep={move}>
      <form className="form-stack" noValidate onSubmit={advance}>
        <Problem errors={errors} />
        {step === 'student' && <>
          {field('studentName', 'Student name', { autoComplete: 'name' })}
          {field('state', 'State or territory (two-letter code)', { maxLength: 2 })}
          <Field label="Dependency status"><select id="dependencyStatus" {...errorProps(errors, 'dependencyStatus')} value={answers.dependencyStatus || ''} onChange={event => change('dependencyStatus', event.target.value)}>
            <option value="">Choose dependency status</option><Options values={['dependent', 'independent']} />
          </select><InlineError errors={errors} name="dependencyStatus" /></Field>
        </>}
        {step === 'financial' && <>
          {field('annualIncome', 'Annual income ($)', { type: 'number', min: 0, step: '0.01' })}
          {field('householdSize', 'Household size', { type: 'number', min: 1 })}
          <Check id="taxConsent" {...errorProps(errors, 'taxConsent')} checked={Boolean(answers.taxConsent)} onChange={event => change('taxConsent', event.target.checked)}>I consent to use sample tax information for this form.</Check>
          <InlineError errors={errors} name="taxConsent" />
        </>}
        {step === 'schools' && <>
          <Field label="Search schools"><input id="schoolSearch" type="search" placeholder="Name, state, or federal school code" value={query} onChange={event => setQuery(event.target.value)} {...errorProps(errors, 'schoolSearch')} /><InlineError errors={errors} name="schoolSearch" /></Field>
          <div><h3>Selected schools ({schoolIds.length})</h3>
            {schoolIds.length ? <ul className="clean">{schoolIds.map(id => <li key={id}><span>{schoolLabel(state, id)}</span>
              <button type="button" aria-label={'Remove ' + schoolLabel(state, id)} onClick={() => setSchoolIds(ids => ids.filter(item => item !== id))}>Remove</button>
            </li>)}</ul> : <p className="muted">No schools selected.</p>}
          </div>
          <div><h3>{query.trim() ? 'Search results' : 'Schools to add'}</h3>
            {results.length ? <ul className="clean scroll-list">{results.map(school => <li key={school.id}><span><strong>{school.name || 'School unavailable'}</strong><br /><small>{[school.city, school.state, school.federalSchoolCode].filter(Boolean).join(' · ')}</small></span>
              <button type="button" aria-label={'Add ' + (school.name || 'school')} onClick={() => setSchoolIds(ids => [...ids, school.id])}>Add</button>
            </li>)}</ul> : <p className="muted">{list(state.schools).length ? 'No unselected schools match your search.' : 'The school directory is unavailable.'}</p>}
          </div>
        </>}
        {step === 'review' && <>
          <ReviewFacts answers={{ ...answers, annualIncome: validIncome(answers.annualIncome) ? Number(answers.annualIncome) : undefined }} schoolIds={schoolIds} state={state} />
          {contributorFields.map(({ person, title, prefix }) => <fieldset className="contributor" key={person.id}>
            <legend>{title}</legend>
            <Field label={title + ' name'}><input id={prefix + 'Name'} {...errorProps(errors, prefix + 'Name')} value={person.name || ''} onChange={event => updateContributor(person, { name: event.target.value })} /><InlineError errors={errors} name={prefix + 'Name'} /></Field>
            <Check id={prefix + 'Consent'} {...errorProps(errors, prefix + 'Consent')} checked={Boolean(person.consent)} onChange={event => updateContributor(person, { consent: event.target.checked })}>{title} provides sample consent.</Check>
            <InlineError errors={errors} name={prefix + 'Consent'} />
            <Check id={prefix + 'Signature'} {...errorProps(errors, prefix + 'Signature')} checked={person.status === 'signed'} onChange={event => updateContributor(person, { status: event.target.checked ? 'signed' : 'pending', signedAt: undefined })}>Sign as {title.toLowerCase()}.</Check>
            <InlineError errors={errors} name={prefix + 'Signature'} />
          </fieldset>)}
          <Check id="studentSignature" {...errorProps(errors, 'studentSignature')} checked={signature} onChange={event => setSignature(event.target.checked)}>I sign this FAFSA as the student.</Check>
          <InlineError errors={errors} name="studentSignature" />
        </>}
        <div className="actions">
          <button className="primary">{step === 'review' ? 'Submit FAFSA' : 'Save and continue'}</button>
          <button type="button" onClick={() => { save(step); go('/fafsa') }}>Save and exit</button>
          {index > 0 && <button type="button" onClick={() => move(steps[index - 1][0])}>Back</button>}
        </div>
      </form>
    </Wizard>
    <FafsaHistory form={form} history={formHistory(state, form)} />
  </>
}
