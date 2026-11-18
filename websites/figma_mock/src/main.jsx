import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { WorkspaceProvider } from './store.jsx'
import { Library } from './Library.jsx'
import { Editor } from './Editor.jsx'
import './styles.css'

function DesignRoute() {
  const { fileId } = useParams()
  return <Editor key={fileId} fileId={fileId} />
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <WorkspaceProvider>
      <Routes>
        <Route path="/" element={<Library key="files" scope="files" />} />
        <Route path="/drafts" element={<Library key="drafts" scope="drafts" />} />
        <Route path="/starred" element={<Library key="starred" scope="starred" />} />
        <Route path="/trash" element={<Library key="trash" scope="trash" />} />
        <Route path="/folders/:folderId" element={<Library scope="folder" />} />
        <Route path="/design/:fileId" element={<DesignRoute />} />
        <Route path="*" element={<Library scope="missing" />} />
      </Routes>
    </WorkspaceProvider>
  </BrowserRouter>,
)

