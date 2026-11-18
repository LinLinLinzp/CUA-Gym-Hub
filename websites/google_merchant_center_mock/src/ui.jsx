import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { withSid } from './utils/dataManager.js'

const labels = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia', DE: 'Germany', FR: 'France', JP: 'Japan',
  en: 'English', fr: 'French', de: 'German', es: 'Spanish', ja: 'Japanese',
  missing_gtin: 'Missing GTIN', missing_image: 'Missing product image', feed_validation: 'Source rows rejected',
  setup_policy: 'Store information needs review', file_upload: 'File upload', scheduled_fetch: 'Scheduled fetch',
  never_run: 'Never run', website_check: 'Request website check', fixed: 'Request review', disagree: 'I disagree',
  error: 'Error', warning: 'Warning',
}
export function label(value) {
  if (value == null || value === '') return '—'
  return labels[value] || String(value).replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

export const productPath = (id) => '/products/' + encodeURIComponent(id)
export const feedPath = (id) => '/data-sources/' + encodeURIComponent(id)
export const issuePath = (id) => '/issues/' + encodeURIComponent(id)
export const sidPath = withSid

export function AppLink({ to, nav = false, children, ...props }) {
  const path = sidPath(to)
  const Component = nav ? NavLink : Link
  return <Component to={path} {...props}>{children}</Component>
}

export function Thumbnail({ item, large = false }) {
  const key = ['pack', 'bottle', 'lantern', 'throw', 'pouch', 'mug'].includes(item?.thumbnailKey) ? item.thumbnailKey : 'plain'
  return <span aria-hidden="true" className={'thumbnail art-' + key + (large ? ' thumbnail-large' : '')}><i /></span>
}

export function DateText({ value }) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf())
    ? <time dateTime={date.toISOString()}>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</time> : '—'
}

export function money(value, currency) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(value) }
  catch { return String(value) }
}

const statusTone = {
  approved: 'good', success: 'good', visible: 'good', in_stock: 'good', resolved: 'good',
  limited: 'warning', partial: 'warning', warning: 'warning',
  failed: 'danger', disapproved: 'danger', error: 'danger', out_of_stock: 'danger',
  pending: 'pending', under_review: 'pending', submitted: 'pending', preorder: 'pending', backorder: 'pending',
}
export function Status({ value }) {
  return <span className={'pill ' + (statusTone[value] || 'neutral')}>{label(value)}</span>
}

export function PageHeader({ title, description, actions, eyebrow, breadcrumbs }) {
  return <>
    {breadcrumbs?.length > 0 && <nav className="crumbs" aria-label="Breadcrumb">
      {breadcrumbs.map(([name, path], index) => <span key={name + index}>{index > 0 && <span className="crumb-separator">/</span>}{path ? <AppLink to={path}>{name}</AppLink> : <span aria-current="page">{name}</span>}</span>)}
    </nav>}
    <div className="page-header">
      <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  </>
}

export function Missing({ title = 'Page not found', description = 'The requested page may have moved or been removed.', to = '/', action = 'Back to overview' }) {
  return <><PageHeader title={title} description={description} /><AppLink to={to} className="button">{action}</AppLink></>
}

export function Empty({ title, description, children }) {
  return <div className="empty"><strong>{title}</strong>{description && <p>{description}</p>}{children}</div>
}

export function Field({ name, title, error, children, hint, required = false }) {
  return <div className="field">
    <label htmlFor={name} className={required ? 'required-indicator' : undefined}>{title}</label>
    {children({ id: name, name, 'aria-invalid': error ? true : undefined, 'aria-required': required || undefined,
      'aria-describedby': [hint && name + '-hint', error && name + '-error'].filter(Boolean).join(' ') || undefined })}
    {hint && <span className="field-hint" id={name + '-hint'}>{hint}</span>}
    {error && <span className="field-error" id={name + '-error'}>{error}</span>}
  </div>
}

export function Filter({ title, value, options, onChange }) {
  const id = useId()
  return <div className="filter"><label htmlFor={id}>{title}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">All</option>
    {options.map((option) => {
      const [key, name] = Array.isArray(option) ? option : [option, label(option)]
      return <option key={key} value={key}>{name}</option>
    })}
  </select></div>
}

export function Search({ value, onChange, placeholder, title = 'Search', name }) {
  return <label className="filter search"><span>{title}</span><input name={name} type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>
}

export function useFilters(keys) {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const defaults = Object.fromEntries(keys.map((key) => [key, params.get(key) || '']))
  const [filters, setFilters] = useState(defaults)
  const change = (key) => (value) => setFilters((current) => ({ ...current, [key]: value }))
  const clear = () => setFilters(Object.fromEntries(keys.map((key) => [key, ''])))
  return { filters, change, clear, filtered: Object.values(filters).some(Boolean) }
}

export function usePage(items, key, size = 20) {
  const [cursor, setCursor] = useState({ key, index: 0 })
  const pages = Math.max(1, Math.ceil(items.length / size))
  const index = cursor.key === key ? Math.min(cursor.index, pages - 1) : 0
  const start = index * size
  return { items: items.slice(start, start + size), index, pages, start, total: items.length, size, move: (index) => setCursor({ index, key }) }
}

export function Pagination({ page }) {
  return <div className="pagination">
    <span>{page.total ? (page.start + 1) + '–' + Math.min(page.start + page.size, page.total) + ' of ' + page.total : '0 results'}</span>
    <div className="actions">
      <button type="button" disabled={page.index === 0} onClick={() => page.move(page.index - 1)}>Previous</button>
      <span>Page {page.index + 1} of {page.pages}</span>
      <button type="button" disabled={page.index + 1 >= page.pages} onClick={() => page.move(page.index + 1)}>Next</button>
    </div>
  </div>
}

export function Facts({ entries }) {
  return <dl className="facts">{entries.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? '—'}</dd></div>)}</dl>
}

export function Dialog({ title, children, onCancel, onConfirm, confirm = 'Confirm', disabled = false, danger = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const node = ref.current
    node.showModal()
    return () => {
      node.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); if (!disabled) onCancel() }}>
    <form onSubmit={(event) => { event.preventDefault(); onConfirm() }} noValidate>
      <h2 id="dialog-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="actions dialog-actions">
        <button type="button" onClick={onCancel} disabled={disabled}>Cancel</button>
        <button type="submit" disabled={disabled} className={danger ? 'danger-button' : 'primary'}>{confirm}</button>
      </div>
    </form>
  </dialog>
}

export const matchesText = (query, ...values) => {
  const needle = query.trim().toLowerCase()
  return !needle || values.some((value) => String(value ?? '').toLowerCase().includes(needle))
}

export const filterOptions = (items, key) => [...new Set(items.map((item) => item[key]).filter(Boolean))].sort()
export const newest = (a, b) => String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? ''))

