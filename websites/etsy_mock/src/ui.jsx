import React, { cloneElement, useId } from 'react'
import { ArrowRight, Heart, Store as ShopIcon } from 'lucide-react'
import { LocalLink, pathFor, useStore } from './store.jsx'
import { byId, findFavorite, list, money, human, toggleFavorite } from './model.js'

export const artist = (state, id) => byId(state.shops, id)?.name || 'Independent shop'
export const ButtonLink = ({ secondary, className = '', ...props }) => <LocalLink className={'button ' + (secondary ? 'secondary ' : '') + className} {...props} />
export const TextLink = ({ children, ...props }) => <LocalLink className="text-link" {...props}>{children} <ArrowRight size={16} aria-hidden="true" /></LocalLink>
export const Heading = ({ title, children, action }) => <header className="page-heading"><div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</header>
export const Empty = ({ title, children }) => <section className="panel empty"><h2>{title}</h2>{children}</section>
export const Missing = ({ title = 'Page unavailable', to = '/', label = 'Back to overview' }) => <Empty title={title}><ButtonLink to={to} secondary>{label}</ButtonLink></Empty>
export const ErrorNote = ({ children }) => children ? <p className="error" role="alert">{children}</p> : null
export const Status = ({ value }) => <span className={'status status-' + value}>{human(value)}</span>
export function Field({ label, children, hint }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {cloneElement(children, { id, 'aria-describedby': hint ? id + '-hint' : undefined })}
    {hint && <small id={id + '-hint'}>{hint}</small>}
  </div>
}
export const Choose = ({ options, placeholder = 'Select an option', ...props }) => <select {...props}>
  {placeholder && <option value="">{placeholder}</option>}
  {Object.entries(options).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
</select>
export function Art({ src, className = '', alt = '' }) {
  const fallback = '/images/fallback.png'
  const source = typeof src === 'string' && /^\/images\/[\w.-]+$/.test(src) ? src : fallback
  return <img className={'art ' + className} src={source} alt={alt} loading="lazy"
    onError={(event) => { if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback }} />
}
export function FavoriteButton({ type = 'listing', id, title, floating = false }) {
  const { state, commit, notify } = useStore()
  const saved = Boolean(findFavorite(state, type, id))
  const label = type === 'shop' ? (saved ? 'Unfollow shop' : 'Follow shop') : saved ? 'Remove from favorites' : 'Add to favorites'
  const click = () => {
    try {
      commit((current, at) => toggleFavorite(current, type, id, at))
      notify(type === 'shop' ? (saved ? 'Shop unfollowed.' : 'Shop followed.') : saved ? 'Item removed from favorites.' : 'Item saved to favorites.')
    } catch (error) { notify(error.message) }
  }
  return <button type="button" className={floating ? 'heart' : 'button secondary'} aria-pressed={saved}
    aria-label={floating && title ? label + ': ' + title : label} onClick={click}>
    <Heart size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{!floating && label}
  </button>
}
export function ListingGrid({ listings, context = '', extra }) {
  const { state } = useStore()
  return <div className="product-grid">{listings.map((listing) => {
    const url = pathFor('listing', listing.id) + context
    return <article className="product-card" key={listing.id}>
      <div className="product-media"><LocalLink to={url} tabIndex={-1} aria-hidden="true"><Art src={listing.image} /></LocalLink>
        <FavoriteButton id={listing.id} title={listing.title} floating /></div>
      <div className="product-copy"><LocalLink className="product-title" to={url}>{listing.title || 'Untitled listing'}</LocalLink>
        <small>{artist(state, listing.shopId)}</small>
        <div className="product-price">{money(listing.price, listing.currency)}{!(Number(listing.stock) > 0) && <span className="status">Sold out</span>}</div>
        {extra?.(listing)}
      </div>
    </article>
  })}</div>
}
export function ShopCard({ shop, context = '' }) {
  return <article className="panel shop-card"><span className="initials"><ShopIcon size={19} aria-hidden="true" /></span>
    <div><LocalLink className="product-title" to={pathFor('shop', shop.id) + context}>{shop.name || 'Independent shop'}</LocalLink>
      {shop.location && <small>{shop.location}</small>}</div><FavoriteButton type="shop" id={shop.id} />
  </article>
}
export function LineItems({ items, currency, compact = false }) {
  return <div className={compact ? 'line-items compact' : 'line-items'}>{list(items).map((item, i) => <div className="receipt-line" key={item.id || i}>
    <Art src={item.image} />
    <div>{item.listingId ? <LocalLink className="product-title" to={pathFor('listing', item.listingId)}>{item.title || 'View listing'}</LocalLink>
      : <strong>{item.title || 'Item'}</strong>}
      <small>Qty {item.quantity ?? '—'}{list(item.variants).length > 0 && ' · ' + item.variants.map((option) => option.label || option.optionId).join(', ')}</small>
      {item.personalization && <small>Personalization: {item.personalization}</small>}
    </div>
    <strong>{money(item.lineTotal ?? Number(item.unitPrice) * Number(item.quantity), currency)}</strong>
  </div>)}</div>
}
export function Totals({ subtotal, shipping, tax, total, currency }) {
  return <dl className="totals">
    <div><dt>Items</dt><dd>{money(subtotal, currency)}</dd></div><div><dt>Shipping</dt><dd>{money(shipping, currency)}</dd></div>
    <div><dt>Tax</dt><dd>{money(tax, currency)}</dd></div><div><dt>Total</dt><dd>{money(total, currency)}</dd></div>
  </dl>
}
export const matches = (query, ...fields) => fields.filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())
