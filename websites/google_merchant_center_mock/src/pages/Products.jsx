import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { active, rows, useStore } from '../store.jsx'
import { approvals, availabilities, conditions, issuesForProduct, supportedCurrencies, visibilityOptions } from '../data/records.js'
import { changeVisibility, removeProduct, saveProduct } from '../data/products.js'
import { currencies, languages } from '../data/seed.js'
import {
  AppLink, DateText, Dialog, Empty, Facts, Field, Filter, Missing, PageHeader, Pagination, Search, Status, Thumbnail,
  feedPath, filterOptions, issuePath, label, matchesText, money, newest, productPath, useFilters, usePage, sidPath,
} from '../ui.jsx'

const catalogFilters = ['q', 'status', 'visibility', 'availability', 'country', 'feedId']
const listPath = '/products'
const unnamed = 'Untitled product'
const titleOf = (item) => item.title || item.offerId || unnamed
const compareTitle = (a, b) => titleOf(a).localeCompare(titleOf(b), 'en', { sensitivity: 'base' })
const comparePrice = (a, b) => {
  const left = a.price == null ? NaN : Number(a.price)
  const right = b.price == null ? NaN : Number(b.price)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.isFinite(right) - Number.isFinite(left)
  return left - right
}
const sameFilter = (value, filter) => !filter || value === filter
const actionLabel = (item) => item.visibility === 'hidden' ? 'Show' : 'Hide'
const otherVisibility = (item) => item.visibility === 'hidden' ? 'visible' : 'hidden'

function ProductsTable({ page, selected, onSelect, feeds, onVisibility }) {
  const pageIds = page.items.map((item) => item.id)
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someChecked = pageIds.some((id) => selected.has(id))
  return <div className="table-body" tabIndex={0} aria-label="Product results">
    <table aria-label="Products">
      <thead><tr>
        <th scope="col"><input type="checkbox" aria-label="Select all products on this page" checked={allChecked}
          ref={(input) => { if (input) input.indeterminate = !allChecked && someChecked }} onChange={() => onSelect(pageIds, !allChecked)} /></th>
        <th scope="col">Product</th><th scope="col">Status</th><th scope="col">Visibility</th><th scope="col">Availability</th>
        <th scope="col" className="money">Price</th><th scope="col">Market</th><th scope="col">Source</th><th scope="col">Actions</th>
      </tr></thead>
      <tbody>{page.items.map((item) => {
        const feed = feeds.get(item.feedId)
        return <tr key={item.id} className={selected.has(item.id) ? 'selected' : undefined}>
          <td><input type="checkbox" aria-label={'Select ' + titleOf(item) + (item.offerId ? ' (' + item.offerId + ')' : '')}
            checked={selected.has(item.id)} onChange={(event) => onSelect([item.id], event.target.checked)} /></td>
          <td><div className="product-cell"><Thumbnail item={item} /><div><AppLink to={productPath(item.id)}>{titleOf(item)}</AppLink><small className="identifier">{item.offerId || '—'}</small></div></div></td>
          <td><Status value={item.status} /></td><td>{label(item.visibility)}</td><td>{label(item.availability)}</td>
          <td className="money">{money(item.price, item.currency)}</td><td>{label(item.country)}</td>
          <td>{feed ? <AppLink to={feedPath(feed.id)}>{feed.name || 'Unnamed source'}</AppLink> : item.feedId ? 'Unavailable source' : 'Manual'}</td>
          <td><button type="button" className="row-action" aria-label={actionLabel(item) + ' ' + titleOf(item)}
            onClick={() => onVisibility(new Set([item.id]), otherVisibility(item))}>{actionLabel(item)}</button></td>
        </tr>
      })}</tbody>
    </table>
  </div>
}

export function ProductList() {
  const { state, commit, setNotice } = useStore()
  const { filters, change, clear, filtered } = useFilters(catalogFilters)
  const [sort, setSort] = useState('recent')
  const [selected, setSelected] = useState(new Set())
  const [bulk, setBulk] = useState(null)
  const products = active(state.products)
  const sources = active(state.feeds)
  const feeds = new Map(sources.map((item) => [item.id, item]))
  const sourceOptions = [['manual', 'Manual'], ...filterOptions(products, 'feedId').filter((id) => !feeds.has(id)).map((id) => [id, 'Unavailable source (' + id + ')']),
    ...sources.map((item) => [item.id, item.name || 'Unnamed source'])]
  const results = products.filter((item) => matchesText(filters.q, item.title, item.offerId, item.sku)
    && sameFilter(item.status, filters.status)
    && sameFilter(item.visibility, filters.visibility)
    && sameFilter(item.availability, filters.availability)
    && sameFilter(item.country, filters.country)
    && sameFilter(item.feedId || 'manual', filters.feedId))
  const sorters = { recent: newest, title: compareTitle, price: comparePrice }
  results.sort(sorters[sort])
  const page = usePage(results, JSON.stringify([filters, sort]))
  const selectedProducts = products.filter((item) => selected.has(item.id))
  const selectedIds = new Set(selectedProducts.map((item) => item.id))
  const numToHide = selectedProducts.filter((item) => item.visibility !== 'hidden').length
  const numToShow = selectedProducts.filter((item) => item.visibility !== 'visible').length

  function select(ids, checked) {
    setSelected((previous) => {
      const next = new Set(previous)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function applyVisibility(ids, visibility) {
    const { count } = commit((current, meta) => changeVisibility(current, meta, ids, visibility))
    if (count) setNotice(count + (count === 1 ? ' product ' : ' products ') + (visibility === 'hidden' ? 'hidden.' : 'shown.'))
  }

  const sortOptions = [['recent', 'Last updated'], ['title', 'Title A–Z'], ['price', 'Price low to high']]
  return <>
    <PageHeader title="Products" description="Browse offers, update listing attributes, and control which products are visible."
      actions={<><AppLink className="button" to="/issues">Needs attention</AppLink><AppLink className="button primary" to="/products/new">Add product</AppLink></>} />
    <section className="panel" aria-label="Catalog">
      <div className="filters">
        <Search title="Search products" placeholder="Title, SKU, or offer ID" name="q" value={filters.q} onChange={change('q')} />
        <Filter title="Status" value={filters.status} onChange={change('status')} options={[...new Set([...approvals, ...filterOptions(products, 'status')])]} />
        <Filter title="Visibility" value={filters.visibility} onChange={change('visibility')} options={visibilityOptions} />
        <Filter title="Availability" value={filters.availability} onChange={change('availability')} options={[...new Set([...availabilities, ...filterOptions(products, 'availability')])]} />
        <Filter title="Market" value={filters.country} onChange={change('country')} options={filterOptions(products, 'country')} />
        <Filter title="Source" value={filters.feedId} onChange={change('feedId')} options={sourceOptions} />
        <div className="filter"><label htmlFor="product-sort">Sort by</label><select id="product-sort" value={sort} onChange={(event) => setSort(event.target.value)}>{sortOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></div>
        {filtered && <button type="button" onClick={clear}>Clear filters</button>}
      </div>
      {selectedProducts.length > 0 && <div className="selection-bar">
        <strong>{selectedProducts.length} selected</strong>
        <button type="button" className="row-action" disabled={!numToHide} onClick={() => setBulk({ visibility: 'hidden', count: numToHide })}>Hide selected</button>
        <button type="button" className="row-action" disabled={!numToShow} onClick={() => setBulk({ visibility: 'visible', count: numToShow })}>Show selected</button>
        <button type="button" className="row-action" onClick={() => setSelected(new Set())}>Clear selection</button>
      </div>}
      {page.total > 0 ? <ProductsTable page={page} feeds={feeds} selected={selectedIds} onSelect={select} onVisibility={applyVisibility} /> : filtered
        ? <Empty title="No matching products" description="Try another search or clear the filters." />
        : <Empty title="No products yet" description="Add a manual product or create a data source."><AppLink to="/products/new" className="button">Add product</AppLink></Empty>}
      <Pagination page={page} />
    </section>
    {bulk && <Dialog title={(bulk.visibility === 'hidden' ? 'Hide' : 'Show') + ' selected products?'} confirm={bulk.visibility === 'hidden' ? 'Hide products' : 'Show products'}
      onCancel={() => setBulk(null)} onConfirm={() => {
        applyVisibility(selectedIds, bulk.visibility)
        setBulk(null)
        setSelected(new Set())
      }}><p>{bulk.count} {bulk.count === 1 ? 'product will' : 'products will'} become {bulk.visibility}.</p></Dialog>}
  </>
}

export function ProductDetail() {
  const { id } = useParams()
  const { state, commit, setNotice } = useStore()
  const [removing, setRemoving] = useState(false)
  const item = rows(state.products).find((row) => row.id === id)
  if (!item || item.deletedAt) return <Missing title={item?.deletedAt ? 'Product removed' : 'Product not found'} description={item?.deletedAt ? 'This offer has been removed from the active catalog.' : 'This offer could not be found.'} to={listPath} action="Back to products" />

  const feed = active(state.feeds).find((row) => row.id === item.feedId)
  const issues = issuesForProduct(state, id)
  const edit = productPath(id) + '/edit'
  return <>
    <PageHeader title={titleOf(item)} description={item.offerId || undefined} breadcrumbs={[[ 'Products', listPath ], [titleOf(item)]]}
      actions={<>
        <button type="button" onClick={() => {
          const visibility = otherVisibility(item)
          if (commit((current, meta) => changeVisibility(current, meta, new Set([id]), visibility)).count) setNotice('Product ' + (visibility === 'hidden' ? 'hidden.' : 'shown.'))
        }}>{actionLabel(item)} product</button>
        <AppLink className="button primary" to={edit}>Edit product</AppLink>
      </>} />
    <div className="workspace-grid">
      <section className="panel">
        <div className="panel-heading"><h2>Listing details</h2><Status value={item.status} /></div>
        <div className="content">
          <div className="record-intro"><Thumbnail item={item} large /><p>{item.description || 'No description provided.'}</p></div>
          <Facts entries={[
            ['Offer ID', item.offerId], ['SKU', item.sku], ['Brand', item.brand || '—'], ['Condition', label(item.condition)],
            ['Price', money(item.price, item.currency)], ['Availability', label(item.availability)], ['Visibility', label(item.visibility)],
            ['Market', label(item.country)], ['Language', label(item.language)], ['Landing-page URL', item.link || '—'],
            ['Image URL', item.imageLink || '—'], ['GTIN', item.gtin || '—'], ['MPN', item.mpn || '—'], ['Last updated', <DateText value={item.updatedAt} />],
          ]} />
        </div>
      </section>
      <div className="stack">
        <section className="panel">
          <div className="panel-heading"><h2>Data source</h2></div>
          <div className="content">
            {feed ? <><AppLink to={feedPath(feed.id)}>{feed.name || 'Unnamed source'}</AppLink><p className="detail-copy">Manage removal through the source.</p></>
              : item.feedId ? <p className="detail-copy">The owning source is unavailable. Product removal is managed by the source.</p>
                : <><p className="detail-copy">This product was added manually.</p><div className="review-options"><button type="button" onClick={() => setRemoving(true)}>Remove product</button></div></>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>Linked issues</h2></div>
          {issues.length ? <ul className="compact-list">{issues.map((issue) => <li key={issue.id}><AppLink to={issuePath(issue.id)}>{issue.title || label(issue.code)}</AppLink><Status value={issue.status} /></li>)}</ul>
            : <Empty title="No linked issues" />}
        </section>
      </div>
    </div>
    {removing && <Dialog title="Remove product?" confirm="Remove product" danger onCancel={() => setRemoving(false)}
      onConfirm={() => {
        const result = commit((current, meta) => removeProduct(current, meta, id))
        setRemoving(false)
        setNotice(result.error || 'Product removed.')
      }}>
      <p>Remove {titleOf(item)} from the active catalog and close its outstanding issues.</p>
    </Dialog>}
  </>
}

const identity = [['title', 'Title', true], ['offerId', 'Offer ID', true], ['brand', 'Brand'], ['condition', 'Condition', true, conditions], ['description', 'Description']]
const commerce = [['price', 'Price', true], ['currency', 'Currency', true, supportedCurrencies], ['availability', 'Availability', true, availabilities],
  ['country', 'Country', true, Object.keys(currencies)], ['language', 'Language', true, languages]]
const attributes = [['link', 'Landing-page URL', true], ['imageLink', 'Image URL'], ['gtin', 'GTIN'], ['mpn', 'MPN']]

function ProductForm({ item, state, focusField }) {
  const { commit, setNotice } = useStore()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => item ?? {
    condition: 'new', availability: 'in_stock', country: state.account?.defaultCountry || 'US',
    currency: state.account?.defaultCurrency || 'USD', language: 'en',
  })
  const [errors, setErrors] = useState({})
  const id = item?.id
  const cancelPath = id ? productPath(id) : listPath

  useEffect(() => {
    if (focusField === 'gtin' || focusField === 'imageLink') document.getElementById(focusField)?.focus()
  }, [focusField])

  function field([name, title, required, choices]) {
    const value = draft[name] ?? ''
    const options = choices && [...new Set([...choices, ...(value ? [value] : [])])]
    const readOnly = Boolean(id && name === 'offerId')
    const onChange = (event) => {
      const next = event.target.value
      setDraft((current) => ({ ...current, [name]: next }))
      setErrors((current) => ({ ...current, [name]: undefined }))
    }
    return <div key={name} className={['description', 'link', 'imageLink', 'title'].includes(name) ? 'wide' : undefined}>
      <Field name={name} title={title} required={required && !readOnly} error={errors[name]}>
        {(props) => options ? <select {...props} value={value} onChange={onChange}>
          <option value="">Choose {title.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{name === 'currency' ? option : label(option)}</option>)}
        </select> : name === 'description' ? <textarea {...props} value={value} onChange={onChange} />
          : <input {...props} inputMode={name === 'price' ? 'decimal' : name === 'gtin' ? 'numeric' : undefined} value={value} onChange={onChange} readOnly={readOnly} />}
      </Field>
    </div>
  }

  function submit(event) {
    event.preventDefault()
    const result = commit((current, meta) => saveProduct(current, meta, id, draft))
    if (result.errors) {
      setErrors(result.errors)
      document.getElementById(Object.keys(result.errors)[0])?.focus()
      return
    }
    if (result.error) {
      setNotice(result.error)
      return
    }
    if (result.state) setNotice(id ? 'Product saved.' : 'Product added.')
    navigate(sidPath(productPath(result.id)))
  }

  return <>
    <PageHeader title={id ? 'Edit product' : 'Add product'} breadcrumbs={[[ 'Products', listPath ], ...(id ? [[titleOf(item), cancelPath]] : []), [id ? 'Edit' : 'New product']]} />
    <form className="panel editor" onSubmit={submit} noValidate>
      {[['Product identity', identity], ['Price and availability', commerce], ['Listing attributes', attributes]].map(([heading, fields]) =>
        <section className="editor-section" key={heading}><h2>{heading}</h2><div className="form-grid">{fields.map(field)}</div></section>)}
      <div className="form-footer"><AppLink className="button" to={cancelPath}>Cancel</AppLink><button className="primary" type="submit">Save product</button></div>
    </form>
  </>
}

export function ProductEditor() {
  const { state } = useStore()
  const { id } = useParams()
  const { search } = useLocation()
  const item = id ? active(state.products).find((row) => row.id === id) : null
  if (id && !item) return <Missing title="Product unavailable" to={listPath} action="Back to products" />
  return <ProductForm item={item} state={state} focusField={new URLSearchParams(search).get('field')} />
}

