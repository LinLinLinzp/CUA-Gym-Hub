import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { artwork, childPath, Confirm, Cover, dateLabel, Field, Funding, list, money, projectPath, Readable, SectionHeading, SiteLink, useFeedback, useSiteNavigate } from '../ui'
import { creation, put, timestamp, useStore } from '../store'
import { bind, selected, textValues, today, validDate, validMoney } from '../forms'

const categories = ['Art', 'Comics', 'Design', 'Film & Video', 'Music', 'Photography', 'Publishing', 'Theater']
const currencies = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'JPY', 'NZD', 'MXN']
const fields = ['title', 'blurb', 'category', 'location', 'fundingGoal', 'currency', 'deadline', 'story', 'risks', 'coverKey']
const blankProject = { currency: 'USD', status: 'draft', pledgedAmount: 0, backerCount: 0 }
const activeTiers = (state, id) => list(state.rewards).filter(reward => reward.projectId === id && reward.type === 'tier' && reward.status === 'active')

function editableFields(values, project) {
  const trimmed = Object.fromEntries(fields.map(key => [key, values[key].trim()]))
  if (project && project.status !== 'draft') {
    for (const key of ['fundingGoal', 'currency', 'deadline']) delete trimmed[key]
  } else {
    trimmed.fundingGoal = trimmed.fundingGoal ? Number(trimmed.fundingGoal) : null
    trimmed.deadline ||= null
  }
  trimmed.coverKey ||= null
  return trimmed
}

function launchIssues(project, state) {
  const missing = [
    ['title', 'a title'], ['blurb', 'a short blurb'], ['category', 'a category'],
    ['location', 'a location'], ['story', 'a story'], ['currency', 'a currency'],
  ].filter(([field]) => !String(project[field] ?? '').trim()).map(([, label]) => label)
  if (!validMoney(project.fundingGoal ?? '')) missing.push('a positive funding goal')
  if (!validDate(project.deadline) || project.deadline < today()) missing.push('a funding deadline that has not passed')
  if (!activeTiers(state, project.id).length) missing.push('an active reward tier')
  return missing
}

export function CampaignEditor({ project }) {
  const { state, mutate } = useStore()
  const notify = useFeedback()
  const navigate = useSiteNavigate()
  const { state: routeState } = useLocation()
  const [values, setValues] = useState(() => textValues({ ...(project || blankProject), ...routeState?.campaignForm }, fields))
  const [errors, setErrors] = useState({})
  const base = project ? projectPath(project.id) : '/projects/new'
  const locked = Boolean(project && project.status !== 'draft')
  const field = (name) => ({ ...bind(values, setValues, name), error: errors[name] })

  function validate(form) {
    const issues = {}
    if (!values.title.trim()) issues.title = 'Enter a project title.'
    if (!locked && values.fundingGoal.trim() && !validMoney(values.fundingGoal)) issues.fundingGoal = 'Enter a positive amount with up to two decimal places.'
    if (!locked && (values.deadline && !validDate(values.deadline) || form.elements.fundingDeadline.validity.badInput)) issues.deadline = 'Enter a valid funding deadline.'
    setErrors(issues)
    return !Object.keys(issues).length
  }

  function save(event) {
    event.preventDefault()
    if (!validate(event.currentTarget)) return
    let id
    mutate(current => {
      const existing = project && list(current.projects).find(entry => entry.id === project.id)
      if (project && !existing) return current
      const next = existing
        ? { ...existing, ...editableFields(values, existing), ...timestamp(current.account) }
        : { ...blankProject, ...editableFields(values), ...creation(current.account, 'project'), launchedAt: null }
      id = next.id
      return put(current, 'projects', next)
    })
    if (!id) return
    notify(project ? 'Campaign saved.' : 'Project draft created.')
    navigate(projectPath(id) + '/campaign', { replace: !project })
  }

  function preview(event) {
    if (!validate(event.currentTarget.form)) return
    navigate(project ? base + '/preview' : base, {
      state: { campaignPreview: editableFields(values, project) },
    })
  }

  const newPreview = !project && routeState?.campaignPreview
  if (newPreview) return <CampaignPreview project={{ ...blankProject, ...newPreview }} isNew />

  return <>
    {!project && <SiteLink className="breadcrumb" to="/">← Projects</SiteLink>}
    <SectionHeading title={project ? 'Campaign' : 'New project'}
      description={project ? 'Manage the story and funding details for your campaign.' : 'Start a draft and fill in your campaign details.'} />
    <form className="editor" onSubmit={save} noValidate>
      <section className="panel editor-group">
        <h3>Project basics</h3>
        <Field label="Project title" required {...field('title')} />
        <Field label="Short blurb" as="textarea" rows={2} {...field('blurb')} />
        <div className="field-pair">
          <Field label="Category" as="select" {...field('category')}>
            <option value="">Choose a category</option>
            {selected(categories, values.category).map(value => <option key={value}>{value}</option>)}
          </Field>
          <Field label="Location" placeholder="City, region" {...field('location')} />
        </div>
        <Field label="Cover artwork" as="select" {...field('coverKey')}>
          <option value="">Default illustration</option>
          {selected(Object.keys(artwork), values.coverKey).map(key => <option key={key} value={key}>{artwork[key] || key}</option>)}
        </Field>
        {values.coverKey && <Cover coverKey={values.coverKey} className="editor-cover" />}
      </section>
      <section className="panel editor-group">
        <h3>Funding</h3>
        {locked && <p className="hint">The goal, currency and deadline are locked after launch.</p>}
        <div className="field-pair">
          <Field label="Funding goal" inputMode="decimal" placeholder="0.00" disabled={locked} {...field('fundingGoal')} />
          <Field label="Currency" as="select" disabled={locked} {...field('currency')}>
            <option value="">Choose a currency</option>
            {selected(currencies, values.currency).map(value => <option key={value}>{value}</option>)}
          </Field>
        </div>
        <Field label="Funding deadline" name="fundingDeadline" type="date" disabled={locked} {...field('deadline')} />
      </section>
      <section className="panel editor-group">
        <h3>Campaign story</h3>
        <Field label="Story" as="textarea" rows={6} {...field('story')} />
        <Field label="Risks and challenges" as="textarea" rows={4} {...field('risks')} />
      </section>
      <div className="actions">
        <button className="button primary" type="submit">{project ? 'Save campaign' : 'Save draft'}</button>
        <button className="button secondary" type="button" onClick={preview}>Preview campaign</button>
        {project && <SiteLink className="button secondary" to={base + '/preview'}>View saved campaign</SiteLink>}
      </div>
    </form>
  </>
}

export function CampaignPreview({ project, isNew = false }) {
  const { state, mutate } = useStore()
  const { state: routeState } = useLocation()
  const notify = useFeedback()
  const navigate = useSiteNavigate()
  const [confirm, setConfirm] = useState(false)
  const base = isNew ? '/projects/new' : projectPath(project.id)
  const pending = !isNew && routeState?.campaignPreview
  const displayed = pending ? { ...project, ...pending } : project
  const tiers = isNew ? [] : activeTiers(state, project.id)
  const posts = isNew ? [] : list(state.updates).filter(update =>
    update.projectId === project.id && update.status === 'published' && update.audience === 'public'
  )
  const issues = displayed.status === 'draft' && !isNew ? launchIssues(project, state) : []
  const hasChanges = pending && Object.keys(pending).some(key => pending[key] !== project[key])

  function launch() {
    const saved = mutate(current => {
      const entry = list(current.projects).find(item => item.id === project.id)
      if (!entry || entry.status !== 'draft' || launchIssues(entry, current).length) return current
      const stamp = timestamp(current.account)
      return put(current, 'projects', { ...entry, status: 'live', launchedAt: stamp.updatedAt, ...stamp })
    })
    setConfirm(false)
    if (saved) notify('Project launched.')
  }

  return <>
    <SectionHeading title="Campaign preview" description={isNew || hasChanges ? 'Showing unsaved campaign changes.' : 'Showing the saved campaign page.'}>
      {pending || isNew
        ? <button className="button secondary" onClick={() => navigate(isNew ? base : base + '/campaign', { state: { campaignForm: isNew ? routeState?.campaignPreview : pending } })}>Return to editor</button>
        : <SiteLink className="button secondary" to={base + '/campaign'}>Edit campaign</SiteLink>}
    </SectionHeading>
    <div className="overview">
      <section className="panel overview-story">
        <Cover coverKey={displayed.coverKey} />
        <div className="panel-body preview-copy">
          <h2 className="preview-title">{displayed.title || 'Untitled project'}</h2>
          <p className="hint">{[displayed.category, displayed.location].filter(Boolean).join(' · ')}</p>
          <Readable>{displayed.blurb}</Readable>
          <section><h2>Story</h2><Readable>{displayed.story}</Readable></section>
          <section><h2>Risks and challenges</h2><Readable>{displayed.risks}</Readable></section>
          <section><h2>Project updates</h2>
            {posts.length ? posts.map(update => <article className="preview-entry" key={update.id}>
              <h3>{update.title || 'Untitled update'}</h3><p className="hint">{dateLabel(update.publishedAt)}</p><Readable>{update.body}</Readable>
            </article>) : <p className="hint">No public updates yet.</p>}
          </section>
        </div>
      </section>
      <div className="overview-side">
        <section className="panel panel-body">
          <h2>Funding summary</h2><Funding project={displayed} />
          <p>Funding deadline · {dateLabel(displayed.deadline)}</p>
          {!isNew && displayed.status === 'draft' && <>
            <button className="button primary spaced" type="button" disabled={Boolean(hasChanges || issues.length)}
              onClick={() => setConfirm(true)}>Launch project</button>
            {hasChanges ? <p className="hint">Save your campaign changes to launch.</p> : issues.length > 0 && <p className="hint">Before launch, add {issues.join(', ')}.</p>}
          </>}
        </section>
        <section className="panel panel-body"><h2>Reward tiers</h2>
          {tiers.length ? tiers.map(tier => <article className="preview-entry" key={tier.id}>
            <h3>{tier.title || 'Untitled tier'}</h3><p>{money(tier.minimumPledge, displayed.currency)}</p><Readable>{tier.description}</Readable>
          </article>) : <p className="hint">No active reward tiers.</p>}
          {!isNew && <SiteLink className="button secondary spaced" to={childPath(base, 'rewards')}>Manage rewards</SiteLink>}
        </section>
      </div>
    </div>
    {confirm && <Confirm title="Launch project" onClose={() => setConfirm(false)} onConfirm={launch}>
      <p>Launch <strong>{project.title}</strong>? The campaign will go live immediately and its funding terms will lock.</p>
    </Confirm>}
  </>
}

