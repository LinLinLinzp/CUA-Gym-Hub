import React from 'react'
import { ArrowRight, File, FileText, Images, MessageSquare } from 'lucide-react'
import { commentsPath, editorPath, listPath, mediaPath, newPath, routePath, SiteLink } from '../utils/navigation.jsx'
import { StatusPill } from '../components/Controls.jsx'
import { contentDate, contentFor, displayDate, rows, titleOf } from '../utils/display.js'

export default function Dashboard({ state }) {
  const posts = rows(state.posts)
  const pages = rows(state.pages)
  const pending = rows(state.comments).filter((item) => item.status === 'pending')
  const summary = [
    { label: 'Published posts', icon: FileText, value: posts.filter((row) => row.status === 'published').length, to: listPath('post', 'published') },
    { label: 'Published pages', icon: File, value: pages.filter((row) => row.status === 'published').length, to: listPath('page', 'published') },
    { label: 'Media files', icon: Images, value: rows(state.media).length, to: mediaPath },
    { label: 'Pending comments', icon: MessageSquare, value: pending.length, to: routePath(commentsPath, { comment_status: 'pending' }) },
  ]
  const recent = [...posts, ...pages].filter((row) => row.status !== 'trash').sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')).slice(0, 6)
  const review = [...pending].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4)
  return (
    <div className="dashboard">
      <section className="dashboard-intro">
        <div>
          <h1>{state.site?.name || 'Dashboard'}</h1>
          {state.site?.tagline && <p>{state.site.tagline}</p>}
          <SiteLink to={newPath('post')} className="button primary"><FileText size={16} /> Write a post</SiteLink>
        </div>
        <div className="intro-image" aria-hidden="true" />
      </section>
      <div className="summary-grid">
        {summary.map(({ label, icon: Icon, value, to }) => <SiteLink key={label} to={to} className="summary-card">
          <span className="summary-icon"><Icon size={19} aria-hidden="true" /></span>
          <span className="summary-data"><strong>{value}</strong><span>{label}</span></span>
          <ArrowRight size={16} className="summary-arrow" aria-hidden="true" />
        </SiteLink>)}
      </div>
      <div className="dashboard-columns">
        <section className="card recent-card">
          <div className="card-header"><h2>Recent content</h2><SiteLink to={listPath('post')}>View posts <ArrowRight size={14} /></SiteLink></div>
          {recent.length === 0 ? <p className="muted">No content yet.</p> : <ul className="activity-list">
            {recent.map((item) => <li key={item.id}><div><SiteLink className="record-title" to={editorPath(item.id)}>{titleOf(item)}</SiteLink><div className="meta">{displayDate(contentDate(item))}</div></div><StatusPill status={item.status} /></li>)}
          </ul>}
        </section>
        <section className="card recent-card">
          <div className="card-header"><h2>Needs moderation</h2><SiteLink to={routePath(commentsPath, { comment_status: 'pending' })}>View queue <ArrowRight size={14} /></SiteLink></div>
          {review.length === 0 ? <p className="muted">No comments awaiting moderation.</p> : <ul className="activity-list">
            {review.map((item) => <li key={item.id}><div className="dashboard-comment">
              <SiteLink className="record-title" to={routePath(commentsPath, { comment_status: 'pending', ...(item.contentId ? { contentId: item.contentId } : {}) })}>{item.authorName || 'Guest'}</SiteLink>
              <div className="meta">{contentFor(state, item.contentType, item.contentId)?.title || 'Content unavailable'}</div>
              {item.body && <p>{item.body}</p>}
            </div><span className="meta nowrap">{displayDate(item.createdAt)}</span></li>)}
          </ul>}
        </section>
      </div>
    </div>
  )
}
