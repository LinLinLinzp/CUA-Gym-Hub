import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from './account.jsx'
import { actorId, belongsToAccount, catalogEntry, dateLabel, latest, newId, nextNumber, records, recordPath } from './model.js'
import { AccountLink, Badge, Confirmation, DraftRows, Empty, ErrorSummary, Field, Heading, Missing, Panel, StepList, useAccountNavigate } from './ui.jsx'

const stepKeys = ['applicant', 'questions', 'review']
const stepLabels = ['Applicant details', 'Form questions', 'Review and sign']
const formsBack = { to: '/forms', label: 'Forms' }

export function Forms() {
  const { state, commit } = useAccount()
  const navigate = useAccountNavigate()
  const [view, setView] = useState('catalog')
  const [query, setQuery] = useState('')
  const [filingQuery, setFilingQuery] = useState('')
  const catalog = records(state.formCatalog)
  const search = query.trim().toLowerCase()
  const visible = catalog.filter(item => [item.code, item.title, item.category].join(' ').toLowerCase().includes(search))
  function matchesFiling(item) {
    const form = catalogEntry(state, item.formId)
    return [form?.code, form?.title, form?.category, item.receiptNumber]
      .join(' ').toLowerCase().includes(filingQuery.trim().toLowerCase())
  }
  const drafts = latest(records(state.formDrafts).filter(item => item.status !== 'submitted' && belongsToAccount(state, item) && matchesFiling(item)), 'updatedAt')
  const submissions = latest(records(state.formSubmissions).filter(item => belongsToAccount(state, item) && matchesFiling(item)), 'createdAt')

  function start(id) {
    let draftId
    const saved = commit(current => {
      const item = catalogEntry(current, id)
      if (!item?.id || item.canFileOnline !== true) return current
      draftId = newId('draft')
      const now = new Date().toISOString()
      return {
        ...current,
        formDrafts: [...records(current.formDrafts), {
          id: draftId, formId: id, actorId: actorId(current), status: 'draft',
          currentStep: 'applicant', answers: {}, createdAt: now, updatedAt: now,
        }],
      }
    })
    if (saved) navigate(recordPath('/forms/drafts', draftId))
  }

  return <>
    <Heading title="Forms">Find a form, resume a draft, or review your past submissions.</Heading>
    <div className="tabs" role="group" aria-label="Forms views">
      <button type="button" aria-pressed={view === 'catalog'} className={'button secondary ' + (view === 'catalog' ? 'selected' : '')} onClick={() => setView('catalog')}>Form catalog</button>
      <button type="button" aria-pressed={view === 'filings'} className={'button secondary ' + (view === 'filings' ? 'selected' : '')} onClick={() => setView('filings')}>Your filings</button>
    </div>
    {view === 'catalog' ? <Panel title="Form catalog">
      <div className="filters"><Field id="catalog-search" label="Search forms" type="search" value={query} placeholder="Form code or title" onChange={event => setQuery(event.target.value)} /></div>
      <p className="meta list-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'form' : 'forms'}</p>
      {visible.length ? <ul className="record-list">
        {visible.map((item, index) => <li className="record-row" key={item.id || index}>
          <div className="record-main"><strong>{item.code || 'Form'}{item.title && ' · ' + item.title}</strong>
            <span className="meta">{item.category || 'Category unavailable'}</span>
            {item.description && <span>{item.description}</span>}
          </div>
          {item.canFileOnline === true && item.id ? <div className="record-side">
            <Badge status="open">Available to file</Badge><button className="button secondary" type="button" onClick={() => start(item.id)}>Start form</button>
          </div> : <Badge>Reference only</Badge>}
        </li>)}
      </ul> : <Empty>{catalog.length ? 'No forms match your search.' : 'There are no forms in the catalog.'}</Empty>}
    </Panel> : <div className="stack">
      <Panel><Field id="filing-search" label="Search your filings" type="search" value={filingQuery}
        placeholder="Form code, title, or receipt number" onChange={event => setFilingQuery(event.target.value)} /></Panel>
      <Panel title="Drafts"><DraftRows state={state} drafts={drafts} /></Panel>
      <Panel title="Submitted forms">
        {submissions.length ? <ul className="record-list">{submissions.map((item, index) => {
          const form = catalogEntry(state, item.formId)
          const linkedCase = item.caseId && records(state.cases).some(entry => entry.id === item.caseId)
          return <li key={item.id || index} className="record-row">
            <div className="record-main">
              <strong>{[form?.code, form?.title].filter(Boolean).join(' · ') || 'Submitted form'}</strong>
              <span className="meta">{[form?.category, dateLabel(item.createdAt)].filter(Boolean).join(' · ')}</span>
              {linkedCase ? <AccountLink className="numeric" to={recordPath('/cases', item.caseId)}>{item.receiptNumber || 'View case'}</AccountLink> :
                <span className="meta numeric">{item.receiptNumber || 'Receipt unavailable'}</span>}
            </div>
            <div className="record-side"><Badge status={item.status || 'submitted'} />{item.draftId &&
              <AccountLink to={recordPath('/forms/drafts', item.draftId)}>View filing</AccountLink>}</div>
          </li>
        })}</ul> : <Empty>No submitted forms to show.</Empty>}
      </Panel>
    </div>}
  </>
}

function cleanAnswers(answers) {
  return {
    applicantName: answers.applicantName.trim(),
    email: answers.email.trim(),
    responses: Object.fromEntries(Object.entries(answers.responses).map(([key, value]) => [key, String(value ?? '').trim()])),
  }
}

function applicantErrors(answers) {
  return {
    applicantName: answers.applicantName ? '' : 'Enter your full legal name.',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email) ? '' : 'Enter a valid email address.',
  }
}

function questionErrors(questions, answers) {
  const invalid = questions.filter(question => {
    const answer = answers.responses[question.id]
    return (question.required && !answer) || (answer && question.options?.length && !question.options.includes(answer))
  })
  return Object.fromEntries(invalid.map(question => [question.id, 'Provide an answer to this question.']))
}

function FileConfirmation({ state, submission }) {
  const linkedCase = submission?.caseId && records(state.cases).some(item => item.id === submission.caseId)
  return <Confirmation title="Form submitted">
    <p>Your filing has been recorded in your account.</p>
    <dl className="details inset panel-action">
      <div><dt>Receipt number</dt><dd className="numeric">{submission?.receiptNumber || 'Receipt unavailable'}</dd></div>
      <div><dt>Submitted</dt><dd>{dateLabel(submission?.createdAt)}</dd></div>
    </dl>
    <div className="actions panel-action">
      {linkedCase && <AccountLink className="button" to={recordPath('/cases', submission.caseId)}>View case</AccountLink>}
      <AccountLink className="button secondary" to="/forms">Return to forms</AccountLink>
    </div>
  </Confirmation>
}

export function Draft() {
  const { state } = useAccount()
  const { draftId } = useParams()
  const draft = records(state.formDrafts).find(item => item.id === draftId && belongsToAccount(state, item))
  const submission = records(state.formSubmissions).find(item => item.draftId === draftId && belongsToAccount(state, item))
  if (submission || draft?.status === 'submitted') return <FileConfirmation state={state} submission={submission} />
  if (!draft) return <Missing title="Form draft unavailable" to="/forms" label="Return to forms" />
  return <FilingWizard key={draftId} draft={draft} item={catalogEntry(state, draft.formId)} />
}

function FilingWizard({ draft, item }) {
  const { commit } = useAccount()
  const [step, setStep] = useState(Math.max(0, stepKeys.indexOf(draft.currentStep)))
  const [answers, setAnswers] = useState(() => ({
    applicantName: String(draft.answers?.applicantName ?? ''),
    email: String(draft.answers?.email ?? ''),
    responses: draft.answers?.responses || {},
  }))
  const [signature, setSignature] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const questions = records(item?.questions).filter(question => question.id)
  const canFileOnline = item?.canFileOnline === true

  function changeStep(index) {
    setStep(index)
    setErrors({})
    setMessage('')
  }

  function edit(update) {
    setAnswers(update)
    setErrors({})
    setMessage('')
  }

  function saveFor(stepIndex) {
    return commit(current => {
      const latestDraft = records(current.formDrafts).find(entry => entry.id === draft.id)
      if (!latestDraft || latestDraft.status === 'submitted') return current
      const nextDraft = {
        ...latestDraft, currentStep: stepKeys[stepIndex], answers: cleanAnswers(answers), updatedAt: new Date().toISOString(),
      }
      return { ...current, formDrafts: records(current.formDrafts).map(entry => entry.id === draft.id ? nextDraft : entry) }
    })
  }

  function save() {
    if (saveFor(step)) setMessage('Draft saved.')
  }

  function submit(event) {
    event.preventDefault()
    if (step === 2 && !canFileOnline) return
    setMessage('')
    const snapshot = cleanAnswers(answers)
    const checkedApplicant = applicantErrors(snapshot)
    const checkedQuestions = questionErrors(questions, snapshot)
    const applicantInvalid = Object.values(checkedApplicant).some(Boolean)
    const questionsInvalid = Object.keys(checkedQuestions).length > 0
    if ((step === 0 || step === 2) && applicantInvalid) {
      changeStep(0)
      setErrors({ ...checkedApplicant, summary: 'Complete the required applicant details.' })
      return
    }
    if ((step === 1 || step === 2) && questionsInvalid) {
      changeStep(1)
      setErrors({ ...checkedQuestions, summary: 'Complete the required form questions.' })
      return
    }
    if (step < 2) {
      if (saveFor(step + 1)) changeStep(step + 1)
      return
    }
    const name = signature.trim()
    if (!name || name.toLowerCase() !== snapshot.applicantName.toLowerCase()) {
      setErrors({ signature: 'Type your name as it appears in Applicant details.', summary: 'Check your typed signature.' })
      return
    }
    commit(current => {
      const existing = records(current.formDrafts).find(entry => entry.id === draft.id)
      const catalogItem = catalogEntry(current, existing?.formId)
      if (catalogItem?.canFileOnline !== true || !existing || existing.status === 'submitted' ||
        records(current.formSubmissions).some(entry => entry.draftId === draft.id)) return current
      const now = new Date().toISOString()
      const actor = actorId(current)
      const caseId = newId('case')
      const submissionId = newId('submission')
      const receiptNumber = nextNumber(records(current.cases), 'receiptNumber', 'IOE98', 8, 1)
      return {
        ...current,
        formDrafts: records(current.formDrafts).map(entry => entry.id === draft.id ? {
          ...entry, answers: snapshot, currentStep: 'review', status: 'submitted', submittedAt: now, updatedAt: now,
        } : entry),
        formSubmissions: [...records(current.formSubmissions), {
          id: submissionId, draftId: draft.id, formId: catalogItem.id, actorId: actor, caseId, receiptNumber,
          answers: snapshot, signature: name, status: 'submitted', createdAt: now,
        }],
        cases: [...records(current.cases), {
          id: caseId, receiptNumber, formId: catalogItem.id, formCode: catalogItem.code || '',
          formTitle: catalogItem.title || '', status: 'received', filedAt: now, statusUpdatedAt: now,
          mailingAddress: current.profile?.mailingAddress ?? null, submissionId,
        }],
        caseEvents: [...records(current.caseEvents), {
          id: newId('event'), caseId, status: 'received', title: 'Case received',
          description: 'Your form was submitted and a receipt number was assigned.', actorId: actor, createdAt: now,
        }],
        trackedCases: [...records(current.trackedCases), { id: newId('tracked'), caseId, actorId: actor, createdAt: now }],
      }
    })
  }

  return <div className="wizard">
    <Heading title={item?.code ? 'File ' + item.code : 'Form draft'} back={formsBack}>
      {item?.title || 'The catalog details for this draft are unavailable.'}
    </Heading>
    <StepList steps={stepLabels} current={step} />
    <Panel title={stepLabels[step]}>
      {!canFileOnline && <p className="notice">You can save this draft. Online submission is unavailable for this form.</p>}
      <form className="field-stack" onSubmit={submit} noValidate>
        {errors.summary && <ErrorSummary>{errors.summary}</ErrorSummary>}
        {step === 0 && <>
          <Field id="applicant-name" label="Full legal name" autoComplete="name" required value={answers.applicantName}
            error={errors.applicantName} onChange={event => edit({ ...answers, applicantName: event.target.value })} />
          <Field id="applicant-email" label="Email address" type="email" autoComplete="email" required value={answers.email}
            error={errors.email} onChange={event => edit({ ...answers, email: event.target.value })} />
        </>}
        {step === 1 && (questions.length ? questions.map(question => <Field key={question.id} id={'question-' + question.id}
          label={question.label || 'Form question'} options={question.options?.length ? question.options : undefined}
          required={question.required} error={errors[question.id]} value={answers.responses[question.id] ?? ''}
          onChange={event => edit({ ...answers, responses: { ...answers.responses, [question.id]: event.target.value } })} />) :
          <Empty>This form has no additional questions.</Empty>)}
        {step === 2 && <>
          <dl className="details inset">
            <div><dt>Full legal name</dt><dd>{answers.applicantName || 'Missing'}</dd></div>
            <div><dt>Email address</dt><dd>{answers.email || 'Missing'}</dd></div>
            {questions.map(question => <div key={question.id}><dt>{question.label || 'Form question'}</dt><dd>{answers.responses[question.id] || 'Unanswered'}</dd></div>)}
          </dl>
          {canFileOnline && <Field id="signature" label="Typed signature" hint="Type your full legal name to sign this filing." value={signature}
            required error={errors.signature} onChange={event => { setSignature(event.target.value); setErrors({}) }} />}
        </>}
        <div className="actions">
          {step > 0 && <button className="button secondary" type="button" onClick={() => changeStep(step - 1)}>Back</button>}
          {step < 2 && <button className="button" type="submit">Continue</button>}
          {step === 2 && canFileOnline && <button className="button" type="submit">Submit form</button>}
          <button className="button secondary" type="button" onClick={save}>Save draft</button>
        </div>
        {message && <p className="notice" role="status">{message}</p>}
      </form>
    </Panel>
  </div>
}
