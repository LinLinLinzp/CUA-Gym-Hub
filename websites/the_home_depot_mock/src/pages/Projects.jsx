
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  active, AppLink, date, Dialog, Empty, ErrorMessage, Field, find, Heading, latest, matches, Metric,
  Missing, money, newId, records, replace, ResultCount, roundMoney, route, stamp, useAccount,
  useAccountNavigate, validPrice, whole,
} from '../shared.jsx'

const listPath = '/project-lists'
const listName = (list) => list.name || 'Untitled list'
const lineName = (line, products) => line.name || find(products, line.productId)?.name || 'Material'
const updated = (state, time = new Date().toISOString()) => ({ updatedAt: time, updatedBy: state.account?.id })

function ListForm({ list, onClose }) {
  const { mutate } = useAccount()
  const navigate = useAccountNavigate()
  const [name, setName] = useState(list?.name || '')
  const [description, setDescription] = useState(list?.description || '')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    const id = list?.id ?? newId('list')
    const problem = await mutate((current) => {
      if (!name.trim()) return 'Enter a list name.'
      const fields = { name: name.trim(), description: description.trim() }
      if (list) {
        if (!find(active(current.projectLists), id)) return 'This project list is no longer available.'
        return { ...current, projectLists: replace(current.projectLists, id, (record) => ({ ...record, ...fields, ...updated(current) })) }
      }
      const created = stamp(current)
      return { ...current, projectLists: [...(current.projectLists ?? []), {
        id, ...fields, status: 'active', items: [], ...created, updatedAt: created.createdAt,
      }] }
    })
    setError(problem)
    if (!problem) {
      onClose()
      if (!list) navigate(route(listPath, id))
    }
  }

  return <Dialog title={list ? 'Edit project list' : 'New list'} onClose={onClose}>
    <form className="form-flow" noValidate onSubmit={submit}>
      <Field label="List name"><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></Field>
      <Field label="Description (optional)"><textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></Field>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="actions"><button className="secondary" type="button" onClick={onClose}>Close</button>
        <button className="primary" type="submit">{list ? 'Save list' : 'Create list'}</button></div>
    </form>
  </Dialog>
}

function MaterialForm({ listId, line, onClose }) {
  const { state, mutate } = useAccount()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const [quantity, setQuantity] = useState(String(line?.quantity ?? 1))
  const [note, setNote] = useState(line?.note || '')
  const [error, setError] = useState('')
  const product = find(state.products, selected)
  const choices = records(state.products).filter((item) => matches(query, item.name, item.sku))

  async function submit(event) {
    event.preventDefault()
    const problem = await mutate((current) => {
      if (!whole(quantity)) return 'Enter a positive whole quantity.'
      const list = find(active(current.projectLists), listId)
      if (!list) return 'This project list is no longer available.'
      const items = list.items ?? []
      const changes = updated(current)
      let nextItems
      if (line) {
        if (!find(active(items), line.id)) return 'This material is no longer on the list.'
        nextItems = replace(items, line.id, (item) => ({ ...item, quantity: Number(quantity), note: note.trim(), ...changes }))
      } else {
        const material = find(current.products, selected)
        if (!material || !validPrice(material.unitPrice)) return 'Select a material with an available price.'
        const existing = active(items).find((item) => item.productId === material.id)
        if (existing) {
          const total = Number(existing.quantity || 0) + Number(quantity)
          if (!whole(total)) return 'Enter a smaller quantity.'
          nextItems = replace(items, existing.id, (item) => ({
            ...item, quantity: total, ...(note.trim() && { note: note.trim() }), ...changes,
          }))
        } else {
          nextItems = [...items, {
            id: newId('list-line'), productId: material.id, name: material.name || 'Material', sku: material.sku || '',
            unitPrice: Number(material.unitPrice), quantity: Number(quantity), note: note.trim(), status: 'active',
            actorId: current.account?.id, createdAt: changes.updatedAt, updatedAt: changes.updatedAt,
          }]
        }
      }
      return { ...current, projectLists: replace(current.projectLists, listId, (record) => ({ ...record, items: nextItems, ...changes })) }
    })
    setError(problem)
    if (!problem) onClose()
  }

  return <Dialog title={line ? 'Edit ' + lineName(line, state.products) : 'Add materials'} onClose={onClose}>
    <form className="form-flow" noValidate onSubmit={submit}>
      {!line && <>
        <Field label="Search materials"><input type="search" placeholder="Product name or SKU" value={query} onChange={(e) => setQuery(e.target.value)} /></Field>
        <fieldset className="choices"><legend>Select a material</legend>
          {choices.length ? <div className="choice-scroll">{choices.map((item) => <label className="choice" key={item.id}>
            <input type="radio" name="material" value={item.id} checked={selected === item.id} onChange={() => setSelected(item.id)} disabled={!validPrice(item.unitPrice)} />
            <span><strong>{item.name || 'Material'}</strong><small>SKU {item.sku || 'unavailable'} · {money(item.unitPrice)}</small></span>
          </label>)}</div> : <p>No materials match your search.</p>}
        </fieldset>
        {product && <p className="muted">Selected material · {product.name || 'Material'}</p>}
      </>}
      <Field label="Quantity"><input type="number" min="1" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
      <Field label="Note (optional)"><textarea rows="2" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="actions"><button className="secondary" type="button" onClick={onClose}>Close</button>
        <button className="primary" type="submit">{line ? 'Save material' : 'Add material'}</button></div>
    </form>
  </Dialog>
}

export function Projects() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const lists = latest(active(state.projectLists), 'updatedAt').filter((list) => matches(query, list.name, list.description))

  return <div className="flow">
    <Heading title="Project Lists" intro="Save materials, quantities and notes for your next project."
      action={<button className="primary" onClick={() => setOpen(true)}>New list</button>} />
    <div className="panel filters one"><Field label="Search lists"><input type="search" placeholder="Project name or description" value={query} onChange={(e) => setQuery(e.target.value)} /></Field></div>
    <ResultCount count={lists.length} singular="list" reset={query ? () => setQuery('') : undefined} />
    {lists.length ? <div className="card-grid">{lists.map((list) => {
      const count = active(list.items).length
      return <article className="panel project-card pad" key={list.id}>
        <h2><AppLink to={route(listPath, list.id)}>{listName(list)}</AppLink></h2>
        {list.description && <p>{list.description}</p>}
        <small>{count} {count === 1 ? 'material' : 'materials'}</small>
        <small>Updated {date(list.updatedAt)}</small>
      </article>
    })}</div> : <Empty title={query ? 'No matching project lists' : 'No project lists yet'}><p>{query ? 'Try a different search.' : 'Create a list to start saving materials.'}</p></Empty>}
    {open && <ListForm onClose={() => setOpen(false)} />}
  </div>
}

export function ProjectDetail() {
  const { listId } = useParams()
  const { state, mutate } = useAccount()
  const navigate = useAccountNavigate()
  const [dialog, setDialog] = useState(null)
  const [error, setError] = useState('')
  const list = find(active(state.projectLists), listId)
  if (!list) return <Missing title="Project list unavailable" to={listPath} link="Back to Project Lists" />

  const items = active(list.items)
  const selected = dialog?.lineId ? find(items, dialog.lineId) : null
  const total = roundMoney(items.reduce((sum, item) => {
    const price = item.unitPrice ?? find(state.products, item.productId)?.unitPrice
    return sum + (validPrice(price) && whole(item.quantity) ? Number(price) * Number(item.quantity) : 0)
  }, 0))

  function dismiss() { setDialog(null); setError('') }

  async function remove() {
    const lineId = dialog.lineId
    const problem = await mutate((current) => {
      const target = find(active(current.projectLists), listId)
      if (!target || (lineId && !find(active(target.items), lineId))) return 'This item is no longer available.'
      const changes = updated(current)
      return { ...current, projectLists: replace(current.projectLists, listId, (record) => lineId
        ? { ...record, ...changes, items: replace(record.items, lineId, (item) => ({ ...item, status: 'removed', ...changes })) }
        : { ...record, ...changes, status: 'deleted' }) }
    })
    setError(problem)
    if (!problem) {
      dismiss()
      if (!lineId) navigate(listPath)
    }
  }

  return <div className="flow">
    <Heading title={listName(list)} intro={list.description} back={{ to: listPath, label: 'Project Lists' }}
      action={<button className="primary" onClick={() => setDialog({ kind: 'add' })}>Add materials</button>} />
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-heading"><h2>Materials</h2><small>{items.length} {items.length === 1 ? 'item' : 'items'}</small></div>
        {items.length ? <ul className="rows">{items.map((line) => {
          const name = lineName(line, state.products)
          const product = find(state.products, line.productId)
          return <li className="record-row material-row" key={line.id}>
            <div><strong>{name}</strong><small>SKU {line.sku || product?.sku || 'unavailable'}</small>{line.note && <p className="line-note">{line.note}</p>}</div>
            <div><small>Quantity</small>{line.quantity ?? '—'}</div>
            <div><small>Unit price</small>{money(line.unitPrice ?? product?.unitPrice)}</div>
            <div className="actions"><button className="text-button" aria-label={'Edit ' + name} onClick={() => setDialog({ kind: 'edit-line', lineId: line.id })}>Edit</button>
              <button className="text-button" aria-label={'Remove ' + name} onClick={() => setDialog({ kind: 'remove-line', lineId: line.id })}>Remove</button></div>
          </li>
        })}</ul> : <p className="panel-body">This list has no materials yet.</p>}
      </section>
      <section className="panel pad"><h2>List summary</h2>
        <dl className="metrics"><Metric title="Estimated materials total">{money(total)}</Metric><Metric title="Last updated">{date(list.updatedAt)}</Metric></dl>
        <div className="actions left"><button className="secondary" onClick={() => setDialog({ kind: 'edit-list' })}>Edit list</button>
          <button className="text-button" onClick={() => setDialog({ kind: 'delete-list' })}>Delete list</button></div>
      </section>
    </div>
    {dialog?.kind === 'edit-list' && <ListForm list={list} onClose={dismiss} />}
    {dialog?.kind === 'add' && <MaterialForm listId={listId} onClose={dismiss} />}
    {dialog?.kind === 'edit-line' && selected && <MaterialForm listId={listId} line={selected} onClose={dismiss} />}
    {(dialog?.kind === 'delete-list' || dialog?.kind === 'remove-line') && <Dialog
      title={dialog.lineId ? 'Remove ' + (selected ? lineName(selected, state.products) : 'material') + '?' : 'Delete ' + listName(list) + '?'} onClose={dismiss}>
      <p>{dialog.lineId ? 'This material will be removed from your list.' : 'This project list will be removed from your account view.'}</p>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="actions"><button className="secondary" onClick={dismiss}>Keep {dialog.lineId ? 'material' : 'list'}</button>
        <button className="danger" onClick={remove}>{dialog.lineId ? 'Remove material' : 'Delete list'}</button></div>
    </Dialog>}
  </div>
}
