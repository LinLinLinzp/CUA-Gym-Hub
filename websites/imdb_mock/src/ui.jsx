import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUp, Bookmark, Check, Film, Search } from 'lucide-react'
import { genresOf, matchesTitle, scoreLabel, textOrder, titleName, typeNames } from './catalog.js'
import { useAccount } from './store.jsx'
import { withSid } from './utils/dataManager.js'

export function SiteLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export const titlePath = (id) => '/title/' + encodeURIComponent(id)
export const listPath = (id) => '/list/' + encodeURIComponent(id)
export const browsePath = '/search'
export const titleCount = (count) => count + (count === 1 ? ' title' : ' titles')

export function Poster({ title, className = '' }) {
  const [failed, setFailed] = useState(null)
  const candidate = title?.posterPath
  const src = typeof candidate === 'string' && /^\/(?![/\\])[^\\\t\r\n]*$/.test(candidate) ? candidate : null
  const initials = title?.name?.split(/\s+/).slice(0, 3).map((word) => word[0]).join('') || ''
  return <div className={'poster ' + className} aria-hidden="true">
    {src && failed !== src
      ? <img src={src} alt="" loading="lazy" onError={() => setFailed(src)} />
      : <div className="poster-fallback"><Film size={19} />{initials && <span>{initials}</span>}</div>}
  </div>
}

export function ListCover({ rows, titleById }) {
  const title = rows.map((row) => titleById.get(row.titleId)).find(Boolean)
  return <Poster title={title} />
}

export function TitleMeta({ title }) {
  if (!title) return <span className="meta">Catalog entry unavailable</span>
  const values = [title.year, typeNames[title.type] || title.type, ...genresOf(title)].filter(Boolean)
  return values.length > 0 && <span className="meta">{values.join(' · ')}</span>
}

export function WatchButton({ title, compact = false }) {
  const { watchByTitle, dispatch } = useAccount()
  const membership = watchByTitle.get(title.id)
  const selected = Boolean(membership)
  const label = selected ? 'In Watchlist' : compact ? 'Watchlist' : 'Add to Watchlist'
  return <button type="button" className={'button watch-button' + (selected ? ' selected' : '')}
    aria-pressed={selected} aria-label={selected ? 'Remove from Watchlist' : 'Add to Watchlist'}
    onClick={() => dispatch(selected ? { type: 'watchlist.remove', membershipId: membership.id } : { type: 'watchlist.add', titleId: title.id })}>
    {selected ? <Check size={16} /> : <Bookmark size={16} />}{label}
  </button>
}

export function Empty({ title, children, to, action }) {
  return <div className="empty"><div className="empty-icon"><Film size={21} /></div><h2>{title}</h2>
    {children && <p>{children}</p>}
    {to && <SiteLink className="button" to={to}>{action}<ArrowRight size={15} /></SiteLink>}
  </div>
}

export function PageHeading({ title, children, actions }) {
  return <header className="page-heading">
    <div><h1>{title}</h1>{children && <div className="heading-detail">{children}</div>}</div>
    {actions && <div className="heading-actions">{actions}</div>}
  </header>
}

export function SectionHeading({ title, to, action }) {
  return <div className="section-heading"><h2>{title}</h2>
    {to && <SiteLink className="text-link" to={to}>{action}<ArrowRight size={15} /></SiteLink>}</div>
}

export function SearchField({ label, value, onChange, placeholder }) {
  return <label className="field search-field">
    <span>{label}</span><span className="input-icon"><Search size={17} aria-hidden="true" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </span>
  </label>
}

export function SelectField({ label, value, onChange, children }) {
  const labelId = useId()
  return <label className="field"><span id={labelId}>{label}</span>
    <select aria-labelledby={labelId} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
  </label>
}

export function Visibility({ value, onChange }) {
  return <SelectField label="Visibility" value={value || 'private'} onChange={onChange}>
    <option value="private">Private</option><option value="public">Public</option>
  </SelectField>
}

export function TitleRow({ title, children, note, compact = false }) {
  return <li className={'title-row' + (compact ? ' compact' : '')}>
    <Poster title={title} />
    <div className="row-copy">
      {title ? <SiteLink className="row-title" to={titlePath(title.id)}>{titleName(title)}</SiteLink> : <strong className="row-title">{titleName(title)}</strong>}
      <TitleMeta title={title} />
      {note && <div className="row-note">{note}</div>}
    </div>
    {children && <div className="row-actions">{children}</div>}
  </li>
}

const sortOptions = {
  custom: 'Custom order', added: 'Date added', rated: 'Recently rated', title: 'Title',
  year: 'Release year', aggregate: 'IMDb score', personal: 'Your score',
}
const highFirst = (a, b) => (Number.isFinite(b) ? b : -Infinity) - (Number.isFinite(a) ? a : -Infinity)
const sortRows = {
  added: (a, b) => textOrder(b.row.createdAt, a.row.createdAt),
  rated: (a, b) => textOrder(b.row.updatedAt || b.row.createdAt, a.row.updatedAt || a.row.createdAt),
  title: (a, b) => Number(!a.title) - Number(!b.title) || textOrder(titleName(a.title), titleName(b.title)),
  year: (a, b) => highFirst(a.title?.year, b.title?.year),
  aggregate: (a, b) => highFirst(a.title?.imdbRating, b.title?.imdbRating),
  personal: (a, b) => highFirst(a.row.value, b.row.value),
}

export function CollectionBrowser({ rows, sorts, renderRow, empty, options }) {
  const { titleById } = useAccount()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [genre, setGenre] = useState('')
  const [sort, setSort] = useState(sorts[0])
  const [descending, setDescending] = useState(true)
  const [compact, setCompact] = useState(false)
  const joined = rows.map((row) => ({ row, title: titleById.get(row.titleId) }))
  const genres = [...new Set([genre, ...joined.flatMap(({ title }) => genresOf(title))])].filter(Boolean).sort(textOrder)
  const types = [...new Set([type, ...joined.map(({ title }) => title?.type)])].filter(Boolean)
  const filtered = joined.filter(({ title }) => matchesTitle(title, query)
    && (!type || title?.type === type) && (!genre || genresOf(title).includes(genre)))
  if (sortRows[sort]) {
    const key = { added: (x) => x.row.createdAt, rated: (x) => x.row.updatedAt || x.row.createdAt,
      title: (x) => x.title, year: (x) => x.title?.year, aggregate: (x) => x.title?.imdbRating, personal: (x) => x.row.value }[sort]
    filtered.sort((a, b) => Number(key(a) == null) - Number(key(b) == null)
      || (descending ? 1 : -1) * sortRows[sort](a, b) || textOrder(a.row.id, b.row.id))
  }
  const reverse = sort === 'title' ? !descending : descending
  return <>
    <div className="tools">
      <SearchField label="Filter by title" value={query} onChange={setQuery} placeholder="Search this collection" />
      <SelectField label="Type" value={type} onChange={setType}><option value="">All types</option>
        {types.map((key) => <option key={key} value={key}>{typeNames[key] || key}</option>)}
      </SelectField>
      <SelectField label="Genre" value={genre} onChange={setGenre}><option value="">All genres</option>
        {genres.map((key) => <option key={key}>{key}</option>)}
      </SelectField>
      <SelectField label="Sort by" value={sort} onChange={(value) => { setSort(value); setDescending(true) }}>
        {sorts.map((key) => <option key={key} value={key}>{sortOptions[key]}</option>)}
      </SelectField>
      {sort !== 'custom' && <button className="button icon-button" type="button" aria-label="Reverse sort order" title="Reverse sort order"
        onClick={() => setDescending(!descending)}>{reverse ? <ArrowDown size={17} /> : <ArrowUp size={17} />}</button>}
      {options}
    </div>
    <div className="results-bar"><p aria-live="polite">{titleCount(filtered.length)}{filtered.length !== rows.length ? ' of ' + rows.length : ''}</p>
      <SelectField label="View" value={compact ? 'compact' : 'detailed'} onChange={(value) => setCompact(value === 'compact')}>
        <option value="detailed">Detailed</option><option value="compact">Compact</option>
      </SelectField>
    </div>
    {rows.length === 0 ? empty : filtered.length === 0 ? <Empty title="No matching titles">Try changing the title, type, or genre filters.</Empty>
      : <ul className="row-list">{filtered.map(({ row, title }) => renderRow(row, title, compact))}</ul>}
  </>
}

export function Aggregate({ title }) {
  return <span className="aggregate"><span aria-hidden="true">★</span> IMDb {scoreLabel(title?.imdbRating)}</span>
}
