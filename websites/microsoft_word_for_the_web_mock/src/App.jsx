import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import { ArrowLeft, FileWarning } from 'lucide-react'
import { directRole, isActive, redeemedRole, rows } from './data/access.js'
import { Library } from './components/Library.jsx'
import { Editor } from './components/Editor.jsx'
import { useWorkspace } from './data/store.jsx'
import { routeTo } from './utils/routes.js'

function Unavailable({ title, detail }) {
  return <main className="unavailable">
    <FileWarning size={36} strokeWidth={1.5} /><h1>{title}</h1><p>{detail}</p>
    <Link className="button primary" to={routeTo('/')}><ArrowLeft size={17} />Back to documents</Link>
  </main>
}

function DocumentRoute({ state, shared = false }) {
  const { documentId, linkId } = useParams()
  const link = shared ? rows(state, 'shareLinks').find((item) => item.id === linkId) : null
  if (shared && link?.status !== 'active') {
    return <Unavailable title="This link is unavailable" detail={link?.status === 'revoked' ? 'The owner removed this sharing link.' : 'This sharing link could not be found.'} />
  }
  const doc = rows(state, 'documents').find((item) => item.id === (shared ? link.documentId : documentId))
  if (!isActive(doc)) return <Unavailable title="Document unavailable" detail={doc?.status === 'deleted' ? 'This document has been deleted.' : 'This document could not be found.'} />
  const role = shared ? redeemedRole(state, doc, link) : directRole(state, doc)
  if (!role) return <Unavailable title="You don’t have access" detail={shared ? 'This link is restricted to its intended audience.' : 'Ask the document owner to grant you access.'} />
  return <Editor key={`${shared ? 'share:' + link.id : 'document:' + doc.id}:${role}`} state={state} doc={doc} role={role} />
}

export function App() {
  const { state } = useWorkspace()
  return <BrowserRouter>
    <Routes>
      <Route path="/" element={<Library state={state} />} />
      <Route path="/documents/:documentId" element={<DocumentRoute state={state} />} />
      <Route path="/share/:linkId" element={<DocumentRoute state={state} shared />} />
      <Route path="*" element={<Unavailable title="Page unavailable" detail="This page could not be found." />} />
    </Routes>
  </BrowserRouter>
}
