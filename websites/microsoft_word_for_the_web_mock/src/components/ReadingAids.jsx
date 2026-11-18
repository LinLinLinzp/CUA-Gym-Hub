import { ListTree, Minus, Plus, X } from 'lucide-react'
import { blockOffsets, blockText } from '../data/body.js'

export function Outline({ body, onJump, onClose }) {
  const headings = blockOffsets(body).filter(({ block }) => block.style !== 'normal' && blockText(block).trim())
  return <aside className="collaboration" aria-label="Headings outline">
    <div className="panel-heading"><h2>Headings</h2><button type="button" className="icon-button" aria-label="Close navigation" onClick={onClose}><X size={18} /></button></div>
    {headings.length ? <nav aria-label="Document headings" className="outline-entries">
      {headings.map(({ block, start }) => <button key={block.id} type="button" className={`button ghost outline-${block.style}`} onClick={() => onJump(start)}>
        {blockText(block)}
      </button>)}
    </nav> : <div className="panel-empty"><ListTree size={25} strokeWidth={1.5} /><p>No headings in this document</p></div>}
  </aside>
}

export function Zoom({ value, onChange }) {
  const adjust = (amount) => onChange(Math.min(200, Math.max(50, value + amount)))
  return <div className="zoom-controls">
    <button type="button" className="icon-button" aria-label="Zoom out" disabled={value <= 50} onClick={() => adjust(-10)}><Minus size={14} /></button>
    <input type="range" aria-label="Zoom" min={50} max={200} step={10} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <button type="button" className="icon-button" aria-label="Zoom in" disabled={value >= 200} onClick={() => adjust(10)}><Plus size={14} /></button>
    <button type="button" className="zoom-reset" aria-label={`Reset zoom to 100 percent. Current zoom ${value} percent`} title="Reset zoom" onClick={() => onChange(100)}>{value}%</button>
  </div>
}
