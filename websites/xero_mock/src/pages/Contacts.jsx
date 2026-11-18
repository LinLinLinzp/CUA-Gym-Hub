import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { newId } from '../store/reducer.js';
import { SidLink, useSidNavigate } from '../components/SidLink.jsx';
import { PageHeader, Button, Menu, Modal, ConfirmDialog, Field, MoneyInput, AccountPicker, TaxRatePicker, Tabs, DataTable, HistoryNotes, NotFound, ErrorBanner, StatusPill, useToast, downloadCsv } from '../components/UI.jsx';
import { fmtMoney, fmtDate, todayISO } from '../utils/money.js';
import { accountBalance, fyStart } from '../utils/ledger.js';
import { displayStatus } from '../utils/status.js';
const balance = (state, key, id, overdue = false) => (state[key] || []).filter(d => d.contactId === id && d.status === 'AUTHORISED' && (!overdue || displayStatus(d) === 'Overdue')).reduce((s, d) => s + Number(d.amountDue || 0), 0);
function GroupModal({
  ids,
  onClose
}) {
  const {
      state,
      dispatch
    } = useStore(),
    [group, setGroup] = useState((state.contactGroups || [])[0]?.id || 'new'),
    [name, setName] = useState(''),
    [error, setError] = useState('');
  return <Modal title="Add to group" onClose={onClose}><ErrorBanner error={error} /><Field label="Group"><select value={group} onChange={e => setGroup(e.target.value)}>{(state.contactGroups || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}<option value="new">New group</option></select></Field>{group === 'new' && <Field label="Group name"><input value={name} onChange={e => setName(e.target.value)} /></Field>}<footer><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => {
        try {
          dispatch({
            type: 'group',
            id: group === 'new' ? null : group,
            ids,
            name
          });
          onClose();
        } catch (e) {
          setError(e.message);
        }
      }}>Save</Button></footer></Modal>;
}
export function ContactsList() {
  const {
      state,
      dispatch
    } = useStore(),
    [params, setParams] = useSearchParams(),
    navigate = useSidNavigate(),
    [q, setQ] = useState(''),
    [selected, setSelected] = useState([]),
    [confirm, setConfirm] = useState(false),
    [group, setGroup] = useState(false),
    type = params.get('type') || 'all',
    groupId = params.get('group'),
    rows = (state.contacts || []).filter(c => (type === 'archived' ? c.contactStatus === 'ARCHIVED' : c.contactStatus !== 'ARCHIVED') && (type !== 'customers' || c.isCustomer) && (type !== 'suppliers' || c.isSupplier) && (!groupId || (state.contactGroups || []).find(g => g.id === groupId)?.contactIds?.includes(c.id)) && [c.name, c.email, c.firstName, c.lastName, c.accountNumber].join(' ').toLowerCase().includes(q.toLowerCase()));
  return <><PageHeader title="Contacts" actions={<><Button onClick={() => downloadCsv('Contacts.csv', ['Name', 'Email', 'Account number', 'Phone'], rows.map(c => [c.name, c.email, c.accountNumber, c.phone]))}>Export</Button><Button variant="primary" onClick={() => navigate('/contacts/new')}>New contact</Button></>} /><div className="content"><Tabs value={groupId || type} items={[['all', 'All contacts'], ['customers', 'Customers'], ['suppliers', 'Suppliers'], ['archived', 'Archived'], ...(state.contactGroups || []).map(g => [g.id, `${g.name} (${g.contactIds?.length || 0})`])]} onChange={v => {
        const next = new URLSearchParams(params);
        next.delete('group');
        next.set('type', v.startsWith('grp') ? 'all' : v);
        if (v.startsWith('grp')) next.set('group', v);
        setParams(next);
        setSelected([]);
      }} /><div className="toolbar"><input placeholder="Search contacts" value={q} onChange={e => setQ(e.target.value)} /></div>{selected.length > 0 && <div className="bulk-bar"><strong>{selected.length} items selected</strong><Button onClick={() => setGroup(true)}>Add to group</Button><Button onClick={() => setConfirm(true)}>{type === 'archived' ? 'Restore' : 'Archive'}</Button></div>}<DataTable rows={rows} selected={selected} onSelect={setSelected} onRow={c => navigate(`/contacts/${c.id}`)} columns={[{
        key: 'starred',
        label: '★',
        render: c => <button aria-label={`Star ${c.name}`} className="star" onClick={e => {
          e.stopPropagation();
          dispatch({
            type: 'contactAction',
            id: c.id,
            event: 'star'
          });
        }}>{c.starred ? '★' : '☆'}</button>
      }, {
        key: 'name',
        label: 'Contact',
        render: c => <><SidLink to={`/contacts/${c.id}`}><strong>{c.name || '(Unknown contact)'}</strong></SidLink><small>{c.firstName} {c.lastName}</small></>
      }, {
        key: 'email',
        label: 'Email'
      }, {
        key: 'youOwe',
        label: 'You owe',
        numeric: true,
        sortValue: c => balance(state, 'bills', c.id),
        render: c => fmtMoney(balance(state, 'bills', c.id))
      }, {
        key: 'theyOwe',
        label: 'They owe',
        numeric: true,
        sortValue: c => balance(state, 'invoices', c.id),
        render: c => <>{fmtMoney(balance(state, 'invoices', c.id))}{balance(state, 'invoices', c.id, true) > 0 && <small className="red">{fmtMoney(balance(state, 'invoices', c.id, true))} overdue</small>}</>
      }]} /></div>{confirm && <ConfirmDialog title={`${type === 'archived' ? 'Restore' : 'Archive'} contacts?`} onClose={() => setConfirm(false)} onConfirm={() => {
      dispatch({
        type: 'contactAction',
        ids: selected,
        event: type === 'archived' ? 'restore' : 'archive'
      });
      setSelected([]);
    }} />}{group && <GroupModal ids={selected} onClose={() => setGroup(false)} />}</>;
}
export function ContactDetail() {
  const {
      state,
      dispatch
    } = useStore(),
    {
      id
    } = useParams(),
    navigate = useSidNavigate(),
    [confirm, setConfirm] = useState(false),
    [group, setGroup] = useState(false),
    [filter, setFilter] = useState('all'),
    c = (state.contacts || []).find(c => c.id === id);
  if (!c) return <NotFound name="Contact" back="/contacts" />;
  const activities = [...(state.invoices || []).filter(d => d.contactId === id).map(d => ({
      ...d,
      kind: 'invoice',
      path: `/invoices/${d.id}`
    })), ...(state.bills || []).filter(d => d.contactId === id).map(d => ({
      ...d,
      kind: 'bill',
      path: `/bills/${d.id}`
    })), ...(state.payments || []).filter(d => d.contactId === id).map(d => ({
      ...d,
      total: d.amount,
      kind: 'payment',
      path: `/payments/${d.id}`
    })), ...(state.bankTransactions || []).filter(d => d.contactId === id).map(d => ({
      ...d,
      kind: 'bankTransaction',
      path: `/bank-transactions/${d.id}`
    }))].filter(d => filter === 'all' || d.kind === filter).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    address = a => a ? Object.values(a).filter(Boolean).join(', ') : '—';
  return <><PageHeader title={c.name || '(Unknown contact)'} breadcrumb={{
      label: 'Contacts',
      to: '/contacts'
    }} actions={<>{c.contactStatus === 'ARCHIVED' && <span className="status">Archived</span>}<Button onClick={() => navigate(`/contacts/${id}/edit`)}>Edit</Button><Menu label="New ▾"><SidLink to={`/invoices/new?contactId=${id}`}>Invoice</SidLink><SidLink to={`/bills/new?contactId=${id}`}>Bill</SidLink><SidLink to={`/quotes/new?contactId=${id}`}>Quote</SidLink><SidLink to={`/credit-notes/new?contactId=${id}`}>Credit note</SidLink></Menu><Menu label="⋯"><button onClick={() => setConfirm(true)}>{c.contactStatus === 'ARCHIVED' ? 'Restore' : 'Archive'}</button><button onClick={() => setGroup(true)}>Add to group</button></Menu></>} /><div className="content"><div className="two-columns"><section className="panel"><h2>Contact details</h2><p>{c.firstName} {c.lastName}</p>{c.email && <p><a href={`mailto:${c.email}`}>{c.email}</a></p>}<p>{c.phone || '—'}</p><p>{c.website}</p><h3>Billing address</h3><p>{address(c.billingAddress)}</p><h3>Delivery address</h3><p>{address(c.deliveryAddress || c.billingAddress)}</p><h3>Financial details</h3><p>VAT number: {c.taxNumber || '—'}</p><p>Sales account: {c.defaultSalesAccountCode || '200'}</p><p>Purchases account: {c.defaultPurchaseAccountCode || '429'}</p><p>Invoice payment terms: {c.salesPaymentTerms?.day || state.organisation?.invoiceSettings?.salesPaymentTerms?.day || 30} days</p><p className="notes">{c.notes}</p></section><div><div className="summary-tiles" style={{
            gridTemplateColumns: '1fr 1fr'
          }}>{[['Money coming in', 'invoices'], ['Money going out', 'bills']].map(([title, key]) => <div key={key} className="summary-tile"><span>{title}</span><strong>{fmtMoney(balance(state, key, id))}</strong><p className="red">{fmtMoney(balance(state, key, id, true))} overdue</p></div>)}</div><h2>Activity</h2><div className="toolbar"><select value={filter} onChange={e => setFilter(e.target.value)}>{[['all', 'All activity'], ['invoice', 'Invoices'], ['bill', 'Bills'], ['payment', 'Payments'], ['bankTransaction', 'Bank transactions']].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div><DataTable rows={activities} onRow={d => navigate(d.path)} columns={[{
            key: 'date',
            label: 'Date',
            render: d => fmtDate(d.date)
          }, {
            key: 'kind',
            label: 'Type'
          }, {
            key: 'reference',
            label: 'Number / Ref',
            render: d => <SidLink to={d.path}>{d.invoiceNumber || d.documentNumber || d.reference || '—'}</SidLink>
          }, {
            key: 'total',
            label: 'Amount',
            numeric: true,
            render: d => fmtMoney(d.total)
          }, {
            key: 'status',
            label: 'Status',
            render: d => <StatusPill doc={d} />
          }]} /></div></div><HistoryNotes kind="contact" id={id} /></div>{confirm && <ConfirmDialog title={`${c.contactStatus === 'ARCHIVED' ? 'Restore' : 'Archive'} contact?`} onClose={() => setConfirm(false)} onConfirm={() => dispatch({
      type: 'contactAction',
      id,
      event: c.contactStatus === 'ARCHIVED' ? 'restore' : 'archive'
    })} />}{group && <GroupModal ids={[id]} onClose={() => setGroup(false)} />}</>;
}
const blankAddress = {
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'United Kingdom'
};
const termTypes = [['DAYSAFTERBILLDATE', 'day(s) after the invoice date'], ['DAYSAFTERBILLMONTH', 'day(s) after the end of the invoice month'], ['OFCURRENTMONTH', 'of the current month'], ['OFFOLLOWINGMONTH', 'of the following month']];
export function ContactForm() {
  const {
      state,
      dispatch
    } = useStore(),
    {
      id
    } = useParams(),
    navigate = useSidNavigate(),
    toast = useToast(),
    existing = (state.contacts || []).find(c => c.id === id),
    [c, setC] = useState(() => structuredClone(existing || {
      name: '',
      accountNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
      website: '',
      billingAddress: blankAddress,
      deliveryAddress: blankAddress,
      taxNumber: '',
      defaultSalesAccountCode: '200',
      defaultSalesTaxType: 'OUTPUT2',
      defaultPurchaseAccountCode: '429',
      defaultPurchaseTaxType: 'INPUT2',
      salesPaymentTerms: state.organisation?.invoiceSettings?.salesPaymentTerms || {
        day: 30,
        type: 'DAYSAFTERBILLDATE'
      },
      billsPaymentTerms: state.organisation?.invoiceSettings?.billsPaymentTerms || {
        day: 20,
        type: 'OFFOLLOWINGMONTH'
      },
      isCustomer: true,
      isSupplier: false,
      notes: ''
    })),
    [same, setSame] = useState(!existing?.deliveryAddress),
    [error, setError] = useState('');
  if (id && !existing) return <NotFound name="Contact" back="/contacts" />;
  const field = (k, v) => setC({
      ...c,
      [k]: v
    }),
    textFields = keys => keys.map(([key, label]) => <Field key={key} label={label}><input value={c[key] || ''} onChange={e => field(key, e.target.value)} /></Field>),
    address = key => Object.entries({
      line1: 'Line 1',
      line2: 'Line 2',
      city: 'Town/City',
      region: 'Region',
      postalCode: 'Postal code',
      country: 'Country'
    }).map(([k, label]) => <Field label={label} key={k}>{k === 'country' ? <select value={c[key]?.[k] || 'United Kingdom'} onChange={e => field(key, {
        ...c[key],
        [k]: e.target.value
      })}>{['United Kingdom', 'Ireland', 'France', 'Germany', 'United States'].map(c => <option key={c}>{c}</option>)}</select> : <input value={c[key]?.[k] || ''} onChange={e => field(key, {
        ...c[key],
        [k]: e.target.value
      })} />}</Field>);
  return <><PageHeader title={id ? 'Edit contact' : 'New contact'} breadcrumb={{
      label: 'Contacts',
      to: '/contacts'
    }} /><div className="content"><section className="panel"><ErrorBanner error={error} /><h2>Contact details</h2><div className="form-row">{textFields([['name', 'Contact name *'], ['accountNumber', 'Account number']])}</div><h3>Primary person</h3><div className="form-row">{textFields([['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email']])}</div><div className="form-row">{textFields([['phone', 'Phone'], ['mobile', 'Mobile'], ['website', 'Website']])}</div><h3>Billing address</h3><div className="form-row">{address('billingAddress')}</div><h3>Delivery address</h3><p><label><input type="checkbox" checked={same} onChange={e => setSame(e.target.checked)} /> Same as billing address</label></p>{!same && <div className="form-row">{address('deliveryAddress')}</div>}<h2>Financial details</h2>{textFields([['taxNumber', 'VAT number']])}<div className="form-row"><Field label="Default sales account"><AccountPicker value={c.defaultSalesAccountCode} onChange={v => field('defaultSalesAccountCode', v)} /></Field><Field label="Sales VAT"><TaxRatePicker value={c.defaultSalesTaxType} onChange={v => field('defaultSalesTaxType', v)} /></Field><Field label="Default purchases account"><AccountPicker value={c.defaultPurchaseAccountCode} onChange={v => field('defaultPurchaseAccountCode', v)} /></Field><Field label="Purchases VAT"><TaxRatePicker purchase value={c.defaultPurchaseTaxType} onChange={v => field('defaultPurchaseTaxType', v)} /></Field></div>{[['salesPaymentTerms', 'Invoice payment terms'], ['billsPaymentTerms', 'Bills payment terms']].map(([key, label]) => <div className="form-row" key={key}><Field label={label}><input type="number" min="0" value={c[key]?.day ?? ''} onChange={e => field(key, {
              ...c[key],
              day: Number(e.target.value)
            })} /></Field><Field label="Terms type"><select value={c[key]?.type || 'DAYSAFTERBILLDATE'} onChange={e => field(key, {
              ...c[key],
              type: e.target.value
            })}>{termTypes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Field></div>)}<p><label><input type="checkbox" checked={c.isCustomer || false} onChange={e => field('isCustomer', e.target.checked)} /> Customer</label> <label><input type="checkbox" checked={c.isSupplier || false} onChange={e => field('isSupplier', e.target.checked)} /> Supplier</label></p><Field label="Notes"><textarea value={c.notes || ''} onChange={e => field('notes', e.target.value)} /></Field><footer className="form-footer"><Button onClick={() => navigate(id ? `/contacts/${id}` : '/contacts')}>Cancel</Button><Button variant="primary" onClick={() => {
            try {
              const newRecordId = id || newId('con');
              dispatch({
                type: 'saveContact',
                id,
                newId: newRecordId,
                data: {
                  ...c,
                  deliveryAddress: same ? c.billingAddress : c.deliveryAddress
                }
              });
              toast('Contact saved');
              navigate(`/contacts/${newRecordId}`);
            } catch (e) {
              setError(e.message);
            }
          }}>Save</Button></footer></section></div></>;
}
export function Products() {
  const {
      state,
      dispatch
    } = useStore(),
    [q, setQ] = useState(''),
    [edit, setEdit] = useState(null),
    [data, setData] = useState({}),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(null),
    open = item => {
      setData(item ? structuredClone(item) : {
        code: '',
        name: '',
        isSold: true,
        isPurchased: false,
        salesUnitPrice: 0,
        salesAccountCode: '200',
        salesTaxType: 'OUTPUT2',
        purchaseUnitPrice: 0,
        purchaseAccountCode: '429',
        purchaseTaxType: 'INPUT2',
        salesDescription: '',
        purchaseDescription: ''
      });
      setEdit(item?.id || 'new');
      setError('');
    },
    field = (k, v) => setData({
      ...data,
      [k]: v
    });
  return <><PageHeader title="Products and services" actions={<Button variant="primary" onClick={() => open(null)}>New item</Button>} /><div className="content"><div className="toolbar"><input placeholder="Search products and services" value={q} onChange={e => setQ(e.target.value)} /></div><DataTable rows={(state.items || []).filter(i => [i.code, i.name].join(' ').toLowerCase().includes(q.toLowerCase()))} onRow={open} columns={[{
        key: 'code',
        label: 'Code',
        render: i => <span className="link">{i.code}</span>
      }, {
        key: 'name',
        label: 'Name'
      }, {
        key: 'salesUnitPrice',
        label: 'Sale price',
        numeric: true,
        render: i => i.isSold ? fmtMoney(i.salesUnitPrice) : '—'
      }, {
        key: 'purchaseUnitPrice',
        label: 'Cost price',
        numeric: true,
        render: i => i.isPurchased ? fmtMoney(i.purchaseUnitPrice) : '—'
      }, {
        key: 'salesAccountCode',
        label: 'Sales account'
      }, {
        key: 'actions',
        label: '',
        render: i => <Button onClick={e => {
          e.stopPropagation();
          setConfirm(i.id);
        }}>Delete</Button>
      }]} /></div>{edit && <Modal title={edit === 'new' ? 'New item' : 'Edit item'} onClose={() => setEdit(null)}><ErrorBanner error={error} /><div className="form-row"><Field label="Code *"><input value={data.code} onChange={e => field('code', e.target.value)} /></Field><Field label="Name *"><input value={data.name} onChange={e => field('name', e.target.value)} /></Field></div>{[['isSold', 'I sell this item', 'sales', false], ['isPurchased', 'I purchase this item', 'purchase', true]].map(([flag, label, prefix, purchase]) => <section key={flag}><p><label><input type="checkbox" checked={data[flag] || false} onChange={e => field(flag, e.target.checked)} /> {label}</label></p>{data[flag] && <><div className="form-row"><Field label={purchase ? 'Cost price' : 'Sale price'}><MoneyInput value={data[`${prefix}UnitPrice`]} onChange={v => field(`${prefix}UnitPrice`, Number(v))} /></Field><Field label="Account"><AccountPicker value={data[`${prefix}AccountCode`]} onChange={v => field(`${prefix}AccountCode`, v)} /></Field><Field label="Tax rate"><TaxRatePicker purchase={purchase} value={data[`${prefix}TaxType`]} onChange={v => field(`${prefix}TaxType`, v)} /></Field></div><Field label="Description"><textarea value={data[`${prefix}Description`] || ''} onChange={e => field(`${prefix}Description`, e.target.value)} /></Field></>}</section>)}<footer><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => {
          try {
            dispatch({
              type: 'saveItem',
              id: edit === 'new' ? null : edit,
              data
            });
            setEdit(null);
          } catch (e) {
            setError(e.message);
          }
        }}>Save</Button></footer></Modal>}{confirm && <ConfirmDialog title="Delete item?" onClose={() => setConfirm(null)} destructive onConfirm={() => dispatch({
      type: 'deleteItem',
      id: confirm
    })} />}</>;
}
export function ChartOfAccounts() {
  const {
      state,
      dispatch
    } = useStore(),
    navigate = useSidNavigate(),
    [q, setQ] = useState(''),
    [tab, setTab] = useState('all'),
    [editing, setEditing] = useState(null),
    [archive, setArchive] = useState(null),
    today = todayISO(),
    rows = (state.accounts || []).filter(a => (tab === 'archive' ? a.status === 'ARCHIVED' : a.status !== 'ARCHIVED') && (tab === 'all' || tab === 'archive' || a.class === tab.toUpperCase()) && [a.code, a.name, a.description].join(' ').toLowerCase().includes(q.toLowerCase()));
  return <><PageHeader title="Chart of accounts" actions={<Button variant="primary" onClick={() => setEditing({})}>+ Add account</Button>} /><div className="content"><Tabs value={tab} items={[['all', 'All accounts'], ['asset', 'Assets'], ['liability', 'Liabilities'], ['equity', 'Equity'], ['expense', 'Expenses'], ['revenue', 'Revenue'], ['archive', 'Archive']]} onChange={setTab} /><div className="toolbar"><input placeholder="Search accounts" value={q} onChange={e => setQ(e.target.value)} /></div><DataTable rows={rows} onRow={a => setEditing(a)} columns={[{
        key: 'code',
        label: 'Code'
      }, {
        key: 'name',
        label: 'Name',
        render: a => <>{a.name}<small>{a.description}</small></>
      }, {
        key: 'type',
        label: 'Type'
      }, {
        key: 'taxType',
        label: 'Tax rate',
        render: a => (state.taxRates || []).find(t => t.taxType === a.taxType)?.name || a.taxType
      }, {
        key: 'ytd',
        label: 'YTD',
        numeric: true,
        sortValue: a => accountBalance(state, a.code, today, fyStart(today, state.organisation)),
        render: a => <SidLink to={`/reports/account-transactions?accountCode=${a.code}&from=${fyStart(today, state.organisation)}&to=${today}`}>{fmtMoney(accountBalance(state, a.code, today, fyStart(today, state.organisation)))}</SidLink>
      }, {
        key: 'showOnDashboard',
        label: 'Watchlist',
        render: a => <button aria-label={`Watch ${a.name}`} className="star" onClick={e => {
          e.stopPropagation();
          dispatch({
            type: 'watchlist',
            id: a.id
          });
        }}>{a.showOnDashboard ? '★' : '☆'}</button>
      }, {
        key: 'archive',
        label: '',
        render: a => !a.systemAccount && a.type !== 'BANK' && <Button onClick={e => {
          e.stopPropagation();
          setArchive(a);
        }}>{a.status === 'ARCHIVED' ? 'Restore' : 'Archive'}</Button>
      }]} /></div>{editing && <AccountModal account={editing} onClose={() => setEditing(null)} />}{archive && <ConfirmDialog title={`${archive.status === 'ARCHIVED' ? 'Restore' : 'Archive'} account?`} onClose={() => setArchive(null)} onConfirm={() => dispatch({
      type: 'archiveAccount',
      id: archive.id
    })} />}</>;
}
function AccountModal({
  account,
  onClose
}) {
  const {
      dispatch
    } = useStore(),
    [data, setData] = useState({
      code: '',
      name: '',
      type: 'OVERHEADS',
      class: 'EXPENSE',
      taxType: 'INPUT2',
      description: '',
      showOnDashboard: false,
      ...account
    }),
    [error, setError] = useState(''),
    field = (k, v) => setData({
      ...data,
      [k]: v
    });
  return <Modal title={account.id ? 'Edit account' : 'Add account'} onClose={onClose}><ErrorBanner error={error} />{[['code', 'Code'], ['name', 'Name'], ['description', 'Description']].map(([k, t]) => <Field label={t} key={k}><input value={data[k] || ''} onChange={e => field(k, e.target.value)} /></Field>)}<Field label="Type"><select value={data.type} onChange={e => {
        const type = e.target.value;
        setData({
          ...data,
          type,
          class: ['REVENUE', 'OTHERINCOME'].includes(type) ? 'REVENUE' : ['DIRECTCOSTS', 'OVERHEADS', 'DEPRECIATN'].includes(type) ? 'EXPENSE' : ['CURRENT', 'FIXED', 'PREPAYMENT'].includes(type) ? 'ASSET' : type === 'EQUITY' ? 'EQUITY' : 'LIABILITY'
        });
      }}>{['REVENUE', 'OTHERINCOME', 'DIRECTCOSTS', 'OVERHEADS', 'DEPRECIATN', 'CURRENT', 'FIXED', 'PREPAYMENT', 'CURRLIAB', 'TERMLIAB', 'EQUITY'].map(t => <option key={t}>{t}</option>)}</select></Field><Field label="Tax rate"><TaxRatePicker purchase={data.class !== 'REVENUE'} value={data.taxType} onChange={v => field('taxType', v)} /></Field><label><input type="checkbox" checked={data.showOnDashboard || false} onChange={e => field('showOnDashboard', e.target.checked)} /> Show on dashboard watchlist</label><footer><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => {
        try {
          dispatch({
            type: 'saveAccount',
            id: account.id,
            data
          });
          onClose();
        } catch (e) {
          setError(e.message);
        }
      }}>Save</Button></footer></Modal>;
}
