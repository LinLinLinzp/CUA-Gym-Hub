import { useState } from 'react'
import { useStore } from '../context/Store.jsx'
import { array, find, productTitle } from '../data/model.js'
import { editGift, ownedRegistry, purchaseGift, registryItems, registryTitle, remainingGiftQuantity } from '../data/registries.js'
import { ButtonLink, Dialog, Feedback, Field, Photo, encoded, money } from './UI.jsx'
import { SiteLink } from '../utils/navigation.jsx'

export function ProductGift({ product }) {
  const { state, commit } = useStore()
  const registries = array(state.registries).filter(registry => ownedRegistry(state, registry))
  const [open, setOpen] = useState(false)
  const [registryId, setRegistryId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState(null)
  const close = () => { setOpen(false); setFeedback(null) }
  return <div className="stack small-gap">
    <button type="button" className="button secondary" onClick={() => {
      setRegistryId(registries[0]?.id || ''); setQuantity(1); setFeedback(null); setOpen(true)
    }}>Add to Registry</button>
    {!open && <Feedback success>{feedback?.message}</Feedback>}
    {open && <Dialog title="Add to Registry" onClose={close}>
      {registries.length ? <form className="stack" onSubmit={event => {
        event.preventDefault()
        const result = commit(editGift, { registryId, type: 'add', quantity: Number(quantity), productId: product.id })
        if (result.state) { setOpen(false); setFeedback({ message: `Added to ${registryTitle(result.registry)}.` }) }
        else setFeedback({ error: result.error })
      }}>
        <p>{productTitle(product)}</p>
        <Field label="Registry"><select value={registryId} required onChange={event => setRegistryId(event.target.value)}>{registries.map(registry => <option key={registry.id} value={registry.id}>{registryTitle(registry)}</option>)}</select></Field>
        <Field label="Gift quantity"><input type="number" required min="1" value={quantity} onChange={event => setQuantity(event.target.value)} /></Field>
        <Feedback>{feedback?.error}</Feedback>
        <div className="actions"><button className="button primary">Add gift</button><button type="button" className="button secondary" onClick={close}>Cancel</button></div>
      </form> : <div className="stack"><p>Create a registry to add this item.</p><ButtonLink to="/registry/new">Create a registry</ButtonLink></div>}
    </Dialog>}
  </div>
}

function CatalogGiftSearch({ registry }) {
  const { state, commit } = useStore()
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState(null)
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const results = array(state.catalog).filter(product => product.registryEligible && terms.every(term => [product.title, product.brand, product.department].join(' ').toLowerCase().includes(term)))
  const product = find(results, selection)
  return <section className="panel stack">
    <h2>Add gifts</h2>
    <form className="stack" onSubmit={event => {
      event.preventDefault()
      if (!product) return
      const result = commit(editGift, { registryId: registry.id, type: 'add', quantity: Number(quantity), productId: product.id })
      setFeedback(result.error ? { error: result.error } : { message: `${productTitle(product)} added.` })
      if (result.state) setQuantity(1)
    }}>
      <Field label="Search catalog"><input type="search" value={query} placeholder="Product name, brand or department" onChange={event => {
        setQuery(event.target.value); setSelection(''); setFeedback(null)
      }} /></Field>
      {results.length ? <>
        <div className="field-row">
          <Field label="Gift product"><select value={selection} required onChange={event => setSelection(event.target.value)}>
            <option value="">Select a product</option>{results.map(item => <option key={item.id} value={item.id}>{productTitle(item)}{item.variant ? ` · ${item.variant}` : ''}</option>)}
          </select></Field>
          <Field label="Gift quantity"><input type="number" required min="1" value={quantity} onChange={event => setQuantity(event.target.value)} /></Field>
        </div>
        <div><button className="button primary" disabled={!product}>Add gift</button></div>
      </> : <p className="muted">No eligible catalog items match.</p>}
      <Feedback success={!feedback?.error}>{feedback?.error || feedback?.message}</Feedback>
    </form>
  </section>
}

function PurchaseDialog({ item, registry, owner, onClose, onDone }) {
  const { state, commit } = useStore()
  const [quantity, setQuantity] = useState(1)
  const [giverName, setGiverName] = useState(owner ? state.profile?.name || '' : '')
  const [retailer, setRetailer] = useState(owner ? 'Walmart' : '')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  return <Dialog title="Mark as purchased" onClose={onClose}><form className="stack" onSubmit={event => {
    event.preventDefault()
    const result = commit(purchaseGift, { itemId: item.id, registryId: registry.id, quantity: Number(quantity), giverName, retailer, reference })
    if (result.state) onDone('Purchase recorded.')
    else setError(result.error)
  }}>
    <p><strong>{productTitle(item.product)}</strong> · {remainingGiftQuantity(item)} still requested</p>
    <Field label="Quantity purchased"><input type="number" min="1" max={remainingGiftQuantity(item)} required value={quantity} onChange={event => setQuantity(event.target.value)} /></Field>
    <Field label="Giver name"><input maxLength={100} required value={giverName} onChange={event => setGiverName(event.target.value)} /></Field>
    <Field label="Retailer"><input maxLength={100} required value={retailer} onChange={event => setRetailer(event.target.value)} /></Field>
    <Field label="Order or receipt reference (optional)"><input maxLength={100} value={reference} onChange={event => setReference(event.target.value)} /></Field>
    <Feedback>{error}</Feedback>
    <div className="actions"><button className="button primary">Record purchase</button><button className="button secondary" type="button" onClick={onClose}>Cancel</button></div>
  </form></Dialog>
}

function GiftRow({ item, registry, owner }) {
  const { state, commit } = useStore()
  const [quantity, setQuantity] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [purchase, setPurchase] = useState(false)
  const product = find(state.catalog, item.productId)
  const title = productTitle(item.product || product)
  return <article className={owner ? 'gift-row' : 'panel product-card'}>
    <Photo path={item.product?.imagePath || product?.imagePath} />
    <div className="stack small-gap gift-description">
      <h3>{product ? <SiteLink to={`/item/${encoded(product.id)}`}>{title}</SiteLink> : title}</h3>
      <p className="small muted">{item.product?.variant || product?.variant}</p>
      <p><strong>{item.quantityPurchased ?? 0}</strong> of <strong>{item.quantityRequested ?? 0}</strong> purchased</p>
      {!owner && Number.isFinite(product?.price) && <p>{money(product.price)}</p>}
      <Feedback success={!feedback?.error}>{feedback?.error || feedback?.message}</Feedback>
    </div>
    <div className="stack small-gap gift-actions">
      {owner && <form className="actions gift-quantity" onSubmit={event => {
        event.preventDefault()
        const result = commit(editGift, { registryId: registry.id, itemId: item.id, type: 'quantity', quantity: Number(quantity ?? item.quantityRequested ?? 1) })
        if (result.state) setQuantity(null)
        setFeedback(result.error ? { error: result.error } : { message: 'Requested quantity updated.' })
      }}>
        <Field label="Requested quantity"><input type="number" min={Math.max(1, Number(item.quantityPurchased) || 0)} required value={quantity ?? item.quantityRequested ?? 1} onChange={event => setQuantity(event.target.value)} /></Field>
        <button className="button secondary">Update</button>
      </form>}
      <div className="actions">
        {remainingGiftQuantity(item) > 0 && <button className="button secondary" onClick={() => setPurchase(true)}>Mark as purchased</button>}
        {owner && <button className="text-button" onClick={() => {
          const result = commit(editGift, { registryId: registry.id, itemId: item.id, type: 'remove' })
          if (result.error) setFeedback({ error: result.error })
        }}>Remove</button>}
      </div>
    </div>
    {purchase && <PurchaseDialog item={item} registry={registry} owner={owner} onClose={() => setPurchase(false)} onDone={message => {
      setPurchase(false); setFeedback({ message })
    }} />}
  </article>
}

export function RegistryGifts({ registry, owner = false }) {
  const items = registryItems(registry)
  return <>
    {owner && <CatalogGiftSearch registry={registry} />}
    <section className={`stack ${owner ? 'panel' : ''}`} aria-label="Registry gifts">
      <h2>Gifts ({items.length})</h2>
      {items.length ? <div className={owner ? 'line-list' : 'registry-grid'}>{items.map((item, index) =>
        <GiftRow key={item.id ?? index} item={item} registry={registry} owner={owner} />)}</div>
        : <p className="muted">{owner ? 'Search the catalog to add your first gift.' : 'This registry has no gifts yet.'}</p>}
    </section>
  </>
}
