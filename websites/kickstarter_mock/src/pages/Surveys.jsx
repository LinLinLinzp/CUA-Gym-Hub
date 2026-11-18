import { useState } from 'react'
import { Badge, Check, childPath, Confirm, dateLabel, Dialog, Empty, Field, list, projectPath, Readable, SectionHeading, SiteLink, useFeedback, useSiteNavigate } from '../ui'
import { creation, newId, put, timestamp, useStore } from '../store'
import { bind, textValues } from '../forms'
import { SurveyResponses } from './SurveyResponses'
import { Missing } from './Projects'

const launchedStatuses = ['live', 'funded', 'unsuccessful']
const questionTypes = { short_text: 'Short text', single_choice: 'Single choice' }

function surveysFor(state, projectId) {
  return list(state.surveys).filter(survey => survey.projectId === projectId)
}

function recipientsFor(state, projectId) {
  const rewards = new Set(list(state.rewards).filter(reward => reward.projectId === projectId).map(reward => reward.id))
  return [...new Set(list(state.backers).filter(backer =>
    backer.id && backer.projectId === projectId && backer.paymentStatus === 'paid' && backer.rewardId && rewards.has(backer.rewardId)
  ).map(backer => backer.id))]
}

function draftContent(values, questions, shipping) {
  return {
    title: values.title.trim(), intro: values.intro.trim(), collectShippingAddress: shipping,
    questions: questions.map(({ id, original, label, type, required, choices }) => ({
      ...original, id, label: label.trim(), type, required,
      options: type === 'single_choice' ? choices.map(choice => choice.value.trim()) : [],
    })),
  }
}

function formIssues(content, needsCollection = false) {
  const errors = {}
  if (!content.title) errors.title = 'Enter a survey title.'
  if (needsCollection && !content.collectShippingAddress && !content.questions.length) {
    errors.questions = 'Add a question or collect shipping addresses.'
  }
  for (const [index, question] of content.questions.entries()) {
    if (!question.label) errors[index + 'label'] = 'Enter a question.'
    if (!Object.hasOwn(questionTypes, question.type)) errors[index + 'type'] = 'Choose a question type.'
    if (question.type === 'single_choice') {
      const distinct = new Set(question.options.map(option => option.toLowerCase()))
      if (question.options.length < 2 || question.options.includes('') || distinct.size !== question.options.length) {
        errors[index + 'options'] = 'Enter at least two distinct, nonempty choices.'
      }
    }
  }
  return errors
}

function choices(options) {
  return options.map(value => ({ key: newId('choice'), value }))
}

function editQuestion(question = {}) {
  const type = question.type || 'short_text'
  return {
    id: question.id || newId('question'), original: question, label: question.label || '',
    type, required: Boolean(question.required),
    choices: choices(list(question.options).length ? list(question.options).map(String) : ['', '']),
  }
}

export function Surveys({ project, surveyId }) {
  const { state } = useStore()
  const [creating, setCreating] = useState(false)
  const base = projectPath(project.id) + '/surveys'
  const all = surveysFor(state, project.id)
  const sent = all.find(survey => survey.status === 'sent')
  const survey = surveyId ? all.find(entry => entry.id === surveyId) : sent || all.find(entry => entry.status === 'draft') || all[0]
  if (surveyId && !survey) return <Missing title="Survey not found" to={base} label="Back to backer surveys" />
  if (survey?.status === 'sent') return <SentSurvey key={survey.id} project={project} survey={survey} />
  if (!launchedStatuses.includes(project.status)) return <>
    <SectionHeading title="Backer surveys" />
    <Empty title="Surveys open after launch" message="Launch your campaign before creating a backer survey.">
      <SiteLink className="button secondary" to={projectPath(project.id) + '/preview'}>Preview campaign</SiteLink>
    </Empty>
  </>
  if (!survey && !creating) return <>
    <SectionHeading title="Backer surveys" />
    <Empty title="No survey yet" message="Ask backers for information you need to fulfill rewards.">
      <button className="button primary" type="button" onClick={() => setCreating(true)}>Create survey</button>
    </Empty>
  </>
  return <SurveyEditor key={survey?.id || 'new-' + project.id} project={project} survey={survey} />
}

function SurveyEditor({ project, survey }) {
  const { state, mutate } = useStore()
  const notify = useFeedback()
  const navigate = useSiteNavigate()
  const [values, setValues] = useState(() => textValues(survey, ['title', 'intro']))
  const [shipping, setShipping] = useState(Boolean(survey?.collectShippingAddress))
  const [questions, setQuestions] = useState(() => list(survey?.questions).map(editQuestion))
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const base = projectPath(project.id) + '/surveys'
  const sent = surveysFor(state, project.id).find(entry => entry.status === 'sent')
  const content = draftContent(values, questions, shipping)
  const dirty = !survey || content.title !== (survey.title || '') || content.intro !== (survey.intro || '') ||
    content.collectShippingAddress !== Boolean(survey.collectShippingAddress) ||
    JSON.stringify(content.questions) !== JSON.stringify(list(survey.questions))
  const eligible = recipientsFor(state, project.id)
  const sendReason = sent ? 'A survey has already been sent for this project.'
    : project.status !== 'funded' ? 'A survey can be sent after this project is funded.'
    : !eligible.length ? 'There are no eligible paid backers.'
    : dirty ? 'Save the survey draft before sending.'
    : Object.keys(formIssues(content, true)).length ? 'Add valid questions or collect shipping addresses before sending.' : ''

  function changeQuestion(index, patch) {
    setQuestions(current => current.map((question, position) => position === index ? { ...question, ...patch } : question))
  }

  function moveQuestion(index, direction) {
    setQuestions(current => {
      const next = current.slice()
      const [question] = next.splice(index, 1)
      next.splice(index + direction, 0, question)
      return next
    })
    setErrors({})
  }

  function save(event) {
    event.preventDefault()
    const issues = formIssues(content)
    setErrors(issues)
    if (Object.keys(issues).length || sent) return
    let id
    mutate(current => {
      const owner = list(current.projects).find(entry => entry.id === project.id)
      const existing = surveysFor(current, project.id)
      const draft = existing.find(entry => entry.id === survey?.id)
      if (!owner || !launchedStatuses.includes(owner.status) || existing.some(entry => entry.status === 'sent') ||
        (survey ? draft?.status !== 'draft' : existing.length > 0)) return current
      const record = draft ? { ...draft, ...content, ...timestamp(current.account) } : {
        ...creation(current.account, 'survey'), projectId: project.id, ...content,
        status: 'draft', sentAt: null, sentBy: null, recipientBackerIds: [], recipientCount: 0,
      }
      id = record.id
      return put(current, 'surveys', record)
    })
    if (!id) return
    notify('Survey draft saved.')
    navigate(childPath(base, id), { replace: !survey })
  }

  function send() {
    const saved = mutate(current => {
      const owner = list(current.projects).find(entry => entry.id === project.id)
      const existing = surveysFor(current, project.id)
      const draft = existing.find(entry => entry.id === survey?.id)
      if (owner?.status !== 'funded' || draft?.status !== 'draft' || existing.some(entry => entry.status === 'sent')) return current
      const recipientBackerIds = recipientsFor(current, owner.id)
      const savedContent = {
        title: String(draft.title ?? '').trim(), collectShippingAddress: Boolean(draft.collectShippingAddress),
        questions: list(draft.questions).map(question => ({ ...question, options: list(question.options).map(String) })),
      }
      if (!recipientBackerIds.length || Object.keys(formIssues(savedContent, true)).length) return current
      const stamp = timestamp(current.account)
      return put(current, 'surveys', {
        ...draft, status: 'sent', sentAt: stamp.updatedAt, sentBy: stamp.updatedBy,
        recipientBackerIds, recipientCount: recipientBackerIds.length, ...stamp,
      })
    })
    setConfirm(false)
    if (saved) notify('Survey sent.')
  }

  return <>
    <SectionHeading title="Backer surveys" description="Build a survey to collect fulfillment details from your backers.">
      {survey && <Badge status={survey.status} />}
    </SectionHeading>
    <form className="editor" onSubmit={save} noValidate>
      <section className="panel editor-group">
        <h3>Survey details</h3>
        <Field label="Survey title" required error={errors.title} {...bind(values, setValues, 'title')} />
        <Field label="Introduction" as="textarea" rows={3} {...bind(values, setValues, 'intro')} />
        <Check label="Collect shipping addresses" checked={shipping} onChange={event => setShipping(event.target.checked)} />
      </section>
      <section className="panel editor-group">
        <h3>Questions</h3>
        {!questions.length && <p className="hint">Add a question to collect details such as size, color or personalization.</p>}
        {questions.map((question, index) => <section className="question-block" key={question.id}>
          <h3>Question {index + 1}</h3>
          <div className="field-pair">
            <Field label={`Question ${index + 1} text`} value={question.label} error={errors[index + 'label']}
              onChange={event => changeQuestion(index, { label: event.target.value })} />
            <Field label={`Question ${index + 1} type`} as="select" value={question.type} error={errors[index + 'type']}
              onChange={event => changeQuestion(index, { type: event.target.value })}>
              {!Object.hasOwn(questionTypes, question.type) && <option value={question.type}>Choose a type</option>}
              {Object.entries(questionTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Field>
          </div>
          <Check label={`Question ${index + 1} required`} checked={question.required} onChange={event => changeQuestion(index, { required: event.target.checked })} />
          {question.type === 'single_choice' && <div className="choices">
            {question.choices.map((choice, position) => <div className="choice-row" key={choice.key}>
              <Field label={`Question ${index + 1} choice ${position + 1}`} value={choice.value} onChange={event => changeQuestion(index, {
                choices: question.choices.map(item => item.key === choice.key ? { ...item, value: event.target.value } : item),
              })} />
              <button className="button secondary" type="button" onClick={() => changeQuestion(index, {
                choices: question.choices.filter(item => item.key !== choice.key),
              })} aria-label={`Remove question ${index + 1} choice ${position + 1}`}>Remove</button>
            </div>)}
            {errors[index + 'options'] && <p className="field-error" role="alert">{errors[index + 'options']}</p>}
            <button className="button secondary align-start" type="button" onClick={() => changeQuestion(index, {
              choices: [...question.choices, ...choices([''])],
            })}>Add choice</button>
          </div>}
          <div className="actions">
            <button className="button secondary" type="button" disabled={index === 0} aria-label={`Move question ${index + 1} up`} onClick={() => moveQuestion(index, -1)}>Move up</button>
            <button className="button secondary" type="button" disabled={index === questions.length - 1} aria-label={`Move question ${index + 1} down`} onClick={() => moveQuestion(index, 1)}>Move down</button>
            <button className="button secondary" type="button" aria-label={`Remove question ${index + 1}`} onClick={() => {
              setQuestions(current => current.filter(item => item.id !== question.id))
              setErrors({})
            }}>Remove question</button>
          </div>
        </section>)}
        <button className="button secondary align-start" type="button" onClick={() => setQuestions(current => [...current, editQuestion()])}>Add question</button>
      </section>
      <div className="actions">
        <button className="button primary" type="submit" disabled={Boolean(sent)}>Save survey draft</button>
        <button className="button secondary" type="button" onClick={() => setPreview(true)}>Preview survey</button>
        <button className="button primary" type="button" disabled={Boolean(sendReason)} onClick={() => setConfirm(true)}>Send survey</button>
      </div>
      <p className="hint">{eligible.length} eligible paid {eligible.length === 1 ? 'backer' : 'backers'}. {sendReason}</p>
    </form>
    {preview && <Dialog title="Survey preview" onClose={() => setPreview(false)}>
      <div className="dialog-body"><SurveyContent survey={content} /></div>
      <button className="button secondary" type="button" onClick={() => setPreview(false)}>Close preview</button>
    </Dialog>}
    {confirm && <Confirm title="Send survey" onClose={() => setConfirm(false)} onConfirm={send}>
      <p>Send <strong>{content.title}</strong> to <strong>{eligible.length} {eligible.length === 1 ? 'backer' : 'backers'}</strong>? The questions will be read-only once sent.</p>
    </Confirm>}
  </>
}

function SurveyContent({ survey }) {
  return <div className="survey-content">
    <h3>{survey.title || 'Untitled survey'}</h3>
    {survey.intro && <Readable>{survey.intro}</Readable>}
    {list(survey.questions).map(question => {
      const label = (question.label || 'Untitled question') + (question.required ? ' (required)' : '')
      return question.type === 'single_choice'
        ? <Field key={question.id} label={label} as="select" defaultValue="">
          <option value="">Choose an answer</option>
          {list(question.options).map((option, index) => <option key={index}>{option}</option>)}
        </Field>
        : <Field key={question.id} label={label} />
    })}
    {survey.collectShippingAddress && <fieldset className="survey-content">
      <legend>Shipping address</legend>
      {['Street address', 'City', 'State or region', 'Postal code', 'Country'].map(label => <Field label={label} key={label} />)}
    </fieldset>}
  </div>
}

function SentSurvey({ project, survey }) {
  const { state } = useStore()
  const [preview, setPreview] = useState(false)
  const ids = [...new Set(list(survey.recipientBackerIds))]
  const backers = new Map(list(state.backers).filter(backer => backer.projectId === project.id).map(backer => [backer.id, backer]))
  const rewards = new Map(list(state.rewards).filter(reward => reward.projectId === project.id).map(reward => [reward.id, reward]))
  const responses = new Map(list(state.surveyResponses)
    .filter(response => response.surveyId === survey.id && response.status === 'submitted').map(response => [response.backerId, response]))
  const rows = ids.map(id => {
    const backer = backers.get(id)
    return { id, backer, rewardTitle: rewards.get(backer?.rewardId)?.title, response: responses.get(id) }
  })
  const answered = rows.filter(row => row.response).length

  return <>
    <SectionHeading title="Backer surveys">
      <button className="button secondary" type="button" onClick={() => setPreview(true)}>Preview sent survey</button>
    </SectionHeading>
    <section className="panel panel-body survey-summary">
      <div className="survey-summary-title"><h3>{survey.title || 'Untitled survey'}</h3><Badge status="sent" /></div>
      <p>Sent {dateLabel(survey.sentAt)} · {survey.recipientCount ?? ids.length} recipients</p>
      <p>{answered} answered · {ids.length - answered} pending</p>
    </section>
    <SectionHeading title="Responses" />
    <SurveyResponses rows={rows} survey={survey} />
    {preview && <Dialog title="Sent survey preview" onClose={() => setPreview(false)}>
      <div className="dialog-body"><SurveyContent survey={survey} /></div>
      <button className="button secondary" type="button" onClick={() => setPreview(false)}>Close preview</button>
    </Dialog>}
  </>
}

