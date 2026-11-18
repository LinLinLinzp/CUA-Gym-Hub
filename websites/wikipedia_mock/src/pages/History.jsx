import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { articlePath, contributorName, dateLabel, newestFirst, oldestFirst, published } from '../data/records.js'
import { ButtonLink, SiteLink, useQuery, useSiteNavigate } from '../navigation.jsx'
import { useWorkspace } from '../workspace.js'
import { SourceProse } from './Article.jsx'
import { TextChanges } from './Editor.jsx'

function RevisionComparison({ base, snapshots, from, to }) {
  const navigate = useSiteNavigate()
  const [first, setFirst] = useState(from)
  const [second, setSecond] = useState(to)
  const valid = first !== second && [first, second].every(id => snapshots.some(item => item.id === id))
  const pair = snapshots.filter(item => item.id === from || item.id === to).sort(oldestFirst)

  return <section className="paper">
    <h2>Compare revisions</h2>
    <form className="filters" onSubmit={event => {
      event.preventDefault()
      if (!valid) return
      const ordered = snapshots.filter(item => item.id === first || item.id === second).sort(oldestFirst)
      const query = new URLSearchParams({ from: ordered[0].id, to: ordered[1].id })
      navigate(base + '?' + query)
    }}>
      {[['First revision', first, setFirst], ['Second revision', second, setSecond]].map(([label, value, setValue]) =>
        <label className="field" key={label}>{label}
          <select aria-label={label} value={value} onChange={event => setValue(event.target.value)}>
            <option value="">Select a revision</option>
            {value && !snapshots.some(item => item.id === value) && <option value={value}>Revision unavailable</option>}
            {snapshots.map(item => <option key={item.id} value={item.id}>{dateLabel(item.createdAt)} · {item.summary || item.id}</option>)}
          </select>
        </label>)}
      <button type="submit" disabled={!valid}>Compare selected</button>
    </form>
    {pair.length === 2 && <div aria-live="polite">
      <p className="metadata">{dateLabel(pair[0].createdAt)} → {dateLabel(pair[1].createdAt)}</p>
      <TextChanges before={pair[0].body} after={pair[1].body} />
    </div>}
  </section>
}

export function History() {
  const article = useOutletContext()
  const { state } = useWorkspace()
  const [params] = useQuery()
  const base = articlePath(article) + '/history'
  const revisions = state.revisions.filter(item => item.articleId === article.id && published(item)).sort(newestFirst)
  const snapshotId = params.get('revision')
  const snapshot = revisions.find(item => item.id === snapshotId)
  const parent = revisions.find(item => item.id === snapshot?.parentRevisionId)
  const available = revisions.filter(item => typeof item.body === 'string')
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  return <div className="stack">
    {snapshotId && <section className="paper stack">
      <div className="panel-heading"><h2>{snapshot ? 'Revision snapshot' : 'Revision unavailable'}</h2><ButtonLink to={base}>Back to history</ButtonLink></div>
      {snapshot && <>
        <p className="metadata">{contributorName(state, snapshot.actorId)} · {dateLabel(snapshot.createdAt)}</p>
        <p>{snapshot.summary || 'No edit summary'}</p>
        <SourceProse body={snapshot.body ?? ''} />
        <div><h3>Changes from previous revision</h3>
          {typeof parent?.body === 'string' && typeof snapshot.body === 'string'
            ? <TextChanges before={parent.body} after={snapshot.body} />
            : <p className="metadata">The previous text is unavailable.</p>}
        </div>
      </>}
    </section>}
    {(from || to || available.length > 1) && <RevisionComparison key={JSON.stringify([article.id, from, to])}
      base={base} snapshots={available} from={from} to={to} />}
    <section className="paper">
      <h2>Revision history</h2>
      {revisions.length ? <ul className="ruled">{revisions.map(revision => <li key={revision.id}>
        <div className="align-row">
          <SiteLink to={base + '?revision=' + encodeURIComponent(revision.id)}>{dateLabel(revision.createdAt)}</SiteLink>
          {typeof revision.byteDelta === 'number' && <span className="metadata">
            {revision.byteDelta > 0 ? '+' : ''}{revision.byteDelta} bytes
          </span>}
        </div>
        <div>{revision.summary || 'No edit summary'} {revision.minor && <span className="pill">Minor</span>}</div>
        <div className="metadata">{contributorName(state, revision.actorId)}{revision.section && ' · ' + revision.section}</div>
      </li>)}</ul> : <p className="metadata">No revisions are available.</p>}
    </section>
  </div>
}
