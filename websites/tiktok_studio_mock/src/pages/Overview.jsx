import { useStudio } from '../context/StudioContext.jsx'
import { Cover, Empty, PageHeading, SectionTitle, Status, StudioLink, Trend } from '../components/ui.jsx'
import { activeDraft, actor, creatorReplies, dateKey, dateLabel, isAudienceComment, items, number, shortNumber } from '../utils/view.js'

export default function Overview() {
  const { state } = useStudio()
  const posts = items(state.posts)
  const published = posts.filter((post) => post.status === 'published').sort((a, b) => dateKey(b.publishedAt || b.createdAt).localeCompare(dateKey(a.publishedAt || a.createdAt)))
  const drafts = items(state.drafts).filter(activeDraft).sort((a, b) => dateKey(b.updatedAt).localeCompare(dateKey(a.updatedAt)))
  const comments = items(state.comments)
  const creatorId = actor(state)
  const replies = creatorReplies(comments, creatorId)
  const unanswered = comments.filter((comment) => isAudienceComment(comment, creatorId) && !replies.has(comment.id)).sort((a, b) => dateKey(b.createdAt).localeCompare(dateKey(a.createdAt)))
  const samples = items(state.analyticsSamples).filter((sample) => !sample.postId && /^\d{4}-\d{2}-\d{2}$/.test(sample.date) && Number.isFinite(Date.parse(sample.date)))
    .sort((a, b) => a.date.localeCompare(b.date))
  const dates = [...new Set(samples.map((sample) => sample.date))].slice(-14)
  const recent = samples.filter((sample) => dates.includes(sample.date))
  const views = recent.reduce((sum, sample) => sum + number(sample.views), 0)
  const lastDraft = drafts[0]
  return <>
    <PageHeading title="Overview" description={state.account?.workspaceName || 'Your creator workspace'} />
    <div className="overview-grid">
      <section className="card performance">
        <SectionTitle title="Account performance" to="/analytics" link="View analytics" />
        <div className="overview-figure"><strong>{shortNumber(views)}</strong><span>Post views</span></div>
        <p className="meta">{dates.length ? `${dateLabel(dates[0], { year: undefined, timeZone: 'UTC' })} – ${dateLabel(dates.at(-1), { timeZone: 'UTC' })}` : 'No analytics samples yet'}</p>
        <Trend rows={recent} metric="views" label="Post views" compact />
      </section>
      <section className="card work-in-progress">
        <SectionTitle title="Drafts in progress" to="/drafts" link="View drafts" />
        {lastDraft ? <>
          <StudioLink className="feature-cover-link" to={`/drafts/${encodeURIComponent(lastDraft.id)}/edit`} aria-label="Open most recent draft"><Cover url={lastDraft.coverUrl} className="feature-cover" /></StudioLink>
          <p className="feature-caption">{lastDraft.caption || 'Untitled draft'}</p>
          <p className="meta">{drafts.length} active {drafts.length === 1 ? 'draft' : 'drafts'} · Latest saved {dateLabel(lastDraft.updatedAt)}</p>
        </> : <Empty title="No drafts in progress" icon="drafts">Saved work will appear here.</Empty>}
      </section>
      <section className="card recent-posts">
        <SectionTitle title="Recent posts" to="/posts" link="View posts" />
        {published.length ? published.slice(0, 3).map((post) => <div className="mini-row" key={post.id}>
          <Cover className="mini-cover" url={post.coverUrl} /><div><StudioLink className="row-title" to={`/posts/${encodeURIComponent(post.id)}/edit`}>{post.caption || 'Untitled post'}</StudioLink><span className="meta">{dateLabel(post.publishedAt || post.createdAt)}</span></div>
          <Status status="published" />
        </div>) : <Empty title="No published posts">New publications will appear here.</Empty>}
      </section>
      <section className="card recent-comments">
        <SectionTitle title="Awaiting a reply" to="/comments?reply=unanswered" link="View comments" />
        {unanswered.length ? unanswered.slice(0, 3).map((comment) => <div className="mini-row" key={comment.id}>
          <span className="comment-marker" /><div><strong>{comment.authorName || 'Viewer'}</strong><p>{comment.body || 'Comment unavailable'}</p></div>
        </div>) : <Empty title="You’re caught up" icon="comments">Unanswered comments will appear here.</Empty>}
      </section>
    </div>
  </>
}
