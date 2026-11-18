import { useState } from 'react'
import { useWorkspace } from './store.jsx'
import { createContact, id } from './model.js'
import { items } from './pricing.js'
import { Dialog, Empty, LocalLink, Notice, PageHead, Pagination, Search, includesText, initials, money, nameOf } from './ui.jsx'

const SIZE = 9

export function ContactDialog({ onClose, onCreated }) {
  const { commit } = useWorkspace()
  const [data, setData] = useState({ name: '', email: '', company: '', title: '' })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    const contact = { ...data, id: id('ct') }
    try {
      await commit(state => createContact(state, contact))
      onCreated(contact.id)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  return <Dialog title="New contact" onClose={pending ? () => {} : onClose}>
    <form className="stacked" onSubmit={submit}>
      {[['name', 'Full name'], ['email', 'Email'], ['company', 'Company'], ['title', 'Job title']].map(([field, label]) =>
        <label key={field}>{label}<input value={data[field]} type={field === 'email' ? 'email' : 'text'}
          required={field === 'name' || field === 'email'} onChange={event => setData({ ...data, [field]: event.target.value })} /></label>,
      )}
      <Notice error={error} />
      <div className="actions end"><button type="button" disabled={pending} onClick={onClose}>Cancel</button>
        <button className="primary" disabled={pending}>Create contact</button></div>
    </form>
  </Dialog>
}

function Library({ title, description, records, fields, empty, render, action }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const filtered = items(records).filter(record => includesText(query, ...fields.map(field => record[field])))
  const visiblePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / SIZE)))
  return <main className="page">
    <PageHead title={title} action={action}>{description}</PageHead>
    <div className="filters"><Search label={'Search ' + title.toLowerCase()} placeholder={'Search ' + title.toLowerCase()} value={query}
      onChange={value => { setQuery(value); setPage(1) }} /></div>
    {filtered.length ? render(filtered.slice((visiblePage - 1) * SIZE, visiblePage * SIZE)) : <Empty title={empty}>
      {query && <button onClick={() => { setQuery(''); setPage(1) }}>Clear search</button>}
    </Empty>}
    <Pagination total={filtered.length} page={visiblePage} size={SIZE} onPage={setPage} />
  </main>
}

export function Templates() {
  const { state } = useWorkspace()
  return <Library title="Templates" description="Start with reusable proposal content." records={state.templates} fields={['name', 'category']}
    empty="No matching templates" render={records => <div className="template-grid">{records.map((template, index) =>
      <article className="template surface" key={template.id}>
        <div className={'template-preview preview-' + index % 3} aria-hidden="true">
          <div className="mini-paper"><i /><b /><b /><b /><span /><b /><b /></div>
        </div>
        <div className="template-info">
          <span className="muted">{template.category || 'General'}</span><h2>{nameOf(template, 'Untitled template')}</h2>
          {template.description && <p>{template.description}</p>}
          <LocalLink className="button" to={'/documents/new?template=' + encodeURIComponent(template.id)}
            aria-label={'Use template: ' + nameOf(template)}>Use template <span aria-hidden="true">→</span></LocalLink>
        </div>
      </article>,
    )}</div>} />
}

export function Catalog() {
  const { state } = useWorkspace()
  return <Library title="Catalog" description="Products and services available for pricing tables." records={state.catalogItems}
    fields={['name', 'sku', 'category']} empty="No matching products" render={records =>
      <div className="surface table-scroll"><table>
        <thead><tr><th scope="col">Product</th><th scope="col">SKU</th><th scope="col">Category</th><th scope="col" className="amount">Unit price</th></tr></thead>
        <tbody>{records.map(record => <tr key={record.id}><td><strong>{nameOf(record, 'Unnamed product')}</strong>
          {record.description && <small className="table-note">{record.description}</small>}</td><td>{record.sku || '—'}</td>
          <td>{record.category || '—'}</td><td className="amount">{money(record.unitPrice, record.currency || state.workspace?.currency)}</td></tr>)}</tbody>
      </table></div>} />
}

export function Contacts() {
  const { state } = useWorkspace()
  const [dialog, setDialog] = useState(false)
  return <>
    <Library title="Contacts" description="Find the people you work with and add new contacts." records={state.contacts}
      fields={['name', 'email', 'company']} empty="No matching contacts" action={<button className="primary" onClick={() => setDialog(true)}>New contact</button>}
      render={records => <div className="surface table-scroll"><table>
        <thead><tr><th scope="col">Name</th><th scope="col">Company</th><th scope="col">Email</th></tr></thead>
        <tbody>{records.map(record => <tr key={record.id}>
          <td><div className="person"><span className="avatar">{initials(record.name)}</span><div>
            <strong>{nameOf(record, 'Unnamed contact')}</strong>{record.title && <small className="table-note">{record.title}</small>}
          </div></div></td><td>{record.company || '—'}</td><td>{record.email || '—'}</td>
        </tr>)}</tbody>
      </table></div>} />
    {dialog && <ContactDialog onClose={() => setDialog(false)} onCreated={() => setDialog(false)} />}
  </>
}
