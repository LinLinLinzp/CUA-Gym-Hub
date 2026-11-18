import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BillTable } from './Bills.jsx'
import { PaymentTable } from './PaymentTable.jsx'
import { ButtonLink, DataTable, DefinitionList, Field, Missing, PageTitle, SearchField, SiteLink, methodLabel, recordPath } from './components.jsx'
import { byId, includes, methods, recentFirst, rows } from './data/selectors.js'
import { useStore } from './store.jsx'

const columns = [{ label: 'Vendor' }, { label: 'Category' }, { label: 'Contact' }, { label: 'Email' }, { label: 'Payment methods' }]

export function Vendors() {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState('')
  const vendors = rows(state.vendors).filter(vendor => includes(query, vendor.name, vendor.email) && (!method || methods(vendor).includes(method)))
  vendors.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))

  return <>
    <PageTitle title="Vendors" description="Find supplier contacts, bills, and payment history." />
    <div className="toolbar">
      <SearchField label="Search vendors" value={query} onChange={setQuery} placeholder="Vendor name or email" />
      <Field label="Payment method">{props => <select {...props} value={method} onChange={event => setMethod(event.target.value)}>
        <option value="">All methods</option><option value="ach">ACH</option><option value="check">Check</option>
      </select>}</Field>
    </div>
    <DataTable label="Vendors directory" columns={columns} records={vendors} empty="No vendors found."
      rowPath={vendor => recordPath('vendors', vendor.id)} render={vendor => <>
        <td><SiteLink className="table-link" to={recordPath('vendors', vendor.id)}>{vendor.name || 'Unknown vendor'}</SiteLink></td>
        <td>{vendor.category || '—'}</td><td>{vendor.contactName || '—'}</td><td>{vendor.email || '—'}</td>
        <td>{methods(vendor).map(methodLabel).join(', ') || '—'}</td>
      </>} />
  </>
}

export function VendorDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const vendor = byId(state.vendors, id)
  if (!vendor) return <Missing title="Vendor unavailable" to="/vendors" label="Back to Vendors" />
  const bills = rows(state.bills).filter(bill => bill.vendorId === id).sort(recentFirst)
  const payments = rows(state.payments).filter(payment => payment.vendorId === id).sort(recentFirst)

  return <>
    <PageTitle title={vendor.name || 'Vendor details'} description={vendor.category}
      back={{ to: '/vendors', label: 'Vendors' }}
      actions={<ButtonLink to={`/payments/new?vendor=${encodeURIComponent(id)}`}>Pay bills</ButtonLink>} />
    <div className="detail-grid">
      <div className="stack">
        <section><div className="section-head"><h2>Bills</h2></div><BillTable records={bills} empty="No bills for this vendor." /></section>
        <section><div className="section-head"><h2>Payment history</h2></div><PaymentTable records={payments} empty="No payments for this vendor." /></section>
      </div>
      <section className="panel">
        <h2>Vendor details</h2>
        <DefinitionList entries={[
          ['Contact', vendor.contactName || '—'], ['Email', vendor.email || '—'],
          ['Category', vendor.category || '—'], ['Payment methods', methods(vendor).map(methodLabel).join(', ') || '—'],
        ]} />
      </section>
    </div>
  </>
}
