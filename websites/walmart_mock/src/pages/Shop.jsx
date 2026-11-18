import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Baby, Box, Cat, CookingPot, Gamepad2, House, MapPin, Search as SearchIcon, ShoppingBasket, SlidersHorizontal, Sparkles, Truck } from 'lucide-react'
import { ProductGift } from '../components/RegistryGifts.jsx'
import { useStore } from '../context/Store.jsx'
import { addToCart } from '../data/cart.js'
import { activeLines, array, cartStore, modeNames, productTitle, quantityLimit } from '../data/model.js'
import { SiteLink } from '../utils/navigation.jsx'
import { Back, ButtonLink, Dialog, Empty, Feedback, Field, Photo, encoded, localImage, money } from '../components/UI.jsx'

const departments = [
  ['Grocery', ShoppingBasket], ['Household Essentials', Sparkles], ['Electronics', Gamepad2], ['Home', House],
  ['Baby', Baby], ['Toys', Box], ['Beauty', CookingPot], ['Pets', Cat],
]
const departmentPath = department => `/search?category=${encoded(department)}`
const productPath = product => `/item/${encoded(product.id)}`

function availability(product, store) {
  return ['pickup', 'shipping'].filter(mode => quantityLimit(product, mode, store) > 0)
}

function Stock({ modes }) {
  if (!modes.length) return <span className="stock unavailable">Out of stock</span>
  return <div className="stock">{modes.map(mode => mode === 'pickup'
    ? <span key={mode}><MapPin size={15} aria-hidden="true" /> Pickup available</span>
    : <span key={mode}><Truck size={15} aria-hidden="true" /> Shipping available</span>)}</div>
}

function AddControl({ product, detail = false }) {
  const { state, commit } = useStore()
  const store = cartStore(state)
  const modes = availability(product, store)
  const [chosenMode, setChosenMode] = useState('')
  const mode = modes.includes(chosenMode) ? chosenMode : modes[0]
  const [quantity, setQuantity] = useState(1)
  const [feedback, setFeedback] = useState(null)
  const existing = activeLines(state.cart, mode).find(line => line.productId === product.id)
  const limit = Math.max(0, quantityLimit(product, mode, store) - (Number(existing?.quantity) || 0))
  if (!mode) return null
  return <form className="add-control stack small-gap" onSubmit={event => {
    event.preventDefault()
    const result = commit(addToCart, { productId: product.id, fulfillmentMode: mode, quantity: detail ? Number(quantity) : 1 })
    setFeedback(result.error ? { error: result.error } : { message: 'Added to cart.' })
    if (result.state) setQuantity(1)
  }}>
    {detail && <div className="field-row">
      <Field label="Fulfillment"><select value={mode} onChange={event => { setChosenMode(event.target.value); setQuantity(1); setFeedback(null) }}>{modes.map(value => <option value={value} key={value}>{modeNames[value]}</option>)}</select></Field>
      <Field label="Quantity"><input type="number" min="1" max={limit || 1} value={quantity} required onChange={event => setQuantity(event.target.value)} /></Field>
    </div>}
    <button className="button primary" disabled={limit === 0} aria-label={detail ? undefined : `Add ${productTitle(product)} to cart`}>{limit === 0 ? 'Cart limit reached' : 'Add to cart'}</button>
    <Feedback success={!feedback?.error}>{feedback?.error || feedback?.message}</Feedback>
  </form>
}

export function ProductCard({ product }) {
  const { state } = useStore()
  const modes = availability(product, cartStore(state))
  return <article className="panel product-card">
    <SiteLink to={productPath(product)} className="product-image-link" tabIndex={-1} aria-hidden="true"><Photo path={product.imagePath} /></SiteLink>
    <div className="product-card-details">
      <div className="price-line"><strong>{Number.isFinite(product.price) ? money(product.price) : 'Price unavailable'}</strong>{product.previousPrice > product.price && <del>{money(product.previousPrice)}</del>}</div>
      <h3><SiteLink to={productPath(product)}>{productTitle(product)}</SiteLink></h3>
      <p className="small muted">{[product.variant, product.seller && `Sold by ${product.seller}`].filter(Boolean).join(' · ')}</p>
      <Stock modes={modes} />
    </div>
    <AddControl product={product} />
  </article>
}

function ProductGrid({ products }) {
  return <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id ?? index} product={product} />)}</div>
}

export function Home() {
  const { state } = useStore()
  const store = cartStore(state)
  const departmentsInCatalog = new Set(array(state.catalog).map(product => product.department).filter(Boolean))
  const featured = array(state.catalog).filter(product => product.featured).slice(0, 8)
  const products = featured.length ? featured : array(state.catalog).slice(0, 8)
  return <div className="stack wide-gap">
    <section className="storefront-lead">
      <div className="shop-hero">
        <div className="hero-copy stack">
          <h1>Everyday essentials</h1>
          <p>Shop groceries, home favorites and more.</p>
          <ButtonLink to="/search">Shop all items <ArrowRight size={16} aria-hidden="true" /></ButtonLink>
        </div>
        <div className="hero-products" aria-hidden="true">
          <Photo path="/images/bananas.webp" />
          <Photo path="/images/coffee.webp" />
          <Photo path="/images/paper-towels.webp" />
        </div>
      </div>
      <aside className="pickup-tile stack">
        <div className="tile-icon"><MapPin size={23} aria-hidden="true" /></div>
        <h2>Store pickup</h2>
        <p>{store?.name || 'Find a participating store.'}</p>
        <ButtonLink kind="secondary" to="/pickup/reserve">Reserve a time</ButtonLink>
      </aside>
    </section>
    <section className="stack">
      <h2>Shop by department</h2>
      <div className="department-grid">{departments.map(([name, Icon]) => <SiteLink key={name} to={departmentPath(name)} className="department-card">
        <Icon size={25} aria-hidden="true" /><span>{name}</span>
      </SiteLink>)}</div>
      {[...departmentsInCatalog].some(name => !departments.some(([known]) => known === name)) && <SiteLink to="/search">Browse all departments</SiteLink>}
    </section>
    <section className="stack">
      <div className="section-heading"><h2>Featured items</h2><SiteLink to="/search">View all items</SiteLink></div>
      {products.length ? <ProductGrid products={products} /> : <Empty title="No products available">Check back for more items.</Empty>}
    </section>
  </div>
}

function SearchFilters({ params, change, categories }) {
  return <div className="stack">
    <Field label="Department"><select value={params.get('category') || ''} onChange={event => change('category', event.target.value)}>
      <option value="">All departments</option>{categories.map(category => <option key={category}>{category}</option>)}
    </select></Field>
    <Field label="Fulfillment"><select value={params.get('fulfillment') || ''} onChange={event => change('fulfillment', event.target.value)}>
      <option value="">All options</option><option value="pickup">Pickup</option><option value="shipping">Shipping</option>
    </select></Field>
    <Field label="Availability"><select value={params.get('availability') || ''} onChange={event => change('availability', event.target.value)}>
      <option value="">All items</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option>
    </select></Field>
    <Field label="Minimum price"><input type="number" min="0" step=".01" value={params.get('minPrice') || ''} onChange={event => change('minPrice', event.target.value)} placeholder="$0" /></Field>
    <Field label="Maximum price"><input type="number" min="0" step=".01" value={params.get('maxPrice') || ''} onChange={event => change('maxPrice', event.target.value)} placeholder="Any price" /></Field>
    <button className="button secondary" onClick={() => change('', '')}>Clear filters</button>
  </div>
}

export function SearchPage() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const products = array(state.catalog)
  const store = cartStore(state)
  const query = params.get('q')?.trim() || ''
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const category = params.get('category') || ''
  const categories = [...new Set([category, ...departments.map(([name]) => name), ...products.map(product => product.department)].filter(Boolean))].sort()
  const mode = params.get('fulfillment')
  const stock = params.get('availability')
  const sort = params.get('sort') || 'relevance'
  const min = params.get('minPrice')
  const max = params.get('maxPrice')
  const results = products.filter(product => {
    const terms = [product.title, product.brand, product.department].join(' ').toLowerCase()
    const modes = availability(product, store)
    const inStock = mode ? modes.includes(mode) : modes.length > 0
    return words.every(word => terms.includes(word)) &&
      (!category || product.department === category) &&
      (stock === 'out-of-stock' ? !inStock : (mode || stock === 'in-stock') ? inStock : true) &&
      (!min || product.price >= Number(min)) && (!max || product.price <= Number(max))
  })
  const title = product => productTitle(product).toLowerCase()
  const score = product => words.reduce((sum, word) => sum + (title(product).includes(word) ? 1 : 0), 0)
  results.sort((a, b) => {
    const priceA = Number.isFinite(a.price) ? a.price : null
    const priceB = Number.isFinite(b.price) ? b.price : null
    let difference = score(b) - score(a)
    if (sort === 'price-asc' || sort === 'price-desc') {
      difference = priceA === null || priceB === null ? Number(priceA === null) - Number(priceB === null)
        : (sort === 'price-asc' ? 1 : -1) * (priceA - priceB)
    }
    return difference || title(a).localeCompare(title(b)) || String(a.id).localeCompare(String(b.id))
  })
  const change = (key, value) => {
    const updated = new URLSearchParams(params)
    if (!key) ['category', 'fulfillment', 'availability', 'minPrice', 'maxPrice'].forEach(name => updated.delete(name))
    else if (value) updated.set(key, value)
    else updated.delete(key)
    setParams(updated, { replace: true })
  }
  const filterProps = { params, change, categories }
  return <div className="stack">
    <Back to="/">Shop</Back>
    <h1>{query ? `Results for “${query}”` : category || 'Shop all items'}</h1>
    <div className="search-layout">
      <aside className="panel desktop-filters stack"><h2>Filters</h2><SearchFilters {...filterProps} /></aside>
      <section className="stack">
        <div className="section-heading panel search-toolbar">
          <p className="muted" role="status"><SearchIcon size={16} aria-hidden="true" /> {results.length} {results.length === 1 ? 'result' : 'results'}</p>
          <button className="button secondary mobile-filters" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /> Filters</button>
          <label className="sort"><span>Sort by</span><select value={sort} onChange={event => change('sort', event.target.value === 'relevance' ? '' : event.target.value)}>
            <option value="relevance">Relevance</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option>
          </select></label>
        </div>
        {results.length ? <ProductGrid products={results} /> : <Empty title="No items found">Try searching for another item or changing your filters.</Empty>}
      </section>
    </div>
    {filtersOpen && <Dialog title="Filters" onClose={() => setFiltersOpen(false)}><SearchFilters {...filterProps} /><button className="button primary space-top" onClick={() => setFiltersOpen(false)}>Show results</button></Dialog>}
  </div>
}

function Gallery({ product }) {
  const paths = [...new Set([product.imagePath, ...(Array.isArray(product.galleryPaths) ? product.galleryPaths : [])].map(localImage).filter(Boolean))]
  const [selected, setSelected] = useState('')
  const path = paths.includes(selected) ? selected : paths[0]
  return <div className="panel stack product-detail-image">
    <Photo path={path} title={productTitle(product)} />
    {paths.length > 1 && <div className="gallery-options" aria-label="Product views">
      {paths.map((image, index) => <button className="gallery-choice" aria-pressed={path === image} type="button" aria-label={`View product image ${index + 1}`} key={image} onClick={() => setSelected(image)}><Photo path={image} /></button>)}
    </div>}
  </div>
}

export function ProductPage({ record: product }) {
  const { state } = useStore()
  const modes = availability(product, cartStore(state))
  const related = product.department ? array(state.catalog).filter(item => item.id !== product.id && item.department === product.department).slice(0, 4) : []
  return <div className="stack">
    <Back to={product.department ? departmentPath(product.department) : '/search'}>{product.department || 'Shop all items'}</Back>
    <article className="detail-grid">
      <Gallery product={product} />
      <div className="panel stack product-detail-copy">
        {product.brand && <p className="small muted">{product.brand}</p>}
        <h1>{productTitle(product)}</h1>
        {product.variant && <p>{product.variant}</p>}
        <div className="price-line"><strong>{Number.isFinite(product.price) ? money(product.price) : 'Price unavailable'}</strong>{product.previousPrice > product.price && <del>{money(product.previousPrice)}</del>}</div>
        <p className="small muted">{product.seller ? `Sold by ${product.seller}` : 'Seller unavailable'}</p>
        <Stock modes={modes} />
        {product.description && <p>{product.description}</p>}
        <AddControl product={product} detail />
        {product.registryEligible && <ProductGift product={product} />}
      </div>
    </article>
    {related.length > 0 && <section className="stack space-top"><h2>Related items</h2><ProductGrid products={related} /></section>}
  </div>
}
