import { ArrowDownRight, ArrowRight, BookOpen, FileText, Plus, Users } from 'lucide-react'
import { AppLink, createArticle } from '../components/Shell.jsx'
import { useStore, nameOf } from '../state/Store.jsx'
import { accessFor, relevantGrant } from '../state/access.js'
import { articlePath, count, date, postPath, sortTime } from '../utils/format.js'

const postsPath = '/publish/posts'

export function PostThumb({ post }) {
  const source = typeof post.thumbnailPath === 'string' && /^\/(?![\\/])/.test(post.thumbnailPath) ? post.thumbnailPath : null
  return source
    ? <img className="post-thumb" src={source} alt="" />
    : <span className="post-thumb thumb-empty" aria-hidden="true"><FileText size={18} /></span>
}

export default function Home() {
  const { state } = useStore()
  const now = new Date()
  const subscribers = state.subscribers.filter(subscriber => subscriber.status === 'active')
  const paid = subscribers.filter(subscriber => accessFor(subscriber, relevantGrant(state.compSubscriptions, subscriber.id, now), now).paid)
  const published = state.posts.filter(post => post.status === 'published').sort(sortTime('publishedAt'))
  const drafts = state.posts.filter(post => post.status === 'draft').sort(sortTime('updatedAt'))
  const stats = [
    { label: 'Active subscribers', value: subscribers.length, icon: Users, path: '/publish/subscribers' },
    { label: 'Paid access', value: paid.length, icon: BookmarkIcon, path: '/publish/subscribers?access=access' },
    { label: 'Published posts', value: published.length, icon: BookOpen, path: postsPath },
  ]
  return <div className="page home-page">
    <div className="page-heading">
      <h1>Home</h1>
      <AppLink className="button primary" to={createArticle}><Plus size={16} /> New post</AppLink>
    </div>
    <section className="stats-band" aria-label="Publication summary">
      {stats.map(({ label, value, icon: Icon, path }) => <AppLink to={path} className="stat" key={label}>
        <span className="stat-top"><span><Icon size={16} /> {label}</span><ArrowDownRight size={15} /></span>
        <strong>{count(value)}</strong>
      </AppLink>)}
    </section>
    <div className="home-content">
      <section className="panel home-panel">
        <div className="section-heading"><h2>Recent posts</h2><AppLink to={postsPath}>View all <ArrowRight size={14} /></AppLink></div>
        {published.length ? <ul className="home-list">{published.slice(0, 6).map(post => <li key={post.id}>
          <AppLink to={articlePath(post)} className="home-post"><PostThumb post={post} /><span><strong>{post.title || 'Untitled'}</strong><small>{nameOf(state, post.authorId)} · {date(post.publishedAt)}</small></span></AppLink>
          <span className="home-metric">{post.metrics?.views == null ? '—' : `${count(post.metrics.views)} views`}</span>
        </li>)}</ul> : <p className="panel-empty">No published posts yet.</p>}
      </section>
      <section className="panel home-panel">
        <div className="section-heading"><h2>Drafts</h2><AppLink to={`${postsPath}?tab=drafts`}>View all <ArrowRight size={14} /></AppLink></div>
        {drafts.length ? <ul className="home-list draft-list">{drafts.slice(0, 5).map(post => <li key={post.id}>
          <AppLink to={postPath(post)} className="home-post"><span><strong>{post.title || 'Untitled'}</strong><small>Edited {date(post.updatedAt)}</small></span><ArrowRight size={15} /></AppLink>
        </li>)}</ul> : <p className="panel-empty">No drafts yet.</p>}
        <div className="home-panel-footer"><AppLink to={createArticle}><Plus size={15} /> Start a draft</AppLink></div>
      </section>
    </div>
  </div>
}

function BookmarkIcon(props) { return <span aria-hidden="true" className="paid-mark" style={{ width: props.size }}>◆</span> }
