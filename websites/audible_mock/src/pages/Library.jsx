import { useRef, useState } from 'react'
import { useConfirm } from '../components/Confirm.jsx'
import { Empty } from '../components/Empty.jsx'
import { SiteLink } from '../components/links.jsx'
import { TitleIdentity, TitleRuntime } from '../components/TitleIdentity.jsx'
import { alphabetic, Filters, Heading, matches, recentFirst, SearchField, SelectField, TitleButton } from '../components/ui.jsx'
import { useAccount } from '../state/AccountProvider.jsx'
import { rows, titleLabel } from '../state/selectors.js'

const filters = [['all', 'All'], ['unfinished', 'Unfinished'], ['finished', 'Finished']]
const sorts = [['recent', 'Recently added'], ['title', 'Title'], ['author', 'Author']]

function ListeningProgress({ entry }) {
  const status = entry.listeningStatus === 'finished' ? 'Finished'
    : entry.listeningStatus === 'in_progress' ? 'In progress' : 'Not started'
  const progress = Math.max(0, Math.min(100, Number(entry.progressPercent) || 0))

  return (
    <div className="listening">
      <span className={`pill ${status === 'Finished' ? 'positive' : status === 'In progress' ? 'amber' : ''}`}>{status}</span>
      {status === 'In progress' && <div className="progress-line">
        <progress max="100" value={progress} aria-label="Listening progress" />
        <span>{progress}%</span>
      </div>}
    </div>
  )
}

export function Library() {
  const { state, act } = useAccount()
  const confirm = useConfirm()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const list = useRef(null)
  const titles = new Map(rows(state, 'titles').map((title) => [title.id, title]))
  const library = rows(state, 'library').filter((entry) => entry.status === 'active')
  const total = library.length
  const items = library.filter((entry) => {
    const title = titles.get(entry.titleId)
    const finished = entry.listeningStatus === 'finished'
    if (filter !== 'all' && finished !== (filter === 'finished')) return false
    return matches(query, titleLabel(title), title?.author, title?.narrator)
  }).sort((left, right) => sort === 'recent' ? recentFirst(left, right)
    : alphabetic(titles.get(left.titleId)?.[sort], titles.get(right.titleId)?.[sort]))

  async function mark(entry, finished, trigger) {
    await act({ type: finished ? 'unfinish' : 'finish', libraryId: entry.id })
    requestAnimationFrame(() => {
      if (!trigger.isConnected) list.current?.focus()
    })
  }

  return (
    <section>
      <Heading title="Library" action={<SiteLink className="button secondary" to="/browse">Browse audiobooks <span aria-hidden="true">↗</span></SiteLink>}>
        {total} {total === 1 ? 'audiobook' : 'audiobooks'} in your collection
      </Heading>
      <div className="shelf-controls">
        <Filters label="Listening status" options={filters} value={filter} onChange={setFilter} />
        <div className="toolbar">
          <SearchField id="library-search" label="Search library" placeholder="Title, author, or narrator" value={query} onChange={setQuery} />
          <SelectField id="library-sort" label="Sort by" value={sort} onChange={setSort} options={sorts} />
        </div>
      </div>
      <h2 className="list-caption" aria-live="polite" tabIndex={-1} ref={list}>
        {items.length} {items.length === 1 ? 'title' : 'titles'}
      </h2>
      {items.length ? (
        <ul className="shelf-list">
          {items.map((entry, index) => {
            const title = titles.get(entry.titleId)
            const label = titleLabel(title)
            const finished = entry.listeningStatus === 'finished'
            return (
              <li className="shelf-row library-row" key={entry.id ?? index}>
                <TitleIdentity title={title} eager={index < 8}>
                  <div className="metadata">
                    {entry.source && <span>{entry.source === 'purchased' ? 'Purchased' : 'Included'}</span>}
                    <TitleRuntime title={title} />
                  </div>
                </TitleIdentity>
                <ListeningProgress entry={entry} />
                {entry.id && entry.titleId && <div className="row-actions">
                  <TitleButton title={label} className="button quiet" onClick={(event) => mark(entry, finished, event.currentTarget)}>
                    {finished ? 'Mark as unfinished' : 'Mark as finished'}
                  </TitleButton>
                  {entry.source === 'included' && <TitleButton title={label} className="button quiet"
                    onClick={() => confirm(label, { type: 'remove_included', libraryId: entry.id })}>
                    Remove from Library
                  </TitleButton>}
                </div>}
              </li>
            )
          })}
        </ul>
      ) : total ? (
        <Empty title="No matching audiobooks" action={<button className="button secondary" onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</button>}>
          Try a different search or listening status.
        </Empty>
      ) : (
        <Empty title="Your Library is empty" action={<SiteLink className="button" to="/browse">Browse audiobooks</SiteLink>}>
          Add an included title or use a credit to start your collection.
        </Empty>
      )}
    </section>
  )
}
