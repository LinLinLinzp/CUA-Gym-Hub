import { useRef, useState } from 'react'
import { Empty } from '../components/Empty.jsx'
import { SiteLink } from '../components/links.jsx'
import { TitleActions } from '../components/TitleActions.jsx'
import { TitleIdentity } from '../components/TitleIdentity.jsx'
import { alphabetic, dateLabel, Heading, matches, recentFirst, SearchField, SelectField } from '../components/ui.jsx'
import { useAccount } from '../state/AccountProvider.jsx'
import { rows, titleLabel } from '../state/selectors.js'

const sorts = [['recent', 'Recently added'], ['title', 'Title']]

export function WishList() {
  const { state, act } = useAccount()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const list = useRef(null)
  const titles = new Map(rows(state, 'titles').map((title) => [title.id, title]))
  const wishes = rows(state, 'wishlist').filter((entry) => entry.status === 'saved')
  const results = wishes.filter((entry) => {
    const title = titles.get(entry.titleId)
    return matches(query, titleLabel(title), title?.author)
  }).sort((left, right) => sort === 'recent' ? recentFirst(left, right)
    : alphabetic(titleLabel(titles.get(left.titleId)), titleLabel(titles.get(right.titleId))))

  function remove(titleId) {
    act({ type: 'remove_wish', titleId })
    requestAnimationFrame(() => list.current?.focus())
  }

  return (
    <section>
      <Heading title="Wish List" action={<SiteLink className="button secondary" to="/browse">Browse audiobooks <span aria-hidden="true">↗</span></SiteLink>}>
        {wishes.length} saved {wishes.length === 1 ? 'audiobook' : 'audiobooks'}
      </Heading>
      <div className="shelf-controls wish-controls">
        <div className="toolbar">
          <SearchField id="wish-search" label="Search Wish List" placeholder="Title or author" value={query} onChange={setQuery} />
          <SelectField id="wish-sort" label="Sort by" value={sort} onChange={setSort} options={sorts} />
        </div>
      </div>
      <h2 className="list-caption" aria-live="polite" tabIndex={-1} ref={list}>
        {results.length} {results.length === 1 ? 'title' : 'titles'}
      </h2>
      {results.length ? (
        <ul className="shelf-list">
          {results.map((entry, index) => {
            const title = titles.get(entry.titleId)
            return (
              <li className="shelf-row wish-row" key={entry.id ?? index}>
                <TitleIdentity title={title} eager={index < 5}>
                  <div className="metadata">{entry.createdAt && <span>Saved {dateLabel(entry.createdAt)}</span>}</div>
                </TitleIdentity>
                <TitleActions title={title} showWish={false} removeWish={entry.titleId ? () => remove(entry.titleId) : undefined} />
              </li>
            )
          })}
        </ul>
      ) : wishes.length ? (
        <Empty title="No matching saved titles" action={<button className="button secondary" onClick={() => setQuery('')}>Clear search</button>} />
      ) : (
        <Empty title="Your Wish List is empty" action={<SiteLink className="button" to="/browse">Browse audiobooks</SiteLink>}>
          Save an audiobook to find it here later.
        </Empty>
      )}
    </section>
  )
}
