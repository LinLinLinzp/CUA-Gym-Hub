import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from './store.jsx'
import { AppLink, Breadcrumb, Dialog, Empty, ErrorText, FormActions, Intro, Metric, Pager, SortHead, Table, Tags, usePager, useRoute, useSort } from './ui.jsx'
import { campaignsFor, dateLabel, downloadCsv, inBand, latestHistory, list, lower, movement, normalizeTarget, numberLabel, projectLabel, projectPath, same, splitItems, textSort } from './model.js'

const bands = [['3', 'Top 3'], ['10', 'Top 10'], ['20', 'Top 20'], ['100', 'Top 100'], ['unranked', 'Unranked']]
const targetTypes = [['root_domain', 'Root domain'], ['subdomain', 'Subdomain'], ['subfolder', 'Subfolder'], ['url', 'Exact URL']]
const engines = [['google', 'Google'], ['bing', 'Bing']]
const devices = [['desktop', 'Desktop'], ['mobile', 'Mobile'], ['tablet', 'Tablet']]
const locations = [
  'United States', 'Seattle, Washington, United States', 'New York, New York, United States',
  'Austin, Texas, United States', 'San Francisco, California, United States', 'Canada', 'Toronto, Ontario, Canada',
  'United Kingdom', 'London, United Kingdom', 'Australia', 'Sydney, Australia', 'Germany', 'Berlin, Germany',
  'France', 'Paris, France', 'Singapore', 'Singapore, Singapore',
]
const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Japanese']
const titleFor = (options, value) => options.find(([id]) => id === value)?.[1] || value
const termsFor = (state, campaignId) => list(state.trackedKeywords).filter(row => row.campaignId === campaignId)
const competitorsFor = (state, campaignId) => list(state.trackingCompetitors).filter(row => row.campaignId === campaignId)
const newKeyword = (make, campaignId, term, tags) => ({
  ...make('kw'), campaignId, term, tags, position: null, previousPosition: null, volume: null, landingUrl: null,
})

function Options({ choices }) {
  return choices.map(choice => {
    const [value, label] = Array.isArray(choice) ? choice : [choice, choice]
    return <option value={value} key={value}>{label}</option>
  })
}

export function Tracking({ project }) {
  const { state } = useWorkspace()
  const { params, go } = useRoute()
  const base = projectPath(project, 'position-tracking')
  const campaigns = campaignsFor(state, project.id)
  const campaign = campaigns.find(row => row.id === params.get('campaign')) || campaigns[0]
  const setup = !campaign || params.get('setup') === '1'
  const requestedTab = params.get('tab')
  const tab = ['rankings', 'competitors'].includes(requestedTab) ? requestedTab : 'overview'
  const report = (selected, view = tab, extra = {}) => ({
    campaign: selected?.id, tab: view === 'overview' ? undefined : view, ...extra,
  })
  const reportTo = (view, extra = {}) => base + '?' + new URLSearchParams(
    Object.entries(report(campaign, view, extra)).filter(([, value]) => value != null))
  const info = campaign && [titleFor(engines, campaign.searchEngine), titleFor(devices, campaign.device), campaign.location, campaign.language].filter(Boolean).join(' · ')
  const keywords = campaign ? termsFor(state, campaign.id) : []
  const history = latestHistory(campaign)
  const latest = history.at(-1)

  return <>
    <Breadcrumb items={[[ 'Projects', '/projects' ], [projectLabel(project), projectPath(project)], ['Position Tracking']]} />
    <Intro title="Position Tracking" subtitle={setup ? projectLabel(project) : [campaign.target || project.domain, info].filter(Boolean).join(' · ')}>
      {!setup && <>
        {campaigns.length > 1 && <select aria-label="Tracking target" value={campaign.id} onChange={event => go(base, report({ id: event.target.value }))}>
          {campaigns.map(row => <option key={row.id} value={row.id}>
            {[
              titleFor(targetTypes, row.targetType),
              row.language,
              row.target || project.domain || 'Target',
              titleFor(engines, row.searchEngine),
              titleFor(devices, row.device),
              row.location,
            ].filter(Boolean).join(' · ')}
          </option>)}
        </select>}
        <button className="button primary" onClick={() => go(base, report(campaign, tab, { setup: '1' }))}>Add target</button>
      </>}
    </Intro>
    {setup ? <TrackingSetup project={project} onClose={() => campaign ? go(base, report(campaign)) : go(projectPath(project))}
      onCreated={id => go(base, report({ id }, 'overview'))} /> : <>
      <nav className="tabs" aria-label="Position Tracking reports">
        {[[ 'overview', 'Overview' ], [ 'rankings', 'Rankings' ], [ 'competitors', 'Competitors' ]].map(([id, label]) =>
          <AppLink key={id} to={reportTo(id)} aria-current={id === tab ? 'page' : undefined}>{label}</AppLink>)}
      </nav>
      {tab === 'overview' && <>
        <div className="metric-strip" aria-label="Tracking performance">
          <Metric label="Visibility" value={latest?.visibility} suffix="%" />
          <Metric label="Estimated traffic" value={latest?.estimatedTraffic} />
          <Metric label="Average position" value={latest?.averagePosition} />
        </div>
        <section className="card padded stack" aria-label="Ranking distribution">
          <h2>Keyword positions</h2>
          <div className="actions">{bands.map(([id, label]) => <AppLink className="button" key={id} to={reportTo('rankings', { band: id })}>
            {label} <span className="tag">{keywords.filter(row => inBand(row, id)).length}</span>
          </AppLink>)}</div>
        </section>
        <VisibilityChart history={history} />
      </>}
      {tab === 'rankings' && <Rankings key={campaign.id} project={project} campaign={campaign} keywords={keywords}
        band={bands.some(([id]) => id === params.get('band')) ? params.get('band') : ''}
        onBand={band => go(base, report(campaign, 'rankings', { band }))} />}
      {tab === 'competitors' && <Competitors key={campaign.id} project={project} campaign={campaign} rows={competitorsFor(state, campaign.id)} />}
    </>}
  </>
}

function TrackingSetup({ project, onClose, onCreated }) {
  const { commit } = useWorkspace()
  const [step, setStep] = useState(1)
  const [fields, setFields] = useState({
    targetType: 'root_domain', target: project.domain || '', searchEngine: 'google', device: 'desktop', location: 'United States', language: 'English',
  })
  const [terms, setTerms] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const keywords = splitItems(terms)
  function field(key) {
    return { value: fields[key], onChange: event => { setFields({ ...fields, [key]: event.target.value }); setError('') } }
  }
  function submit(event) {
    event.preventDefault()
    const target = normalizeTarget(fields.target, fields.targetType)
    if (!target) return setError(fields.targetType === 'subfolder' ? 'Enter a valid domain and folder path.' : 'Enter a valid target domain or URL.')
    if (step === 1) { setStep(2); setError(''); return }
    if (!keywords.length) return setError('Enter at least one keyword to start tracking.')
    let campaignId
    commit((state, { make, createdAt }) => {
      const campaign = { ...make('trk'), ...fields, target, projectId: project.id, status: 'active', startedAt: createdAt, history: [] }
      campaignId = campaign.id
      const tagList = splitItems(tags)
      const rows = keywords.map(term => newKeyword(make, campaignId, term, tagList))
      return {
        changes: { trackingCampaigns: [...list(state.trackingCampaigns), campaign], trackedKeywords: [...list(state.trackedKeywords), ...rows] },
        event: { type: 'tracking.started', projectId: project.id, campaignId, details: { keywordIds: rows.map(row => row.id) } },
      }
    }, 'Position Tracking started.')
    onCreated(campaignId)
  }

  return <section className="card padded setup" aria-labelledby="tracking-setup">
    <h2 id="tracking-setup">Set up Position Tracking</h2>
    <form className="form" onSubmit={submit} noValidate>
      <div className="actions" aria-label="Setup steps">
        <span className={'step' + (step === 1 ? ' active' : '')} aria-current={step === 1 ? 'step' : undefined}>Targeting</span>
        <span className={'step' + (step === 2 ? ' active' : '')} aria-current={step === 2 ? 'step' : undefined}>Keywords</span>
      </div>
      {step === 1 ? <>
        <label className="field">Target scope<select aria-label="Target scope" {...field('targetType')}><Options choices={targetTypes} /></select></label>
        <label className="field">Target domain or URL<input {...field('target')} aria-invalid={Boolean(error)} aria-describedby={error ? 'tracking-setup-error' : undefined} required /></label>
        <div className="form-grid">
          <label className="field">Search engine<select aria-label="Search engine" {...field('searchEngine')}><Options choices={engines} /></select></label>
          <label className="field">Device<select aria-label="Device" {...field('device')}><Options choices={devices} /></select></label>
          <label className="field">Location<select aria-label="Location" {...field('location')}><Options choices={locations} /></select></label>
          <label className="field">Language<select aria-label="Language" {...field('language')}><Options choices={languages} /></select></label>
        </div>
      </> : <>
        <label className="field">Keywords<textarea aria-label="Keywords" value={terms} onChange={event => { setTerms(event.target.value); setError('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'tracking-keyword-hint tracking-setup-error' : 'tracking-keyword-hint'} required />
          <small id="tracking-keyword-hint">Enter one keyword per line or separate terms with commas.</small>
        </label>
        <label className="field">Common tags (optional)<input value={tags} onChange={event => setTags(event.target.value)} placeholder="Category, Priority" /></label>
        <p className="muted" aria-live="polite">{keywords.length} unique {keywords.length === 1 ? 'keyword' : 'keywords'}</p>
      </>}
      <ErrorText message={error} id="tracking-setup-error" />
      <FormActions onClose={onClose} submit={step === 1 ? 'Continue to keywords' : 'Start Tracking'}>
        {step === 2 && <button className="button" type="button" onClick={() => { setStep(1); setError('') }}>Back</button>}
      </FormActions>
    </form>
  </section>
}

function VisibilityChart({ history }) {
  const canvas = useRef(null)
  const points = history.filter(row => Number.isFinite(row.visibility))
  const first = points[0]
  const last = points.at(-1)
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    function draw() {
      const width = element.clientWidth
      const height = element.clientHeight
      if (!width || !height) return
      const ratio = window.devicePixelRatio || 1
      element.width = width * ratio
      element.height = height * ratio
      const context = element.getContext('2d')
      if (!context) return
      context.scale(ratio, ratio)
      const left = 38
      const top = 12
      const bottom = height - 8
      const right = width - 8
      const max = Math.min(100, Math.max(20, Math.ceil(Math.max(...points.map(row => row.visibility)) / 20) * 20))
      const y = number => bottom - Math.max(0, Math.min(max, number)) * (bottom - top) / max
      context.font = '11px "Segoe UI", sans-serif'
      for (let i = 0; i <= 4; i++) {
        const value = max * i / 4
        const line = y(value)
        context.strokeStyle = '#d6ded7'
        context.beginPath()
        context.moveTo(left, line)
        context.lineTo(right, line)
        context.stroke()
        context.fillStyle = '#52635b'
        context.fillText(value + '%', 0, line + 4)
      }
      const positions = points.map((row, i) => [left + (right - left) * (points.length === 1 ? .5 : i / (points.length - 1)), y(row.visibility)])
      const fill = context.createLinearGradient(0, top, 0, bottom)
      fill.addColorStop(0, '#c5e5d4')
      fill.addColorStop(1, '#f4fbf6')
      if (positions.length > 1) {
        context.beginPath()
        positions.forEach(([x, height], i) => i ? context.lineTo(x, height) : context.moveTo(x, height))
        context.lineTo(right, bottom)
        context.lineTo(left, bottom)
        context.closePath()
        context.fillStyle = fill
        context.fill()
        context.beginPath()
        positions.forEach(([x, height], i) => i ? context.lineTo(x, height) : context.moveTo(x, height))
        context.strokeStyle = '#155c4c'
        context.lineWidth = 2
        context.stroke()
      }
      context.fillStyle = '#155c4c'
      for (const [x, height] of positions) {
        context.beginPath()
        context.arc(x, height, 2.6, 0, Math.PI * 2)
        context.fill()
      }
    }
    const observer = new ResizeObserver(draw)
    observer.observe(element)
    draw()
    return () => observer.disconnect()
  }, [history])

  return <section className="card padded stack">
    <header><h2>Visibility trend</h2>{first && <span className="badge">Visibility</span>}</header>
    {first ? <>
      <canvas ref={canvas} className="visibility-chart" role="img" aria-label={'Visibility chart with ' + points.length + ' observations. First: ' + numberLabel(first.visibility, '%') + '. Latest: ' + numberLabel(last.visibility, '%') + '.'} />
      <div className="chart-dates"><span>{dateLabel(first.date)}</span>{last !== first && <span>{dateLabel(last.date)}</span>}</div>
    </> : <p className="muted">Visibility history is unavailable for this target.</p>}
  </section>
}

function Rankings({ project, campaign, keywords, band, onBand }) {
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [selection, setSelection] = useState([])
  const [dialog, setDialog] = useState('')
  const sort = useSort('position')
  const tags = [...new Set(keywords.flatMap(row => list(row.tags)))].sort(textSort)
  const selected = selection.filter(id => keywords.some(row => row.id === id))
  const filtered = keywords.filter(row => lower(row.term).includes(lower(search.trim()))
    && (!tag || list(row.tags).includes(tag)) && inBand(row, band))
    .sort((a, b) => sort.compare(sort.key === 'movement' ? movement(a) : a[sort.key], sort.key === 'movement' ? movement(b) : b[sort.key])
      || textSort(a.term, b.term) || textSort(a.id, b.id))
  const pager = usePager(filtered)
  const pageIds = pager.rows.map(row => row.id)
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected.includes(id))
  const someSelected = pageIds.some(id => selected.includes(id))
  const selectAll = useRef(null)
  useEffect(() => { if (selectAll.current) selectAll.current.indeterminate = someSelected && !allSelected }, [someSelected, allSelected])
  function toggle(ids, checked) {
    setSelection(previous => checked ? [...new Set([...previous, ...ids])] : previous.filter(id => !ids.includes(id)))
  }
  function reset() {
    setSearch('')
    setTag('')
    onBand('')
    pager.setPage(1)
  }
  function exportRankings() {
    downloadCsv('rankings.csv', ['Keyword', 'Tags', 'Position', 'Previous position', 'Movement', 'Volume', 'Landing URL'],
      filtered.map(row => [row.term, list(row.tags).join(', '), row.position, row.previousPosition, movement(row), row.volume, row.landingUrl]))
  }
  return <section className="card" aria-label="Keyword rankings">
    <div className="section-header"><h2>Rankings</h2><div className="actions">
      <button className="button" onClick={exportRankings} disabled={!filtered.length}>Export CSV</button>
      <button className="button primary" onClick={() => setDialog('add')}>Add keywords</button>
    </div></div>
    <div className="toolbar">
      <input type="search" aria-label="Search keywords" placeholder="Search keywords" value={search} onChange={event => { setSearch(event.target.value); pager.setPage(1) }} />
      <select aria-label="Filter by keyword tag" value={tag} onChange={event => { setTag(event.target.value); pager.setPage(1) }}><option value="">All tags</option><Options choices={tags} /></select>
      <select aria-label="Filter by position" value={band} onChange={event => { onBand(event.target.value); pager.setPage(1) }}><option value="">All positions</option><Options choices={bands} /></select>
      {(search || tag || band) && <button className="text-button" onClick={reset}>Clear filters</button>}
    </div>
    {selected.length > 0 && <div className="selection">
      <strong>{selected.length} selected</strong>
      <button className="button small" onClick={() => setDialog('tag')}>Manage tags</button>
      <button className="button small" onClick={() => setDialog('remove')}>Remove keywords</button>
      <button className="text-button" onClick={() => setSelection([])}>Clear selection</button>
    </div>}
    {pager.total ? <>
      <Table label="Rankings"><thead><tr>
        <th scope="col"><input ref={selectAll} type="checkbox" aria-label="Select all keywords on this page" checked={allSelected} onChange={event => toggle(pageIds, event.target.checked)} /></th>
        <SortHead sort={sort} field="term" onChange={() => pager.setPage(1)}>Keyword</SortHead><th scope="col">Tags</th>
        <SortHead sort={sort} field="position" onChange={() => pager.setPage(1)}>Position</SortHead>
        <SortHead sort={sort} field="previousPosition" onChange={() => pager.setPage(1)}>Previous</SortHead>
        <SortHead sort={sort} field="movement" onChange={() => pager.setPage(1)}>Movement</SortHead>
        <SortHead sort={sort} field="volume" onChange={() => pager.setPage(1)}>Volume</SortHead>
        <th scope="col">Landing URL</th>
      </tr></thead><tbody>
        {pager.rows.map(row => {
          const change = movement(row)
          return <tr key={row.id}>
            <td><input type="checkbox" aria-label={'Select ' + (row.term || 'keyword')} checked={selected.includes(row.id)} onChange={event => toggle([row.id], event.target.checked)} /></td>
            <td><strong>{row.term || 'Unnamed keyword'}</strong></td><td><Tags items={list(row.tags)} /></td>
            <td><Value value={row.position} /></td><td><Value value={row.previousPosition} /></td>
            <td>{change ? <span className={'badge ' + (change > 0 ? 'success' : 'error')}>{change > 0 ? '+' + change : change}</span> : <Value value={change} />}</td>
            <td><Value value={row.volume} /></td><td className="path">{row.landingUrl || <Unavailable />}</td>
          </tr>
        })}
      </tbody></Table>
      <Pager pager={pager} noun="keywords" />
    </> : keywords.length ? <Empty title="No matching keywords" action={<button className="button" onClick={reset}>Clear filters</button>}>Try a different query or position range.</Empty>
      : <Empty title="No tracked keywords" action={<button className="button" onClick={() => setDialog('add')}>Add keywords</button>}>Add search terms to this target.</Empty>}
    {dialog && <KeywordDialog key={dialog} mode={dialog} project={project} campaign={campaign} selected={selected} onClose={() => setDialog('')}
      onDone={() => { if (dialog === 'remove') setSelection([]); setDialog('') }} />}
  </section>
}

function Unavailable({ blank }) {
  return blank ? <span className="sr-only">Unavailable</span> : <span className="muted" role="img" aria-label="Unavailable">—</span>
}

function Value({ value, suffix, blank }) {
  return Number.isFinite(value) ? numberLabel(value, suffix) : <Unavailable blank={blank} />
}

function KeywordDialog({ mode, project, campaign, selected, onClose, onDone }) {
  const { state, commit } = useWorkspace()
  const [text, setText] = useState('')
  const [tagInput, setTags] = useState('')
  const [operation, setOperation] = useState('add')
  const [error, setError] = useState('')
  const current = termsFor(state, campaign.id)
  const terms = splitItems(text)
  const unique = (rows) => {
    const taken = new Set(rows.map(row => lower(row.term).trim()))
    return terms.filter(term => !taken.has(lower(term)))
  }
  const titles = { add: 'Add keywords', tag: 'Manage keyword tags', remove: 'Remove keywords' }

  function submit(event) {
    event.preventDefault()
    const tags = splitItems(tagInput)
    if (mode === 'add' && !unique(current).length) return setError(terms.length ? 'These keywords are already tracked.' : 'Enter at least one keyword.')
    if (mode === 'tag' && !tags.length) return setError('Enter at least one tag.')
    commit((previous, { make, edit }) => {
      const rows = list(previous.trackedKeywords)
      const scoped = termsFor(previous, campaign.id)
      let next, keywordIds, details
      if (mode === 'add') {
        const added = unique(scoped).map(term => newKeyword(make, campaign.id, term, tags))
        next = [...rows, ...added]
        keywordIds = added.map(row => row.id)
      } else {
        const ids = new Set(scoped.filter(row => selected.includes(row.id)).map(row => row.id))
        const tagKeys = new Set(tags.map(lower))
        keywordIds = []
        next = mode === 'remove' ? rows.filter(row => {
          if (!ids.has(row.id)) return true
          keywordIds.push(row.id)
          return false
        }) : rows.map(row => {
          if (!ids.has(row.id)) return row
          const before = list(row.tags)
          const after = operation === 'add' ? splitItems([...before, ...tags].join('\n')) : before.filter(tag => !tagKeys.has(lower(tag)))
          if (same(before, after)) return row
          keywordIds.push(row.id)
          return { ...row, tags: after, ...edit }
        })
        if (mode === 'tag') details = { tags, mode: operation }
      }
      if (!keywordIds.length) return null
      const type = { add: 'tracking.keywords_added', tag: 'tracking.tags_changed', remove: 'tracking.keywords_removed' }[mode]
      return {
        changes: { trackedKeywords: next },
        event: { type, projectId: project.id, campaignId: campaign.id, details: { keywordIds, ...details } },
      }
    }, { add: 'Keywords added.', tag: 'Keyword tags updated.', remove: 'Keywords removed.' }[mode])
    onDone()
  }
  return <Dialog title={titles[mode]} onClose={onClose}>
    <form className="form" onSubmit={submit}>
      {mode === 'add' && <>
        <label className="field">Keywords<textarea aria-label="Keywords" aria-describedby={error ? 'add-keyword-hint keyword-dialog-error' : 'add-keyword-hint'} aria-invalid={Boolean(error)} value={text} onChange={event => { setText(event.target.value); setError('') }} autoFocus />
          <small id="add-keyword-hint">Separate terms with commas or line breaks.</small>
        </label>
        <p className="muted" aria-live="polite">{unique(current).length} new keywords</p>
      </>}
      {mode === 'tag' && <>
        <p>{selected.length} selected {selected.length === 1 ? 'keyword' : 'keywords'}</p>
        <label className="field">Tag action<select aria-label="Tag action" value={operation} onChange={event => setOperation(event.target.value)}>
          <option value="add">Add tags</option><option value="remove">Remove tags</option>
        </select></label>
      </>}
      {mode !== 'remove' && <label className="field">{mode === 'add' ? 'Tags (optional)' : 'Tags'}<input value={tagInput} onChange={event => { setTags(event.target.value); setError('') }} placeholder="Separate tags with commas" /></label>}
      {mode === 'remove' && <p>Remove {selected.length} selected {selected.length === 1 ? 'keyword' : 'keywords'} from this tracking target?</p>}
      <ErrorText message={error} id="keyword-dialog-error" />
      <FormActions onClose={onClose} submit={mode === 'tag' ? 'Apply tags' : titles[mode]} danger={mode === 'remove'} />
    </form>
  </Dialog>
}

function Competitors({ project, campaign, rows }) {
  const { commit } = useWorkspace()
  const [dialog, setDialog] = useState(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  function close() { setDialog(null); setInput(''); setError('') }
  function submit(event) {
    event.preventDefault()
    const removing = dialog !== 'add'
    const domain = removing ? dialog.domain : normalizeTarget(input, 'root_domain')
    if (!removing && !domain) return setError('Enter a valid competitor domain.')
    if (!removing && domain === normalizeTarget(campaign.target || project.domain, 'root_domain')) return setError('Enter a domain other than the tracked domain.')
    let duplicate = false
    commit((state, { make }) => {
      const all = list(state.trackingCompetitors)
      const scoped = competitorsFor(state, campaign.id)
      duplicate = !removing && scoped.some(row => normalizeTarget(row.domain, 'root_domain') === domain)
      if (duplicate || (removing && !scoped.some(row => row.id === dialog.id))) return null
      const competitor = removing ? dialog : { ...make('cmp'), campaignId: campaign.id, domain, visibility: null, estimatedTraffic: null, top10: null }
      return {
        changes: { trackingCompetitors: removing ? all.filter(row => row.id !== competitor.id) : [...all, competitor] },
        event: { type: removing ? 'tracking.competitor_removed' : 'tracking.competitor_added', projectId: project.id,
          campaignId: campaign.id, details: { competitorId: competitor.id, domain: domain ?? null } },
      }
    }, removing ? 'Competitor removed.' : 'Competitor added.')
    if (duplicate) return setError('This competitor is already tracked.')
    close()
  }

  return <section className="card" aria-label="Tracking competitors">
    <div className="section-header"><h2>Competitors</h2><button className="button primary" onClick={() => setDialog('add')}>Add competitor</button></div>
    {rows.length ? <Table label="Competitors"><thead><tr>
      <th scope="col">Domain</th><th scope="col">Visibility</th><th scope="col">Estimated traffic</th><th scope="col">Top 10</th><th scope="col">Actions</th>
    </tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <td><strong>{row.domain || 'Domain unavailable'}</strong></td>
      <td><Value value={row.visibility} suffix="%" blank /></td><td><Value value={row.estimatedTraffic} blank /></td><td><Value value={row.top10} blank /></td>
      <td><button className="button small" aria-label={'Remove ' + (row.domain || 'competitor')} onClick={() => setDialog(row)}>Remove</button></td>
    </tr>)}</tbody></Table> : <Empty title="No competitors yet">Add a domain to compare with this target.</Empty>}
    {dialog && <Dialog title={dialog === 'add' ? 'Add competitor' : 'Remove competitor'} onClose={close}>
      <form className="form" onSubmit={submit} noValidate>
        {dialog === 'add' ? <label className="field">Competitor domain<input value={input} onChange={event => { setInput(event.target.value); setError('') }} autoFocus required
          aria-invalid={Boolean(error)} aria-describedby={error ? 'competitor-error' : undefined} placeholder="competitor.example" /></label>
          : <p>Remove <strong>{dialog.domain || 'this competitor'}</strong> from this tracking target?</p>}
        <ErrorText message={error} id="competitor-error" />
        <FormActions onClose={close} submit={dialog === 'add' ? 'Add competitor' : 'Remove competitor'} danger={dialog !== 'add'} />
      </form>
    </Dialog>}
  </section>
}

