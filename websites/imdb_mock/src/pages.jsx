import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bookmark, FolderOpen, LockKeyhole, MoreHorizontal, Plus, Star, UnlockKeyhole } from 'lucide-react'
import { dateLabel, isFuture, matchesTitle, recent, scoreLabel, textOrder, titleName } from './catalog.js'
import { useAccount } from './store.jsx'
import {
  Aggregate, CollectionBrowser, Empty, ListCover, PageHeading, Poster, SearchField, SectionHeading, SelectField,
  SiteLink, TitleMeta, TitleRow, Visibility, WatchButton, browsePath, listPath, titleCount, titlePath,
} from './ui.jsx'

export const collectionLinks = [
  { path: '/watchlist', label: 'Watchlist', key: 'watchlist', unit: 'saved title', icon: Bookmark },
  { path: '/ratings', label: 'Ratings', key: 'ratings', unit: 'rated title', icon: Star },
  { path: '/lists', label: 'Lists', key: 'lists', unit: 'title list', icon: FolderOpen },
]
const listName = (list) => list.name || 'Untitled list'

export function ActivityPage() {
  const account = useAccount()
  const { user, watchlist, ratings, lists, listItems, titleById } = account
  return <>
    <PageHeading title="Your Activity"><p>{user.displayName || 'IMDb member'}’s film and television collection</p></PageHeading>
    <div className="collection-links">{collectionLinks.map(({ path, label, key, unit, icon: Icon }) =>
      <SiteLink key={key} className="collection-card" to={path}>
        <span className="collection-icon"><Icon size={21} /></span>
        <span className="collection-label"><strong>{label}</strong><span>{account[key].length} {unit}{account[key].length === 1 ? '' : 's'}</span></span>
        <ArrowRight size={19} className="collection-arrow" />
      </SiteLink>)}</div>
    <section className="activity-shelf">
      <SectionHeading title="From your Watchlist" to="/watchlist" action="View Watchlist" />
      {watchlist.length > 0 ? <ul className="shelf">{watchlist.slice(0, 5).map((row) => {
        const title = titleById.get(row.titleId)
        const content = <><div className="shelf-art"><Poster title={title} />
          {title?.year && <span className="poster-year">{title.year}</span>}</div>
          <strong>{titleName(title)}</strong></>
        return <li key={row.id}>{title ? <SiteLink className="shelf-card" to={titlePath(title.id)}>{content}</SiteLink>
          : <div className="shelf-card">{content}</div>}</li>
      })}</ul> : <Empty title="Your Watchlist is empty" to={browsePath} action="Browse titles" />}
    </section>
    <div className="activity-columns">
      <section>
        <SectionHeading title="Recent ratings" to="/ratings" action="View ratings" />
        {ratings.length > 0 ? <ul className="preview-list">{[...ratings].sort(recent).slice(0, 3).map((row) => {
          const title = titleById.get(row.titleId)
          return <li key={row.id}><Poster title={title} /><div className="row-copy">
            {title ? <SiteLink className="row-title" to={titlePath(title.id)}>{titleName(title)}</SiteLink> : <strong>{titleName(title)}</strong>}
            <span className="meta">{dateLabel(row.updatedAt || row.createdAt)}</span>
          </div><span className="personal-score">{row.value ?? '—'}<small>/10</small></span></li>
        })}</ul> : <Empty title="No ratings yet" to={browsePath} action="Find a title" />}
      </section>
      <section>
        <SectionHeading title="Your lists" to="/lists" action="View lists" />
        {lists.length > 0 ? <ul className="preview-list">{[...lists].sort(recent).slice(0, 3).map((list) => {
          const rows = listItems.get(list.id) || []
          return <li key={list.id}><ListCover rows={rows} titleById={titleById} /><div className="row-copy">
            <SiteLink className="row-title" to={listPath(list.id)}>{listName(list)}</SiteLink>
            <span className="meta">{titleCount(rows.length)} · {list.visibility === 'public' ? 'Public' : 'Private'}</span>
          </div></li>
        })}</ul> : <Empty title="No custom lists yet" to="/lists" action="Go to Your Lists" />}
      </section>
    </div>
  </>
}

export function SearchPage() {
  const { titles } = useAccount()
  const [params] = useSearchParams()
  const query = (params.get('q') || '').trim()
  const matches = titles.filter((title) => matchesTitle(title, query)).sort((a, b) =>
    textOrder(titleName(a), titleName(b)) || (b.year || 0) - (a.year || 0) || textOrder(a.id, b.id))
  return <>
    <PageHeading title={query ? 'Search results' : 'Browse titles'}><p>{query ? 'Results for “' + query + '”' : 'Explore the film and television catalog.'}</p></PageHeading>
    <p className="count">{titleCount(matches.length)}</p>
    {matches.length ? <ul className="row-list">{matches.map((title) =>
      <TitleRow title={title} key={title.id}><WatchButton title={title} compact /></TitleRow>)}</ul>
      : <Empty title={query ? 'No matching titles' : 'The catalog is empty'} to={query ? browsePath : '/'} action={query ? 'Browse all titles' : 'Back to Your Activity'}>
        {query ? 'Try another title, a shorter phrase, or a catalog ID.' : undefined}
      </Empty>}
  </>
}

export function TitlePage({ open }) {
  const { titleId } = useParams()
  const { titleById, ratingByTitle } = useAccount()
  const title = titleById.get(titleId)
  const rating = ratingByTitle.get(titleId)
  if (!title) return <Missing title="Title unavailable" to={browsePath} action="Browse titles" />
  const blocked = isFuture(title)
  return <>
    <SiteLink className="text-link back-link" to={browsePath}><ArrowLeft size={16} />Browse titles</SiteLink>
    <article className="title-detail">
      <Poster title={title} />
      <div className="detail-copy">
        <PageHeading title={titleName(title)}><TitleMeta title={title} /></PageHeading>
        <div className="detail-meta">{[title.certificate, title.runtimeMinutes ? title.runtimeMinutes + ' min' : '', title.releaseDate ? dateLabel(title.releaseDate) : '']
          .filter(Boolean).map((value, i) => <span key={i}>{value}</span>)}</div>
        {title.synopsis && <p className="synopsis">{title.synopsis}</p>}
        <div className="detail-scores">
          <div><span>IMDb rating</span><strong><Star size={20} />{scoreLabel(title.imdbRating)}{Number.isFinite(title.imdbRating) && <small>/10</small>}</strong></div>
          <div><span>Your rating</span><strong>{rating ? <>{rating.value}<small>/10</small></> : 'Unrated'}</strong></div>
        </div>
        <div className="detail-actions">
          <WatchButton title={title} />
          <button className="button primary" type="button" disabled={blocked && !rating}
            onClick={() => open({ kind: 'rate', titleId })}><Star size={16} />{rating ? 'Edit rating' : 'Rate'}</button>
          <button className="button" type="button" onClick={() => open({ kind: 'choose-list', titleId })}><Plus size={17} />Add to list</button>
        </div>
        {blocked && <p className="meta">Ratings open on the release date.</p>}
      </div>
    </article>
  </>
}

function PositionForm({ index, length, save }) {
  const [value, setValue] = useState(String(index))
  return <form className="position-form" onSubmit={(event) => {
    event.preventDefault()
    save(Number(value))
    setValue(String(index))
  }}>
    <label className="field"><span>Move to position</span><input type="number" value={value} min={1} max={length} step={1}
      required onChange={(event) => setValue(event.target.value)} /></label>
    <button className="button" type="submit">Save</button>
  </form>
}

function OrderEditor({ rows, onMove }) {
  const { titleById } = useAccount()
  return <section className="order-editor">
    <h2>Custom order</h2><p>Enter a new position for a title and save it to move that title.</p>
    <ul className="row-list">
      {rows.map((row, index) => <TitleRow key={row.id} title={titleById.get(row.titleId)} note={'Position ' + (index + 1)} compact>
        <PositionForm key={index} index={index + 1} length={rows.length} save={(position) => onMove(row.id, position)} />
      </TitleRow>)}
    </ul>
  </section>
}

export function WatchlistPage() {
  const { user, watchlist, dispatch } = useAccount()
  const [editing, setEditing] = useState(false)
  return <>
    <PageHeading title="Your Watchlist" actions={watchlist.length > 0 &&
      <button className="button" type="button" aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done editing order' : 'Edit order'}</button>}>
      <p>{titleCount(watchlist.length)} saved for later</p>
    </PageHeading>
    {editing && watchlist.length ? <OrderEditor rows={watchlist}
      onMove={(membershipId, position) => dispatch({ type: 'watchlist.reorder', membershipId, position })} /> : <CollectionBrowser rows={watchlist}
      sorts={['custom', 'added', 'title', 'year', 'aggregate']}
      options={<Visibility value={user.watchlistVisibility} onChange={(visibility) => dispatch({ type: 'watchlist.visibility', visibility })} />}
      empty={<Empty title="Your Watchlist is empty" to={browsePath} action="Browse titles">Save titles you want to watch later.</Empty>}
      renderRow={(row, title, compact) => <TitleRow key={row.id} title={title} compact={compact}
        note={<><Aggregate title={title} /><span>Added {dateLabel(row.createdAt)}</span></>}>
        <button className="button" type="button" onClick={() => dispatch({ type: 'watchlist.remove', membershipId: row.id })}>Remove</button>
      </TitleRow>} />}
  </>
}

function RatingDistribution({ ratings }) {
  const bins = Array.from({ length: 10 }, () => 0)
  for (const { value } of ratings) if (Number.isInteger(value) && value >= 1 && value <= 10) bins[value - 1]++
  const highest = Math.max(...bins, 1)
  return <section className="distribution" aria-label="Rating distribution">
    <h2>Score distribution</h2>
    <ul>{bins.map((count, index) => <li key={index} aria-label={(index + 1) + ' out of 10: ' + titleCount(count)}
      title={titleCount(count)}>
      <div className="rating-track" aria-hidden="true"><span style={{ height: count / highest * 100 + '%' }} /></div>
      <span>{index + 1}</span><span className="sr-only">{titleCount(count)}</span>
    </li>)}</ul>
  </section>
}

export function RatingsPage({ open }) {
  const { user, ratings, dispatch } = useAccount()
  return <>
    <PageHeading title="Your Ratings"><p>{titleCount(ratings.length)} rated</p></PageHeading>
    {ratings.length > 0 && <RatingDistribution ratings={ratings} />}
    <CollectionBrowser rows={ratings} sorts={['rated', 'title', 'personal', 'year']}
      options={<Visibility value={user.ratingsVisibility} onChange={(visibility) => dispatch({ type: 'ratings.visibility', visibility })} />}
      empty={<Empty title="No ratings yet" to={browsePath} action="Find a title">Choose a title to give it a score from 1 to 10.</Empty>}
      renderRow={(row, title, compact) => <TitleRow key={row.id} title={title} compact={compact}
        note={<><span className="personal-score">Your score {row.value ?? '—'}<small>/10</small></span><Aggregate title={title} />
          <span>Rated {dateLabel(row.updatedAt || row.createdAt)}</span></>}>
        <button className="button" type="button" onClick={() => open({ kind: 'rate', titleId: row.titleId, ratingId: row.id })}>
          {title && !isFuture(title) ? 'Edit rating' : 'Manage rating'}</button>
      </TitleRow>} />
  </>
}

function ListMenu({ list, open }) {
  const [expanded, setExpanded] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  useEffect(() => {
    if (!expanded) return
    function outside(event) {
      if (!root.current?.contains(event.target)) setExpanded(false)
    }
    function escape(event) {
      if (event.key === 'Escape') {
        setExpanded(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [expanded])
  function choose(kind) {
    setExpanded(false)
    trigger.current.focus()
    open({ kind, listId: list.id })
  }
  return <div className="list-menu" ref={root}>
    <button className="button icon-button" ref={trigger} type="button" title="List actions" aria-expanded={expanded}
      aria-label={'Actions for ' + listName(list)} onClick={() => setExpanded(!expanded)}><MoreHorizontal size={20} /></button>
    {expanded && <div className="menu-panel">
      <button type="button" onClick={() => choose('edit-list')}>Edit details</button>
      <button className="danger" type="button" onClick={() => choose('delete-list')}>Delete list</button>
    </div>}
  </div>
}

function ListVisibility({ value }) {
  return <span className="visibility-label">{value === 'public' ? <><UnlockKeyhole size={13} />Public</> : <><LockKeyhole size={13} />Private</>}</span>
}

export function ListsPage({ open }) {
  const { lists, listItems, titleById } = useAccount()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('updated')
  const matches = lists.filter((list) => listName(list).toLowerCase().includes(query.trim().toLowerCase()))
    .sort(sort === 'name' ? (a, b) => textOrder(listName(a), listName(b)) || textOrder(a.id, b.id) : recent)
  return <>
    <PageHeading title="Your Lists" actions={<button className="button primary" type="button" onClick={() => open({ kind: 'create-list' })}><Plus size={17} />Create list</button>}>
      <p>{lists.length} {lists.length === 1 ? 'custom list' : 'custom lists'}</p>
    </PageHeading>
    <div className="tools">
      <SearchField label="Find a list" value={query} onChange={setQuery} placeholder="Search by list name" />
      <SelectField label="Sort by" value={sort} onChange={setSort}>
        <option value="updated">Recently updated</option><option value="name">Name</option>
      </SelectField>
    </div>
    <p className="count" aria-live="polite">{matches.length} {matches.length === 1 ? 'list' : 'lists'}</p>
    {matches.length > 0 ? <ul className="row-list">{matches.map((list) => {
      const rows = listItems.get(list.id) || []
      return <li className="title-row" key={list.id}><ListCover rows={rows} titleById={titleById} />
        <div className="row-copy"><SiteLink className="row-title" to={listPath(list.id)}>{listName(list)}</SiteLink>
          {list.description && <span className="list-summary">{list.description}</span>}
          <div className="row-note"><span>{titleCount(rows.length)}</span><ListVisibility value={list.visibility} />
            <span>Updated {dateLabel(list.updatedAt || list.createdAt)}</span></div></div>
        <ListMenu list={list} open={open} />
      </li>
    })}</ul> : <Empty title={lists.length ? 'No matching lists' : 'No custom lists yet'}>
      {lists.length ? 'Try another list name.' : 'Use Create list to start a collection.'}
    </Empty>}
  </>
}

export function ListPage({ open }) {
  const { listId } = useParams()
  const { lists, listItems, dispatch } = useAccount()
  const list = lists.find((item) => item.id === listId)
  const rows = listItems.get(listId) || []
  const [editing, setEditing] = useState(false)
  if (!list) return <Missing title="List unavailable" to="/lists" action="Back to Your Lists" />
  return <>
    <SiteLink className="text-link back-link" to="/lists"><ArrowLeft size={16} />Your Lists</SiteLink>
    <PageHeading title={listName(list)} actions={<>
      <button type="button" className="button primary" onClick={() => open({ kind: 'choose-title', listId })}><Plus size={17} />Add titles</button>
      <ListMenu list={list} open={open} />
    </>}>
      <div className="row-note"><span>{titleCount(rows.length)}</span><ListVisibility value={list.visibility} />
        <span>Updated {dateLabel(list.updatedAt || list.createdAt)}</span></div>
    </PageHeading>
    {list.description && <p className="list-description">{list.description}</p>}
    <div className="list-controls">
      <button type="button" className="button" onClick={() => open({ kind: 'edit-list', listId })}>Edit details</button>
      {rows.length > 0 && <button type="button" className="button" aria-pressed={editing}
        onClick={() => setEditing(!editing)}>{editing ? 'Done editing order' : 'Edit order'}</button>}
    </div>
    {editing && rows.length ? <OrderEditor rows={rows} onMove={(membershipId, position) =>
      dispatch({ type: 'list.reorder', listId, membershipId, position })} />
      : <CollectionBrowser rows={rows} sorts={['custom', 'added', 'title']}
        empty={<Empty title="This list is empty">Use Add titles to find something for this collection.</Empty>}
        renderRow={(row, title, compact) => <TitleRow compact={compact} key={row.id} title={title}
          note={<span>Added {dateLabel(row.createdAt)}</span>}>
          <button className="button" type="button" onClick={() => dispatch({ type: 'list.item.remove', listId, membershipId: row.id })}>Remove</button>
        </TitleRow>} />}
  </>
}

export function Missing({ title = 'Page unavailable', to = '/', action = 'Back to Your Activity' }) {
  return <div className="missing"><PageHeading title={title} /><SiteLink className="button" to={to}>{action}<ArrowRight size={15} /></SiteLink></div>
}
