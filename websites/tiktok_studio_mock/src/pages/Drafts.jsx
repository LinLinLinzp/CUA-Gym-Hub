import { useState } from 'react'
import { useStudio } from '../context/StudioContext.jsx'
import { ConfirmDialog, Cover, Empty, Icon, PageHeading, Pagination, Search, Select, StudioLink, usePagination } from '../components/ui.jsx'
import { metadata, updateRecord } from '../utils/changes.js'
import { activeDraft, dateKey, dateLabel, items, localUrl, queryMatch } from '../utils/view.js'

export default function Drafts() {
  const { state, commit, notify } = useStudio()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [discarding, setDiscarding] = useState(null)
  const drafts = items(state.drafts).filter((draft) => activeDraft(draft) && queryMatch(query, draft.caption))
  drafts.sort((left, right) => {
    const order = dateKey(right.updatedAt).localeCompare(dateKey(left.updatedAt))
    return sort === 'newest' ? order : -order
  })
  const pagination = usePagination(drafts, JSON.stringify([query, sort]), 12)

  function discard() {
    const timestamp = new Date().toISOString()
    if (commit((current) => updateRecord(current, 'drafts', discarding.id, activeDraft, {
      status: 'discarded', discardedAt: timestamp, ...metadata(current, timestamp),
    }))) notify('Draft discarded.')
    setDiscarding(null)
  }
  return <>
    <PageHeading title="Drafts" description="Pick up where you left off or clear work you no longer need.">
      <StudioLink className="button primary" to="/create"><Icon name="plus" />New post</StudioLink>
    </PageHeading>
    <div className="toolbar"><Search label="Search drafts" value={query} onChange={setQuery} placeholder="Search draft captions" />
      <Select label="Sort by" value={sort} onChange={setSort}><option value="newest">Last updated</option><option value="oldest">Oldest first</option></Select>
    </div>
    {drafts.length ? <div className="draft-grid">{pagination.rows.map((draft) => {
      const edit = `/drafts/${encodeURIComponent(draft.id)}/edit`
      return <article className="card draft-card" key={draft.id}>
        <StudioLink to={edit} className="draft-cover-link" aria-label={`Open draft: ${draft.caption || 'Untitled draft'}`}><Cover className="draft-cover" url={draft.coverUrl} /></StudioLink>
        <div className="draft-body"><div><span className={`readiness ${localUrl(draft.media?.url) ? 'ready' : ''}`}>{localUrl(draft.media?.url) ? 'Video ready' : 'Needs video'}</span></div>
          <StudioLink to={edit} className="row-title">{draft.caption || 'Untitled draft'}</StudioLink><span className="meta">Saved {dateLabel(draft.updatedAt)}</span>
          <div className="action-row"><StudioLink to={edit} className="button">Edit draft</StudioLink><button type="button" className="text-button danger-text" onClick={() => setDiscarding(draft)}>Discard</button></div>
        </div>
      </article>
    })}</div> : <section className="card"><Empty title="No matching drafts" icon="drafts">Try a different search or save your work from New post.</Empty></section>}
    <Pagination {...pagination} noun="drafts" />
    {discarding && <ConfirmDialog title="Discard this draft?" close={() => setDiscarding(null)} confirm={discard} action="Discard draft">This draft will be removed from your working list.</ConfirmDialog>}
  </>
}
