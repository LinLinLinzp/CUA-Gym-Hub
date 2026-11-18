import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Icon, Missing, StudioLink } from './components/ui.jsx'
import { openSession, StudioProvider, useStudio } from './context/StudioContext.jsx'
import { getSessionId } from './utils/dataManager.js'
import { handle, initials, localUrl } from './utils/view.js'
import Overview from './pages/Overview.jsx'
import Posts from './pages/Posts.jsx'
import Drafts from './pages/Drafts.jsx'
import Composer from './pages/Composer.jsx'
import Comments from './pages/Comments.jsx'
import Analytics from './pages/Analytics.jsx'

const navigation = [
  ['Overview', '/', 'overview'], ['Posts', '/posts', 'posts'], ['Drafts', '/drafts', 'drafts'],
  ['Comments', '/comments', 'comments'], ['Analytics', '/analytics', 'analytics'],
]

function Account({ account }) {
  const [broken, setBroken] = useState(false)
  const avatar = localUrl(account?.avatarUrl)
  return <div className="account" title={account?.displayName || 'Creator account'}>
    <span className="avatar">{avatar && !broken ? <img src={avatar} alt="" onError={() => setBroken(true)} /> : initials(account?.displayName)}</span>
    <span><strong>{account?.displayName || 'Creator'}</strong>{account?.handle && <small>{handle(account.handle)}</small>}</span>
  </div>
}

function Layout() {
  const { state } = useStudio()
  return <>
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <header className="masthead"><div className="masthead-inner">
      <StudioLink to="/" className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>TikTok Studio</StudioLink>
      <nav aria-label="Workspace navigation">{navigation.map(([label, to, icon]) => <StudioLink nav key={to} to={to} end={to === '/'}><Icon name={icon} size={17} />{label}</StudioLink>)}</nav>
      <div className="masthead-actions"><Account account={state.account} /><StudioLink className="button new-post" to="/create"><Icon name="plus" />New post</StudioLink></div>
    </div></header>
    <main className="workspace" id="workspace" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/:postId/edit" element={<Composer kind="post" />} />
        <Route path="/drafts" element={<Drafts />} />
        <Route path="/drafts/:draftId/edit" element={<Composer kind="draft" />} />
        <Route path="/create" element={<Composer kind="new" />} />
        <Route path="/comments" element={<Comments />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/analytics/posts/:postId" element={<Analytics />} />
        <Route path="*" element={<Missing />} />
      </Routes>
    </main>
  </>
}

export default function App() {
  const { search } = useLocation()
  const sid = new URLSearchParams(search).get('sid') || getSessionId()
  const [session, setSession] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    openSession(sid).then((initial) => {
      if (active) setSession({ sid, initial })
    }).catch(() => {
      if (active) setFailed(true)
    })
    return () => { active = false }
  }, [sid])
  if (failed) return <div className="loading"><strong>Workspace could not load.</strong><button onClick={() => window.location.reload()}>Refresh workspace</button></div>
  if (!session || session.sid !== sid) return <div className="loading" role="status">Loading workspace…</div>
  return <StudioProvider key={sid || '_default'} initial={session.initial}><Layout /></StudioProvider>
}
