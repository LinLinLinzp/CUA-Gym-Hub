import { articlePath, contributorName, dateLabel } from '../data/records.js'
import { sourceSections } from '../data/source.js'
import { watchActivity } from '../data/activity.js'
import { ButtonLink, SiteLink, useQuery } from '../navigation.jsx'
import { useWorkspace } from '../workspace.js'

const byTitle = (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)

function ArticleRows({ articles, empty }) {
  if (!articles.length) return <p className="metadata">{empty}</p>
  return <ul className="ruled">{articles.map(article => {
    const intro = sourceSections(article.body ?? '')[0].text.trim()
    const excerpt = intro.split('\n\n')[0]
    return <li key={article.id}>
      <div className="align-row">
        <SiteLink to={articlePath(article)}>{article.title}</SiteLink>
        {article.category && <span className="pill">{article.category}</span>}
      </div>
      {excerpt && <div className="metadata">{excerpt.length > 145 ? excerpt.slice(0, 142).trimEnd() + '…' : excerpt}</div>}
    </li>
  })}</ul>
}

export function ActivityRows({ rows }) {
  const { state } = useWorkspace()
  return <ul className="ruled">{rows.map(item => <li key={item.kind + '-' + item.id}>
    <div className="align-row">
      <SiteLink to={item.href}>{item.article.title}</SiteLink>
      <span className="pill">{item.kind === 'edit' ? 'Article edit' : 'Talk comment'}</span>
    </div>
    <div>{item.label}</div>
    <div className="metadata">{contributorName(state, item.actorId)} · {dateLabel(item.createdAt)}</div>
  </li>)}</ul>
}

export function Home() {
  const { state } = useWorkspace()
  const articles = [...state.articles].sort(byTitle).slice(0, 5)
  const activity = watchActivity(state).slice(0, 4)
  return <>
    <section className="hero">
      <div>
        <h1>Contributor workspace</h1>
        <p>Explore the article collection, revise a page, or follow a conversation on your watchlist.</p>
        <ButtonLink to="/articles" primary>Browse articles</ButtonLink>
      </div>
      <div className="reading-desk-art" aria-hidden="true" />
    </section>
    <div className="home-panels">
      <section className="paper">
        <div className="panel-heading"><h2>Article index</h2><SiteLink to="/articles">All articles</SiteLink></div>
        <ArticleRows articles={articles} empty="No articles are available." />
      </section>
      <section className="paper">
        <div className="panel-heading"><h2>Watchlist activity</h2><SiteLink to="/watchlist">View watchlist</SiteLink></div>
        {activity.length ? <ActivityRows rows={activity} /> : <p className="metadata">No changes on watched pages yet.</p>}
      </section>
    </div>
  </>
}

export function Catalog() {
  const { state } = useWorkspace()
  const [params, setQuery] = useQuery()
  const query = (params.get('q') ?? '').trim().toLowerCase()
  const category = params.get('topic') ?? ''
  const descending = params.get('sort') === 'desc'
  const topics = [...new Set(state.articles.map(article => article.category).filter(Boolean))].sort()
  const filtered = state.articles.filter(article => (!category || article.category === category)
    && [article.title, article.category, article.body].some(value => (value ?? '').toLowerCase().includes(query)))
    .sort(descending ? (a, b) => byTitle(b, a) : byTitle)
  return <>
    <div className="page-heading"><h1>Articles</h1></div>
    <section className="paper">
      <div className="filters">
        <label className="field">Topic
          <select aria-label="Topic" value={category} onChange={event => setQuery({ topic: event.target.value })}>
            <option value="">All topics</option>
            {category && !topics.includes(category) && <option value={category}>{category}</option>}
            {topics.map(topic => <option key={topic}>{topic}</option>)}
          </select>
        </label>
        <label className="field">Sort by
          <select aria-label="Sort by" value={descending ? 'desc' : ''} onChange={event => setQuery({ sort: event.target.value })}>
            <option value="">Title (A–Z)</option><option value="desc">Title (Z–A)</option>
          </select>
        </label>
        {(query || category) && <ButtonLink to="/articles">Clear filters</ButtonLink>}
      </div>
      <p className="metadata" role="status">{filtered.length} {filtered.length === 1 ? 'article' : 'articles'}{query && ' for “' + params.get('q') + '”'}</p>
      <ArticleRows articles={filtered} empty="No articles match your search." />
    </section>
  </>
}
