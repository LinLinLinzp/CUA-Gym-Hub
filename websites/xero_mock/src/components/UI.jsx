import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SidLink } from './SidLink.jsx';
import { fmtMoney, fmtDate, calcDocumentTotals, todayISO } from '../utils/money.js';
import { displayStatus } from '../utils/status.js';
import { useStore } from '../store/StoreContext.jsx';
import { withSid } from '../utils/dataManager.js';
import { newId } from '../store/reducer.js';
const ToastContext = createContext(() => {});
export function ToastProvider({
  children
}) {
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  return <ToastContext.Provider value={setToast}>{children}{toast && <div role="status" className="toast">✓ {toast}<button onClick={() => setToast('')}>×</button></div>}</ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
export function Button({
  children,
  variant = '',
  ...props
}) {
  return <button type="button" className={`button ${variant}`} {...props}>{children}</button>;
}
export function Menu({
  label,
  children,
  align = 'right',
  className = '',
  'aria-label': ariaLabel
}) {
  const [open, setOpen] = useState(false),
    ref = useRef();
  useEffect(() => {
    const click = e => {
        if (!ref.current?.contains(e.target)) setOpen(false);
      },
      key = e => {
        if (e.key === 'Escape') setOpen(false);
      };
    document.addEventListener('pointerdown', click);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', click);
      document.removeEventListener('keydown', key);
    };
  }, []);
  return <div className={`menu ${className}`} ref={ref}><button className="menu-trigger" aria-label={ariaLabel} aria-expanded={open} onClick={() => setOpen(!open)}>{label}</button>{open && <div className={`dropdown ${align}`} onClick={e => {
      if (e.target.closest('a,button')) setOpen(false);
    }}>{children}</div>}</div>;
}
export function SplitButton({
  label,
  onClick,
  children,
  variant = 'primary'
}) {
  return <span className={`split ${variant}`}><Button variant={variant} onClick={onClick}>{label}</Button><Menu label="▾">{children}</Menu></span>;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false
}) {
  const ref = useRef(),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement,
      el = ref.current;
    el?.querySelector('input,select,textarea,button')?.focus();
    const key = e => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const controls = [...el.querySelectorAll('input,select,textarea,button,a[href]')].filter(x => !x.disabled);
        if (e.shiftKey && document.activeElement === controls[0]) {
          e.preventDefault();
          controls.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === controls.at(-1)) {
          e.preventDefault();
          controls[0]?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return <div className={`overlay ${drawer ? 'drawer-overlay' : ''}`} onMouseDown={e => {
    if (e.target === e.currentTarget) onClose();
  }}><section className={`modal ${wide ? 'wide' : ''} ${drawer ? 'drawer' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}><header><h2>{title}</h2><button aria-label="Close" onClick={onClose}>×</button></header><div className="modal-body">{children}</div></section></div>;
}
export function ConfirmDialog({
  title,
  children,
  onConfirm,
  onClose,
  destructive = false
}) {
  const [error, setError] = useState(''),
    [reason, setReason] = useState('');
  return <Modal title={title} onClose={onClose}>{children}{title.toLowerCase().includes('void') && <Field label="Reason (optional)"><textarea value={reason} onChange={e => setReason(e.target.value)} /></Field>}<ErrorBanner error={error} /><footer><Button onClick={onClose}>Cancel</Button><Button variant={destructive ? 'destructive' : 'primary'} onClick={() => {
        try {
          onConfirm(reason);
          onClose();
        } catch (e) {
          setError(e.message);
        }
      }}>Confirm</Button></footer></Modal>;
}
export const ErrorBanner = ({
  error
}) => error ? <div role="alert" className="error-banner">{error}</div> : null;
export const Field = ({
  label,
  children,
  className = ''
}) => <label className={`field ${className}`}><span>{label}</span>{children}</label>;
export function DateInput({
  value,
  onChange,
  ...props
}) {
  const [text, setText] = useState(fmtDate(value) === '—' ? '' : fmtDate(value)),
    calendar = useRef();
  useEffect(() => setText(value ? fmtDate(value) : ''), [value]);
  return <div className="date-input"><input {...props} type="text" placeholder="D MMM YYYY" value={text} onChange={e => {
      const raw = e.target.value;
      setText(raw);
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) onChange(raw);
    }} onBlur={() => {
      if (!text) {
        onChange('');
        return;
      }
      const date = new Date(text);
      if (!Number.isNaN(date.getTime())) onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);else setText(value ? fmtDate(value) : '');
    }} /><input ref={calendar} type="date" aria-label={props['aria-label'] ? `${props['aria-label']} calendar` : 'Calendar'} value={value || ''} onChange={e => onChange(e.target.value)} tabIndex={-1} /><button type="button" aria-label="Open calendar" onClick={() => {
      try {
        calendar.current.showPicker();
      } catch {
        calendar.current.focus();
      }
    }}>▦</button></div>;
}
export const MoneyInput = ({
  value,
  onChange,
  ...props
}) => <input inputMode="decimal" value={value ?? ''} onChange={e => {
  const raw = e.target.value.replaceAll(',', '');
  if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) onChange(raw);
}} {...props} />;
export function PageHeader({
  title,
  pageTitle = title,
  breadcrumb,
  actions
}) {
  const {
    state
  } = useStore();
  useEffect(() => {
    document.title = `${pageTitle} | ${state.organisation?.name || 'Brightwater Creative Ltd'} | Xero`;
  }, [pageTitle, state.organisation?.name]);
  return <header className="page-header"><div>{breadcrumb && <div className="breadcrumb"><SidLink to={breadcrumb.to} onClick={breadcrumb.onClick}>{breadcrumb.label} ›</SidLink></div>}<h1>{title}</h1></div><div className="actions">{actions}</div></header>;
}
export const StatusPill = ({
  doc,
  kind
}) => {
  const label = displayStatus(doc, undefined, kind);
  return <span className={`status ${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</span>;
};
export const Tabs = ({
  items,
  value,
  onChange
}) => <div className="tabs">{items.map(([key, label]) => <button key={key} className={key === value ? 'active' : ''} onClick={() => onChange(key)}>{label}</button>)}</div>;
export function DataTable({
  columns,
  rows,
  onRow,
  selected,
  onSelect,
  pageSize: initialSize = 25
}) {
  const [sort, setSort] = useState(null),
    [ascending, setAscending] = useState(true),
    [page, setPage] = useState(0),
    [size, setSize] = useState(initialSize);
  useEffect(() => setPage(0), [rows.length]);
  const sorted = [...rows];
  if (sort) {
    const c = columns.find(c => c.key === sort);
    sorted.sort((a, b) => {
      const x = c.sortValue ? c.sortValue(a) : a[sort] ?? '',
        y = c.sortValue ? c.sortValue(b) : b[sort] ?? '';
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * (ascending ? 1 : -1);
    });
  }
  const max = Math.max(0, Math.ceil(sorted.length / size) - 1),
    current = Math.min(page, max),
    visible = sorted.slice(current * size, (current + 1) * size);
  return <div className="table-panel"><div className="table-scroll"><table><thead><tr>{onSelect && <th className="check"><input type="checkbox" aria-label="Select all rows" checked={visible.length > 0 && visible.every(r => selected?.includes(r.id))} onChange={e => onSelect(e.target.checked ? [...new Set([...(selected || []), ...visible.map(r => r.id)])] : (selected || []).filter(id => !visible.some(r => r.id === id)))} /></th>}{columns.map(c => <th key={c.key} className={[c.numeric ? 'num' : '', c.className].filter(Boolean).join(' ')}><button onClick={() => {
                setSort(c.key);
                setAscending(sort === c.key ? !ascending : true);
              }}>{c.label} {sort === c.key ? ascending ? '↑' : '↓' : ''}</button></th>)}</tr></thead><tbody>{visible.map((row, i) => <tr key={row.id || i} onClick={() => onRow?.(row)} className={onRow ? 'clickable' : ''}>{onSelect && <td onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${row.invoiceNumber || row.reference || row.name || row.id}`} checked={selected?.includes(row.id) || false} onChange={e => onSelect(e.target.checked ? [...(selected || []), row.id] : (selected || []).filter(id => id !== row.id))} /></td>}{columns.map(c => <td key={c.key} className={[c.numeric ? 'num' : '', c.className].filter(Boolean).join(' ')}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}</tr>)}</tbody></table>{!visible.length && <div className="empty">There are no items to display</div>}</div><div className="pagination"><span>Showing items {rows.length ? current * size + 1 : 0}–{Math.min((current + 1) * size, rows.length)} of {rows.length}</span><span>Items per page <select aria-label="Items per page" value={size} onChange={e => {
          setSize(Number(e.target.value));
          setPage(0);
        }}>{[...new Set([initialSize, 10, 25, 50, 100, 200])].sort((a, b) => a - b).map(n => <option key={n}>{n}</option>)}</select><Button disabled={current === 0} onClick={() => setPage(current - 1)}>‹</Button><Button disabled={current >= max} onClick={() => setPage(current + 1)}>›</Button></span></div></div>;
}
export function SummaryTiles({
  docs,
  onSelect
}) {
  return <div className="summary-tiles">{[['draft', 'Draft', d => d.status === 'DRAFT'], ['submitted', 'Awaiting approval', d => d.status === 'SUBMITTED'], ['authorised', 'Awaiting payment', d => d.status === 'AUTHORISED'], ['overdue', 'Overdue', d => displayStatus(d) === 'Overdue']].map(([key, label, filter]) => {
      const rows = docs.filter(filter);
      return <button key={key} className={`summary-tile ${key}`} onClick={() => onSelect(key)}><span>{label} ({rows.length})</span><strong>{fmtMoney(rows.reduce((s, d) => s + Number(key === 'draft' || key === 'submitted' ? d.total || 0 : d.amountDue || 0), 0))}</strong></button>;
    })}</div>;
}
export function Picker({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  onAdd
}) {
  const [query, setQuery] = useState(''),
    [open, setOpen] = useState(false),
    ref = useRef();
  useEffect(() => {
    const f = e => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', f);
    return () => document.removeEventListener('pointerdown', f);
  }, []);
  const chosen = options.find(o => o.value === value);
  return <div className="picker" ref={ref}><input aria-label={label} placeholder={placeholder} role="combobox" aria-expanded={open} value={open ? query : chosen?.label || (String(value || '').startsWith('new:') ? String(value).slice(4) : value) || ''} onFocus={() => {
      setQuery('');
      setOpen(true);
    }} onChange={e => {
      setQuery(e.target.value);
      setOpen(true);
    }} onKeyDown={e => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Enter' && open) {
        e.preventDefault();
        const first = options.find(o => o.label.toLowerCase().includes(query.toLowerCase()));
        if (first) {
          onChange(first.value);
          setOpen(false);
        }
      }
    }} />{open && <div className="picker-options" role="listbox">{options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())).map(o => <button type="button" role="option" aria-selected={o.value === value} key={o.value} onClick={() => {
        onChange(o.value);
        setOpen(false);
      }}>{o.group && <small>{o.group} · </small>}{o.label}</button>)}{onAdd && <button className="link" type="button" onClick={() => {
        onAdd(query);
        setOpen(false);
      }}>+ Add {query ? `'${query}' as a new contact` : 'contact'}</button>}</div>}</div>;
}
export function ContactPicker({
  value,
  onChange,
  label = 'Contact',
  allowTyped = false
}) {
  const {
      state,
      dispatch
    } = useStore(),
    [add, setAdd] = useState(null),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [customer, setCustomer] = useState(true),
    [supplier, setSupplier] = useState(false),
    [error, setError] = useState('');
  return <><Picker label={label} value={value} onChange={onChange} options={(state.contacts || []).filter(c => c.contactStatus !== 'ARCHIVED').map(c => ({
      value: c.id,
      label: c.name || '(Unknown contact)'
    }))} onAdd={q => {
      if (allowTyped && q) {
        onChange(`new:${q}`);
        return;
      }
      setName(q);
      setAdd(true);
    }} />{add && <Modal title="Add contact" onClose={() => setAdd(null)}><Field label="Contact name"><input value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field><label><input type="checkbox" checked={customer} onChange={e => setCustomer(e.target.checked)} /> Customer</label> <label><input type="checkbox" checked={supplier} onChange={e => setSupplier(e.target.checked)} /> Supplier</label><ErrorBanner error={error} /><footer><Button onClick={() => setAdd(null)}>Cancel</Button><Button variant="primary" onClick={() => {
          try {
            const id = newId('con');
            dispatch({
              type: 'saveContact',
              newId: id,
              data: {
                name,
                email,
                isCustomer: customer,
                isSupplier: supplier
              }
            });
            onChange(id);
            setAdd(null);
          } catch (e) {
            setError(e.message);
          }
        }}>Save</Button></footer></Modal>}</>;
}
export function AccountPicker({
  value,
  onChange,
  label = 'Account'
}) {
  const {
    state
  } = useStore();
  return <Picker label={label} value={value} onChange={onChange} options={(state.accounts || []).filter(a => a.status !== 'ARCHIVED' && a.type !== 'BANK').map(a => ({
    value: a.code,
    label: `${a.code} - ${a.name}`,
    group: a.type
  }))} />;
}
export function TaxRatePicker({
  value,
  onChange,
  purchase = false,
  label = 'Tax rate'
}) {
  const {
    state
  } = useStore();
  return <select aria-label={label} value={value || 'NONE'} onChange={e => onChange(e.target.value)}>{(state.taxRates || []).filter(t => t.appliesTo === 'both' || t.appliesTo === (purchase ? 'purchases' : 'sales')).map(t => <option key={t.taxType} value={t.taxType}>{t.name}</option>)}</select>;
}
export function BankPicker({
  value,
  onChange,
  label = 'Bank account',
  exclude
}) {
  const {
    state
  } = useStore();
  return <select aria-label={label} value={value || ''} onChange={e => onChange(e.target.value)}><option value="">Select a bank account</option>{(state.bankAccounts || []).filter(b => b.id !== exclude).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>;
}
export function Totals({
  doc
}) {
  return <div className="totals"><div><span>Subtotal</span><span>{fmtMoney(doc.subTotal)}</span></div><div><span>{doc.lineAmountTypes === 'Inclusive' ? 'Includes VAT' : 'Total VAT'}</span><span>{fmtMoney(doc.totalTax)}</span></div><div className="total"><strong>Total</strong><strong>GBP {fmtMoney(doc.total)}</strong></div>{doc.amountDue !== undefined && <div><strong>Amount Due</strong><strong>{fmtMoney(doc.amountDue)}</strong></div>}</div>;
}
export function LineEditor({
  doc,
  onChange,
  purchase = false
}) {
  const {
      state
    } = useStore(),
    [discount, setDiscount] = useState(false),
    [taxColumn, setTaxColumn] = useState(false),
    change = (i, key, value) => onChange({
      ...doc,
      lineItems: (doc.lineItems || []).map((l, j) => j === i ? {
        ...l,
        [key]: value
      } : l)
    }),
    totals = calcDocumentTotals(doc, state.taxRates || []);
  return <><div className="line-tools"><Menu label="⚙ Columns"><label><input type="checkbox" checked={discount} onChange={e => setDiscount(e.target.checked)} /> Discount %</label><label><input type="checkbox" checked={taxColumn} onChange={e => setTaxColumn(e.target.checked)} /> Tax amount</label></Menu></div><div className="table-scroll line-table"><table><thead><tr>{['Item', 'Description', 'Qty', 'Price', ...(discount ? ['Disc %'] : []), 'Account', 'Tax rate', ...(taxColumn ? ['Tax amount'] : []), ...((state.trackingCategories || []).length ? ['Department'] : []), 'Amount GBP', ''].map((x, i) => <th key={i}>{x}</th>)}</tr></thead><tbody>{(doc.lineItems || []).map((l, i) => <tr key={l.id || i}><td><select aria-label={`Item ${i + 1}`} value={l.itemCode || ''} onChange={e => {
                const item = (state.items || []).find(t => t.code === e.target.value);
                if (!item) return;
                onChange({
                  ...doc,
                  lineItems: doc.lineItems.map((line, j) => i === j ? {
                    ...line,
                    itemCode: item.code,
                    description: item[purchase ? 'purchaseDescription' : 'salesDescription'] || item.name,
                    unitAmount: item[purchase ? 'purchaseUnitPrice' : 'salesUnitPrice'] || 0,
                    accountCode: item[purchase ? 'purchaseAccountCode' : 'salesAccountCode'] || l.accountCode,
                    taxType: item[purchase ? 'purchaseTaxType' : 'salesTaxType'] || l.taxType
                  } : line)
                });
              }}><option value="">Select item</option>{(state.items || []).filter(t => purchase ? t.isPurchased : t.isSold).map(t => <option key={t.id} value={t.code}>{t.code}</option>)}</select></td><td><textarea aria-label={`Description ${i + 1}`} value={l.description || ''} onChange={e => change(i, 'description', e.target.value)} /></td><td><MoneyInput aria-label={`Quantity ${i + 1}`} value={l.quantity} onChange={v => change(i, 'quantity', v)} /></td><td><MoneyInput aria-label={`Price ${i + 1}`} value={l.unitAmount} onChange={v => change(i, 'unitAmount', v)} /></td>{discount && <td><MoneyInput aria-label={`Discount ${i + 1}`} value={l.discountRate || 0} onChange={v => change(i, 'discountRate', v)} /></td>}<td><AccountPicker label={`Account ${i + 1}`} value={l.accountCode} onChange={v => {
                const account = (state.accounts || []).find(a => a.code === v);
                onChange({
                  ...doc,
                  lineItems: doc.lineItems.map((line, j) => i === j ? {
                    ...line,
                    accountCode: v,
                    taxType: account?.taxType || 'NONE'
                  } : line)
                });
              }} /></td><td><TaxRatePicker label={`Tax rate ${i + 1}`} purchase={purchase} value={l.taxType} onChange={v => change(i, 'taxType', v)} /></td>{taxColumn && <td className="num">{fmtMoney(totals.lineItems[i]?.taxAmount)}</td>}{(state.trackingCategories || []).length > 0 && <td><select aria-label={`Department ${i + 1}`} value={l.tracking?.[0]?.optionId || ''} onChange={e => change(i, 'tracking', e.target.value ? [{
                categoryId: state.trackingCategories[0].id,
                optionId: e.target.value
              }] : [])}><option value="">None</option>{(state.trackingCategories[0].options || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></td>}<td className="num">{fmtMoney(totals.lineItems[i]?.lineAmount)}</td><td><button aria-label={`Remove line ${i + 1}`} className="icon-button" onClick={() => onChange({
                ...doc,
                lineItems: doc.lineItems.filter((_, j) => j !== i)
              })}>×</button></td></tr>)}</tbody></table></div><Button variant="borderless" onClick={() => onChange({
      ...doc,
      lineItems: [...(doc.lineItems || []), {
        id: newId('li'),
        quantity: 1,
        unitAmount: 0,
        discountRate: 0,
        description: '',
        accountCode: purchase ? '429' : '200',
        taxType: purchase ? 'INPUT2' : 'OUTPUT2',
        tracking: []
      }]
    })}>+ Add line item</Button><Totals doc={totals} /></>;
}
export function DocumentLines({
  doc
}) {
  const {
    state
  } = useStore();
  return <><div className="table-scroll"><table><thead><tr>{['Description', 'Qty', 'Unit price', 'Disc %', 'Account', 'Tax rate', 'Amount'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{(doc.lineItems || []).map((l, i) => <tr key={l.id || i}><td>{l.description}</td><td>{l.quantity}</td><td className="num">{fmtMoney(l.unitAmount)}</td><td>{l.discountRate || 0}</td><td>{l.accountCode}</td><td>{(state.taxRates || []).find(t => t.taxType === l.taxType)?.name || l.taxType}</td><td className="num">{fmtMoney(l.lineAmount)}</td></tr>)}</tbody></table></div><Totals doc={{
      ...doc,
      amountDue: undefined
    }} /></>;
}
export function HistoryNotes({
  kind,
  id
}) {
  const {
      state,
      dispatch
    } = useStore(),
    [open, setOpen] = useState(false),
    [add, setAdd] = useState(false),
    [text, setText] = useState(''),
    events = (state.historyEvents || []).filter(e => e.entityId === id);
  return <div className="history"><Button variant="borderless" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'} history ({events.length} entries)</Button><Button onClick={() => {
      setText('');
      setAdd(true);
    }}>Add note</Button>{open && <DataTable rows={events} columns={[{
      key: 'action',
      label: 'Changes'
    }, {
      key: 'createdAt',
      label: 'Date',
      render: r => `${fmtDate(r.createdAt)} ${new Date(r.createdAt).toLocaleTimeString('en-GB', {
        hour: 'numeric',
        minute: '2-digit'
      })}`
    }, {
      key: 'userName',
      label: 'User'
    }, {
      key: 'details',
      label: 'Details'
    }]} />}{add && <Modal title="Add note" onClose={() => setAdd(false)}><Field label="Note"><textarea value={text} onChange={e => setText(e.target.value)} /></Field><footer><Button onClick={() => setAdd(false)}>Cancel</Button><Button variant="primary" disabled={!text.trim()} onClick={() => {
          dispatch({
            type: 'note',
            kind,
            id,
            text
          });
          setAdd(false);
        }}>Save</Button></footer></Modal>}</div>;
}
export const NotFound = ({
  name = 'Page',
  back = '/'
}) => <><PageHeader title={`${name} not found`} /><div className="content"><div className="panel empty">This {name.toLowerCase()} could not be found. <SidLink to={back}>Go back</SidLink></div></div></>;
export function downloadCsv(name, columns, rows) {
  const escape = x => `"${String(x ?? '').replaceAll('"', '""')}"`,
    csv = [columns, ...rows].map(row => row.map(escape).join(',')).join('\r\n'),
    blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8'
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function Attachments({
  kind,
  id,
  files = []
}) {
  const {
      dispatch
    } = useStore(),
    [error, setError] = useState(''),
    [uploading, setUploading] = useState(false);
  const upload = async chosen => {
    if (!chosen.length) return;
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      for (const file of chosen) data.append('files', file);
      const response = await fetch(withSid('/upload'), {
        method: 'POST',
        body: data
      });
      if (!response.ok) throw Error('Upload failed. Please try again.');
      const result = await response.json();
      if (!Array.isArray(result.files)) throw Error('Upload returned no files');
      dispatch({
        type: 'attachments',
        kind,
        id,
        files: result.files
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };
  return <section className="attachments" onDragOver={e => e.preventDefault()} onDrop={e => {
    e.preventDefault();
    upload([...e.dataTransfer.files]);
  }}><h3>Attachments</h3><ErrorBanner error={error} /><p>{uploading ? 'Uploading…' : 'Drag files here or browse'}</p><input aria-label="Attach files" type="file" multiple disabled={uploading} onChange={e => {
      upload([...e.target.files]);
      e.target.value = '';
    }} />{files.map((f, i) => <p key={f.url || i}><AttachmentLink file={f} /><small>{Math.round(Number(f.size || 0) / 1024)} KB</small></p>)}</section>;
}
function AttachmentLink({
  file
}) {
  return <a href={withSid(file.url || '')} download={file.original_name}>{file.original_name || 'Attachment'}</a>;
}
