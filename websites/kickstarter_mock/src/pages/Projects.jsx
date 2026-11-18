import { useState } from 'react'
import { Badge, Cover, Empty, Field, FilterCount, Funding, includes, list, PageHeading, projectPath, SiteLink } from '../ui'
import { useStore } from '../store'

const statuses = ['draft', 'live', 'funded', 'unsuccessful']

export function Catalog() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('recent')
  const projects = list(state.projects)
  const filtered = Boolean(query.trim() || status)
  const rows = projects.filter(project =>
    (!status || project.status === status) && (includes(project.title, query) || includes(project.category, query))
  ).sort((a, b) => sort === 'title'
    ? String(a.title ?? '').localeCompare(String(b.title ?? ''))
    : String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
  const reset = () => { setQuery(''); setStatus('') }

  return <>
    <PageHeading title="Projects" description={state.account.studioName}>
      <SiteLink className="button primary" to="/projects/new"><span aria-hidden="true">＋</span> New project</SiteLink>
    </PageHeading>
    <div className="toolbar panel catalog-toolbar">
      <Field label="Search projects" type="search" placeholder="Search by title or category" value={query} onChange={event => setQuery(event.target.value)} />
      <Field label="Status" as="select" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option>
        {statuses.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
      </Field>
      <Field label="Sort by" as="select" value={sort} onChange={event => setSort(event.target.value)}>
        <option value="recent">Recently edited</option><option value="title">Title A–Z</option>
      </Field>
    </div>
    <FilterCount count={rows.length} noun="project" filtered={filtered} onReset={reset} />
    {rows.length ? <div className="catalog">
      {rows.map(project => <article className="project-card panel" key={project.id}>
        <SiteLink className="card-link" to={projectPath(project.id)}>
          <Cover coverKey={project.coverKey} />
          <div className="card-content">
            <div className="card-meta"><span>{project.category || 'Uncategorized'}</span><Badge status={project.status} /></div>
            <h2>{project.title || 'Untitled project'}</h2>
            <Funding project={project} />
          </div>
        </SiteLink>
      </article>)}
    </div> : <Empty title={filtered ? 'No matching projects' : 'No projects yet'}
      message={filtered ? 'Try a different title, category or status.' : 'Start a draft to set up your first campaign.'}>
      {filtered ? <button className="button secondary" onClick={reset}>Clear filters</button> : <SiteLink className="button primary" to="/projects/new">New project</SiteLink>}
    </Empty>}
  </>
}

export const sections = [
  { slug: '', label: 'Overview' },
  { slug: 'campaign', label: 'Campaign', description: 'Edit the story, funding details and launch plan.' },
  { slug: 'rewards', label: 'Rewards', description: 'Manage pledge tiers and add-ons.' },
  { slug: 'surveys', label: 'Backer surveys', description: 'Collect fulfillment information from backers.' },
  { slug: 'updates', label: 'Updates', description: 'Share progress with your backers and the public.' },
]

export function Overview({ project }) {
  const base = projectPath(project.id)
  return <div className="overview">
    <section className="panel overview-story">
      <Cover coverKey={project.coverKey} />
      <div className="panel-body">
        <h2>Campaign overview</h2>
        <p>{project.blurb || 'Add a short blurb to introduce your campaign.'}</p>
        <SiteLink className="button secondary" to={base + '/preview'}>Preview campaign</SiteLink>
      </div>
    </section>
    <div className="overview-side">
      <section className="panel panel-body"><h2>Funding summary</h2><Funding project={project} /></section>
      <section className="panel panel-body workflow-links"><h2>Creator tools</h2>
        {sections.slice(1).map(section => <SiteLink key={section.slug} to={base + '/' + section.slug}>
          <strong>{section.label}</strong><span>{section.description}</span>
        </SiteLink>)}
      </section>
    </div>
  </div>
}

export function Missing({ title, to = '/', label = 'Back to projects' }) {
  return <Empty title={title}><SiteLink className="button secondary" to={to}>{label}</SiteLink></Empty>
}

