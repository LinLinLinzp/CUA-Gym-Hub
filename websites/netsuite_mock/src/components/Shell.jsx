import { useEffect, useId, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme, useWorkspace } from '../context/Workspace.jsx'
import { codeOf, documentNo, label, partyOf, records, rows } from '../utils/model.js'
import { homePath, listPath, queuePath, recordPath, resolveRoute, stockPath } from '../utils/routes.js'
import { AppLink, useAppNavigate } from './Navigation.jsx'

const navigation = [
  ['Transactions', [
    ['Sales', [
      ['Enter Sales Orders', recordPath('salesord')], ['Sales Orders', listPath('salesord')], ['Approve Sales Orders', queuePath('approvesalesorders')],
      ['Fulfill Orders', queuePath('itemshipmanager')], ['Item Fulfillments', listPath('itemship')], ['Bill Sales Orders', queuePath('billingmanager')],
      ['Create Invoices', recordPath('custinvc')], ['Invoices', listPath('custinvc')],
    ]],
    ['Purchases', [
      ['Enter Purchase Orders', recordPath('purchord')], ['Purchase Orders', listPath('purchord')], ['Approve Purchase Orders', queuePath('approvetransactions', 'group=purchase')],
      ['Receive Orders', queuePath('receiveorders')], ['Item Receipts', listPath('itemrcpt')], ['Bill Purchase Orders', queuePath('billingmanager', 'group=purchase')],
      ['Vendor Bills', listPath('vendbill')], ['Order Items', queuePath('orderitems')], ['Pay Bills', queuePath('paybills')],
      ['Vendor Payments', listPath('vendpymt')],
    ]],
    ['Inventory', [
      ['Adjust Inventory', recordPath('invadjst')], ['Inventory Adjustments', listPath('invadjst')],
      ['Transfer Inventory', recordPath('invtrnfr')], ['Inventory Transfers', listPath('invtrnfr')], ['Current Inventory Status', stockPath],
    ]],
    ['Customers', [['Accept Customer Payments', recordPath('custpymt')], ['Customer Payments', listPath('custpymt')]]],
    ['Transaction Search', queuePath('transactionsearch')],
  ]],
  ['Lists', [
    ['Relationships', [['Customers', listPath('custjob')], ['Vendors', listPath('vendor')]]],
    ['Accounting', [['Items', listPath('item')], ['New Inventory Item', recordPath('item')]]],
  ]],
  ['Activities', [['Tasks', '/app/workspace/tasks'], ['User Notes', '/app/workspace/notes']]],
]

const searchCodes = {
  sales: ['salesord'], so: ['salesord'], po: ['purchord'], invo: ['custinvc'], inv: ['custinvc', 'item'],
  it: ['item'], item: ['item'], cu: ['custjob'], ve: ['vendor'],
}

function Search() {
  const { state } = useWorkspace()
  const id = useId()
  const navigate = useAppNavigate()
  const location = useLocation()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const input = text.trim().toLowerCase()
  const prefix = /^([a-z]+):\s*(.*)$/.exec(input)
  const knownPrefix = prefix && Object.hasOwn(searchCodes, prefix[1])
  const codes = knownPrefix ? searchCodes[prefix[1]] : Object.keys(records)
  const term = knownPrefix ? prefix[2] : input
  const results = term ? codes.flatMap((code) => rows(state, records[code].key).map((entry) => ({ entry, code })))
    .filter(({ entry }) => [documentNo(entry), label(entry), entry.tranId, entry.otherRefNum, entry.companyName, entry.email, partyOf(state, entry)].some((field) => String(field || '').toLowerCase().includes(term))).slice(0, 12) : []
  const visible = open && !!input
  useEffect(() => { setOpen(false); setText(''); setIndex(0) }, [location.pathname, location.search])
  function choose(result) {
    setOpen(false)
    setText('')
    if (result) navigate(recordPath(result.code, result.entry))
    else navigate(queuePath('transactionsearch', new URLSearchParams({ q: term })))
  }
  return <form className="search" role="search" onSubmit={(event) => { event.preventDefault(); if (input) choose(results[index]) }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <span aria-hidden="true" className="search-icon">⌕</span>
    <input type="search" role="combobox" aria-label="Global search" placeholder="Search records" value={text} autoComplete="off"
      aria-autocomplete="list" aria-controls={id} aria-expanded={visible}
      aria-activedescendant={visible && results[index] ? `${id}-${index}` : undefined}
      onFocus={() => setOpen(true)}
      onChange={(event) => { setText(event.target.value); setOpen(true); setIndex(0) }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          setOpen(true)
          setIndex(Math.max(0, Math.min(results.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))))
        }
        if (event.key === 'Escape') setOpen(false)
      }} />
    {visible && <div id={id} className="popup" role="listbox" aria-label="Search results">
      {results.map((result, row) => <div key={`${result.code}-${result.entry.id ?? row}`} id={`${id}-${row}`} role="option" aria-selected={row === index}
        onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setIndex(row)} onClick={() => choose(result)}>
        <strong>{documentNo(result.entry)}</strong>{label(result.entry) !== documentNo(result.entry) && ` · ${label(result.entry)}`}
        <small>{records[result.code].title}</small>
      </div>)}
      {!results.length && <div className="popup-empty">No matching records.</div>}
    </div>}
  </form>
}

function NavNodes({ nodes, location }) {
  const current = resolveRoute(location.pathname, location.search)
  return nodes.map(([title, target]) => {
    if (Array.isArray(target)) {
      const includesCurrent = (entries) => entries.some(([, item]) => Array.isArray(item) ? includesCurrent(item) : isCurrent(item))
      return <details key={title} open={includesCurrent(target) || undefined}><summary>{title}</summary><div>{<NavNodes nodes={target} location={location} />}</div></details>
    }
    return <AppLink key={title} to={target} aria-current={isCurrent(target) ? 'page' : undefined}>{title}</AppLink>
  })
  function isCurrent(path) {
    const [pathname, query] = path.split('?')
    const route = resolveRoute(pathname, query)
    return route.page === current.page && route.code === current.code && route.queue === current.queue && route.section === current.section
      && (route.page !== 'record' || !new URLSearchParams(location.search).has('id'))
  }
}

export default function Shell({ children }) {
  const { state } = useWorkspace()
  const theme = useTheme()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const company = state.company?.name || 'Cascade Industrial Supply'
  useEffect(() => { setMobileOpen(false) }, [location.pathname, location.search])
  return <div className="workspace" data-theme={theme}>
    <header className="utility">
      <button type="button" className="mobile-menu" aria-expanded={mobileOpen} aria-controls="workspace-nav" onClick={() => setMobileOpen(!mobileOpen)}>Menu</button>
      <AppLink className="brand" to={homePath}>NetSuite</AppLink>
      <Search />
      <div className="utility-account">
        <details className="utility-menu"><summary aria-label="Shortcuts">☆</summary>
          <div className="popup">{rows(state, 'shortcuts').filter((item) => typeof item.path === 'string' && /^\/(?![\/\\])/.test(item.path)).map((item, index) => <AppLink key={item.id ?? index} to={item.path}>{item.label}</AppLink>)}
            <AppLink to="/app/workspace/shortcuts">Manage Shortcuts</AppLink>
          </div>
        </details>
        <details className="utility-menu"><summary className="account-name">
          <span className="avatar" aria-hidden="true">{state.currentUser?.initials || 'JE'}</span>
          <span><strong>{state.currentUser?.name || 'Jordan Ellis'}</strong><small>{company} · {state.currentUser?.role || 'Administrator'}</small></span>
        </summary><div className="popup"><AppLink to="/app/workspace/preferences">Set Preferences</AppLink></div></details>
      </div>
    </header>
    <aside className={`rail ${mobileOpen ? 'opened' : ''}`} id="workspace-nav">
      <nav aria-label="Main navigation"><NavNodes nodes={[[ 'Home', homePath ], ...navigation]} location={location} /></nav>
    </aside>
    <main className="work-area" id="main-content">{children}</main>
  </div>
}

export function RelatedLink({ type, record, children }) {
  const code = codeOf(type)
  return record && code ? <AppLink to={recordPath(code, record)}>{children || documentNo(record)}</AppLink> : (children || '—')
}
