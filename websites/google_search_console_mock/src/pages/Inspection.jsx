import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dateLabel, defaultLive, eligible, fixtureFor, label, latest, list, lookupInspection, queueIndexing, scoped, scopedUrl, testLive, unknownIndex } from '../data/records'
import { DetailFields, Empty, Icon, Missing, PageHead, sitemapPath, Status } from '../ui'
import { RecentInspections } from './Overview'

const booleanLabel = value => typeof value === 'boolean' ? value ? 'Yes' : 'No' : '—'
const code = value => value ? <span className="mono wrap">{value}</span> : '—'
const copy = {
  indexed: 'URL is on Google', indexed_with_issues: 'URL is on Google with issues',
  not_indexed: 'URL is not on Google', unknown: 'URL is unknown to Google',
}

function IndexReport({ index, state, property, to }) {
  const links = list(index.sitemapIds)
  const referrers = list(index.referringUrls)
  return <div className="inspection-groups">
    <details open><summary>Discovery</summary><DetailFields rows={[
      ['Sitemaps', links.length ? <ul className="inline-list">{links.map(id => {
        const map = scoped(state.sitemaps, property).find(row => row.id === id)
        return <li key={id}>{map?.url && map.status !== 'removed'
          ? <Link className="mono wrap" to={to(sitemapPath(map), { property: property.id })}>{map.url}</Link> : code(map?.url || id)}</li>
      })}</ul> : '—'],
      ['Referring pages', referrers.length ? <ul className="inline-list">{referrers.map(url => <li key={url}>{code(url)}</li>)}</ul> : '—'],
    ]} /></details>
    <details open><summary>Crawl</summary><DetailFields rows={[
      ['Last crawl', dateLabel(index.lastCrawlAt)], ['Crawl allowed?', booleanLabel(index.crawlAllowed)],
      ['Page fetch', index.pageFetch], ['Indexing allowed?', booleanLabel(index.indexingAllowed)],
    ]} /></details>
    <details open><summary>Indexing and canonical URLs</summary><DetailFields rows={[
      ['Indexing status', index.reason], ['User-declared canonical', code(index.userCanonical)], ['Google-selected canonical', code(index.googleCanonical)],
    ]} /></details>
  </div>
}

export function Inspection({ state, property, to, go, commit, inspect, queryUrl, inspectionId, verdict, staleProperty }) {
  const [value, setValue] = useState(queryUrl)
  const [validation, setValidation] = useState('')
  const [tab, setTab] = useState('index')
  const [requestFeedback, setRequestFeedback] = useState('')
  if (staleProperty) return <Missing title="Inspection property unavailable" path={to('/url-inspection', { property: property?.id })}>Return to URL Inspection</Missing>
  const normalized = queryUrl ? scopedUrl(queryUrl, property) : {}
  const url = normalized.url
  const filter = copy[verdict] ? verdict : ''
  const recent = latest(scoped(state.inspections, property)).filter(row =>
    !filter || (copy[row.index?.verdict] ? row.index.verdict : 'unknown') === filter)
  const fixture = url && fixtureFor(state, property, url)
  const inspection = url && lookupInspection(state, property, url, inspectionId)
  const index = { ...unknownIndex, ...(inspection ? inspection.index : fixture?.index) }
  const test = inspection && latest(scoped(state.liveTests, property).filter(item => item.inspectionId === inspection.id))[0]
  const localResult = { ...defaultLive, ...fixture?.live }
  const result = test ? test.result || {} : localResult
  const request = url && scoped(state.indexingRequests, property).find(row =>
    row.status === 'queued' && scopedUrl(row.url, property).url === url)
  const submit = async event => {
    event.preventDefault()
    setValidation(await inspect(value))
  }
  return <>
    <PageHead eyebrow={property ? label(property) : 'Property reports'} title="URL Inspection"
      description="Check how Google sees an individual URL in this property." />
    {!property ? <section className="card"><Empty title="Choose a verified property">Open Properties to add or verify a site.</Empty>
      <div className="empty-actions"><Link className="button" to={to('/properties')}>Open Properties</Link></div></section> : <>
      <section className="card padded">
        <form className="inline-form" aria-label="URL Inspection form" onSubmit={submit} noValidate>
          <label className="filter-label">URL to inspect<input value={value} onChange={event => { setValue(event.target.value); setValidation('') }}
            placeholder={'https://' + (property.type === 'domain' ? label(property) + '/page' : 'example.com/page')}
            aria-invalid={Boolean(validation)} aria-describedby={validation ? 'inspection-error' : undefined} /></label>
          <button className="primary"><Icon name="search" />Inspect</button>
        </form>
        {(validation || normalized.error) && <p className="error" role="alert" id="inspection-error">{validation || normalized.error}</p>}
        {normalized.error && <Link to={to('/url-inspection', { property: property.id })}>Return to recent inspections</Link>}
      </section>
      {url && <section className="card inspection-result">
        <div className="padded result-header">
          <div><div className="eyebrow">{inspection ? 'Inspection result' : 'Inspection preview'}</div>
            <h2 className="mono wrap">{url}</h2><p>{inspection ? 'Inspected ' + dateLabel(inspection.createdAt) : 'Run an inspection to save this result and use live testing.'}</p></div>
          {inspection && <div className="actions">
            <button onClick={async () => {
              if (!await commit(current => testLive(current, inspection, url, localResult))) return
              setTab('live')
              setRequestFeedback('')
            }}>Test live URL</button>
            <button className="primary" onClick={async () => {
              if (request) { setRequestFeedback('An indexing request is already queued for this URL.'); return }
              if (!eligible(result)) { setRequestFeedback(result.reason || 'This URL does not pass the live indexing checks.'); return }
              if (!await commit(current => queueIndexing(current, inspection, url, test))) return
              setRequestFeedback('Indexing request queued.')
            }}>Request indexing</button>
          </div>}
        </div>
        {(requestFeedback || request) && <p className={'action-feedback ' + (request ? 'queued-feedback' : 'error')} role="status">
          {requestFeedback || 'An indexing request is queued for this URL.'}</p>}
        <div className="tabs" role="group" aria-label="Inspection report">
          <button className={tab === 'index' ? 'active' : ''} aria-pressed={tab === 'index'} onClick={() => setTab('index')}>Google Index</button>
          <button className={tab === 'live' ? 'active' : ''} aria-pressed={tab === 'live'} onClick={() => setTab('live')}>Live Test</button>
        </div>
        {tab === 'index' ? <div className="padded">
          <div className="verdict"><h3>{copy[index.verdict] || copy.unknown}</h3><Status value={index.verdict} /><p>{index.reason}</p></div>
          <IndexReport index={index} state={state} property={property} to={to} />
        </div> : test ? <div className="padded">
          <div className="verdict"><h3>Live test result</h3><Status value={result.status} /><p>{result.reason || 'Live checks completed.'}</p></div>
          <DetailFields rows={[
            ['Tested on', dateLabel(test.createdAt)], ['Crawl allowed?', booleanLabel(result.crawlAllowed)],
            ['Page fetch', result.pageFetch], ['Indexing allowed?', booleanLabel(result.indexingAllowed)],
          ]} />
        </div> : <Empty title="No live test yet">{inspection ? 'Run Test live URL to check current availability.' : 'Inspect this URL to enable live testing.'}</Empty>}
      </section>}
      <RecentInspections rows={recent} property={property} to={to} limit={recent.length} filterControl={!url &&
        <label className="filter-label">Index verdict<select value={filter} onChange={event =>
          go(to('/url-inspection', { property: property.id, verdict: event.target.value }))}>
          <option value="">All verdicts</option>
          {Object.entries(copy).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
        </select></label>} />
    </>}
  </>
}
