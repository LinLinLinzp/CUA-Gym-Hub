import React, { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { categories, conditions, defaultThumbnail } from './data/seed.js'
import { actor, append, byNumber, byText, date, event, find, listingStatuses, match, money, newId, oneCentValue, recordPath, replace, rows, timestamp } from './model.js'
import { useStore } from './store.jsx'
import { Back, Dialog, ErrorMessage, Field, History, Icon, LinkTo, Missing, PageTitle, QUEUE_PAGE_SIZE, Queue, Status, useBrowse, useHrefFor } from './ui.jsx'

const sorts = [['newest', 'Newest first'], ['updated', 'Recently updated'], ['title', 'Title A–Z'], ['price-high', 'Highest price'], ['price-low', 'Lowest price'], ['stock', 'Lowest quantity']]
const statusPath = status => '/listings?status=' + status
const hasRelistStock = item => Number.isSafeInteger(Number(item.quantity)) && Number(item.quantity) > 0

function updateListingStatus(state, ids, status) {
  const expected = status === 'active' ? 'ended' : 'active'
  const listings = ids.map(id => find(state.listings, id))
  if (!listings.every(item => item?.status === expected)) throw new Error('A selected listing has changed. Refresh your selection.')
  if (status === 'active' && !listings.every(hasRelistStock)) throw new Error('Add stock before relisting.')
  const now = timestamp()
  const updated = listings.map(item => ({
    ...item, status, updatedAt: now, ...(status === 'active' ? { publishedAt: now, relistedAt: now } : { endedAt: now }),
  }))
  const updatedById = new Map(updated.map(item => [item.id, item]))
  const activity = updated.map(item => event(state, status === 'active' ? 'listing_relisted' : 'listing_ended', 'listing', item.id, now, { previousStatus: expected, status }))
  return { ...state, listings: state.listings.map(item => updatedById.get(item?.id) || item), activity: append(state, 'activity', ...activity) }
}

function ListingStatusDialog({ action, close, after }) {
  const { commit } = useStore()
  const relist = action.status === 'active'
  const verb = relist ? 'Relist' : 'End'
  const subject = action.ids.length === 1 ? 'listing' : action.ids.length + ' listings'
  return <Dialog title={verb + ' ' + subject + '?'} danger={!relist} confirm={verb + ' ' + subject} onClose={close} onConfirm={() => {
    const result = commit(state => updateListingStatus(state, action.ids, action.status), action.ids.length + (action.ids.length === 1 ? ' listing ' : ' listings ') + (relist ? 'relisted.' : 'ended.'))
    if (result.ok) after()
    return result
  }}><p>{relist ? 'This item will return to your active inventory.' : 'These items will be removed from active inventory. You can relist them later.'}</p></Dialog>
}

export function Listings() {
  const { state } = useStore()
  const browse = useBrowse('newest')
  const [selected, setSelected] = useState([])
  const [action, setAction] = useState(null)
  const listings = rows(state.listings)
  const filtered = listings.filter(item => (!browse.status || item.status === browse.status) &&
    (!browse.filter || item.category === browse.filter) && match(browse.query, item.title, item.sku, item.id))
    .sort((a, b) => {
      if (browse.sort === 'updated') return byText(b.updatedAt, a.updatedAt)
      if (browse.sort === 'title') return byText(a.title, b.title)
      if (browse.sort === 'price-high') return byNumber(b.price, a.price)
      if (browse.sort === 'price-low') return byNumber(a.price, b.price)
      if (browse.sort === 'stock') return byNumber(a.quantity, b.quantity)
      return byText(b.createdAt, a.createdAt)
    })
  const selectedActive = selected.filter(id => find(listings, id)?.status === 'active')
  const first = (Math.min(browse.page, Math.max(1, Math.ceil(filtered.length / QUEUE_PAGE_SIZE))) - 1) * QUEUE_PAGE_SIZE
  const pageIds = filtered.slice(first, first + QUEUE_PAGE_SIZE).filter(item => item.id && item.status === 'active').map(item => item.id)
  const allChecked = !!pageIds.length && pageIds.every(id => selected.includes(id))
  const toggle = id => setSelected(previous => previous.includes(id) ? previous.filter(key => key !== id) : [...previous, id])
  const newLink = <LinkTo className="button primary" to="/listings/new"><Icon name="plus" />Create listing</LinkTo>
  const filterOptions = [...new Set([...categories, ...listings.map(item => item.category).filter(Boolean)])].sort()

  return <>
    <PageTitle title="Listings" action={newLink}>Create and manage your inventory.</PageTitle>
    <Queue label="Listings" browse={browse} records={listings} filtered={filtered} statuses={listingStatuses}
      searchLabel="Search by title, SKU, or ID" filterLabel="Category" filters={[[ '', 'All categories'], ...filterOptions.map(value => [value, value])]} sorts={sorts} emptyAction={newLink}
      bulk={selectedActive.length > 0 && <div className="bulk"><strong>{selectedActive.length} selected</strong><button className="button" onClick={() => setAction({ ids: selectedActive, status: 'ended' })}>End selected</button><button className="text-button" onClick={() => setSelected([])}>Clear selection</button></div>}
      columns={[{ content: <input type="checkbox" aria-label="Select active listings on this page" disabled={!pageIds.length} checked={allChecked} onChange={() => setSelected(previous => allChecked ? previous.filter(id => !pageIds.includes(id)) : [...new Set([...previous, ...pageIds])])} /> }, { label: 'Listing' }, { label: 'Condition' }, { label: 'Price', numeric: true }, { label: 'Quantity', numeric: true }, { label: 'Status' }, { label: 'Actions' }]}
      renderRow={(item, index) => <tr key={item.id || index}>
        <td>{item.id && item.status === 'active' && <input type="checkbox" aria-label={'Select ' + (item.title || item.id)} checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />}</td>
        <td><div className="product"><Thumbnail item={item} /><div>{item.id ? <LinkTo to={recordPath('listings', item.id)}>{item.title || 'Untitled listing'}</LinkTo> : <strong>{item.title || 'Untitled listing'}</strong>}<small>{item.sku || item.id || 'No SKU'}</small></div></div></td>
        <td>{item.condition || '—'}</td><td className="numeric">{money(item.price)}</td><td className="numeric">{item.quantity ?? '—'}</td><td><Status value={item.status} /></td>
        <td><div className="row-actions">{item.id && <LinkTo to={recordPath('listings', item.id)} aria-label={'Revise ' + (item.title || item.id)}>Revise</LinkTo>}
          {item.id && item.status === 'active' && <button className="text-button" onClick={() => setAction({ ids: [item.id], status: 'ended' })}>End</button>}
          {item.id && item.status === 'ended' && <button className="text-button" disabled={!hasRelistStock(item)} onClick={() => setAction({ ids: [item.id], status: 'active' })}>Relist</button>}</div></td>
      </tr>} />
    {action && <ListingStatusDialog action={action} close={() => setAction(null)} after={() => {
      setSelected(current => current.filter(id => !action.ids.includes(id)))
      browse.update({ status: action.status, q: action.ids.length === 1 ? action.ids[0] : '', filter: '', sort: 'updated' })
    }} />}
  </>
}

export function Thumbnail({ item }) {
  const path = item.thumbnail?.startsWith?.('/products/') ? item.thumbnail : defaultThumbnail(item.category)
  return <span className="thumb">{path ? <img width="36" height="36" loading="lazy" alt="" src={path} /> : <Icon name="tag" />}</span>
}

const fields = ['title', 'sku', 'category', 'condition', 'description', 'price', 'quantity']

function listingErrors(state, original, values, requireComplete, publish) {
  const errors = {}
  for (const key of fields) {
    if (requireComplete && !values[key]) errors[key] = 'Enter a value for this listing.'
  }
  if (!publish && !values.title) errors.title = 'Enter a title for this draft.'
  if (values.sku && rows(state.listings).some(item => item.id !== original?.id && String(item.sku || '').trim().toLowerCase() === values.sku.toLowerCase())) errors.sku = 'This SKU is already used by another listing.'
  if (values.price && (!oneCentValue(values.price) || Number(values.price) <= 0)) errors.price = 'Enter a positive price with up to two decimal places.'
  if (values.quantity && (!Number.isSafeInteger(Number(values.quantity)) || Number(values.quantity) < (publish ? 1 : 0))) errors.quantity = publish ? 'Enter a whole quantity of at least 1.' : 'Enter a nonnegative whole quantity.'
  return errors
}

export function ListingEditor() {
  const { id } = useParams()
  const { state } = useStore()
  const listing = find(state.listings, id)
  if (id && !listing) return <Missing name="Listing" to="/listings" label="Back to Listings" />
  return <ListingForm key={id || 'new'} listing={listing} />
}

function ListingForm({ listing }) {
  const { state, commit } = useStore()
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(key => [key, String(listing?.[key] ?? '')])))
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [action, setAction] = useState(null)
  const hrefFor = useHrefFor()
  const navigate = useNavigate()
  const submitted = useRef(false)
  const input = key => ({ value: values[key], 'aria-invalid': Boolean(errors[key]), onChange: evt => setValues(current => ({ ...current, [key]: evt.target.value })) })

  function submit(evt) {
    evt.preventDefault()
    if (submitted.current) return
    const mode = evt.nativeEvent.submitter?.value || (listing?.status === 'draft' || !listing ? 'draft' : 'revise')
    const publish = mode === 'publish'
    const requireComplete = publish || listing?.status === 'active'
    const clean = Object.fromEntries(fields.map(key => [key, values[key].trim()]))
    const invalid = listingErrors(state, listing, clean, requireComplete, publish)
    setErrors(invalid)
    if (Object.keys(invalid).length) {
      setMessage('Review the highlighted fields.')
      return
    }
    setMessage('')
    const id = listing?.id || newId('lst')
    const status = mode === 'publish' ? 'active' : listing?.status || 'draft'
    const result = commit(current => {
      const original = find(current.listings, listing?.id)
      if (listing && (!original || original.status !== listing.status)) throw new Error('The listing changed. Reopen the editor.')
      if (Object.keys(listingErrors(current, original, clean, requireComplete, publish)).length) throw new Error('Review the listing fields before saving.')
      const now = timestamp()
      const changes = { ...clean, price: clean.price ? Number(clean.price) : null, quantity: clean.quantity ? Number(clean.quantity) : null }
      if (original && mode !== 'publish' && fields.every(key => (original[key] ?? null) === changes[key])) return current
      const item = {
        ...original, ...changes, id, status, updatedAt: now, createdAt: original?.createdAt || now, actorId: original?.actorId || actor(current),
        thumbnail: original?.category === clean.category && original.thumbnail ? original.thumbnail : defaultThumbnail(clean.category),
        ...(mode === 'publish' && { publishedAt: now }),
      }
      const details = { previousStatus: original?.status || null, status }
      const events = []
      if (!original) events.push(event(current, 'listing_created', 'listing', id, now, details))
      if (mode === 'publish') events.push(event(current, 'listing_published', 'listing', id, now, details))
      else if (original) events.push(event(current, 'listing_revised', 'listing', id, now, details))
      return { ...current, listings: replace(current.listings, item), activity: append(current, 'activity', ...events) }
    }, mode === 'publish' ? 'Listing published.' : status === 'draft' ? 'Draft saved.' : 'Listing revised.')
    if (result.error) setMessage(result.error)
    else {
      submitted.current = true
      navigate(hrefFor(statusPath(status) + '&q=' + encodeURIComponent(id)))
    }
  }

  function selectField(key, label, options) {
    const choices = [...new Set([...options, values[key]].filter(Boolean))]
    return <Field label={label} error={errors[key]}><select {...input(key)}><option value="">Select {label.toLowerCase()}</option>{choices.map(option => <option key={option}>{option}</option>)}</select></Field>
  }

  return <>
    <Back to="/listings">Back to Listings</Back>
    <PageTitle title={listing ? 'Revise listing' : 'Create listing'} action={listing && <Status value={listing.status} />}>{listing ? listing.title || listing.id : 'Enter item details, then save a draft or publish.'}</PageTitle>
    <div className="detail-grid">
      <form className="panel padded" onSubmit={submit} noValidate>
        <h2>Item details</h2>
        <ErrorMessage>{message}</ErrorMessage>
        <div className="form-grid">
          <Field label="Title" wide error={errors.title}><input {...input('title')} maxLength={120} /></Field>
          <Field label="SKU" error={errors.sku}><input {...input('sku')} maxLength={60} /></Field>
          {selectField('category', 'Category', categories)}
          {selectField('condition', 'Condition', conditions)}
          <Field label="Price (USD)" error={errors.price}><input type="number" min="0.01" step="0.01" {...input('price')} /></Field>
          <Field label="Quantity" error={errors.quantity}><input type="number" min="0" step="1" {...input('quantity')} /></Field>
          <Field label="Description" wide error={errors.description}><textarea rows="5" {...input('description')} /></Field>
        </div>
        <div className="form-actions"><LinkTo className="button" to="/listings">Cancel</LinkTo>
          {!listing || listing.status === 'draft' ? <><button className="button" value="draft">Save draft</button><button className="button primary" value="publish">Publish</button></> : <button className="button primary" value="revise">Save changes</button>}</div>
      </form>
      {listing && <aside className="stack">
        {['active', 'ended'].includes(listing.status) && <section className="panel padded"><h2>Listing status</h2><p><Status value={listing.status} /></p>
          <button className="button" disabled={listing.status === 'ended' && !hasRelistStock(listing)} onClick={() => setAction({ ids: [listing.id], status: listing.status === 'active' ? 'ended' : 'active' })}>{listing.status === 'active' ? 'End listing' : 'Relist'}</button>
          {listing.status === 'ended' && !hasRelistStock(listing) && <p className="muted">Add stock before relisting.</p>}</section>}
        <RelatedSales listingId={listing.id} />
        <History kind="listing" id={listing.id} />
      </aside>}
    </div>
    {action && <ListingStatusDialog action={action} close={() => setAction(null)} after={() => navigate(hrefFor(statusPath(action.status) + '&q=' + encodeURIComponent(listing.id)))} />}
  </>
}

function RelatedSales({ listingId }) {
  const { state } = useStore()
  const orderLinks = rows(state.orders)
    .filter(order => order.id && rows(order.lines).some(line => line.listingId === listingId))
    .sort((a, b) => byText(b.createdAt, a.createdAt)).slice(0, 3)
  const returnLinks = rows(state.returns)
    .filter(item => item.id && rows(item.lines).some(line => line.listingId === listingId))
    .sort((a, b) => byText(b.createdAt, a.createdAt)).slice(0, 3)
  if (!orderLinks.length && !returnLinks.length) return null
  return <section className="panel padded">
    <h2>Related records</h2>
    <ul className="record-list">
      {orderLinks.map(order => <li key={order.id}><LinkTo to={recordPath('orders', order.id)}>{order.orderNumber || order.id}</LinkTo><small>{date(order.createdAt)}</small></li>)}
      {returnLinks.map(item => <li key={item.id}><LinkTo to={recordPath('returns', item.id)}>{item.id}</LinkTo><small>{date(item.createdAt)}</small></li>)}
    </ul>
  </section>
}
