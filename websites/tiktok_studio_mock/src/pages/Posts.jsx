import { useState } from 'react'
import { useStudio } from '../context/StudioContext.jsx'
import { ConfirmDialog, Cover, Empty, Icon, PageHeading, Pagination, Search, Select, Status, StudioLink, usePagination } from '../components/ui.jsx'
import { metadata, updateRecord } from '../utils/changes.js'
import { audienceNames, dateKey, dateLabel, formatNumber, items, number, postDate, queryMatch } from '../utils/view.js'

export default function Posts() {
  const { state, commit, notify } = useStudio()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [audience, setAudience] = useState('all')
  const [sort, setSort] = useState('newest')
  const [removing, setRemoving] = useState(null)
  const records = items(state.posts).filter((post) => post.status !== 'deleted' &&
    (status === 'all' || post.status === status) && (audience === 'all' || post.visibility === audience) && queryMatch(query, post.caption))
  records.sort((left, right) => {
    if (sort === 'views') return number(right.metrics?.views) - number(left.metrics?.views)
    const order = dateKey(postDate(right)).localeCompare(dateKey(postDate(left)))
    return sort === 'oldest' ? -order : order
  })
  const pagination = usePagination(records, JSON.stringify([query, status, audience, sort]))

  function remove() {
    const timestamp = new Date().toISOString()
    const saved = commit((current) => updateRecord(current, 'posts', removing.id, (post) => post.status !== 'deleted', {
      status: 'deleted', deletedAt: timestamp, ...metadata(current, timestamp),
    }))
    if (saved) notify(removing.status === 'scheduled' ? 'Scheduled post canceled.' : 'Post deleted.')
    setRemoving(null)
  }

  return <>
    <PageHeading title="Posts" description="Manage your published videos and upcoming schedule.">
      <StudioLink className="button primary" to="/create"><Icon name="plus" />New post</StudioLink>
    </PageHeading>
    <section className="card posts-card" aria-label="Posts library">
      <div className="toolbar">
        <Search label="Search posts" placeholder="Search captions or hashtags" value={query} onChange={setQuery} />
        <Select label="Status" value={status} onChange={setStatus}><option value="all">All statuses</option><option value="published">Published</option><option value="scheduled">Scheduled</option></Select>
        <Select label="Audience" value={audience} onChange={setAudience}><option value="all">All audiences</option>{Object.entries(audienceNames).map(([id, title]) => <option value={id} key={id}>{title}</option>)}</Select>
        <Select label="Sort by" value={sort} onChange={setSort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="views">Most views</option></Select>
      </div>
      {records.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Posts table">
        <table className="posts-table"><thead><tr><th>Video</th><th>Status & date</th><th>Audience</th><th>Views</th><th>Likes</th><th>Comments</th><th>Shares</th><th>Actions</th></tr></thead>
          <tbody>{pagination.rows.map((post) => <tr key={post.id}>
            <td><div className="post-cell"><Cover className="post-cover" url={post.coverUrl} /><strong>{post.caption || 'Untitled post'}</strong></div></td>
            <td><Status status={post.status} /><span className="meta post-date">{dateLabel(postDate(post), post.status === 'scheduled' ? { hour: 'numeric', minute: '2-digit' } : {})}</span></td>
            <td>{audienceNames[post.visibility] || 'Unspecified'}</td>
            {['views', 'likes', 'comments', 'shares'].map((metric) => <td key={metric}>{formatNumber(post.metrics?.[metric])}</td>)}
            <td><div className="table-actions">
              {post.status === 'published' && <><StudioLink className="text-link" to={`/posts/${encodeURIComponent(post.id)}/edit`}>Edit</StudioLink><StudioLink className="text-link" to={`/analytics/posts/${encodeURIComponent(post.id)}`}>Analytics</StudioLink></>}
              <button type="button" className="text-button danger-text" onClick={() => setRemoving(post)}>{post.status === 'scheduled' ? 'Cancel schedule' : 'Delete'}</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div> : <Empty title="No matching posts">Try another search or change the filters.</Empty>}
      <Pagination {...pagination} noun="posts" />
    </section>
    {removing && <ConfirmDialog title={removing.status === 'scheduled' ? 'Cancel scheduled post?' : 'Delete this post?'} close={() => setRemoving(null)} confirm={remove} action={removing.status === 'scheduled' ? 'Cancel schedule' : 'Delete post'}>
      {removing.status === 'scheduled' ? 'This video will be removed from your publishing schedule.' : 'This video will be removed from your posts.'}
    </ConfirmDialog>}
  </>
}
