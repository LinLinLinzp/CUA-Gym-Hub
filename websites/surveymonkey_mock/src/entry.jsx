import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnswerFields, focusAnswerError } from './answers.jsx'
import {
  cleanAnswers, collectorPath, created, defaultSettings, idFor, normalEmail, questionsFor, settingsFor,
  surveyPath, titleFor, validEmail, validateAnswers,
} from './model.js'
import { useWorkspace } from './state.jsx'
import { Icon, Missing, SiteLink, TextField } from './ui.jsx'

function EntryStatus({ title, children, link, label, done }) {
  return <section className="surface entry-status">
    {done && <span className="completion-mark"><Icon name="check" size={24}/></span>}
    <h1>{title}</h1>{children && <p className="muted">{children}</p>}
    {link && <SiteLink className="button secondary" to={link}>{label}</SiteLink>}
  </section>
}

function ParticipantForm({ survey, collector, mode }) {
  const { change } = useWorkspace()
  const [answers, setAnswers] = useState({})
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [completed, setCompleted] = useState(false)
  const submitted = useRef(false)
  const preview = mode === 'preview'
  const manual = mode === 'manual'
  const questions = questionsFor(survey)
  const identified = !preview && !settingsFor(collector).anonymous
  const back = preview ? surveyPath(survey.id) : manual ? collectorPath(survey.id, collector.id) : null
  const backLabel = preview ? 'Exit preview' : 'Back to collector'

  function setAnswer(id, value) {
    setAnswers(current => ({ ...current, [id]: value }))
    setErrors(current => ({ ...current, [id]: undefined }))
  }

  function submit(event) {
    event.preventDefault()
    if (submitted.current) return
    const form = event.currentTarget
    const address = normalEmail(email)
    const nextErrors = validateAnswers(questions, answers)
    if (identified && ((!manual && !address) || (address && !validEmail(address)))) nextErrors.email = 'Enter a valid email address.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      focusAnswerError(form, nextErrors)
      return
    }

    if (!preview) {
      let rejection = ''
      let emailError = ''
      const saved = change(current => {
        const liveCollector = current.collectors.find(record => record.id === collector.id && record.surveyId === survey.id)
        const liveSurvey = current.surveys.find(record => record.id === survey.id)
        if (!liveSurvey || liveCollector?.status !== 'open') {
          rejection = 'This collector is unavailable.'
          return current
        }
        const settings = settingsFor(liveCollector)
        const liveQuestions = questionsFor(liveSurvey)
        if (!liveQuestions.length || Object.keys(validateAnswers(liveQuestions, answers)).length) {
          rejection = 'The questionnaire has changed. Reload this page to see the current questions.'
          return current
        }
        if (!settings.anonymous) {
          if (!manual && !validEmail(address)) {
            emailError = 'Enter a valid email address.'
            return current
          }
          if (!manual && !settings.allowMultipleResponses && current.responses.some(response =>
            response.collectorId === collector.id && normalEmail(response.respondent?.email) === address)) {
            emailError = 'A response from this email address has already been received.'
            return current
          }
        }

        const now = new Date().toISOString()
        const timestamps = created(current, now)
        if (!manual) Object.assign(timestamps, { createdBy: 'respondent', updatedBy: 'respondent' })
        const respondent = { ...(name.trim() && { name: name.trim() }), ...(address && { email: address }) }
        return { ...current, responses: [...current.responses, {
          id: idFor('rsp'), surveyId: survey.id, collectorId: collector.id, status: 'completed',
          ...(!settings.anonymous && Object.keys(respondent).length > 0 && { respondent }),
          answers: cleanAnswers(liveQuestions, answers), submittedAt: now, ...timestamps,
        }] }
      })
      if (!saved) {
        setErrors({ email: emailError, form: rejection })
        focusAnswerError(form, { email: emailError })
        return
      }
    }

    submitted.current = true
    setCompleted(true)
    window.scrollTo(0, 0)
  }

  if (completed) return <EntryStatus title={preview ? 'Preview complete' : 'Response submitted'} link={back} label={backLabel} done>
    {preview ? 'The form passed validation.' : 'Thank you for taking the time to respond.'}
  </EntryStatus>
  if (!questions.length) return <EntryStatus title="No questions available" link={back} label={backLabel}>
    {preview ? 'Add questions in Design survey to preview the form.' : 'There are no questions to answer yet.'}
  </EntryStatus>
  return <>
    <header className="surface entry-header stack">
      <div className="between">
        <div className="entry-wordmark">SurveyMonkey<span aria-hidden="true">.</span></div>
        {back && <SiteLink className="button secondary" to={back}>{backLabel}</SiteLink>}
      </div>
      {(preview || manual) && <p className="entry-mode">{preview ? 'Survey preview' : 'Manual data entry'}</p>}
      <h1>{titleFor(survey)}</h1>
      {survey.description && <p className="muted">{survey.description}</p>}
    </header>
    <form className="surface entry-form stack" onSubmit={submit} noValidate>
      {identified && <section className="stack respondent-fields" aria-label="Respondent information">
        <TextField id="respondent-name" label="Name (optional)" value={name} onChange={setName} autoComplete="name"/>
        <TextField id="respondent-email" label={manual ? 'Email (optional)' : 'Email'} value={email} type="email" required={!manual}
          onChange={value => { setEmail(value); setErrors(current => ({ ...current, email: undefined })) }} error={errors.email} autoComplete="email"/>
      </section>}
      <AnswerFields questions={questions} answers={answers} errors={errors} onChange={setAnswer}/>
      {errors.form && <p className="error" role="alert">{errors.form}</p>}
      <div><button className="button primary">{preview ? 'Submit preview' : 'Submit response'}</button></div>
    </form>
  </>
}

export function Entry({ mode }) {
  const { state } = useWorkspace()
  const { surveyId, collectorId } = useParams()
  const preview = mode === 'preview'
  const manual = mode === 'manual'
  const collector = state.collectors.find(record => record.id === collectorId && (
    manual ? record.type === 'manual' && record.surveyId === surveyId : record.type === 'webLink'
  ))
  const survey = state.surveys.find(record => record.id === (preview ? surveyId : collector?.surveyId))
  return <main className="participant">
    {!survey ? <Missing title={preview ? 'Survey unavailable' : 'Collector unavailable'} to={manual ? surveyPath(surveyId, 'collect') : '/surveys'} label={manual ? 'Back to collectors' : 'Back to surveys'}/>
      : !preview && collector.status !== 'open' ? <EntryStatus title="This survey is closed"
        link={manual ? collectorPath(survey.id, collector.id) : null} label="Back to collector">
        {settingsFor(collector).closedMessage || defaultSettings.closedMessage}
      </EntryStatus>
      : <ParticipantForm survey={survey} collector={collector} mode={mode}/>}
  </main>
}
