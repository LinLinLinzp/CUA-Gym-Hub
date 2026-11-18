import { Printer, Store, Truck } from 'lucide-react'
import { methods } from '../domain/returns.js'
import Barcode from './Barcode.jsx'

export function ReturnInstructions({ request }) {
  const instruction = request.instructions
  if (request.method === 'store') return <div className="stack">
    <p className="cluster"><Store size={19} />{instruction?.barcode ? 'Show this barcode with your items at Guest Services.' : 'Return to Guest Services.'}</p>
    <Barcode code={instruction?.barcode} />
  </div>
  if (request.method !== 'mail' || !instruction?.labelNumber) return <p className="muted">Return instructions unavailable.</p>
  return <div className="stack">
    <p className="cluster"><Truck size={19} />Pack the items and attach the return label. Drop the package off with {instruction.carrier || 'the carrier'}.</p>
    <div className="mail-label printable stack">
      <h3>{instruction.carrier || 'Carrier'} return label</h3>
      <p>Return {request.returnNumber || request.id}</p>
      <p>Label number {instruction.labelNumber}</p>
      <Barcode code={instruction.labelNumber} />
    </div>
    <button className="button secondary print-button" onClick={() => window.print()}><Printer size={18} /> Print mail label</button>
  </div>
}

export const returnLabel = (method) => Object.hasOwn(methods, method) ? methods[method] : 'Return method unavailable'
