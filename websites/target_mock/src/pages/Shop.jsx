import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ArrowRight, ChevronRight, House, MapPin, Shirt, ShoppingBasket, Sparkles, Star, Store, Truck, WashingMachine, Headphones, SlidersHorizontal } from 'lucide-react'
import { useStore } from '../store.jsx'
import { byId, list, money } from '../utils/read.js'
import { categoryOptions } from '../components/Header.jsx'
import { Empty, PageHeading, ShopLink, useFeedback, useShopNavigate } from '../components/ui.jsx'
import { useStorePicker } from '../components/StorePicker.jsx'
import { ProductOffers } from '../components/OfferLabels.jsx'
import { matchesOffer } from '../domain/circle.js'
import ProductImage from '../components/ProductImage.jsx'
import { addToCart } from '../domain/cart.js'
import { pickupStock, positiveInt, validCents } from '../domain/inventory.js'

const categoryStyles = {
  home: [House, 'category-home'], household: [WashingMachine, 'category-household'],
  grocery: [ShoppingBasket, 'category-grocery'], beauty: [Sparkles, 'category-beauty'],
  electronics: [Headphones, 'category-electronics'], clothing: [Shirt, 'category-clothing'],
}
const productPath = (product) => `/p/${encodeURIComponent(product.id)}`
const brandText = (product) => product.brand || 'Target'
const searchable = (value) => String(value ?? '').toLowerCase()

export function pickupLabel(stock) {
  return stock > 3 ? 'In stock for pickup' : stock > 0 ? `Only ${stock} for pickup` : 'Unavailable for pickup'
}

function Rating({ product }) {
  return Number.isFinite(product.rating) ? <span className="rating small">
    <Star size={15} fill="currentColor" /> <strong>{product.rating.toFixed(1)}</strong>
    {Number.isFinite(product.reviewCount) && <span className="muted">({product.reviewCount})</span>}
  </span> : <span className="small muted">No ratings yet</span>
}

export function useAddItem() {
  const { transact } = useStore()
  const { notify } = useFeedback()
  return (input) => {
    const result = transact((state) => addToCart(state, input))
    if (!result.error) notify(`Added ${input.quantity} × ${result.line.title} to your cart.`, { to: '/cart', label: 'View cart' })
    return result
  }
}

function ProductCard({ product, store, state }) {
  const addItem = useAddItem()
  const [error, setError] = useState('')
  const variants = list(product.variants)
  const variant = variants[0]
  const stock = Math.max(0, ...variants.map((item) => pickupStock(state, item, store?.id)))
  const singleStock = variants.length === 1 ? stock : 0
  const quickMethod = singleStock ? 'pickup' : variant?.shippingAvailable && !variant.shippingRequiresMinimum ? 'shipping' : null
  return <article className="product-card">
    <ShopLink to={productPath(product)} className="card-image-link" aria-label={product.title || 'View product'}>
      <ProductImage product={product} variant={variant} />
    </ShopLink>
    <div className="card-content">
      <p className="small muted">{brandText(product)}</p>
      <h3><ShopLink to={productPath(product)}>{product.title || 'Product details'}</ShopLink></h3>
      <Rating product={product} />
      <p className="price">{validCents(variant?.priceCents) ? money(variant.priceCents) : 'Price unavailable'}</p>
      <p className={`small ${stock ? 'in-stock' : 'muted'}`}><Store size={14} /> {store ? pickupLabel(stock) : 'Choose a store for pickup'}</p>
      {error && <p className="small error" role="alert">{error}</p>}
      {variants.length === 1 && quickMethod && validCents(variant?.priceCents)
        ? <button className="button secondary small-quick" onClick={() => {
          const result = addItem({ productId: product.id, variantId: variant.id, quantity: 1, fulfillment: quickMethod, storeId: store?.id, source: 'catalog' })
          setError(result.error || '')
        }}>Add to cart</button>
        : <ShopLink to={productPath(product)} className="button secondary small-quick">{variants.length > 1 ? 'Choose options' : 'View details'}</ShopLink>}
    </div>
  </article>
}

export function Home() {
  const { state } = useStore()
  const pickStore = useStorePicker()
  const store = byId(state.stores, state.guest?.preferredStoreId)
  const categories = categoryOptions(state.products)
  const products = list(state.products)
  const featured = ['prod-brightroom-bin', 'prod-threshold-side-table', 'prod-gg-strawberries', 'prod-heyday-earbuds']
    .map((id) => byId(products, id)).filter(Boolean)
  for (const product of products) {
    if (featured.length >= 4) break
    if (!featured.includes(product)) featured.push(product)
  }

  return <div className="home">
    <div className="home-hero">
      <section className="shop-hero">
        <div className="hero-copy"><h1>Everyday finds for home</h1>
          <p>Shop storage, kitchen essentials and easy updates for your space.</p>
          <ShopLink className="button primary" to={categories.some(([id]) => id === 'home') ? '/c/home' : '/s?q='}>Shop home <ArrowRight size={17} /></ShopLink>
        </div>
      </section>
      <section className="hero-store">
        <span className="hero-store-icon"><MapPin size={25} /></span>
        <h2>Shop your store</h2>
        {store ? <><strong>Target {store.name || 'store'}</strong><p>{store.pickupEnabled ? 'Order Pickup available' : 'Order Pickup unavailable'}</p></> :
          <p>Choose a store to see what’s available for Order Pickup.</p>}
        <button className="button secondary" onClick={() => pickStore()}>{store ? 'Change store' : 'Choose a store'}</button>
      </section>
    </div>
    {categories.length > 0 && <section className="home-section">
      <h2>Shop by category</h2>
      <div className="category-tiles">{categories.map(([id, label]) => {
        const [Icon, color] = Object.hasOwn(categoryStyles, id) ? categoryStyles[id] : [ShoppingBasket, 'category-home']
        return <ShopLink className={`category-tile ${color}`} to={`/c/${encodeURIComponent(id)}`} key={id}><Icon size={25} />{label}<ChevronRight size={15} /></ShopLink>
      })}</div>
    </section>}
    <section className="home-section">
      <div className="section-heading"><h2>Featured products</h2><ShopLink to="/s?q=">Shop all products <ArrowRight size={16} /></ShopLink></div>
      {featured.length ? <div className="product-grid">{featured.map((product) => <ProductCard key={product.id} product={product} state={state} store={store} />)}</div> :
        <Empty title="No products available">Check back later for more products.</Empty>}
    </section>
  </div>
}

function Filters({ categories, brands, values, update, store }) {
  return <div className="stack filters">
    <label className="field">Category<select value={values.category} onChange={(event) => update('category', event.target.value)}><option value="">All categories</option>
      {categories.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
      {values.category && !categories.some(([id]) => id === values.category) && <option value={values.category}>Unavailable category</option>}
    </select></label>
    <label className="field">Brand<select value={values.brand} onChange={(event) => update('brand', event.target.value)}><option value="">All brands</option>
      {brands.map((brand) => <option key={brand}>{brand}</option>)}
    </select></label>
    <label className="field">Price<select value={values.price} onChange={(event) => update('price', event.target.value)}>
      <option value="">Any price</option><option value="under10">Under $10</option><option value="10to25">$10 to $24.99</option>
      <option value="25to50">$25 to $49.99</option><option value="50up">$50 and up</option>
    </select></label>
    <label className="check-label"><input type="checkbox" checked={values.pickup === '1'} onChange={(event) => update('pickup', event.target.checked ? '1' : '')} />
      Pickup {store?.name ? `at ${store.name}` : 'at my store'}</label>
    <button className="text-button" onClick={() => update('clear', '')}>Clear filters</button>
  </div>
}

const priceBands = { under10: [0, 999], '10to25': [1000, 2499], '25to50': [2500, 4999], '50up': [5000, Infinity] }
function productPrice(product) {
  const prices = list(product.variants).map((variant) => variant.priceCents).filter(validCents)
  return prices.length ? Math.min(...prices) : null
}

export function Catalog() {
  const { state } = useStore()
  const { categoryId } = useParams()
  const { search } = useLocation()
  const navigate = useShopNavigate()
  const { open, close } = useFeedback()
  const params = new URLSearchParams(search)
  const query = params.get('q') || ''
  const keys = ['category', 'brand', 'price', 'pickup', 'sort']
  const values = Object.fromEntries(keys.map((key) => [key, params.get(key) || '']))
  values.category = categoryId || values.category
  const categories = categoryOptions(state.products)
  const products = list(state.products)
  const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))].sort()
  const store = byId(state.stores, state.guest?.preferredStoreId)

  function update(key, value) {
    const next = new URLSearchParams(search)
    next.delete('sid')
    let path = categoryId ? `/c/${encodeURIComponent(categoryId)}` : '/s'
    if (key === 'clear') {
      for (const filter of keys) if (filter !== 'sort') next.delete(filter)
      if (categoryId) path = '/s'
    } else if (key === 'category' && categoryId) {
      path = value ? `/c/${encodeURIComponent(value)}` : '/s'
      next.delete('category')
    } else if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    navigate(`${path}?${next.toString()}`)
  }

  const terms = searchable(query).trim().split(/\s+/).filter(Boolean)
  const results = products.filter((product) => {
    const haystack = [product.title, product.brand, product.tcin, product.categoryLabel, ...list(product.keywords)].map(searchable).join(' ')
    const prices = list(product.variants).map((variant) => variant.priceCents).filter(validCents)
    const band = Object.hasOwn(priceBands, values.price) ? priceBands[values.price] : null
    return terms.every((term) => haystack.includes(term)) &&
      (!values.category || product.categoryId === values.category) &&
      (!values.brand || product.brand === values.brand) &&
      (!band || prices.some((price) => price >= band[0] && price <= band[1])) &&
      (values.pickup !== '1' || list(product.variants).some((variant) => pickupStock(state, variant, store?.id) > 0))
  })
  const relevance = (product) => terms.reduce((score, term) => score +
    (searchable(product.tcin) === term ? 12 : 0) + (searchable(product.title).includes(term) ? 4 : 0) +
    (searchable(product.brand).includes(term) ? 2 : 0), 0)
  const sorts = {
    price_low: (a, b) => (productPrice(a) ?? Infinity) - (productPrice(b) ?? Infinity),
    price_high: (a, b) => (productPrice(b) ?? -1) - (productPrice(a) ?? -1),
    rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
  }
  results.sort(Object.hasOwn(sorts, values.sort) ? sorts[values.sort] : (a, b) => relevance(b) - relevance(a))
  const title = query ? `Results for “${query}”` : categories.find(([id]) => id === categoryId)?.[1] || 'Shop all products'
  const filters = { categories, brands, values, update, store }

  return <>
    <ShopLink className="breadcrumb" to="/">Target home</ShopLink>
    <PageHeading title={title} />
    <div className="catalog-layout">
      <aside className="filter-rail panel"><h2>Filters</h2><Filters {...filters} /></aside>
      <section aria-label="Products">
        <div className="catalog-toolbar">
          <span aria-live="polite">{results.length} {results.length === 1 ? 'result' : 'results'}</span>
          <button className="button secondary mobile-filters" onClick={() => open({
            title: 'Filters', content: <><Filters {...filters} update={(key, value) => { update(key, value); close() }} /><button className="button secondary" onClick={close}>Done</button></>,
          })}><SlidersHorizontal size={16} /> Filters</button>
          <label className="sort-label">Sort by<select value={values.sort} onChange={(event) => update('sort', event.target.value)}>
            <option value="">Relevance</option><option value="price_low">Price, low to high</option>
            <option value="price_high">Price, high to low</option><option value="rating">Top rated</option>
          </select></label>
        </div>
        {results.length ? <div className="product-grid">{results.map((product) => <ProductCard key={product.id} product={product} store={store} state={state} />)}</div> :
          <Empty title="No products found" to="/s?q=" action="Shop all products">Try a different search or clear your filters.</Empty>}
      </section>
    </div>
  </>
}

export function PurchaseOptions({ product, source = 'product', initialVariantId, initialMethod, onAdded, onVariantChange }) {
  const { state } = useStore()
  const pickStore = useStorePicker()
  const addItem = useAddItem()
  const variants = list(product.variants)
  const [variantId, setVariantId] = useState(initialVariantId || variants[0]?.id)
  const variant = byId(variants, variantId) || variants[0]
  const store = byId(state.stores, state.guest?.preferredStoreId)
  const stock = pickupStock(state, variant, store?.id)
  const [selection, setSelection] = useState(initialMethod === 'pickup' && stock ? 'pickup' : '')
  const method = selection || (variant?.shippingAvailable ? 'shipping' : 'pickup')
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const max = method === 'pickup' && stock ? stock : 99
  const invalid = !variant || !validCents(variant.priceCents) || !positiveInt(quantity) || quantity > max ||
    (method === 'pickup' ? !stock : !variant?.shippingAvailable)

  return <form className="stack" onSubmit={(event) => {
    event.preventDefault()
    if (invalid) return
    const result = addItem({ productId: product.id, variantId: variant.id, quantity, fulfillment: method, storeId: store?.id, source })
    setError(result.error || '')
    if (!result.error) onAdded?.()
  }}>
    {variants.length > 1 && <label className="field">Option<select value={variant?.id || ''} onChange={(event) => {
      setVariantId(event.target.value); onVariantChange?.(event.target.value); setQuantity(1); setError(''); setSelection('')
    }}>{variants.map((item) => <option key={item.id} value={item.id}>{item.label || 'Standard'}</option>)}</select></label>}
    <p className="price">{validCents(variant?.priceCents) ? money(variant.priceCents) : 'Price unavailable'}</p>
    <div className="fulfillment-options" role="group" aria-label="Fulfillment">
      <label className={`choice ${method === 'shipping' ? 'selected' : ''}`}>
        <input type="radio" name="product-method" checked={method === 'shipping'} onChange={() => { setSelection('shipping'); setError('') }} disabled={!variant?.shippingAvailable} />
        <Truck size={19} /><span><strong>Shipping</strong><small>{variant?.shippingAvailable ? (variant.shippingRequiresMinimum ? 'Ships with a $35 shipping subtotal' : 'Available to ship') : 'Unavailable'}</small></span>
      </label>
      <label className={`choice ${method === 'pickup' ? 'selected' : ''}`}>
        <input type="radio" name="product-method" checked={method === 'pickup'} onChange={() => { setSelection('pickup'); setQuantity(1); setError('') }} />
        <Store size={19} /><span><strong>Order Pickup</strong><small>{store ? pickupLabel(stock) : 'Choose a store'}</small></span>
      </label>
    </div>
    <div className="cluster"><span className="small muted">{store ? `Pickup at Target ${store.name || 'store'}` : 'Choose a store before pickup'}</span>
      <button className="text-button" type="button" onClick={() => pickStore()}>{store ? 'Change store' : 'Choose a store'}</button>
    </div>
    <div className="purchase-actions"><label className="field">Quantity<input type="number" min="1" max={max} value={quantity || ''} onChange={(event) => { setQuantity(Number(event.target.value)); setError('') }} /></label>
      <button className="button primary" type="submit" disabled={invalid}>Add to cart</button></div>
    {error && <p className="error" role="alert">{error}</p>}
  </form>
}

export function Product() {
  const { productId } = useParams()
  const { state } = useStore()
  const product = byId(state.products, productId) || list(state.products).find((item) => item.tcin === productId)
  if (!product) return <Empty title="Product unavailable" to="/s?q=" action="Continue shopping">We couldn’t find this product.</Empty>
  return <ProductDetails key={product.id} product={product} state={state} />
}

function ProductDetails({ product, state }) {
  const [selected, setSelected] = useState(null)
  const variant = byId(product.variants, selected) || list(product.variants)[0]
  const offers = list(state.offers).filter((offer) => offer.scope !== 'order' && matchesOffer(offer, product))
  return <>
    <div className="breadcrumbs"><ShopLink to="/">Target</ShopLink><ChevronRight size={15} />
      <ShopLink to={product.categoryId ? `/c/${encodeURIComponent(product.categoryId)}` : '/s?q='}>{product.categoryLabel || 'Products'}</ShopLink></div>
    <div className="product-layout">
      <div className="detail-image"><ProductImage product={product} variant={variant} eager /></div>
      <section className="panel stack">
        <p className="muted">{brandText(product)}</p><h1>{product.title || 'Product details'}</h1><Rating product={product} />
        <PurchaseOptions product={product} onVariantChange={setSelected} />
        <ProductOffers offers={offers} state={state} />
      </section>
    </div>
    <div className="panel product-info stack">
      <h2>About this item</h2><p>{product.description || 'Product details are currently unavailable.'}</p>
      {product.tcin && <p className="small muted">TCIN {product.tcin}</p>}
      <h2>Shipping & returns</h2><p>{list(product.variants).some((item) => item.shippingAvailable) ? 'Standard shipping is available for eligible options. Order Pickup is free where in stock.' : 'Available for Order Pickup at participating stores.'}</p>
      <p>{list(product.returnMethods).length ? `Return within ${product.returnDays || 'the eligible number of'} days ${list(product.returnMethods).map((method) => method === 'store' ? 'in store' : 'by mail').join(' or ')}.` : 'Final sale or return information unavailable.'}</p>
    </div>
  </>
}
