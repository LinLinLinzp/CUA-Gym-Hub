import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Activity, Dialog, Facts, Field, Icon, Missing, PageHead, Pager, Panel, Pill, Search, Select, SiteLink, Table, Thumbnail } from '../ui.jsx'
import { actionId, categories, date, label, list, matches, money, route, text, useStore } from '../model.js'
import { itemStatuses, updateItem, validateItem } from '../itemMutations.js'
import { withSid } from '../utils/dataManager.js'
import { exportCsv } from '../utils/csv.js'

const listingOptions = [['', 'All statuses'], ...itemStatuses.map((value) => [value, label(value)])]
const stockOptions = [['', 'All stock'], ['in', 'In stock'], ['low', 'Low stock'], ['out', 'Out of stock']]
const sortOptions = [['name', 'Item name A–Z'], ['recent', 'Recently updated']]
const columns = ['Item', 'Category', 'Price', 'Available stock', 'Listing status']
const pageSize = 15

function stockLevel(quantity) {
  if (quantity === 0) return 'out'
  if (quantity > 0 && quantity <= 10) return 'low'
  if (quantity > 10) return 'in'
  return ''
}

export function Catalog() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [stock, setStock] = useState('')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(0)
  const items = list(state.items)
  const status = params.get('status') ?? ''
  const rows = items.filter((item) => (!status || item.status === status) && (!stock || stockLevel(item.availableQuantity) === stock)
    && matches(query, item.name, item.sku, item.id, item.productId)).sort((a, b) => sort === 'recent'
    ? String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''))
    : String(a.name ?? '').localeCompare(String(b.name ?? '')))
  const activePage = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1))
  const changeFilter = (setter) => (value) => { setter(value); setPage(0) }

  return <>
    <PageHead title="Catalog" description="Manage item content, offers, and available inventory.">
      <button className="button" onClick={() => exportCsv('catalog.csv', ['Item ID', 'Name', 'SKU', ...columns.slice(1)],
        rows.map((item) => [item.id, item.name, item.sku, item.category, item.price, item.availableQuantity, label(item.status)]))}><Icon name="download" size={16} />Export CSV</button>
      <SiteLink to="/items/new" className="button primary"><Icon name="plus" size={17} />Add item</SiteLink>
    </PageHead>
    <Panel title="All listings" action={<span className="muted">{items.length} items</span>}>
      <div className="toolbar">
        <Search name="Search catalog" placeholder="Search name, SKU, item ID or product ID" value={query} onChange={changeFilter(setQuery)} />
        <Select name="Listing status" value={status} options={listingOptions} onChange={changeFilter((value) => {
          const next = new URLSearchParams(params)
          if (value) next.set('status', value)
          else next.delete('status')
          setParams(next, { replace: true })
        })} />
        <Select name="Stock" value={stock} onChange={changeFilter(setStock)} options={stockOptions} />
        <Select name="Sort by" value={sort} onChange={changeFilter(setSort)} options={sortOptions} />
      </div>
      <Table columns={columns} className="catalog-table queue-table" empty={!rows.length}>
        {rows.slice(activePage * pageSize, (activePage + 1) * pageSize).map((item) => <tr key={item.id}>
          <td><div className="product-cell"><Thumbnail type={item.imageKey ?? ['kitchen', 'home', 'outdoor', 'office', 'pet'][categories.indexOf(item.category)]} /><div>
            <SiteLink to={route('items', item.id)}>{item.name || item.id}</SiteLink><span className="meta cell-id">{text(item.sku)}</span>
          </div></div></td>
          <td>{text(item.category)}</td><td>{money(item.price)}</td>
          <td>{text(item.availableQuantity)}{['out', 'low'].includes(stockLevel(item.availableQuantity)) && <small className="meta">{item.availableQuantity === 0 ? 'Out of stock' : 'Low stock'}</small>}</td>
          <td><Pill status={item.status} /></td>
        </tr>)}
      </Table>
      <Pager page={activePage} pageSize={pageSize} total={rows.length} onPage={setPage} />
    </Panel>
  </>
}

const initialValues = { name: '', sku: '', brand: '', category: '', productId: '', description: '', price: '', fulfillment: 'seller', availableQuantity: '0' }

function ItemContentFields({ values, errors, set, create }) {
  const bind = (key) => ({ value: values[key] ?? '', onChange: (event) => set(key, event.target.value), error: errors[key] })
  const categoryOptions = categories.includes(values.category) || !values.category ? categories : [...categories, values.category]
  return <div className="form-grid">
    <Field label="Item name" required {...bind('name')} />
    {create && <Field label="SKU" required {...bind('sku')} />}
    <Field label="Brand" required {...bind('brand')} />
    <Field label="Category" as="select" required {...bind('category')}><option value="">Select a category</option>
      {categoryOptions.map((category) => <option key={category}>{category}</option>)}</Field>
    <Field label="Product ID (optional)" {...bind('productId')} />
    <div className="full-field"><Field label="Description (optional)" as="textarea" {...bind('description')} /></div>
  </div>
}

export function ItemSetup() {
  const { state, commit } = useStore()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const set = (key, value) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
    setMessage('')
  }
  function submit(event) {
    event.preventDefault()
    const status = event.nativeEvent.submitter?.value ?? 'draft'
    const nextErrors = validateItem(values, Object.keys(initialValues))
    if (list(state.items).some((item) => String(item.sku).trim().toLowerCase() === values.sku.trim().toLowerCase())) nextErrors.sku = 'This SKU is already in use.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setMessage('Check the highlighted fields.')
      return
    }
    const id = actionId('itm')
    const error = commit((latest) => updateItem(latest, { id, type: 'created', values, status }), status === 'draft' ? 'Item draft saved.' : 'Item published.')
    if (error) setMessage(error)
    else navigate(withSid(route('items', id)))
  }
  return <>
    <PageHead title="Add item" back={{ to: '/items', label: 'Catalog' }} description="Set up a listing for your catalog." />
    <Panel className="setup"><form noValidate onSubmit={submit}>
      <section><h2>Item content</h2><ItemContentFields values={values} errors={errors} set={set} create /></section>
      <section><h2>Offer and inventory</h2><div className="form-grid">
        <Field label="Price (USD)" value={values.price} inputMode="decimal" required onChange={(event) => set('price', event.target.value)} error={errors.price} />
        <Field label="Fulfillment" as="select" value={values.fulfillment} onChange={(event) => set('fulfillment', event.target.value)}>
          <option value="seller">Seller fulfilled</option><option value="walmart">Walmart fulfilled</option>
        </Field>
        <Field label="Starting stock" value={values.availableQuantity} inputMode="numeric" required onChange={(event) => set('availableQuantity', event.target.value)} error={errors.availableQuantity} />
      </div></section>
      {message && <p className="panel-note error-text" role="alert">{message}</p>}
      <footer className="setup-footer"><SiteLink to="/items" className="button">Cancel</SiteLink>
        <div><button className="button" value="draft">Save as draft</button><button className="button primary" value="published">Publish</button></div>
      </footer>
    </form></Panel>
  </>
}

const mutationTitles = {
  edited: 'Edit listing', price_updated: 'Update price', inventory_updated: 'Update inventory',
  retired: 'Retire item', published: 'Republish item',
}

export function ItemDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const item = list(state.items).find((row) => row.id === id)
  return item ? <ItemView key={id} item={item} /> : <Missing to="/items" name="Item" />
}

function ItemView({ item }) {
  const { state } = useStore()
  const [dialog, setDialog] = useState('')
  const actions = list(state.itemActions).filter((entry) => entry.itemId === item.id).map((entry) => ({
    ...entry,
    detail: [entry.actorId === state.account.actorId ? state.account.actorName : entry.actorId, entry.location,
      ...Object.entries(entry.after ?? {}).filter(([key]) => key !== 'imageKey').map(([key, value]) => key === 'price' ? money(value) : String(value))
    ].filter(Boolean).join(' · '),
    title: entry.type === 'created' ? 'Item created' : label(entry.type),
  }))
  const available = [['edited', 'Edit listing'], ['price_updated', 'Update price']]
  if (item.fulfillment === 'seller') available.push(['inventory_updated', 'Update inventory'])
  if (['published', 'unpublished'].includes(item.status)) available.push(['retired', 'Retire item'])
  if (['draft', 'retired', 'unpublished'].includes(item.status)) available.push(['published', item.status === 'draft' ? 'Publish item' : 'Republish item'])
  const activeTitle = available.find(([type]) => type === dialog)?.[1]
  const inventoryLocation = { seller: state.account.inventoryLocation, walmart: 'Walmart fulfillment' }[item.fulfillment]

  return <>
    <PageHead title={item.name || item.id} description={text(item.sku)} back={{ to: '/items', label: 'Catalog' }} badge={<Pill status={item.status} />}>
      {available.map(([type, title], index) => <button key={type} className={'button ' + (index === 0 ? 'primary' : '')} onClick={() => setDialog(type)}>{title}</button>)}
    </PageHead>
    <div className="details"><div>
      <Panel title="Item content"><Facts entries={ [['Item ID', item.id], ['SKU', item.sku], ['Brand', item.brand], ['Category', item.category], ['Product ID', item.productId]] } />
        <p className="panel-note">{item.description || 'No description provided.'}</p>
      </Panel>
      <Activity entries={actions} />
    </div><div>
      <Panel title="Offer"><Facts entries={ [['Price', money(item.price)], ['Fulfillment', item.fulfillment ? label(item.fulfillment) + ' fulfilled' : null], ['Updated', date(item.updatedAt)]] } /></Panel>
      <Panel title="Inventory"><Facts entries={ [['Available units', item.availableQuantity], ['Location', inventoryLocation]] } /></Panel>
    </div></div>
    {dialog && <ItemDialog key={dialog} item={item} type={dialog} title={activeTitle ?? mutationTitles[dialog]} onClose={() => setDialog('')} />}
  </>
}

function ItemDialog({ item, type, title, onClose }) {
  const { state, commit } = useStore()
  const [values, setValues] = useState(item)
  const [errors, setErrors] = useState({})
  const set = (key, value) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }
  const fields = { edited: ['name', 'brand', 'category', 'productId', 'description'], price_updated: ['price'], inventory_updated: ['availableQuantity'] }[type] ?? []
  const confirm = { edited: 'Save changes', price_updated: 'Save price', inventory_updated: 'Save inventory' }[type] ?? title
  function submit() {
    const nextErrors = validateItem(values, fields)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return 'Check the highlighted fields.'
    return commit((latest) => updateItem(latest, { id: item.id, type, values }), confirm === title ? title.replace(' item', '') + ' confirmed.' : 'Item changes saved.')
  }
  return <Dialog title={title} confirm={confirm} onClose={onClose} onConfirm={submit} danger={type === 'retired'} wide={type === 'edited'}>
    <p>{item.name || item.id} · {text(item.sku)}</p>
    {type === 'edited' && <ItemContentFields values={values} errors={errors} set={set} />}
    {type === 'price_updated' && <Field label="Price (USD)" inputMode="decimal" required value={values.price ?? ''} onChange={(event) => set('price', event.target.value)} error={errors.price} />}
    {type === 'inventory_updated' && <Field label="Available units" help={state.account.inventoryLocation} inputMode="numeric" required value={values.availableQuantity ?? ''} onChange={(event) => set('availableQuantity', event.target.value)} error={errors.availableQuantity} />}
    {type === 'retired' && <p>Retire this listing from the catalog. You can republish it later.</p>}
    {type === 'published' && <p>Make this listing available in the catalog.</p>}
  </Dialog>
}
