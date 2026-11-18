import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDocument, makeDocument } from '../data/documents.js'
import { useWorkspace } from '../data/store.jsx'
import { documentPath, routeTo } from '../utils/routes.js'
import { Modal } from './ui.jsx'

export function useDocumentCreation() {
  const { commit } = useWorkspace()
  const navigate = useNavigate()
  return (options) => {
    let doc
    commit((current) => {
      doc = makeDocument(current, options)
      return addDocument(current, doc)
    })
    if (doc?.ownerId) navigate(routeTo(documentPath(doc.id)), { state: { focusDocument: true } })
  }
}

export function RenameField({ doc, onSave, onCancel, inline = false }) {
  const [text, setText] = useState(doc.title ?? '')
  const [error, setError] = useState(false)
  function submit() {
    if (!text.trim()) { setError(true); return }
    onSave(text)
  }
  return <form className={inline ? 'rename-form inline-rename' : 'rename-form'} onSubmit={(event) => { event.preventDefault(); submit() }}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel() } }}>
    <label className="field-label">
      <span className={inline ? 'sr-only' : undefined}>Document name</span>
      <input className="field" value={text} onChange={(event) => { setText(event.target.value); setError(false) }}
        autoFocus onFocus={(event) => event.currentTarget.select()} onBlur={inline ? submit : undefined} aria-invalid={error} />
    </label>
    {error && <p className="error-message" role="alert">Enter a document name.</p>}
    {!inline && <div className="modal-actions"><button type="button" className="button" onClick={onCancel}>Cancel</button><button className="button primary">Rename</button></div>}
  </form>
}

export function DeleteDialog({ doc, onClose, onDelete }) {
  return <Modal title="Delete document?" onClose={onClose}>
    <p>“{doc.title || 'Untitled document'}” will be removed from the document library and its sharing links will stop working.</p>
    <div className="modal-actions">
      <button type="button" className="button" onClick={onClose}>Cancel</button>
      <button type="button" className="button danger" onClick={onDelete}>Delete</button>
    </div>
  </Modal>
}
