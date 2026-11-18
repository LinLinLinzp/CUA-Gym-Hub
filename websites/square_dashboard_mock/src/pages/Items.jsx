import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { cents, contains, find, metadata, money, nameOf, newId, replace, rows, stamp, inputCents, whole } from '../model.js'
import { useStore } from '../store.jsx'
import { choices, Confirm, Field, Header, ListCard, Notice, options, Recovery, RouteLink, Search, Select, Status, Table, useFilters, useRoute } from '../ui.jsx'

const itemStatuses = choices(['active', 'archived'])
const sortOptions = [['name', 'Name A–Z'], ['price', 'Price low to high'], ['edited', 'Last edited']]
const prices = (item) => rows(item.variations).map((variant) => cents(variant.price)).filter((value) => value !== null)
const itemPath = (id) => '/items/' + encodeURIComponent(id)

export function Items() {
  const { state } = useStore()
  const [filters, change, reset] = useFilters({ sort: 'name' })
  const items = rows(state.items).filter((item) =>
    contains(filters.query || '', item.name, ...rows(item.variations).map((variant) => variant.sku))
    && (!filters.category || item.categoryId === filters.category)
    && (!filters.status || item.status === filters.status),
  )
  items.sort((a, b) => {
    if (filters.sort === 'price') return (Math.min(...prices(a)) - Math.min(...prices(b))) || 0
    if (filters.sort === 'edited') return (stamp(b.updatedAt) || 0) - (stamp(a.updatedAt) || 0)
    return (a.name || '').localeCompare(b.name || '')
  })
  return <>
    <Header title="Item library" subtitle="Manage the products, variations and stock in your catalog." action={<RouteLink className="button primary" to="/items/new">+ Create item</RouteLink>} />
    <div className="filters">
      <Search title="Search items" placeholder="Item name or SKU" value={filters.query || ''} change={(value) => change('query', value)} />
      <Select title="Category" value={filters.category} change={(value) => change('category', value)} options={options(rows(state.categories))} empty="All categories" />
      <Select title="Status" value={filters.status} change={(value) => change('status', value)} options={itemStatuses} empty="All statuses" />
      <Select title="Sort by" value={filters.sort} change={(value) => change('sort', value)} options={sortOptions} />
    </div>
    <ListCard count={items.length} noun="item">
      <Table label="Items" headings={['Item', 'Category', 'Variations / SKU', '$Price', '$Stock', 'Status']} entries={items} reset={filters.query || filters.category || filters.status ? reset : null} empty="No items found." render={(item, index) => {
        const variants = rows(item.variations)
        const amounts = prices(item)
        const low = Math.min(...amounts)
        const high = Math.max(...amounts)
        const stocks = variants.map((variant) => whole(variant.stock)).filter((value) => value !== null)
        const category = nameOf(state.categories, item.categoryId)
        const palette = rows(state.categories).findIndex((entry) => entry.id === item.categoryId)
        return <tr key={item.id ?? index}>
          <td><div className="item-cell"><span className={'swatch shade-' + (palette % 5)} aria-hidden="true">{(category === '—' ? item.name : category)?.[0] || '•'}</span>
            {item.id ? <RouteLink to={itemPath(item.id)}>{item.name || item.id}</RouteLink> : item.name || 'Unnamed item'}</div></td>
          <td>{category}</td><td>{variants.length ? <>{variants.length === 1 ? variants[0].name || '1 variation' : variants.length + ' variations'}<div className="muted small">{variants.map((variant) => variant.sku).filter(Boolean).join(', ')}</div></> : '—'}</td>
          <td className="number">{money(low / 100, state.account?.currency)}{low < high && ' – ' + money(high / 100, state.account?.currency)}</td>
          <td className="number">{stocks.length ? stocks.reduce((sum, value) => sum + value, 0) : '—'}</td><td><Status value={item.status} /></td>
        </tr>
      }} />
    </ListCard>
  </>
}

function formOf(item) {
  const variations = rows(item?.variations)
  return {
    name: item?.name ?? '', description: item?.description ?? '', categoryId: item?.categoryId ?? '',
    variations: (variations.length ? variations : [{ name: 'Regular', sku: '', price: '', stock: '' }]).map((variant, index) => ({
      key: String(index), id: variant.id, name: variant.name ?? '', sku: variant.sku ?? '', price: String(variant.price ?? ''), stock: String(variant.stock ?? ''),
    })),
  }
}

function normalize(form, current, state) {
  const errors = {}
  const name = form.name.trim()
  if (!name) errors.name = 'Enter an item name.'
  const used = new Set(rows(state.items).filter((item) => item.id !== current?.id).flatMap((item) =>
    rows(item.variations).map((variant) => String(variant.sku ?? '').trim().toLowerCase()).filter(Boolean)))
  const variations = form.variations.map((draft) => {
    const key = draft.key
    const variantName = draft.name.trim()
    const sku = draft.sku.trim()
    const lower = sku.toLowerCase()
    const price = inputCents(draft.price)
    const stock = whole(draft.stock)
    if (!variantName) errors[key + 'name'] = 'Enter a variation name.'
    if (sku && used.has(lower)) errors[key + 'sku'] = 'This SKU is already in use.'
    if (sku) used.add(lower)
    if (price === null) errors[key + 'price'] = 'Enter a nonnegative price with up to two decimals.'
    if (stock === null) errors[key + 'stock'] = 'Enter a nonnegative whole number.'
    return { ...find(current?.variations, draft.id), id: draft.id, name: variantName, sku, price: price === null ? null : price / 100, stock }
  })
  return { errors, next: { name, description: form.description.trim(), categoryId: form.categoryId || null, variations } }
}

function matches(current, next) {
  const saved = rows(current.variations)
  return current.name === next.name && (current.description ?? '') === next.description && (current.categoryId ?? null) === next.categoryId
    && saved.length === next.variations.length && next.variations.every((variant, index) =>
      variant.id === saved[index].id && variant.name === saved[index].name && variant.sku === (saved[index].sku ?? '')
      && cents(variant.price) === cents(saved[index].price) && variant.stock === whole(saved[index].stock),
    )
}

export function ItemRoute() {
  const { itemId } = useParams()
  const { state } = useStore()
  const item = find(state.items, itemId)
  if (itemId && !item) return <Recovery title="Item unavailable" message="This item could not be found." to="/items" action="Back to items" />
  return <ItemEditor key={itemId || 'new'} item={item} />
}

function ItemEditor({ item }) {
  const { state, commit } = useStore()
  const route = useRoute()
  const [form, set] = useState(() => formOf(item))
  const [original, setOriginal] = useState(() => JSON.stringify(formOf(item)))
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [confirmationError, setConfirmationError] = useState('')
  const [unchanged, setUnchanged] = useState(false)
  const update = (field, value) => set((current) => ({ ...current, [field]: value }))
  const updateVariant = (key, field, value) => set((current) => ({
    ...current, variations: current.variations.map((variant) => variant.key === key ? { ...variant, [field]: value } : variant),
  }))
  function submit(event) {
    event.preventDefault()
    setUnchanged(false)
    const result = commit((latest) => {
      const current = find(latest.items, item?.id)
      if (item && (!current || JSON.stringify(formOf(current)) !== original)) return { errors: { form: 'This item changed. Reopen it before saving.' } }
      const { errors: problems, next } = normalize(form, current, latest)
      if (Object.keys(problems).length) return { errors: problems }
      if (current && matches(current, next)) return { unchanged: true }
      const meta = metadata(latest)
      const saved = {
        id: newId('itm'), status: 'active', createdAt: meta.updatedAt,
        ...current, ...next, ...meta,
        variations: next.variations.map((variant) => ({ ...variant, id: variant.id || newId('var') })),
      }
      return { state: { ...latest, items: current ? replace(latest.items, saved) : [...rows(latest.items), saved] }, id: saved.id, item: saved, message: current ? 'Item updated.' : 'Item created.' }
    })
    setErrors(result.errors || {})
    if (result.unchanged) setUnchanged(true)
    if (result.item) {
      set(formOf(result.item))
      setOriginal(JSON.stringify(formOf(result.item)))
      if (!item) route(itemPath(result.item.id))
    }
  }
  function changeStatus() {
    const result = commit((latest) => {
      const current = find(latest.items, item.id)
      if (!current || current.status !== confirm.from) return { error: 'This item’s status has already changed.' }
      const saved = { ...current, status: confirm.to, ...metadata(latest) }
      return { state: { ...latest, items: replace(latest.items, saved) }, id: item.id, message: confirm.to === 'archived' ? 'Item archived.' : 'Item restored.' }
    })
    if (result.error) return setConfirmationError(result.error)
    setConfirm(null)
  }
  const archive = item?.status === 'active'
  const canChange = archive || item?.status === 'archived'
  const categories = options(rows(state.categories))
  if (form.categoryId && !find(state.categories, form.categoryId)) categories.push([form.categoryId, 'Unavailable category'])
  const showError = (field) => errors[field] && <small id={'error-' + field} className="error">{errors[field]}</small>
  const invalid = (field) => ({ 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? 'error-' + field : undefined })
  return <>
    <Header title={item ? item.name || 'Edit item' : 'Create item'} subtitle={item ? 'Edit catalog details and variation availability.' : 'Add a product and its first variation to the catalog.'} back={['/items', 'Items']} action={item && <Status value={item.status} />} />
    {item && !unchanged && <Notice id={item.id} />}
    {unchanged && <p className="notice" role="status">No changes to save.</p>}
    <form className="grid" onSubmit={submit} noValidate>
      <div className="stack">
        <section className="card">
          <h2>Item details</h2>
          <div className="form-grid">
            <Field label="Item name"><input value={form.name} onChange={(event) => update('name', event.target.value)} {...invalid('name')} />{showError('name')}</Field>
            <Select title="Category" value={form.categoryId} change={(value) => update('categoryId', value)} options={categories} empty="Uncategorized" />
            <Field label="Description" className="wide"><textarea value={form.description} onChange={(event) => update('description', event.target.value)} /></Field>
          </div>
        </section>
        <section className="card">
          <div className="section-heading"><h2>Variations</h2><button type="button" className="button secondary" onClick={() => update('variations', [...form.variations, { key: newId('draft'), name: '', sku: '', price: '', stock: '' }])}>Add variation</button></div>
          {form.variations.map((variant, index) => <fieldset className="variant" key={variant.key}>
            <legend>Variation {index + 1}</legend>
            <div className="form-grid">
              {Object.entries({ name: 'Variation name', sku: 'SKU', price: 'Price', stock: 'Stock' }).map(([field, title]) => {
                const error = variant.key + field
                return <Field key={field} label={title}><input inputMode={field === 'price' ? 'decimal' : field === 'stock' ? 'numeric' : undefined} value={variant[field]} onChange={(event) => updateVariant(variant.key, field, event.target.value)} {...invalid(error)} />{showError(error)}</Field>
              })}
            </div>
            {form.variations.length > 1 && <button type="button" className="text-button" onClick={() => update('variations', form.variations.filter((entry) => entry.key !== variant.key))}>Remove variation {index + 1}</button>}
          </fieldset>)}
        </section>
      </div>
      <aside className="card">
        <h2>Catalog actions</h2>
        {Object.keys(errors).length > 0 && <p className="error" role="alert">{errors.form || 'Review the highlighted fields.'}</p>}
        <div className="side-actions"><button className="button primary" type="submit">{item ? 'Save changes' : 'Create item'}</button><RouteLink className="button secondary" to="/items">Cancel</RouteLink></div>
        {canChange && <button type="button" className="text-button" onClick={() => { setConfirmationError(''); setConfirm({ from: item.status, to: archive ? 'archived' : 'active' }) }}>{archive ? 'Archive item' : 'Restore item'}</button>}
      </aside>
    </form>
    {confirm && <Confirm title={confirm.to === 'archived' ? 'Archive this item?' : 'Restore this item?'} action={confirm.to === 'archived' ? 'Archive item' : 'Restore item'} close={() => setConfirm(null)} submit={changeStatus} error={confirmationError}>
      {confirm.to === 'archived' ? 'The item will move to the archived catalog. Existing order details are retained.' : 'The item will return to the active catalog.'}
    </Confirm>}
  </>
}
