import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { getSessionId, withSid } from './utils/dataManager.js'
import { activity, localFileUrl, useStore, withRecord } from './store.jsx'

export function Icon({ name, size = 20 }) {
  const paths = {
    competitions: 'M8 21h8m-4-4v4M7 4h10v8a5 5 0 0 1-10 0V4Zm0 2H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4',
    code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-2-15-4 18',
    datasets: 'M4 6c0 4 16 4 16 0S4 2 4 6v12c0 4 16 4 16 0V6M4 12c0 4 16 4 16 0',
    arrow: 'M4 12h15m-6-6 6 6-6 6',
    chevron: 'm6 9 6 6 6-6',
    search: 'M15.5 15.5 21 21M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z',
    plus: 'M12 5v14M5 12h14',
    workspace: 'M4 4h16v16H4zM4 9h16m-9 0v11',
    clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4',
    file: 'M6 3h8l4 4v14H6zM14 3v5h4M9 13h6m-6 4h6',
    close: 'm6 6 12 12M18 6 6 18',
    check: 'm5 12 5 5 9-10',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function AppLink({ to, nav, ...props }) {
  const Component = nav ? NavLink : Link
  return <Component to={withSid(to)} {...props} />
}
export function useAppNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}
export const titleOf = (record, fallback = 'Untitled') => record.title?.trim() || fallback
export const count = (value = 0) => Number(value ?? 0).toLocaleString('en-US')
export const date = (value) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : '—'
export const deadline = (value, closed) => {
  if (closed) return 'Closed'
  if (!value || !Number.isFinite(Date.parse(value))) return 'Deadline unavailable'
  const days = Math.ceil((Date.parse(value) - new Date().getTime()) / 86400000)
  return days > 1 ? `${days} days left` : days >= 0 ? 'Due within a day' : 'Deadline passed'
}
export const languageName = (value) => ({ r: 'R', python: 'Python' }[value] ?? 'Notebook')
export const bytes = (value) => value >= 1048576 ? `${(value / 1048576).toFixed(1)} MB`
  : value >= 1024 ? `${(value / 1024).toFixed(1)} KB` : `${value ?? 0} B`
export const compareUpdated = (a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)
export const matches = (term, ...values) => values.flat().some(value => String(value ?? '').toLowerCase().includes(term.trim().toLowerCase()))
export const optionsFrom = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map(value => [value, value])

export function Heading({ type, eyebrow, title, description, actions }) {
  return <header className="page-heading">
    <div>
      {eyebrow && <p className="eyebrow">{type && <Icon name={type} size={16} />}{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className="intro">{description}</p>}
    </div>
    {actions && <div className="actions">{actions}</div>}
  </header>
}
export function Empty({ title = 'Nothing to show yet', children }) {
  return <div className="empty"><h2>{title}</h2>{children && <p>{children}</p>}</div>
}
export function Missing({ group, label = 'Page' }) {
  return <><Heading title={`${label} unavailable`} description="This link may point to a record that is missing or unavailable to this account." />
    <AppLink className="button secondary" to={group ? `/${group}` : '/'}>{group ? 'Back to catalog' : 'Back to home'}</AppLink></>
}
export function Art({ type, variant = 0 }) {
  return <div className={`catalog-art art-${type} art-${variant % 3}`} aria-hidden="true">
    <div className="art-grid" /><span className="art-outline" /><span className="art-icon"><Icon name={type} size={26} /></span>
  </div>
}
export function Tags({ values }) {
  return values?.length ? <div className="tags">{values.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div> : null
}
export function Table({ headers, rows, empty }) {
  if (!rows.length) return <Empty title={empty} />
  return <div className="table-scroll"><table>
    <thead><tr>{headers.map((label, index) => <th scope="col" key={index}>{label}</th>)}</tr></thead>
    <tbody>{rows.map(([key, ...cells]) => <tr key={key}>{cells.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
  </table></div>
}
export function Catalog({ records, filters, sorts, sortDefault, render, label, description, type, actions, searchPlaceholder }) {
  const [params, setParams] = useSearchParams()
  const search = useRef(null)
  useEffect(() => {
    const onKey = event => {
      if (event.key !== '/' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey
        || event.target.closest?.('input, select, textarea, [contenteditable], dialog')) return
      event.preventDefault()
      search.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const query = params.get('q') ?? ''
  const order = sorts.find(sort => sort[0] === params.get('sort')) ?? sorts.find(sort => sort[0] === sortDefault) ?? sorts[0]
  const filtered = records.filter(record => filters.every((filter) => {
    const value = params.get(filter.key)
    return !value || !filter.options.some(([key]) => key === value) || filter.match(record, value)
  })).filter(record => matches(query, record.search)).sort(order[2])
  const maxPage = Math.max(1, Math.ceil(filtered.length / 12))
  const page = Math.max(1, Math.min(maxPage, parseInt(params.get('page'), 10) || 1))
  function nextParams() {
    const next = new URLSearchParams(params)
    const sid = getSessionId()
    if (sid && !next.has('sid')) next.set('sid', sid)
    return next
  }
  function change(key, value) {
    const next = nextParams()
    if (key !== 'page') next.delete('page')
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: key === 'q' })
  }
  return <>
    <Heading title={label} eyebrow="Explore Kaggle" type={type} description={description} actions={actions} />
    <div className="catalog-controls panel">
      <label className="search-field">Search <span className="search-input"><Icon name="search" size={18} /><input ref={search} type="search"
        placeholder={searchPlaceholder} value={query} onChange={event => change('q', event.target.value)} /><kbd>/</kbd></span></label>
      {filters.map(filter => <label key={filter.key}>{filter.label}<select value={filter.options.some(([key]) => key === params.get(filter.key)) ? params.get(filter.key) : ''}
        onChange={event => change(filter.key, event.target.value)}><option value="">{filter.any}</option>
        {filter.options.map(([key, text]) => <option value={key} key={key}>{text}</option>)}</select></label>)}
      <label>Sort by<select value={order[0]} onChange={event => change('sort', event.target.value)}>
        {sorts.map(([key, text]) => <option value={key} key={key}>{text}</option>)}</select></label>
    </div>
    <div className="results-bar"><span role="status">{count(filtered.length)} {filtered.length === 1 ? type === 'code' ? 'notebook' : label.toLowerCase().slice(0, -1)
      : type === 'code' ? 'notebooks' : label.toLowerCase()}</span>
      {(query || filters.some(filter => params.has(filter.key))) && <button className="text-button" onClick={() => {
        const next = nextParams()
        for (const key of ['q', 'page', ...filters.map(filter => filter.key)]) next.delete(key)
        setParams(next)
      }}>Clear filters</button>}
    </div>
    {filtered.length ? <div className="card-grid">{filtered.slice((page - 1) * 12, page * 12).map(render)}</div>
      : <Empty title="No matching results">Try a different search or change the filters.</Empty>}
    {maxPage > 1 && <nav className="pagination" aria-label="Catalog pages">
      <button className="button secondary" disabled={page === 1} onClick={() => change('page', page - 1)}>Previous</button>
      <span>Page {page} of {maxPage}</span>
      <button className="button secondary" disabled={page === maxPage} onClick={() => change('page', page + 1)}>Next</button>
    </nav>}
  </>
}

export function Modal({ title, onClose, children, busy }) {
  const dialog = useRef(null)
  useEffect(() => {
    const node = dialog.current
    const previous = document.activeElement
    node.showModal()
    return () => {
      node.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="dialog-heading"><h2>{title}</h2><button type="button" className="icon-button" disabled={busy} aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>
}
export function FormActions({ onCancel, busy, submit, pending = 'Saving…' }) {
  return <div className="actions form-actions">
    {onCancel && <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Cancel</button>}
    <button className="button" type="submit" disabled={busy}>{busy ? pending : submit}</button>
  </div>
}
export const ErrorMessage = ({ error }) => error ? <p className="error" role="alert">{error}</p> : null

export function DownloadFile({ file, readDownload, onError }) {
  const { command } = useStore()
  const url = localFileUrl(file)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  async function download() {
    if (pending.current || !url) return
    pending.current = true
    setBusy(true)
    onError('')
    try {
      const response = await fetch(url, { headers: { Accept: 'application/octet-stream' } })
      if (!response.ok) throw new Error('This file is unavailable.')
      const blob = await response.blob()
      if (!command(state => {
        const fields = readDownload(state)
        return fields && withRecord(state, 'downloads', activity(state, { ...fields, status: 'requested' }))
      })) throw new Error('This file is no longer available to your account.')
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = file.name ?? 'download'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (error) {
      onError(error.message || 'Download failed.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return <button className="button secondary compact" disabled={!url || busy} onClick={download}>
    <Icon name="download" size={16} /> {busy ? 'Downloading…' : 'Download File'}
  </button>
}
export function Visibility({ item }) {
  return <span className={`badge ${item.visibility === 'public' ? 'good' : ''}`}>{item.visibility === 'public' ? 'Public' : item.visibility === 'private' ? 'Private' : 'Visibility unavailable'}</span>
}
