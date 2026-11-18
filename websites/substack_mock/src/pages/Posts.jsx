import { useState } from 'react'
import { ArrowUpRight, ChartNoAxesColumn, CalendarX, Copy, MessageCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { AppLink, createArticle, useAppNavigate } from '../components/Shell.jsx'
import { ActionMenu, Badge, Confirm, Empty, Modal, Tabs } from '../components/UI.jsx'
import { deletePost, duplicatePost, postSettings, releasePost, reviewIssue, unschedulePost } from '../state/posts.js'
import { useStore, nameOf } from '../state/Store.jsx'
import { articlePath, array, audienceLabels, count, date, postPath, sortTime } from '../utils/format.js'
import { PostThumb } from './Home.jsx'

const postTabs = [['published', 'Published'], ['drafts', 'Drafts'], ['scheduled', 'Scheduled']]
const dateFields = { published: 'publishedAt', drafts: 'updatedAt', scheduled: 'scheduledAt' }

export default function Posts() {
  const { state } = useStore()
  const navigate = useAppNavigate()
  const [params] = useSearchParams()
  const tab = Object.hasOwn(dateFields, params.get('tab')) ? params.get('tab') : 'published'
  const [search, setSearch] = useState('')
  const [audience, setAudience] = useState('')
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState('')
  const status = tab === 'drafts' ? 'draft' : tab
  const visible = state.posts.filter(post => post.status === status)
  const tags = Array.from(new Set(state.posts.filter(post => post.status !== 'deleted').flatMap(post => array(post.tags)))).sort()
  const results = visible.filter(post =>
    (!audience || post.audience === audience || (!post.audience && audience === 'everyone'))
    && (!tag || array(post.tags).includes(tag))
    && [post.title, post.subtitle].some(text => String(text || '').toLowerCase().includes(search.trim().toLowerCase()))
  ).sort(sortTime(dateFields[tab], sort === 'oldest' || (!sort && tab === 'scheduled')))
  function clearFilters() { setSearch(''); setAudience(''); setTag('') }

  return <div className="page posts-page">
    <div className="page-heading"><h1>Posts</h1><AppLink className="button primary" to={createArticle}><Plus size={16} /> New post</AppLink></div>
    <Tabs label="Post status" value={tab} onChange={value => { setSort(''); navigate(`/publish/posts?tab=${value}`) }}
      items={postTabs.map(([key, label]) => [key, label, state.posts.filter(post => post.status === (key === 'drafts' ? 'draft' : key)).length])} />
    <div className="toolbar post-toolbar">
      <label className="search-field"><Search size={17} /><input type="search" aria-label="Search posts" placeholder="Search posts" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <select aria-label="Filter by audience" value={audience} onChange={event => setAudience(event.target.value)}><option value="">All audiences</option>{Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="Filter by tag" value={tag} onChange={event => setTag(event.target.value)}><option value="">All tags</option>{tags.map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Sort posts" value={sort || (tab === 'scheduled' ? 'oldest' : 'newest')} onChange={event => setSort(event.target.value)}><option value="newest">{tab === 'drafts' ? 'Recently edited' : 'Newest first'}</option><option value="oldest">{tab === 'scheduled' ? 'Soonest first' : 'Oldest first'}</option></select>
    </div>
    {results.length ? <section className="panel posts-list" aria-label={`${status} posts`}>
      {results.map(post => <PostRow post={post} key={post.id} />)}
    </section> : <Empty title={visible.length ? 'No posts match your filters' : `No ${tab === 'drafts' ? 'drafts' : tab + ' posts'}`}
      action={visible.length ? 'Clear filters' : 'Create article'} onAction={clearFilters} to={visible.length ? undefined : createArticle} />}
  </div>
}

function PostRow({ post }) {
  const { state, commit } = useStore()
  const navigate = useAppNavigate()
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const scheduled = post.status === 'scheduled'
  const published = post.status === 'published'
  const displayedDate = published ? post.publishedAt : post.status === 'scheduled' ? post.scheduledAt : post.updatedAt
  function publish() {
    const issue = reviewIssue(post, null)
    if (issue) { setError(issue); return }
    commit(previous => releasePost(previous, post.id, postSettings(post), null), 'Post published')
    setConfirmation('')
  }
  return <div className="post-list-row">
    <AppLink to={published && post.slug ? articlePath(post) : postPath(post)} className="home-post post-row-title">
      <PostThumb post={post} />
      <span><strong>{post.title || 'Untitled'}</strong><small>{nameOf(state, post.authorId)} · {date(displayedDate, post.status === 'scheduled')}</small></span>
    </AppLink>
    <div className="post-row-audience"><Badge tone={post.audience === 'paid' || post.audience === 'founding' ? 'paid' : ''}>{audienceLabels[post.audience] || 'Everyone'}</Badge></div>
    {published && <div className="post-row-metrics">
      <span><strong>{count(post.metrics?.views)}</strong><small>Views</small></span>
      <span><strong>{openRate(post.metrics)}</strong><small>Opened</small></span>
      <span><strong>{count(post.metrics?.newSubscribers)}</strong><small>New subs</small></span>
    </div>}
    <ActionMenu label={`Actions for ${post.title || 'Untitled'}`}>
      <AppLink to={postPath(post)}><Pencil size={15} /> Edit post</AppLink>
      <AppLink to={postPath(post, 'preview')}><ArrowUpRight size={15} /> Preview</AppLink>
      {published && post.slug && <AppLink to={articlePath(post) + '#comments'}><MessageCircle size={15} /> View comments</AppLink>}
      {published && <button onClick={() => setConfirmation('metrics')}><ChartNoAxesColumn size={15} /> View metrics</button>}
      {scheduled && <>
        <button onClick={() => { setError(''); setConfirmation('publish') }}><ArrowUpRight size={15} /> Publish now</button>
        <button onClick={() => setConfirmation('unschedule')}><CalendarX size={15} /> Unschedule</button>
      </>}
      <button onClick={() => {
        if (commit(previous => duplicatePost(previous, post.id), 'Copy saved to Drafts')) navigate('/publish/posts?tab=drafts')
      }}><Copy size={15} /> Duplicate to drafts</button>
      <hr />
      <button className="destructive" onClick={() => setConfirmation('delete')}><Trash2 size={15} /> Delete</button>
    </ActionMenu>
    {confirmation === 'metrics' && <PostMetrics post={post} onClose={() => setConfirmation('')} />}
    {confirmation === 'delete' && <Confirm title="Delete post?" label="Delete post" danger onClose={() => setConfirmation('')} onConfirm={() => {
      commit(previous => deletePost(previous, post.id), 'Post deleted')
      setConfirmation('')
    }}><p>Delete “{post.title || 'Untitled'}”? It will be removed from the workspace and publication.</p></Confirm>}
    {confirmation === 'publish' && <Confirm title="Publish now?" label="Publish now" onClose={() => setConfirmation('')} onConfirm={publish}>
      <p>Publish “{post.title || 'Untitled'}” immediately.</p>
      {error && <p className="field-error" role="alert">{error}</p>}
    </Confirm>}
    {confirmation === 'unschedule' && <Confirm title="Unschedule post?" label="Unschedule" onClose={() => setConfirmation('')} onConfirm={() => {
      commit(previous => unschedulePost(previous, post.id), 'Post moved to Drafts')
      setConfirmation('')
    }}><p>Move “{post.title || 'Untitled'}” back to Drafts.</p></Confirm>}
  </div>
}


function openRate(metrics) {
  return metrics?.opens == null || !(metrics.recipients > 0) ? '—' : `${Math.round(metrics.opens * 100 / metrics.recipients)}%`
}

function PostMetrics({ post, onClose }) {
  const data = [
    ['Views', count(post.metrics?.views)],
    ['Recipients', count(post.metrics?.recipients)],
    ['Opens', count(post.metrics?.opens)],
    ['Open rate', openRate(post.metrics)],
    ['New subscribers', count(post.metrics?.newSubscribers)],
  ]
  return <Modal title="Post metrics" onClose={onClose} footer={<button className="button" onClick={onClose}>Done</button>}>
    <h3>{post.title || 'Untitled'}</h3>
    <p className="muted">Published {date(post.publishedAt)}</p>
    <dl className="detail-fields">{data.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </Modal>
}
