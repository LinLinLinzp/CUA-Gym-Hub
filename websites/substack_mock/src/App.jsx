import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell.jsx'
import { Missing, ScrollOnRoute } from './components/UI.jsx'
import Home from './pages/Home.jsx'
import Posts from './pages/Posts.jsx'
import { EditorRoute, PreviewRoute } from './pages/Editor.jsx'
import Subscribers from './pages/Subscribers.jsx'
import { Article, Publication } from './pages/Community.jsx'
import Moderation from './pages/Moderation.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ScrollOnRoute />
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Home />} />
        <Route path="/publish" element={<Home />} />
        <Route path="/publish/posts" element={<Posts />} />
        <Route path="/publish/subscribers/:id?" element={<Subscribers />} />
        <Route path="/publish/moderation" element={<Moderation />} />
        <Route path="/publish/settings" element={<Settings />} />
        <Route path="*" element={<Missing />} />
      </Route>
      <Route path="/publish/posts/new" element={<EditorRoute />} />
      <Route path="/publish/posts/:id/edit" element={<EditorRoute />} />
      <Route path="/publish/posts/:id/preview" element={<PreviewRoute />} />
      <Route path="/publication" element={<Publication />} />
      <Route path="/p/:slug" element={<Article />} />
    </Routes>
  </BrowserRouter>
}
