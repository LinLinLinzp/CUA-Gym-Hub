import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from './store.jsx'
import { AppLink, Breadcrumb, Dialog, Empty, ErrorText, FormActions, Intro, Metric, Pager, Table, usePager, useRoute } from './ui.jsx'
import { configFor, dateLabel, downloadCsv, list, lower, numberLabel, parseLocation, projectLabel, projectPath, replaceRecord, runsFor, same, splitItems, textSort } from './model.js'
import { auditChecks, generateAudit } from './data/auditFixture.js'

const severities = [['error', 'Errors'], ['warning', 'Warnings'], ['notice', 'Notices']]
const severityLabel = (severity) => ({ error: 'Error', warning: 'Warning', notice: 'Notice' }[severity] || 'Unclassified')
const scheduleDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const checksByKey = new Map(auditChecks.map(check => [check.checkKey, check]))
const forRun = (rows, id) => list(rows).filter(row => row.runId === id)

function crawlFields(config, project) {
  return {
    scope: config?.scope ?? project.domain ?? '',
    pageLimit: config?.pageLimit ?? 100,
    crawlSource: config?.crawlSource ?? 'website',
    sitemapUrl: config?.sitemapUrl ?? null,
    crawlerDevice: config?.crawlerDevice ?? 'desktop',
    allowPaths: list(config?.allowPaths),
    disallowPaths: list(config?.disallowPaths),
    schedule: config?.schedule ?? { frequency: 'once', weekday: null },
    excludedCheckKeys: list(config?.excludedCheckKeys),
  }
}

function runAudit(state, project, config, { make, createdAt }) {
  const runNumber = runsFor(state, project.id).reduce((highest, run) => Math.max(highest, Number(run.runNumber) || 0), 0) + 1
  const record = make('adr')
  const settingsSnapshot = crawlFields(config, project)
  const { pages, issues, healthScore } = generateAudit({ settings: settingsSnapshot, runId: record.id, make })
  const run = { ...record, projectId: project.id, auditConfigId: config.id, runNumber, status: 'completed', startedAt: createdAt,
    completedAt: createdAt, healthScore, pagesCrawled: pages.length, settingsSnapshot }
  return {
    changes: { auditRuns: [...list(state.auditRuns), run], auditIssues: [...list(state.auditIssues), ...issues], auditPages: [...list(state.auditPages), ...pages] },
    event: { type: 'audit.completed', projectId: project.id, auditConfigId: config.id, runId: run.id, details: { runNumber, pagesCrawled: pages.length, healthScore } },
    run,
  }
}

export function Audit({ project }) {
  const { state, commit } = useWorkspace()
  const { params, go } = useRoute()
  const { issueId } = useParams()
  const [rerun, setRerun] = useState(false)
  const base = projectPath(project, 'site-audit')
  const runs = runsFor(state, project.id)
  const config = configFor(state, project.id)
  const issue = issueId && list(state.auditIssues).find(row => row.id === issueId && runs.some(run => run.id === row.runId))
  const activeRun = runs[0]
  const run = runs.find(row => row.id === (issue ? issue.runId : params.get('run'))) || activeRun
  const requestedTab = params.get('tab')
  const tab = ['issues', 'pages', 'history', 'settings', 'compare'].includes(requestedTab) ? requestedTab : 'overview'
  const severity = severities.some(([value]) => value === params.get('severity')) ? params.get('severity') : ''
  const historical = Boolean(run && run.id !== activeRun?.id)
  const pages = run ? forRun(state.auditPages, run.id) : []
  const activeExclusions = list(config?.excludedCheckKeys)
  const issues = run ? forRun(state.auditIssues, run.id).filter(row => historical || !activeExclusions.includes(row.checkKey)) : []
  const query = (view = tab, selectedRun = run?.id, extra = {}) => ({ run: selectedRun, tab: view === 'overview' ? undefined : view, ...extra })
  function reportTo(view, selectedRun = run?.id, extra = {}) {
    const search = new URLSearchParams(Object.entries(query(view, selectedRun, extra)).filter(([, value]) => value != null && value !== ''))
    return base + (search.size ? '?' + search : '')
  }
  function finish(event) {
    event.preventDefault()
    let runId
    commit((previous, action) => {
      const currentConfig = configFor(previous, project.id)
      if (!currentConfig) return null
      const result = runAudit(previous, project, currentConfig, action)
      runId = result.run.id
      return result
    }, 'Site Audit completed.')
    setRerun(false)
    if (runId) go(base, query('overview', runId))
  }
  function updateExcluded(checkKey, restoring, issueId) {
    commit((previous, { edit }) => {
      const current = configFor(previous, project.id)
      if (!current || !checkKey) return null
      const before = list(current.excludedCheckKeys)
      if (before.includes(checkKey) !== restoring) return null
      const excludedCheckKeys = restoring ? before.filter(key => key !== checkKey) : [...before, checkKey]
      return {
        changes: { auditConfigs: replaceRecord(previous.auditConfigs, current.id, { excludedCheckKeys, ...edit }) },
        event: { type: restoring ? 'audit.check_restored' : 'audit.check_excluded', projectId: project.id,
          auditConfigId: current.id, runId: run?.id, details: { checkKey, ...(issueId ? { issueId } : {}) } },
      }
    }, restoring ? 'Check restored.' : 'Check excluded.')
  }
  const backToReport = reportTo('issues')
  return <>
    <Breadcrumb items={[[ 'Projects', '/projects' ], [projectLabel(project), projectPath(project)],
      ['Site Audit', issueId ? reportTo('overview') : undefined], ...(issueId ? [[issue?.title || 'Issue details']] : [])]} />
    {issueId ? issue ? <IssueDetail issue={issue} pages={pages} back={backToReport} historical={historical}
      canExclude={Boolean(config) && !activeExclusions.includes(issue.checkKey)} excluded={!historical && activeExclusions.includes(issue.checkKey)}
      onExclude={() => updateExcluded(issue.checkKey, false, issue.id)} />
      : <section className="card"><Empty title="Issue not found" action={<AppLink className="button primary" to={backToReport}>Back to issues</AppLink>}>Choose an issue from this project’s audit report.</Empty></section> : <>
      <Intro title="Site Audit" subtitle={run ? [project.domain || projectLabel(project), 'Run ' + (run.runNumber ?? '—'), dateLabel(run.completedAt || run.startedAt)].join(' · ') : projectLabel(project)}>
        {run && <>
          {runs.length > 1 && <select aria-label="Audit run" value={run.id} onChange={event => go(base, query(tab, event.target.value))}>
            {runs.map(row => <option value={row.id} key={row.id}>Run {row.runNumber ?? '—'} · {dateLabel(row.completedAt || row.startedAt)}</option>)}
          </select>}
          <button className="button" onClick={() => go(base, query('settings'))}>Audit settings</button>
          {config && <button className="button primary" onClick={() => setRerun(true)}>Run again</button>}
        </>}
      </Intro>
      {!run ? <AuditForm key={config?.id || 'new'} project={project} config={config} onCancel={() => go(projectPath(project))}
        onFinish={id => go(base, query('overview', id))} start />
        : <>
          <nav className="tabs" aria-label="Site Audit reports">
            {[[ 'overview', 'Overview' ], [ 'issues', 'Issues' ], [ 'pages', 'Crawled pages' ], [ 'history', 'Run history' ],
              [ 'settings', 'Settings' ], ...(runs.length > 1 ? [[ 'compare', 'Compare runs' ]] : [])].map(([id, label]) =>
              <AppLink key={id} to={reportTo(id)} aria-current={id === tab ? 'page' : undefined}>{label}</AppLink>)}
          </nav>
          {['overview', 'issues', 'pages'].includes(tab) && <AuditSummary run={run} issues={issues} reportTo={reportTo} />}
          {tab === 'overview' && <section className="card padded stack">
            <h2>Crawl summary</h2>
            <p className="muted">{historical ? 'Viewing a previous run.' : 'Viewing the latest run.'} {run.settingsSnapshot?.scope || config?.scope || project.domain}</p>
            <div className="actions"><AppLink className="button primary" to={reportTo('issues')}>View issues</AppLink><AppLink className="button" to={reportTo('pages')}>View crawled pages</AppLink></div>
          </section>}
          {tab === 'issues' && <Issues key={run.id} issues={issues} severity={severity} setSeverity={value => go(base, query('issues', run.id, { severity: value }))}
            linkTo={id => base + '/issues/' + encodeURIComponent(id) + '?run=' + encodeURIComponent(run.id)}
            onExclude={!config || historical ? undefined : row => updateExcluded(row.checkKey, false, row.id)} />}
          {tab === 'pages' && <CrawledPages key={run.id} pages={pages} />}
          {tab === 'history' && <RunHistory runs={runs} reportTo={reportTo} />}
          {tab === 'settings' && <div className="two-columns settings-grid">
            {config ? <AuditForm key={config.id} project={project} config={config} onCancel={() => go(base, query('overview'))} />
              : <AuditForm project={project} onCancel={() => go(base, query('overview'))} onFinish={id => go(base, query('overview', id))} start />}
            <section className="card padded stack"><h2>Excluded checks</h2>
              {activeExclusions.length ? <ul className="excluded">{activeExclusions.map(key => <li key={key}>
                <span>{checksByKey.get(key)?.title || key}</span><button className="button small" onClick={() => updateExcluded(key, true)}>Restore check</button>
              </li>)}</ul> : <p className="muted">All checks are enabled.</p>}
            </section>
          </div>}
          {tab === 'compare' && <Compare key={run.id} state={state} runs={runs} initialRun={run} />}
        </>}
    </>}
    {rerun && <Dialog title="Run Site Audit again" onClose={() => setRerun(false)}>
      <form className="form" onSubmit={finish}>
        <p>Start a new crawl for <strong>{projectLabel(project)}</strong> using the saved audit settings?</p>
        <FormActions onClose={() => setRerun(false)} submit="Run audit" />
      </form>
    </Dialog>}
  </>
}

function normalizeRules(input) {
  return [...new Set(String(input).split(/[,\n]/).map(value => value.trim()).filter(Boolean))]
}

function AuditForm({ project, config, start, onCancel, onFinish }) {
  const { commit } = useWorkspace()
  const [fields, setFields] = useState(() => {
    const current = crawlFields(config, project)
    return { ...current, sitemapUrl: current.sitemapUrl || '', allowPaths: current.allowPaths.join('\n'), disallowPaths: current.disallowPaths.join('\n'),
      frequency: current.schedule?.frequency || 'once', weekday: current.schedule?.weekday || '' }
  })
  const [error, setError] = useState(null)
  function field(key) {
    return { value: fields[key], onChange: event => { setFields({ ...fields, [key]: event.target.value }); setError(null) },
      'aria-invalid': error?.field === key || undefined, 'aria-describedby': error?.field === key ? 'audit-form-error' : undefined }
  }
  function submit(event) {
    event.preventDefault()
    const fail = (field, message) => setError({ field, message })
    const scopeUrl = parseLocation(fields.scope)
    if (!scopeUrl) return fail('scope', 'Enter a valid crawl domain or URL.')
    const scope = scopeUrl.pathname === '/' ? scopeUrl.hostname : scopeUrl.hostname + scopeUrl.pathname.replace(/\/+$/, '')
    const pageLimit = Number(fields.pageLimit)
    if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 1000) return fail('pageLimit', 'Enter a whole page limit between 1 and 1,000.')
    const sitemapText = fields.sitemapUrl.trim()
    const sitemap = /^https?:\/\//i.test(sitemapText) && parseLocation(sitemapText)
    if (fields.crawlSource === 'sitemap_url' && !sitemap) return fail('sitemapUrl', 'Enter a valid HTTP or HTTPS sitemap URL.')
    const allowPaths = normalizeRules(fields.allowPaths)
    const disallowPaths = normalizeRules(fields.disallowPaths)
    const validPaths = (paths) => paths.every(value => /^\/(?!\/)[^\s?#]*$/.test(value))
    if (!validPaths(allowPaths)) return fail('allowPaths', 'Enter each allowed path starting with a slash, such as /products.')
    if (!validPaths(disallowPaths)) return fail('disallowPaths', 'Enter each disallowed path starting with a slash, such as /cart.')
    if (fields.frequency === 'weekly' && !scheduleDays.includes(fields.weekday)) return fail('weekday', 'Choose a day for the weekly schedule.')
    const schedule = { frequency: fields.frequency, weekday: fields.frequency === 'weekly' ? fields.weekday : null }
    const values = { scope, pageLimit, crawlSource: fields.crawlSource, sitemapUrl: fields.crawlSource === 'sitemap_url' ? sitemap.href : null,
      crawlerDevice: fields.crawlerDevice, allowPaths, disallowPaths, schedule }
    let runId
    const saved = commit((state, action) => {
      const current = configFor(state, project.id)
      const previous = crawlFields(current, project)
      const differences = Object.fromEntries(Object.entries(values).filter(([key, value]) => !same(value, previous[key])))
      const next = current
        ? { ...current, ...(start ? { ...values, excludedCheckKeys: previous.excludedCheckKeys } : differences), ...action.edit }
        : { ...action.make('adc'), projectId: project.id, ...values, excludedCheckKeys: [] }
      const configs = current ? replaceRecord(state.auditConfigs, current.id, next) : [...list(state.auditConfigs), next]
      if (start) {
        const result = runAudit(state, project, next, action)
        runId = result.run.id
        return { changes: { auditConfigs: configs, ...result.changes }, event: result.event }
      }
      if (!Object.keys(differences).length) return null
      return {
        changes: { auditConfigs: configs },
        event: { type: 'audit.settings_updated', projectId: project.id, auditConfigId: next.id, details: { changes: differences } },
      }
    }, start ? 'Site Audit completed.' : 'Audit settings saved.')
    if (runId) onFinish(runId)
    else if (!saved) setError({ message: 'No settings have changed.' })
    else setError(null)
  }
  return <section className="card padded setup">
    <h2>{start ? 'Set up Site Audit' : 'Crawl settings'}</h2>
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">Crawl scope<input {...field('scope')} required placeholder="site.example" /></label>
      <div className="form-grid">
        <label className="field">Page limit<input {...field('pageLimit')} type="number" min="1" max="1000" required /></label>
        <label className="field">Crawler device<select aria-label="Crawler device" {...field('crawlerDevice')}><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label>
      </div>
      <label className="field">Crawl source<select aria-label="Crawl source" {...field('crawlSource')}>
        <option value="website">Website</option><option value="robots_sitemap">Robots.txt sitemap</option><option value="sitemap_url">Sitemap URL</option>
      </select></label>
      {fields.crawlSource === 'sitemap_url' && <label className="field">Sitemap URL<input {...field('sitemapUrl')} type="url" placeholder="https://site.example/sitemap.xml" required /></label>}
      <div className="form-grid">
        <label className="field">Allow paths<textarea {...field('allowPaths')} aria-label="Allow paths" aria-describedby={error?.field === 'allowPaths' ? 'allow-hint audit-form-error' : 'allow-hint'} placeholder="/products" /><small id="allow-hint">One path per line. Leave blank to include all paths.</small></label>
        <label className="field">Disallow paths<textarea {...field('disallowPaths')} aria-label="Disallow paths" aria-describedby={error?.field === 'disallowPaths' ? 'disallow-hint audit-form-error' : 'disallow-hint'} placeholder="/cart" /><small id="disallow-hint">Excluded paths take priority.</small></label>
      </div>
      <div className="form-grid">
        <label className="field">Schedule preference<select aria-label="Schedule preference" {...field('frequency')}><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
        {fields.frequency === 'weekly' && <label className="field">Weekday<select aria-label="Weekday" {...field('weekday')} required><option value="">Choose a day</option>{scheduleDays.map(day => <option key={day}>{day}</option>)}</select></label>}
      </div>
      <ErrorText message={error?.message} id="audit-form-error" />
      <FormActions onClose={onCancel} submit={start ? 'Start Audit' : 'Save settings'} />
    </form>
  </section>
}

function AuditSummary({ run, issues, reportTo }) {
  const totals = severities.map(([key, label]) => [key, label, issues.filter(row => row.severity === key).length])
  const max = Math.max(1, ...totals.map(row => row[2]))
  return <div className="audit-summary">
    <section className="card padded health-card">
      <div className="health-ring" style={{ '--health': Math.max(0, Math.min(100, run.healthScore ?? 0)) + '%' }} aria-hidden="true" />
      <div><h2>Site Health</h2><span className="health-number">{numberLabel(run.healthScore, '%')}</span></div>
    </section>
    <section className="card audit-pages-summary"><Metric label="Pages crawled" value={run.pagesCrawled} /><AppLink className="table-link" to={reportTo('pages')}>Crawled pages ↗</AppLink></section>
    <section className="card padded severity-summary" aria-label="Issues by severity">
      {totals.map(([key, label, count]) => <AppLink key={key} className={'severity-row ' + key} to={reportTo('issues', run.id, { severity: key })}>
        <span>{label}</span><span className="severity-bar" aria-hidden="true"><span style={{ width: (count / max * 100) + '%' }} /></span><strong>{count}</strong>
      </AppLink>)}
    </section>
  </div>
}

function Issues({ issues, severity, setSeverity, linkTo, onExclude }) {
  const [search, setSearch] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const filtered = issues.filter(row => (!severity || row.severity === severity) &&
    lower([row.title, row.checkKey, row.description].filter(Boolean).join(' ')).includes(lower(search.trim())))
    .sort((a, b) => severities.findIndex(([key]) => key === a.severity) - severities.findIndex(([key]) => key === b.severity) || textSort(a.title, b.title))
  const pager = usePager(filtered)
  function reset() {
    setSearch('')
    setSeverity('')
    pager.setPage(1)
  }
  function exportIssues() {
    downloadCsv('audit-issues.csv', ['Issue', 'Severity', 'Affected pages', 'Check key', 'Remediation'],
      filtered.map(row => [row.title, severityLabel(row.severity), list(row.affectedPageIds).length, row.checkKey, row.remediation]))
  }
  return <section className="card">
    <div className="section-header"><h2>Issues</h2><button className="button" onClick={exportIssues} disabled={!filtered.length}>Export CSV</button></div>
    <div className="toolbar">
      <input type="search" aria-label="Search issues" placeholder="Search issues" value={search} onChange={event => { setSearch(event.target.value); pager.setPage(1) }} />
      <select aria-label="Filter by severity" value={severity} onChange={event => { setSeverity(event.target.value); pager.setPage(1) }}>
        <option value="">All severities</option>{severities.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
      </select>
      {(search || severity) && <button className="text-button" onClick={reset}>Clear filters</button>}
    </div>
    {pager.total ? <>
      <Table label="Audit issues"><thead><tr><th scope="col">Issue</th><th scope="col">Severity</th><th scope="col">Affected pages</th>{onExclude && <th scope="col">Actions</th>}</tr></thead>
        <tbody>{pager.rows.map(row => <tr key={row.id}>
          <td><AppLink className="table-link" to={linkTo(row.id)}>{row.title || row.checkKey || 'Untitled issue'}</AppLink></td>
          <td><span className={'badge ' + (row.severity || 'notice')}>{severityLabel(row.severity)}</span></td>
          <td>{list(row.affectedPageIds).length}</td>
          {onExclude && <td>{row.checkKey && <button className="button small" aria-label={'Exclude check ' + (row.title || row.checkKey)} onClick={() => setConfirmation(row)}>Exclude check</button>}</td>}
        </tr>)}</tbody>
      </Table>
      <Pager pager={pager} noun="issues" />
    </> : <Empty title={issues.length ? 'No matching issues' : 'No issues to show'} action={(search || severity) && <button className="button" onClick={reset}>Clear filters</button>}>
      {issues.length ? 'Try another search or severity.' : 'No enabled checks have findings for this run.'}
    </Empty>}
    {confirmation && <ExcludeDialog issue={confirmation} onClose={() => setConfirmation(null)} onExclude={() => { onExclude(confirmation); setConfirmation(null) }} />}
  </section>
}

function ExcludeDialog({ issue, onExclude, onClose }) {
  return <Dialog title="Exclude check" onClose={onClose}>
    <form className="form" onSubmit={event => { event.preventDefault(); onExclude() }}>
      <p>Hide <strong>{issue.title || issue.checkKey}</strong> from the current report and skip this check in future runs?</p>
      <FormActions onClose={onClose} submit="Exclude check" />
    </form>
  </Dialog>
}

function IssueDetail({ issue, pages, back, excluded, canExclude, historical, onExclude }) {
  const [confirm, setConfirm] = useState(false)
  const affectedIds = new Set(list(issue.affectedPageIds))
  const affected = pages.filter(page => affectedIds.has(page.id))
  const pager = usePager(affected)
  return <>
    <Intro title={issue.title || issue.checkKey || 'Issue details'} subtitle={severityLabel(issue.severity) + (historical ? ' · Previous run' : '')}>
      <AppLink className="button" to={back}>Back to issues</AppLink>
      {canExclude && !historical && issue.checkKey && <button className="button" onClick={() => setConfirm(true)}>Exclude check</button>}
    </Intro>
    {excluded ? <section className="card"><Empty title="Check excluded">Restore this check from Audit settings to view its findings.</Empty></section> : <>
      <section className="card padded stack"><h2>How to fix this issue</h2>
        {issue.description && <p>{issue.description}</p>}<p className="muted">{issue.remediation || 'Remediation guidance is unavailable.'}</p>
      </section>
      <section className="card">
        <div className="section-header"><h2>Affected pages</h2><span className="badge">{affectedIds.size}</span></div>
        {affected.length ? <><PageTable rows={pager.rows} /><Pager pager={pager} noun="pages" /></> : <Empty title="No affected pages available" />}
      </section>
    </>}
    {confirm && <ExcludeDialog issue={issue} onClose={() => setConfirm(false)} onExclude={() => { onExclude(); setConfirm(false) }} />}
  </>
}

function PageTable({ rows }) {
  const statusClass = status => status >= 400 ? 'error' : status >= 300 ? 'warning' : status >= 200 ? 'success' : 'notice'
  return <Table label="Crawled pages"><thead><tr><th scope="col">URL</th><th scope="col">Status</th><th scope="col">Depth</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id}>
      <td><strong>{row.title || 'Untitled page'}</strong><div className="path">{row.url || 'URL unavailable'}</div></td>
      <td><span className={'badge ' + statusClass(row.httpStatus)}>{numberLabel(row.httpStatus)}</span></td><td>{numberLabel(row.depth)}</td>
    </tr>)}</tbody>
  </Table>
}

function CrawledPages({ pages }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const statuses = [...new Set(pages.map(page => page.httpStatus).filter(Number.isFinite))].sort((a, b) => a - b)
  const filtered = pages.filter(row => lower(row.url).includes(lower(search.trim())) && (!status || String(row.httpStatus) === status))
  const pager = usePager(filtered)
  function reset() { setSearch(''); setStatus(''); pager.setPage(1) }
  return <section className="card">
    <div className="section-header"><h2>Crawled pages</h2></div>
    <div className="toolbar">
      <input type="search" aria-label="Search page URLs" placeholder="Search URLs" value={search} onChange={event => { setSearch(event.target.value); pager.setPage(1) }} />
      <select aria-label="Filter by HTTP status" value={status} onChange={event => { setStatus(event.target.value); pager.setPage(1) }}>
        <option value="">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}
      </select>
      {(search || status) && <button className="text-button" onClick={reset}>Clear filters</button>}
    </div>
    {pager.total ? <><PageTable rows={pager.rows} /><Pager pager={pager} noun="pages" /></>
      : <Empty title={pages.length ? 'No matching pages' : 'No crawled pages'} action={(search || status) && <button className="button" onClick={reset}>Clear filters</button>} />}
  </section>
}

function RunHistory({ runs, reportTo }) {
  const pager = usePager(runs)
  return <section className="card">
    <div className="section-header"><h2>Run history</h2></div>
    <Table label="Audit runs"><thead><tr><th scope="col">Run</th><th scope="col">Date</th><th scope="col">Status</th><th scope="col">Site Health</th><th scope="col">Pages</th></tr></thead>
      <tbody>{pager.rows.map(row => <tr key={row.id}>
        <td><AppLink className="table-link" to={reportTo('overview', row.id)}>Run {row.runNumber ?? '—'}</AppLink></td>
        <td>{dateLabel(row.completedAt || row.startedAt)}</td><td>{row.status || 'Unavailable'}</td>
        <td>{numberLabel(row.healthScore, '%')}</td><td>{numberLabel(row.pagesCrawled)}</td>
      </tr>)}</tbody>
    </Table><Pager pager={pager} noun="runs" />
  </section>
}

function Compare({ state, runs, initialRun }) {
  const [afterId, setAfter] = useState(initialRun.id)
  const [beforeId, setBefore] = useState(runs.find(row => row.id !== initialRun.id)?.id || initialRun.id)
  const options = runs.map(row => <option key={row.id} value={row.id}>Run {row.runNumber ?? '—'} · {dateLabel(row.completedAt)}</option>)
  function findings(runId) {
    const pages = new Map(forRun(state.auditPages, runId).map(page => [page.id, page]))
    const rows = new Map()
    for (const issue of forRun(state.auditIssues, runId)) {
      if (!issue.checkKey) continue
      for (const pageId of list(issue.affectedPageIds)) {
        const page = pages.get(pageId)
        if (!page?.url) continue
        let path = page.url
        try { path = new URL(page.url).pathname } catch { /* Partial worlds can use relative paths. */ }
        rows.set(issue.checkKey + '\n' + path, { path, title: issue.title || issue.checkKey })
      }
    }
    return rows
  }
  const before = findings(beforeId)
  const after = findings(afterId)
  const added = [...after].filter(([key]) => !before.has(key)).map(([key, row]) => ({ ...row, key, change: 'Added' }))
  const resolved = [...before].filter(([key]) => !after.has(key)).map(([key, row]) => ({ ...row, key, change: 'Resolved' }))
  const pager = usePager([...added, ...resolved])
  return <section className="card">
    <div className="section-header"><h2>Compare runs</h2></div>
    <div className="toolbar">
      <label className="field">Baseline run<select aria-label="Baseline run" value={beforeId} onChange={event => { setBefore(event.target.value); pager.setPage(1) }}>{options}</select></label>
      <label className="field">Comparison run<select aria-label="Comparison run" value={afterId} onChange={event => { setAfter(event.target.value); pager.setPage(1) }}>{options}</select></label>
      <span className="badge error">{added.length} added</span><span className="badge success">{resolved.length} resolved</span>
    </div>
    {pager.total ? <><Table label="Audit run comparison"><thead><tr><th scope="col">Change</th><th scope="col">Issue</th><th scope="col">Path</th></tr></thead>
      <tbody>{pager.rows.map(row => <tr key={row.key}><td><span className={'badge ' + (row.change === 'Added' ? 'error' : 'success')}>{row.change}</span></td><td>{row.title}</td><td className="path">{row.path}</td></tr>)}</tbody>
    </Table><Pager pager={pager} noun="changes" /></> : <Empty title="No changes between these runs" />}
  </section>
}

