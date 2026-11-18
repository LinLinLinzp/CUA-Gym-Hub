import { useEffect } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { PaperBody } from './Paper.jsx'

export function PrintPreview({ title, body, onClose }) {
  useEffect(() => {
    function dismiss(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [onClose])
  return <main className="print-preview">
    <header className="preview-header">
      <button className="button ghost" type="button" autoFocus onClick={onClose}><ArrowLeft size={16} />Back to document</button>
      <h1>{title}</h1>
      <button className="button primary" type="button" onClick={() => window.print()}><Printer size={16} />Print</button>
    </header>
    <div className="preview-canvas"><article className="paper"><PaperBody body={body} /></article></div>
  </main>
}
