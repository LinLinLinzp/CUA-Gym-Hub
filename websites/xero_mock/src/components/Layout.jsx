import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { SidLink, useSidNavigate } from './SidLink.jsx';
import { Menu, Modal, Field, Button, PageHeader, DataTable } from './UI.jsx';
import { displayStatus } from '../utils/status.js';
import { unreconciledCount } from '../utils/reconcile.js';
import { fmtMoney } from '../utils/money.js';
import { reportDefinitions } from '../utils/ledger.js';
export const navigation = {
  Sales: [['Sales overview', '/sales'], ['Invoices', '/invoices'], ['Quotes', '/quotes'], ['Products and services', '/products'], ['Customers', '/contacts?type=customers'], ['Sales settings', '/settings/invoice']],
  Purchases: [['Purchases overview', '/purchases'], ['Bills', '/bills'], ['Purchase orders', '/purchase-orders'], ['Suppliers', '/contacts?type=suppliers'], ['Purchases settings', '/settings/invoice']],
  Reporting: [['All reports', '/reports'], ...reportDefinitions.filter(d => !d[0].endsWith('Detail') && d[0] !== 'AccountTransactions').map(d => [d[1], `/reports/${d[2]}`])],
  Accounting: [['Bank accounts', '/bank-accounts'], ['Chart of accounts', '/chart-of-accounts'], ['Manual journals', '/manual-journals'], ['Bank rules', '/bank-rules'], ['Accounting settings', '/settings/financial']],
  Tax: [['VAT returns', '/reports/vat-return'], ['Tax rates', '/settings/tax-rates']],
  Contacts: [['All contacts', '/contacts'], ['Customers', '/contacts?type=customers'], ['Suppliers', '/contacts?type=suppliers']]
};
export function searchGroups(state, q) {
  if (!q.trim()) return [];
  const text = q.toLowerCase(),
    num = q.replaceAll(',', ''),
    contact = id => (state.contacts || []).find(c => c.id === id)?.name || '';
  return [['Contacts', (state.contacts || []).filter(c => [c.name, c.email, c.accountNumber, c.firstName, c.lastName].join(' ').toLowerCase().includes(text)).map(c => ({
    id: c.id,
    title: c.name,
    caption: c.email,
    path: `/contacts/${c.id}`
  }))], ['Invoices', (state.invoices || []).filter(d => [d.invoiceNumber, d.reference, d.contactName, contact(d.contactId)].join(' ').toLowerCase().includes(text) || Number(num) === d.total).map(d => ({
    id: d.id,
    title: d.invoiceNumber,
    caption: `${contact(d.contactId) || d.contactName || '(Unknown contact)'} · ${fmtMoney(d.total)}`,
    path: `/invoices/${d.id}`
  }))], ['Bills', (state.bills || []).filter(d => [d.reference, d.contactName, contact(d.contactId)].join(' ').toLowerCase().includes(text) || Number(num) === d.total).map(d => ({
    id: d.id,
    title: d.reference,
    caption: `${contact(d.contactId) || d.contactName || '(Unknown contact)'} · ${fmtMoney(d.total)}`,
    path: `/bills/${d.id}`
  }))], ['Bank transactions', (state.bankTransactions || []).filter(d => d.status !== 'DELETED' && ([d.reference, d.contactName, contact(d.contactId)].join(' ').toLowerCase().includes(text) || Number(num) === d.total)).map(d => ({
    id: d.id,
    title: d.reference || d.type,
    caption: `${d.contactName || contact(d.contactId)} · ${fmtMoney(d.total)}`,
    path: `/bank-transactions/${d.id}`
  }))]];
}
export default function Layout() {
  const {
      state
    } = useStore(),
    location = useLocation(),
    navigate = useSidNavigate(),
    [search, setSearch] = useState(false),
    [q, setQ] = useState(''),
    [debounced, setDebounced] = useState(''),
    [focused, setFocused] = useState(0),
    [help, setHelp] = useState(false),
    [topic, setTopic] = useState(''),
    [helpQuery, setHelpQuery] = useState('');
  useEffect(() => {
    setSearch(false);
    setQ('');
    setDebounced('');
  }, [location.pathname, location.search]);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      setFocused(0);
    }, 150);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const key = e => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  const notifications = [[(state.bills || []).filter(d => d.status === 'SUBMITTED').length, 'bills awaiting your approval', '/bills?status=submitted'], [(state.invoices || []).filter(d => displayStatus(d) === 'Overdue').length, 'invoices are overdue', '/invoices?overdue=1'], [unreconciledCount(state), 'bank statement lines to reconcile', '/bank-accounts']].filter(n => n[0]),
    groups = searchGroups(state, debounced),
    results = groups.flatMap(([, rs]) => rs.slice(0, 5));
  const active = name => ({
    Sales: ['/sales', '/invoices', '/products', '/quotes'],
    Purchases: ['/purchases', '/bills', '/purchase-orders'],
    Reporting: ['/reports'],
    Accounting: ['/bank', '/chart', '/manual'],
    Tax: ['/settings/tax'],
    Contacts: ['/contacts']
  }[name] || []).some(p => location.pathname.startsWith(p));
  return <><nav className="global-header" aria-label="Main navigation"><SidLink className="logo" to="/dashboard" aria-label="Xero home">xero</SidLink><Menu label={`${state.organisation?.name || 'Brightwater Creative Ltd'} ▾`} className="org-menu" align="left"><strong className="menu-caption">{state.organisation?.name}</strong><SidLink to="/settings">Settings</SidLink><span className="menu-caption">✓ {state.organisation?.name}</span></Menu><SidLink className={`home-link ${location.pathname === '/dashboard' ? 'active' : ''}`} to="/dashboard">Home</SidLink>{Object.entries(navigation).map(([name, items]) => <Menu key={name} className={active(name) ? 'nav-active' : ''} label={`${name} ▾`} align="left">{items.map(([label, to]) => <SidLink key={to} to={to}>{label}</SidLink>)}{name === 'Contacts' && (state.contactGroups || []).map(g => <SidLink key={g.id} to={`/contacts?group=${g.id}`}>{g.name}</SidLink>)}</Menu>)}<div className="header-tools"><Menu label="+" aria-label="Create new"><SidLink to="/invoices/new">New invoice</SidLink><SidLink to="/bills/new">New bill</SidLink><SidLink to="/contacts/new">New contact</SidLink><SidLink to="/quotes/new">New quote</SidLink><SidLink to="/purchase-orders/new">New purchase order</SidLink><SidLink to="/manual-journals/new">New manual journal</SidLink><SidLink to="/bank-transactions/new?type=spend">Spend money</SidLink><SidLink to="/bank-transactions/new?type=receive">Receive money</SidLink><SidLink to="/bank-transfers/new">Transfer money</SidLink></Menu><button className="header-icon" title="Search" aria-label="Search Xero" onClick={() => setSearch(true)}>⌕</button><Menu label={<span aria-label="Notifications">♧{notifications.length > 0 && <i className="notification-dot" />}</span>}>{notifications.length ? notifications.map(([n, label, to]) => <SidLink key={to} to={to}>{n} {label}</SidLink>) : <p className="menu-caption">You're all caught up</p>}</Menu><button className="header-icon" aria-label="Help" onClick={() => setHelp(true)}>?</button><Menu className="avatar-menu" label={<span className="avatar">{state.currentUser?.initials || 'HC'}</span>}><strong className="menu-caption">{state.currentUser?.name}</strong><span className="menu-caption">{state.currentUser?.email}</span><span className="menu-caption muted">Profile</span></Menu></div></nav><main className="app-main"><Outlet /></main>{search && <Modal title="Search Xero" onClose={() => setSearch(false)}><div className="global-search"><input autoFocus aria-label="Search Xero" placeholder="Search Xero" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocused((focused + 1) % Math.max(1, results.length));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocused((focused - 1 + results.length) % Math.max(1, results.length));
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            if (results[focused]) navigate(results[focused].path);else navigate(`/search?q=${encodeURIComponent(q)}`);
          }
        }} />{groups.map(([name, rs]) => rs.length > 0 && <div key={name}><h3>{name}</h3>{rs.slice(0, 5).map(r => <SidLink key={r.id} className={`search-result ${results[focused]?.id === r.id ? 'focused' : ''}`} to={r.path}>{r.title}<small>{r.caption}</small></SidLink>)}</div>)}{q && <SidLink className="search-result" to={`/search?q=${encodeURIComponent(q)}`}>See all results for '{q}'</SidLink>}</div></Modal>}{help && <Modal drawer title="Help and support" onClose={() => setHelp(false)}><Field label="Search help"><input value={helpQuery} onChange={e => setHelpQuery(e.target.value)} /></Field><div className="help-topics">{['Create and approve an invoice', 'Record a payment', 'Reconcile bank transactions', 'Find and match multiple invoices', 'Create a batch payment', 'Run and save a report'].filter(t => t.toLowerCase().includes(helpQuery.toLowerCase())).map(t => <button key={t} onClick={() => setTopic(t)}>{t}</button>)}</div>{topic && <><h3>{topic}</h3><p>Open the relevant page from the navigation. Select the record, enter the required details, then use the blue action button to save your changes. You can review saved changes in the record's History & Notes.</p></>}</Modal>}</>;
}
export function SearchPage() {
  const {
      state
    } = useStore(),
    location = useLocation(),
    q = new URLSearchParams(location.search).get('q') || '';
  return <><PageHeader title={`Search results for '${q}'`} /><div className="content">{searchGroups(state, q).map(([name, rows]) => <section className="panel" key={name}><h2>{name} ({rows.length})</h2>{rows.length ? rows.map(r => <SidLink key={r.id} className="search-result" to={r.path}>{r.title}<small>{r.caption}</small></SidLink>) : <p>No results found</p>}</section>)}</div></>;
}
