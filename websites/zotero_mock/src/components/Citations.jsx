import { lazy, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { dateLabel, newId, records, values } from '../utils/model.js'
import { appPath } from '../utils/routes.js'
import { Empty } from './ui.jsx'

export const styles = { 'apa-7': 'APA 7', 'mla-9': 'MLA 9', 'chicago-author-date': 'Chicago author-date' }
export const modes = { citation: 'Citation', bibliography: 'Bibliography' }
const actions = { saved: 'Saved', copied: 'Copied', downloaded: 'Downloaded' }
const messages = { saved: 'Citation saved to history.', copied: 'Text copied to clipboard.', downloaded: 'Text download started.' }

export const CitationComposer = lazy(() => import('./CitationComposer.jsx'))

export function useCitationActions() {
  const { commit, announce } = useStore()
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  async function run(record, action, sourceCitationId = null) {
    if (busy.current || !record.output?.trim()) return false
    busy.current = true
    setPending(true)
    try {
      if (action === 'copied') await navigator.clipboard.writeText(record.output)
      if (action === 'downloaded') {
        const href = URL.createObjectURL(new Blob([record.output], { type: 'text/plain;charset=utf-8' }))
        try {
          const link = document.createElement('a')
          link.href = href
          link.download = (record.mode ?? 'citation') + '-' + (record.style ?? 'text').replace(/[^a-z0-9-]/gi, '') + '.txt'
          document.body.append(link)
          try { link.click() } finally { link.remove() }
        } finally {
          setTimeout(() => URL.revokeObjectURL(href), 1000)
        }
      }
      const { libraryId, itemIds, locators, style, mode, output } = record
      commit((state, { actorId }, createdAt) => ({
        ...state,
        citations: [...records(state.citations), {
          id: newId('cite'), libraryId: libraryId ?? null, itemIds: values(itemIds), locators: values(locators),
          style: style ?? null, mode: mode ?? null, output, action, sourceCitationId,
          status: 'completed', actorId, createdAt,
        }],
      }))
      announce({ text: messages[action] })
      return true
    } catch {
      announce({ kind: 'error', text: action === 'copied' ? 'Could not access the clipboard. Try again or download the text.' : 'Could not complete this action.' })
      return false
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return { run, pending }
}

export function CitationHistory() {
  const { state } = useStore()
  const { run, pending } = useCitationActions()
  const history = [...records(state.citations)].reverse()
  const items = new Map(records(state.items).map((item) => [item.id, item]))
  const libraries = new Map(records(state.libraries).map((library) => [library.id, library]))
  return <>
    <div className="page-heading"><div><h1>Citations</h1><p className="muted">Review and reuse text from your citation history.</p></div><Link className="button" to={appPath('/libraries')}>Browse libraries</Link></div>
    {history.length ? <section className="history" aria-label="Citation history">
      <div className="history-head"><h2>Citation history</h2><span className="muted">{history.length} {history.length === 1 ? 'entry' : 'entries'}</span></div>
      {history.map((citation) => {
        const titles = values(citation.itemIds).map((id) => items.get(id)).filter(Boolean).map((item) => item.title).filter(Boolean)
        const library = libraries.get(citation.libraryId)
        return <article className="history-entry" key={citation.id}>
          <div className="history-meta"><span>{styles[citation.style] ?? 'Citation style'}</span><span>{modes[citation.mode] ?? 'Output'}</span><span>{actions[citation.action] ?? 'Completed'}</span><time dateTime={citation.createdAt}>{dateLabel(citation.createdAt)}</time></div>
          <h3>{titles.length ? titles.join(' · ') : library?.name || 'Citation output'}</h3>
          <p className="output-text">{citation.output || 'No stored text.'}</p>
          {citation.output && <div className="history-actions">
            <button className="small" disabled={pending} onClick={() => run(citation, 'copied', citation.id)}>Copy</button>
            <button className="small" disabled={pending} onClick={() => run(citation, 'downloaded', citation.id)}>Download</button>
          </div>}
        </article>
      })}
    </section> : <Empty title="No citations yet"><p>Open a reference in Libraries and choose Cite to get started.</p><Link to={appPath('/libraries')}>Browse libraries</Link></Empty>}
  </>
}
