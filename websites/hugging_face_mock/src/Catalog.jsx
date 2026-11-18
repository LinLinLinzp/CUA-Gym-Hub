import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from './store'
import { Badge, Field, Icon, Link, SelectField } from './ui'
import { array, canLink, date, displayName, findRepo, kinds, label, likeCount, namespace, owns, receivedRequests, repoPath, sortRecent, visible } from './workspace'

const blank = { search: '', scope: '', visibility: '', type: '', sort: 'updated' }

export function RepositoryLink({ kind, repo }) {
  return canLink(repo) ? <Link to={repoPath(kind, repo)}>{displayName(repo)}</Link> : <strong>{displayName(repo)}</strong>
}

export function Overview() {
  const { state } = useWorkspace()
  const counts = Object.keys(kinds).map((kind) => [kind, array(state[kind]).filter((repo) => visible(state.account, repo))])
  const recent = counts.flatMap(([kind, records]) => records.map((repo) => ({ ...repo, kind }))).sort(sortRecent).slice(0, 5)
  const pending = receivedRequests(state).filter((request) => request.status === 'pending')

  return <>
    <section className="hero">
      <div className="hero-copy">
        <h1>Your workspace</h1>
        <p>Find and manage your models, datasets, and Spaces. Review requests and control repository access from one place.</p>
        <div className="actions"><Link to="/models/new" className="button primary"><Icon name="plus" />New model</Link><Link to="/access?tab=received" className="button secondary">Review access<Icon name="arrow" /></Link></div>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="art-grid" /><div className="orbit"><i /><i /><i /><i /></div><i className="art-block block-one" /><i className="art-block block-two" /><i className="art-block block-three" /><i className="art-point" /></div>
    </section>
    <section className="stat-grid" aria-label="Workspace totals">
      {counts.map(([kind, records]) => <Stat key={kind} to={'/' + kind} icon={kinds[kind].icon} title={kinds[kind].label} count={records.length} />)}
      <Stat to="/access?tab=received&status=pending" icon="access" title="Pending review" count={pending.length} />
    </section>
    <div className="overview-columns">
      <section className="panel overview-panel"><div className="panel-heading"><h2>Recently updated</h2><Link to="/activity">View activity <Icon name="arrow" size={15} /></Link></div>
        {recent.length ? <ul className="compact-list">{recent.map((repo, index) => <li key={repo.id || index}><span className={'icon-tile ' + repo.kind}><Icon name={kinds[repo.kind].icon} /></span><div><RepositoryLink kind={repo.kind} repo={repo} /><small className="mono">{namespace(repo)}</small></div><time className="quiet">{date(repo.updatedAt)}</time></li>)}</ul>
          : <p className="quiet panel-message">Repositories will appear here as they’re added.</p>}
      </section>
      <section className="panel overview-panel"><div className="panel-heading"><h2>Pending review</h2><Link to="/access?tab=received&status=pending">Open queue <Icon name="arrow" size={15} /></Link></div>
        {pending.length ? <ul className="compact-list">{pending.slice(0, 5).map((request, index) => {
          const person = array(state.users).find((entry) => entry.id === request.requesterId)
          const repo = findRepo(state, request.repoType, request.repoId)
          return <li key={request.id || index}><span className="icon-tile review"><Icon name="access" /></span><div><strong>{person?.displayName || person?.username || request.requesterId || 'Unknown requester'}</strong><small>{displayName(repo)}</small></div><Badge value={request.status} /></li>
        })}</ul> : <p className="quiet panel-message">You’re all caught up on access requests.</p>}
      </section>
    </div>
  </>
}

function Stat({ to, icon, title, count }) {
  return <Link to={to} className="panel stat"><span className={'icon-tile ' + icon}><Icon name={icon} /></span><Icon name="arrow" size={17} /><strong>{count}</strong><span>{title}</span></Link>
}

export function Catalog({ kind }) {
  const { state } = useWorkspace()
  const spec = kinds[kind]
  const [filters, setFilters] = useState(blank)
  const searchRef = useRef(null)
  useEffect(() => {
    function shortcut(event) {
      if (event.ctrlKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  const on = (key) => (value) => setFilters((previous) => ({ ...previous, [key]: value }))
  const all = array(state[kind]).filter((repo) => visible(state.account, repo))
  const types = [...new Set([...spec.options, ...all.map((repo) => repo[spec.field]).filter(Boolean)])]
  const query = filters.search.trim().toLowerCase()
  const records = all.filter((repo) =>
    (!filters.scope || owns(state.account, repo)) &&
    (!filters.visibility || (repo.visibility || 'public') === filters.visibility) &&
    (!filters.type || repo[spec.field] === filters.type) &&
    (!query || [repo.name, namespace(repo), repo.description, ...array(repo.tags)].join(' ').toLowerCase().includes(query)),
  ).sort((a, b) => {
    if (filters.sort === 'name') return displayName(a).localeCompare(displayName(b))
    if (filters.sort === 'likes') return likeCount(b) - likeCount(a) || sortRecent(a, b)
    return sortRecent(a, b)
  })

  return <>
    <div className="page-heading"><div><h1>{spec.label}</h1><p>{({
      models: 'Discover models and manage the ones you publish.',
      datasets: 'Browse collections, inspect sample rows, and maintain dataset cards.',
      spaces: 'Explore interactive demos and manage your published Spaces.',
    })[kind]}</p></div><Link className="button primary" to={'/' + kind + '/new'}><Icon name="plus" />New {kind === 'spaces' ? 'Space' : spec.singular}</Link></div>
    <section className="panel toolbar" aria-label="Catalog filters">
      <Field title={'Search ' + spec.label.toLowerCase()} search><input ref={searchRef} type="search" placeholder="Name, tag, or namespace" value={filters.search} onChange={(event) => on('search')(event.target.value)} /></Field>
      <Field title="Scope"><select value={filters.scope} onChange={(event) => on('scope')(event.target.value)}><option value="">All repositories</option><option value="mine">My repositories</option></select></Field>
      <SelectField title="Visibility" value={filters.visibility} onChange={on('visibility')} first="Any visibility" options={['public', 'private']} />
      <SelectField title={spec.fieldLabel} value={filters.type} onChange={on('type')} first={'Any ' + spec.fieldLabel.toLowerCase()} options={types} />
      <Field title="Sort by"><select value={filters.sort} onChange={(event) => on('sort')(event.target.value)}><option value="updated">Recently updated</option><option value="name">Name</option><option value="likes">Likes</option></select></Field>
      <button className="button secondary" onClick={() => setFilters(blank)}>Reset</button>
    </section>
    <div className="result-count" aria-live="polite">{records.length} {records.length === 1 ? 'repository' : 'repositories'}</div>
    {records.length ? <div className="panel catalog">
      <div className="catalog-heading"><span>Repository</span><span>{spec.fieldLabel}</span><span>{kind === 'spaces' ? 'Visibility / status' : 'Visibility'}</span><span>Updated</span><span>Likes</span></div>
      {records.map((repo, index) => <article className="catalog-row" key={repo.id || index}>
        <div className="catalog-title"><span className={'icon-tile ' + kind}><Icon name={spec.icon} /></span><div><RepositoryLink kind={kind} repo={repo} /><small className="mono">{namespace(repo)}</small>{repo.description && <p>{repo.description}</p>}</div></div>
        <div data-label={spec.fieldLabel}>{label(repo[spec.field])}</div>
        <div data-label="Visibility" className="badge-group"><Badge value={repo.visibility || 'public'} />{kind === 'spaces' && repo.runtimeStatus && <Badge value={repo.runtimeStatus} />}{kind !== 'spaces' && ['auto', 'manual'].includes(repo.gating) && <span className="badge">Gated</span>}</div>
        <time data-label="Updated">{date(repo.updatedAt)}</time><span data-label="Likes" className="mono">{likeCount(repo)}</span>
      </article>)}
    </div> : <section className="panel empty"><h2>No repositories found</h2><p>Try a different search or clear your filters.</p><button className="button secondary" onClick={() => setFilters(blank)}>Clear filters</button></section>}
  </>
}
