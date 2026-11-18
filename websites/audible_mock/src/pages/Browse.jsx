import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Empty } from '../components/Empty.jsx'
import { SiteLink, titlePath } from '../components/links.jsx'
import { TitleActions } from '../components/TitleActions.jsx'
import { Cover, Heading, matches, SearchField } from '../components/ui.jsx'
import { useAccount } from '../state/AccountProvider.jsx'
import { rows, titleLabel } from '../state/selectors.js'

export function Browse() {
  const { state } = useAccount()
  const [params] = useSearchParams()
  const fromSearch = params.get('q') || ''
  const [query, setQuery] = useState(fromSearch)
  useEffect(() => setQuery(fromSearch), [fromSearch])
  const titles = rows(state, 'titles')
  const results = titles.filter((title) => matches(query, title.title, title.author, title.narrator, title.genre))

  return (
    <section>
      <Heading title="Browse">Find your next audiobook.</Heading>
      <div className="catalog-controls">
        <SearchField id="browse-search" label="Search audiobooks" placeholder="Title, author, narrator, or genre" value={query} onChange={setQuery} />
      </div>
      <h2 className="list-caption" aria-live="polite">{results.length} {results.length === 1 ? 'title' : 'titles'}</h2>
      {results.length ? (
        <ul className="catalog-grid">
          {results.map((title, index) => (
            <li className="catalog-card" key={title.id ?? index}>
              {title.id
                ? <SiteLink to={titlePath(title.id)} className="catalog-title">
                    <Cover title={title} large eager={index < 6} />
                    <span className="row-title">{titleLabel(title)}</span>
                  </SiteLink>
                : <div className="catalog-title"><Cover title={title} large /><strong>{titleLabel(title)}</strong></div>}
              {title.author && <span className="catalog-author">{title.author}</span>}
              <TitleActions title={title} compact />
            </li>
          ))}
        </ul>
      ) : titles.length ? (
        <Empty title="No matching audiobooks" action={<button className="button secondary" onClick={() => setQuery('')}>Clear search</button>}>
          Try a different title, author, narrator, or genre.
        </Empty>
      ) : <Empty title="No audiobooks available" action={<SiteLink className="button" to="/library">Back to Library</SiteLink>} />}
    </section>
  )
}
