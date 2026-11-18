import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Avatar, Missing } from './ui.jsx'
import { SiteLink, useWorkspace } from './workspace.jsx'
import { Posts, PostEditor } from './pages/Posts.jsx'
import { Tiers, TierEditor } from './pages/Tiers.jsx'
import { Members, MemberDetail } from './pages/Members.jsx'
import { Messages } from './pages/Messages.jsx'

const sections = ['Posts', 'Tiers', 'Members', 'Messages']

export default function App() {
  const { state } = useWorkspace()
  const { pathname } = useLocation()
  const { name, publicationName } = state.creator ?? {}
  return <>
    <a className="skip-link" href="#workspace">Skip to content</a>
    <header className="masthead">
      <div className="masthead-inner">
        <SiteLink className="wordmark" to="/">Patreon</SiteLink>
        {publicationName && <span className="publication">{publicationName}</span>}
        <div className="identity"><Avatar name={name} /><span>{name || 'Creator'}</span></div>
      </div>
      <nav className="section-nav" aria-label="Creator workspace">
        <div className="nav-inner">
          {sections.map(section => <SiteLink key={section} nav to={section === 'Posts' && pathname === '/' ? '/' : `/${section.toLowerCase()}`}
            className={({ isActive }) => isActive ? 'section-link current' : 'section-link'}>{section}</SiteLink>)}
        </div>
      </nav>
    </header>
    <main id="workspace" className="workspace">
      <Routes>
        <Route index element={<Posts />} />
        <Route path="posts" element={<Posts />} />
        <Route path="posts/new" element={<PostEditor />} />
        <Route path="posts/:postId" element={<PostEditor />} />
        <Route path="tiers" element={<Tiers />} />
        <Route path="tiers/new" element={<TierEditor />} />
        <Route path="tiers/:tierId" element={<TierEditor />} />
        <Route path="members" element={<Members />} />
        <Route path="members/:memberId" element={<MemberDetail />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:threadId" element={<Messages />} />
        <Route path="*" element={<Missing />} />
      </Routes>
    </main>
  </>
}


