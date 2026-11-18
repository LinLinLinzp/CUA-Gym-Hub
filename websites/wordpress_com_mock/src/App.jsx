import React from 'react'
import { createBrowserRouter, Outlet, RouterProvider, useParams, useSearchParams } from 'react-router-dom'
import { StoreProvider, useStore } from './data/store.jsx'
import { getSessionId } from './utils/dataManager.js'
import Shell from './components/Shell.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ContentList from './pages/ContentList.jsx'
import Editor from './pages/Editor.jsx'
import MediaLibrary from './pages/MediaLibrary.jsx'
import Comments from './pages/Comments.jsx'
import PreviewComments from './components/PreviewComments.jsx'
import PreviewLayout from './components/PreviewLayout.jsx'
import DocumentView from './components/DocumentView.jsx'
import { dashboardPath, editorPath, SiteLink } from './utils/navigation.jsx'
import { contentFor } from './utils/display.js'

function Missing({ label = 'Screen unavailable' }) {
  return <section className="card empty"><h1>{label}</h1><SiteLink to={dashboardPath}>Return to Dashboard</SiteLink></section>
}

function EditorRoute({ state, existing = false }) {
  const [params] = useSearchParams()
  const id = params.get('post')
  const post = existing && contentFor(state, 'post', id)
  const type = existing ? (post ? 'post' : 'page') : (params.get('post_type') === 'page' ? 'page' : 'post')
  const record = existing && (post || contentFor(state, 'page', id))
  if (existing && !record) return <Shell state={state}><Missing label="Content unavailable" /></Shell>
  return <Editor key={record?.id || type} record={record || null} type={type} />
}

function PreviewRoute({ state }) {
  const { type, id } = useParams()
  const record = ['post', 'page'].includes(type) && contentFor(state, type, id)
  if (!record) return <Shell state={state}><Missing label="Preview unavailable" /></Shell>
  return <main className="workspace-main standalone-preview"><SiteLink className="button" to={editorPath(id)}>Back to editor</SiteLink><PreviewLayout><DocumentView record={record} media={state.media}><PreviewComments state={state} type={type} id={id} /></DocumentView></PreviewLayout></main>
}

function Screen({ screen }) {
  const { state } = useStore()
  const [params] = useSearchParams()
  const active = screen === 'content' ? (params.get('post_type') === 'page' ? 'pages' : 'posts') : screen
  if (screen === 'preview') return <PreviewRoute state={state} />
  if (screen === 'new' || screen === 'edit') return <EditorRoute state={state} existing={screen === 'edit'} />
  const views = {
    dashboard: <Dashboard state={state} />,
    posts: <ContentList key="posts" type="post" />,
    pages: <ContentList key="pages" type="page" />,
    media: <MediaLibrary />,
    comments: <Comments />,
  }
  return <Shell state={state} active={active}>{views[active] || <Missing />}</Shell>
}

function Session() {
  useSearchParams()
  const sid = getSessionId()
  return <StoreProvider key={sid || ''} sid={sid}><Outlet /></StoreProvider>
}

const router = createBrowserRouter([{ element: <Session />, children: [
  { path: '/', element: <Screen screen="dashboard" /> },
  { path: '/wp-admin/', element: <Screen screen="dashboard" /> },
  { path: '/wp-admin/edit.php', element: <Screen screen="content" /> },
  { path: '/wp-admin/post-new.php', element: <Screen screen="new" /> },
  { path: '/wp-admin/post.php', element: <Screen screen="edit" /> },
  { path: '/wp-admin/upload.php', element: <Screen screen="media" /> },
  { path: '/wp-admin/edit-comments.php', element: <Screen screen="comments" /> },
  { path: '/preview/:type/:id', element: <Screen screen="preview" /> },
  { path: '*', element: <Screen screen="missing" /> },
] }])

export default function App() {
  return <RouterProvider router={router} />
}
