import { ArrowRight, Building2, Clock3, FolderClosed, ListChecks, Megaphone, Pencil, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { titleColumn } from './data/seed'
import { contentsPath, formatDate, idFor, labelType, libraryPath, listPath, normalize, sameName, sitePath } from './model'
import { AppLink, Breadcrumb, Empty, Field, FilterInput, FormActions, Modal, useAppNavigate, usePaging } from './ui'
import { useWorkspace } from './workspace'

function followedSites(data) {
  const ids = new Set(data.siteFollows.filter((follow) => follow.userId === data.account.userId).map((follow) => follow.siteId))
  return data.sites.filter((site) => ids.has(site.id))
}

function SiteCards({ sites }) {
  return <div className="card-grid">{sites.map((site) => {
    const Icon = site.type === 'communication' ? Megaphone : Building2
    return <AppLink className="site-card" key={site.id} to={sitePath(site.id)}>
      <div className="card-top">
        <span className={'tile ' + (site.type === 'communication' ? 'peach' : '')}><Icon size={20} /></span>
        <ArrowRight size={16} aria-hidden="true" />
      </div>
      <div><h3>{site.name}</h3><small>{labelType(site.type)}</small></div>
      {site.description && <p>{site.description}</p>}
    </AppLink>
  })}</div>
}

export function Home() {
  const { data, actorName } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const following = followedSites(data)
  const recent = data.sites.filter((site) => site.updatedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6)
  const paging = usePaging(following, 'following', 6)
  return <>
    <section className="hero">
      <div className="hero-copy">
        <h1>Welcome, {actorName.split(' ')[0]}</h1>
        <p>Find your team sites, shared lists and documents.</p>
        <div className="hero-actions">
          <AppLink className="button primary" to="/sites">Browse sites <ArrowRight size={16} /></AppLink>
          <button onClick={() => setCreating(true)}><Plus size={17} />Create site</button>
        </div>
      </div>
      <div className="paper-art" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    </section>
    <div className={'home-grid ' + (recent.length ? 'with-recent' : '')}>
      <section>
        <div className="section-heading">
          <h2>Following</h2>
          <AppLink to="/sites?view=following">View following <ArrowRight size={14} /></AppLink>
        </div>
        {following.length ? <><SiteCards sites={paging.rows} />{paging.controls}</> :
          <Empty title="You aren’t following any sites yet"><AppLink to="/sites">Find a site to follow</AppLink></Empty>}
      </section>
      {recent.length > 0 && <section className="activity">
        <h2><Clock3 size={19} />Recently updated</h2>
        {recent.map((site) => <AppLink key={site.id} to={sitePath(site.id)}>
          <span><strong>{site.name}</strong><small>{formatDate(site.updatedAt)}</small></span>
          <ArrowRight size={15} aria-hidden="true" />
        </AppLink>)}
      </section>}
    </div>
    {creating && <SiteForm onClose={() => setCreating(false)} />}
  </>
}

export function Sites() {
  const { data } = useWorkspace()
  const [following, setFollowing] = useState(() => new URLSearchParams(window.location.search).get('view') === 'following')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [creating, setCreating] = useState(false)
  const matches = (following ? followedSites(data) : data.sites).filter((site) =>
    (!type || site.type === type) && normalize(site.name + ' ' + (site.description ?? '')).includes(normalize(query)))
  const paging = usePaging(matches, JSON.stringify([following, query, type]), 18)
  return <>
    <div className="page-heading"><div><h1>Sites</h1><p>Find team and communication sites across {data.account.organization || 'your organization'}.</p></div>
      <button className="primary" onClick={() => setCreating(true)}><Plus size={17} />Create site</button>
    </div>
    <div className="toolbar directory-toolbar">
      <div className="segments" aria-label="Site views">
        <button aria-pressed={!following} onClick={() => setFollowing(false)}>All sites</button>
        <button aria-pressed={following} onClick={() => setFollowing(true)}>Following</button>
      </div>
      <div className="toolbar-end">
        <FilterInput label="Search sites" value={query} setValue={setQuery} />
        <select aria-label="Site type" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All site types</option><option value="team">Team</option><option value="communication">Communication</option>
        </select>
      </div>
    </div>
    {matches.length ? <SiteCards sites={paging.rows} /> : <Empty title="No sites found">
      {query || type || following ? 'Try a different search or filter.' : <button onClick={() => setCreating(true)}>Create site</button>}
    </Empty>}
    {paging.controls}
    {creating && <SiteForm onClose={() => setCreating(false)} />}
  </>
}

function SiteForm({ site, onClose }) {
  const { data, commit } = useWorkspace()
  const navigate = useAppNavigate()
  const [name, setName] = useState(site?.name ?? '')
  const [description, setDescription] = useState(site?.description ?? '')
  const [type, setType] = useState('team')
  const [error, setError] = useState('')
  const title = site ? 'Site details' : 'Create site'
  function submit(event) {
    event.preventDefault()
    const value = name.trim()
    if (!value || sameName(data.sites, value, site?.id)) {
      setError(value ? 'A site with this name already exists.' : 'Enter a site name.')
      return
    }
    const details = { name: value, description: description.trim() }
    if (site) {
      commit((state, { modified }) => ({
        ...state, sites: state.sites.map((record) => record.id === site.id ? { ...record, ...details, ...modified } : record),
      }), 'Site details saved.')
    } else {
      const siteId = idFor('site')
      commit((state, { actorId, created }) => ({
        ...state,
        sites: [...state.sites, { id: siteId, ...details, type, ownerId: actorId, ...created }],
        libraries: [...state.libraries, {
          id: idFor('lib'), siteId, name: 'Documents', description: 'Shared documents for this site.', isDefault: true, ...created,
        }],
      }), 'Site created.')
      navigate(sitePath(siteId))
    }
    onClose()
  }
  return <Modal title={title} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      {!site && <Field label="Site type"><select value={type} onChange={(event) => setType(event.target.value)}>
        <option value="team">Team site</option><option value="communication">Communication site</option>
      </select></Field>}
      <Field label="Site name" error={error}><input autoFocus value={name} aria-required="true" aria-invalid={!!error} onChange={(event) => {
        setName(event.target.value)
        setError('')
      }} /></Field>
      <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
      <FormActions onClose={onClose} action={site ? 'Save' : 'Create'} />
    </form>
  </Modal>
}

function SiteHeader({ site, contents }) {
  const { data, commit } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const following = data.siteFollows.some((follow) => follow.siteId === site.id && follow.userId === data.account.userId)
  function toggleFollow() {
    commit((state, { actorId, now, removal }) => {
      const match = (follow) => follow.siteId === site.id && follow.userId === actorId
      const current = state.siteFollows.filter(match)
      if (current.length) return {
        ...state, siteFollows: state.siteFollows.filter((follow) => !match(follow)),
        removals: [...state.removals, removal('unfollowSite', site.id, current.map((follow) => follow.id))],
      }
      return { ...state, siteFollows: [...state.siteFollows, { id: idFor('follow'), siteId: site.id, userId: actorId, createdAt: now }] }
    }, following ? 'Site unfollowed.' : 'Site followed.')
  }
  return <>
    <Breadcrumb links={[{ name: 'Sites', to: '/sites' }, { name: site.name }]} />
    <header className="site-banner">
      <div><span className="eyebrow">{labelType(site.type)}</span><h1>{site.name}</h1>{site.description && <p>{site.description}</p>}</div>
      <div className="hero-actions">
        <button className={following ? 'is-following' : 'primary'} aria-pressed={following} onClick={toggleFollow}><Star size={16} fill={following ? 'currentColor' : 'none'} />{following ? 'Following' : 'Follow'}</button>
        <button onClick={() => setEditing(true)}><Pencil size={16} />Site details</button>
      </div>
    </header>
    <nav className="tabs" aria-label="Site navigation">
      <AppLink to={sitePath(site.id)} aria-current={contents ? undefined : 'page'}>Overview</AppLink>
      <AppLink to={contentsPath(site.id)} aria-current={contents ? 'page' : undefined}>Site contents</AppLink>
    </nav>
    {editing && <SiteForm site={site} onClose={() => setEditing(false)} />}
  </>
}

function Collections({ site, type, records, overview = false, onCreate }) {
  const isList = type === 'list'
  const Icon = isList ? ListChecks : FolderClosed
  const title = isList ? 'Lists' : 'Document libraries'
  const paging = usePaging(records, type, overview ? 3 : 12)
  return <section className="section">
    <div className="section-heading"><h2>{title}</h2>{overview && <AppLink to={contentsPath(site.id)}>Open site contents</AppLink>}</div>
    {records.length ? <div className="collection-grid">
      {(overview ? records.slice(0, 3) : paging.rows).map((record) =>
        <AppLink key={record.id} to={(isList ? listPath : libraryPath)(site.id, record.id)} className="collection-card">
          <span className={'tile ' + (isList ? 'peach' : '')}><Icon size={20} /></span>
          <div><h3>{record.name}</h3>{record.description && <p>{record.description}</p>}</div>
          <ArrowRight size={16} aria-hidden="true" />
        </AppLink>)}
    </div> : <Empty title={isList ? 'No lists yet' : 'No document libraries yet'}>
      {onCreate && <button onClick={onCreate}>{isList ? 'New list' : 'New document library'}</button>}
    </Empty>}
    {!overview && paging.controls}
  </section>
}

export function Site({ site }) {
  const { data } = useWorkspace()
  return <>
    <SiteHeader site={site} />
    <Collections site={site} type="list" records={data.lists.filter((list) => list.siteId === site.id)} overview />
    <Collections site={site} type="library" records={data.libraries.filter((library) => library.siteId === site.id)} overview />
  </>
}

export function Contents({ site }) {
  const { data } = useWorkspace()
  const [kind, setKind] = useState('')
  const lists = data.lists.filter((record) => record.siteId === site.id)
  const libraries = data.libraries.filter((record) => record.siteId === site.id)
  return <>
    <SiteHeader site={site} contents />
    <div className="toolbar">
      <details className="new-menu">
        <summary className="button primary"><Plus size={17} />New</summary>
        <div className="menu">
          <button type="button" onClick={(event) => { event.currentTarget.closest('details').open = false; setKind('list') }}>New list</button>
          <button type="button" onClick={(event) => { event.currentTarget.closest('details').open = false; setKind('library') }}>New document library</button>
        </div>
      </details>
    </div>
    <Collections site={site} type="list" records={lists} />
    <Collections site={site} type="library" records={libraries} />
    {kind && <CollectionForm site={site} kind={kind} records={kind === 'list' ? lists : libraries} onClose={() => setKind('')} />}
  </>
}

function CollectionForm({ site, kind, records, onClose }) {
  const { commit } = useWorkspace()
  const navigate = useAppNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const isList = kind === 'list'
  const type = isList ? 'list' : 'document library'
  function submit(event) {
    event.preventDefault()
    const value = name.trim()
    if (!value || sameName(records, value)) {
      setError(value ? 'This site already has a ' + type + ' with that name.' : 'Enter a name.')
      return
    }
    const id = idFor(isList ? 'list' : 'lib')
    const key = isList ? 'lists' : 'libraries'
    commit((state, { created }) => ({
      ...state, [key]: [...state[key], {
        id, siteId: site.id, name: value, description: description.trim(), ...created,
        ...(isList ? { columns: [titleColumn] } : { isDefault: false }),
      }],
    }), (isList ? 'List' : 'Document library') + ' created.')
    onClose()
    navigate((isList ? listPath : libraryPath)(site.id, id))
  }
  return <Modal title={'New ' + type} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <Field label="Name" error={error}><input autoFocus value={name} aria-required="true" aria-invalid={!!error} onChange={(event) => {
        setName(event.target.value)
        setError('')
      }} /></Field>
      <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
      <FormActions onClose={onClose} action="Create" />
    </form>
  </Modal>
}
