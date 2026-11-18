import { RepeatingInvoices } from './SecondaryDocuments.jsx';
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { newId } from '../store/reducer.js';
import { SidLink, useSidNavigate } from '../components/SidLink.jsx';
import { Attachments, Button, SplitButton, Menu, Modal, ConfirmDialog, ErrorBanner, PageHeader, Field, DateInput, MoneyInput, ContactPicker, BankPicker, LineEditor, Totals, DocumentLines, StatusPill, SummaryTiles, Tabs, DataTable, HistoryNotes, NotFound, useToast, downloadCsv } from '../components/UI.jsx';
import { fmtMoney, fmtDate, todayISO, addDays, dueDateFromTerms, calcDocumentTotals, round2, iso } from '../utils/money.js';
import { displayStatus } from '../utils/status.js';
const statusTabs = [['all', 'All'], ['draft', 'Draft'], ['submitted', 'Awaiting Approval'], ['authorised', 'Awaiting Payment'], ['paid', 'Paid'], ['repeating', 'Repeating']];
export function DocumentList({
  bill = false
}) {
  const {
      state,
      dispatch
    } = useStore(),
    [params, setParams] = useSearchParams(),
    navigate = useSidNavigate(),
    toast = useToast(),
    key = bill ? 'bills' : 'invoices',
    kind = bill ? 'bill' : 'invoice',
    title = bill ? 'Bills' : 'Invoices',
    docs = (state[key] || []).filter(d => d.status !== 'DELETED'),
    [selected, setSelected] = useState([]),
    [showSearch, setShowSearch] = useState(!!params.get('q')),
    [query, setQuery] = useState(params.get('q') || ''),
    [dateType, setDateType] = useState(params.get('dateType') || 'any'),
    [from, setFrom] = useState(params.get('from') || ''),
    [to, setTo] = useState(params.get('to') || ''),
    [confirm, setConfirm] = useState(null);
  const name = d => (state.contacts || []).find(c => c.id === d.contactId)?.name || d.contactName || '(Unknown contact)',
    status = params.get('status') || 'all',
    overdue = params.get('overdue') === '1',
    appliedQ = params.get('q') || '',
    filter = d => {
      const q = appliedQ.toLowerCase(),
        numeric = q.replaceAll(',', ''),
        type = params.get('dateType') || 'any',
        date = type === 'dueDate' ? d.dueDate : d.date;
      return (status === 'all' || d.status?.toLowerCase() === status) && (!overdue || displayStatus(d) === 'Overdue') && (!q || [d.invoiceNumber, d.reference, name(d)].join(' ').toLowerCase().includes(q) || Number(numeric) === d.total || Number(numeric) === d.amountDue) && (!params.get('from') || type === 'any' || date >= params.get('from')) && (!params.get('to') || type === 'any' || date <= params.get('to')) && (!params.get('dueFrom') || d.dueDate >= params.get('dueFrom')) && (!params.get('dueTo') || d.dueDate <= params.get('dueTo'));
    },
    rows = docs.filter(filter).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    chosen = docs.filter(d => selected.includes(d.id)),
    canApprove = chosen.length && chosen.every(d => ['DRAFT', 'SUBMITTED'].includes(d.status)),
    canPay = chosen.length && chosen.every(d => d.status === 'AUTHORISED'),
    canVoid = canPay && chosen.every(d => !d.amountPaid);
  const tab = val => {
    if (val === 'repeating') {
      navigate('/repeating-invoices');
      return;
    }
    const next = new URLSearchParams(params);
    next.delete('overdue');
    next.delete('dueFrom');
    next.delete('dueTo');
    if (val === 'overdue') {
      next.set('status', 'authorised');
      next.set('overdue', '1');
    } else next.set('status', val);
    setParams(next);
    setSelected([]);
  };
  const doAction = event => setConfirm({
    title: `${event === 'approve' ? 'Approve' : event === 'delete' ? 'Delete' : 'Void'} ${chosen.length} ${key}?`,
    event
  });
  const applySearch = () => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries({
      q: query,
      dateType,
      from,
      to
    })) if (v) next.set(k, v);else next.delete(k);
    setParams(next);
  };
  const exportRows = () => downloadCsv(`${title}.csv`, ['Number', 'Reference', 'Contact', 'Date', 'Due date', 'Paid', 'Due', 'Status'], rows.map(d => [d.invoiceNumber, d.reference, name(d), d.date, d.dueDate, d.amountPaid, d.amountDue, displayStatus(d)]));
  const columns = [...(bill ? [{
    key: 'contactName',
    label: 'From',
    render: d => <SidLink to={`/${key}/${d.id}`}>{name(d)}</SidLink>,
    sortValue: name
  }] : [{
    key: 'invoiceNumber',
    label: 'Number',
    className: 'document-number',
    render: d => <SidLink to={`/${key}/${d.id}${d.status === 'DRAFT' ? '/edit' : ''}`}>{d.invoiceNumber || '—'}</SidLink>
  }]), {
    key: 'reference',
    label: bill ? 'Reference' : 'Ref',
    render: d => <span className="document-reference" title={d.reference || ''}>{d.reference || '—'}</span>
  }, ...(!bill ? [{
    key: 'contactName',
    label: 'To',
    render: name,
    sortValue: name
  }] : []), {
    key: 'date',
    label: 'Date',
    className: 'document-date',
    render: d => fmtDate(d.date)
  }, {
    key: 'dueDate',
    label: 'Due Date',
    className: 'document-date',
    render: d => <span className={displayStatus(d) === 'Overdue' ? 'red' : ''}>{fmtDate(d.dueDate)}{displayStatus(d) === 'Overdue' && <small className="red">Overdue</small>}</span>
  }, ...(bill ? [{
    key: 'plannedPaymentDate',
    label: 'Planned',
    className: 'document-date',
    render: d => fmtDate(d.plannedPaymentDate)
  }] : []), {
    key: 'amountPaid',
    label: 'Paid',
    numeric: true,
    render: d => fmtMoney(d.amountPaid)
  }, {
    key: 'amountDue',
    label: 'Due',
    numeric: true,
    render: d => fmtMoney(d.amountDue)
  }, {
    key: 'status',
    label: 'Status',
    render: d => <StatusPill doc={d} />
  }, ...(!bill ? [{
    key: 'sentToContact',
    label: 'Sent',
    render: d => d.sentToContact ? '✉ Sent' : ''
  }] : [])];
  if (status === 'repeating' && !bill) return <RepeatingInvoices />;
  return <><PageHeader title={title} breadcrumb={{
      label: bill ? 'Purchases overview' : 'Sales overview',
      to: bill ? '/purchases' : '/sales'
    }} actions={<><Button onClick={exportRows}>Export</Button><SplitButton label={`New ${kind}`} onClick={() => navigate(`/${key}/new`)}>{!bill && <button onClick={() => navigate('/repeating-invoices')}>New repeating invoice</button>}<button onClick={() => navigate('/credit-notes/new')}>New credit note</button></SplitButton></>} /><div className="content"><SummaryTiles docs={docs} onSelect={tab} /><Tabs value={overdue ? 'overdue' : status} items={[...statusTabs.filter(([k]) => !bill || k !== 'repeating').map(([k, l]) => [k, `${l} (${k === 'all' ? docs.length : k === 'repeating' ? (state.repeatingInvoices || []).filter(r => r.status !== 'DELETED').length : docs.filter(d => d.status?.toLowerCase() === k).length})`]), ...(overdue ? [['overdue', 'Overdue']] : [])]} onChange={tab} /><div className="toolbar"><Button onClick={() => setShowSearch(!showSearch)}>⌕ Search</Button>{appliedQ && <span>Results for “{appliedQ}”</span>}</div>{showSearch && <div className="search-panel form-row"><Field label="Search"><input aria-label="Search documents" placeholder="Enter a contact, amount, or reference" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && applySearch()} /></Field><Field label="Date type"><select value={dateType} onChange={e => setDateType(e.target.value)}><option value="any">Any date</option><option value="date">{bill ? 'Bill' : 'Invoice'} date</option><option value="dueDate">Due date</option></select></Field><Field label="Start"><DateInput value={from} onChange={setFrom} /></Field><Field label="End"><DateInput value={to} onChange={setTo} /></Field><Button variant="primary" onClick={applySearch}>Search</Button><Button onClick={() => {
          setQuery('');
          setFrom('');
          setTo('');
          const next = new URLSearchParams(params);
          ['q', 'from', 'to', 'dateType', 'dueFrom', 'dueTo'].forEach(k => next.delete(k));
          setParams(next);
        }}>Clear</Button></div>}{chosen.length > 0 && <div className="bulk-bar"><strong>{chosen.length} items selected · GBP {fmtMoney(chosen.reduce((s, d) => s + Number(d.amountDue || d.total || 0), 0))}</strong>{canApprove && <><Button onClick={() => doAction('approve')}>Approve</Button><Button onClick={() => doAction('delete')}>Delete</Button></>}{canPay && (bill ? <Button variant="green" onClick={() => navigate(`/bills/batch-payment?ids=${chosen.map(d => d.id).join(',')}`)}>Make payment ▾ · Batch payment</Button> : <Button onClick={() => {
          dispatch({
            type: 'documentAction',
            kind,
            ids: selected,
            event: 'sent'
          });
          setSelected([]);
          toast('Marked as sent');
        }}>Mark as sent</Button>)}{bill && canVoid && <Button onClick={() => doAction('void')}>Void</Button>}<Button onClick={() => window.print()}>Print</Button></div>}<DataTable columns={columns} rows={rows} selected={selected} onSelect={setSelected} onRow={d => navigate(`/${key}/${d.id}${d.status === 'DRAFT' ? '/edit' : ''}`)} /></div>{confirm && <ConfirmDialog title={confirm.title} destructive={confirm.event !== 'approve'} onClose={() => setConfirm(null)} onConfirm={reason => {
      dispatch({
        type: 'documentAction',
        kind,
        ids: selected,
        event: confirm.event,
        reason
      });
      setSelected([]);
      toast(`${chosen.length} ${key} updated`);
    }} />}</>;
}
export function EmailModal({
  doc,
  onClose
}) {
  const {
      state,
      dispatch
    } = useStore(),
    toast = useToast(),
    contact = (state.contacts || []).find(c => c.id === doc.contactId),
    [to, setTo] = useState(contact?.email || ''),
    [subject, setSubject] = useState(`Invoice ${doc.invoiceNumber} from ${state.organisation?.name} for ${contact?.name || doc.contactName || ''}`),
    [body, setBody] = useState(`Hi ${contact?.firstName || contact?.name || ''},\n\nHere's invoice ${doc.invoiceNumber} for GBP ${fmtMoney(doc.amountDue)}.\nPayment is due on ${fmtDate(doc.dueDate)}.\n\nThanks,\n${state.currentUser?.name || 'Hannah Clarke'}\n${state.organisation?.name}`),
    [copy, setCopy] = useState(false),
    [attach, setAttach] = useState(true),
    [error, setError] = useState('');
  return <Modal title={`Email invoice ${doc.invoiceNumber}`} onClose={onClose}><ErrorBanner error={error} /><Field label="To"><input value={to} onChange={e => setTo(e.target.value)} /></Field><label><input type="checkbox" checked={copy} onChange={e => setCopy(e.target.checked)} /> Send me a copy</label><Field label="Subject"><input value={subject} onChange={e => setSubject(e.target.value)} /></Field><Field label="Message"><textarea rows={9} value={body} onChange={e => setBody(e.target.value)} /></Field><label><input type="checkbox" checked={attach} onChange={e => setAttach(e.target.checked)} /> Include PDF attachment</label><footer><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => {
        try {
          dispatch({
            type: 'email',
            kind: 'invoice',
            id: doc.id,
            data: {
              to: to.split(',').map(s => s.trim()).filter(Boolean),
              cc: [],
              subject,
              body,
              attachPdf: attach,
              sendMeACopy: copy
            }
          });
          toast('Invoice sent');
          onClose();
        } catch (e) {
          setError(e.message);
        }
      }}>Send</Button></footer></Modal>;
}
export function DocumentEditor({
  bill = false
}) {
  const {
      state,
      dispatch
    } = useStore(),
    {
      id
    } = useParams(),
    [params] = useSearchParams(),
    navigate = useSidNavigate(),
    location = useLocation(),
    toast = useToast(),
    kind = bill ? 'bill' : 'invoice',
    key = bill ? 'bills' : 'invoices',
    existing = (state[key] || []).find(d => d.id === id),
    copy = location.state?.copy,
    settings = state.organisation?.invoiceSettings || {},
    defaultNumber = `${settings.invoicePrefix || 'INV-'}${String(settings.nextInvoiceNumber || 1).padStart(4, '0')}`,
    today = todayISO(),
    initialContact = params.get('contactId') || copy?.contactId || '',
    contact = (state.contacts || []).find(c => c.id === initialContact),
    blank = () => ({
      contactId: initialContact,
      date: today,
      dueDate: dueDateFromTerms(today, contact?.[bill ? 'billsPaymentTerms' : 'salesPaymentTerms'] || settings[bill ? 'billsPaymentTerms' : 'salesPaymentTerms']),
      invoiceNumber: bill ? '' : defaultNumber,
      reference: '',
      lineAmountTypes: 'Exclusive',
      brandingThemeId: settings.defaultBrandingThemeId || 'bt_standard',
      currencyCode: 'GBP',
      lineItems: [{
        id: newId('li'),
        quantity: 1,
        unitAmount: 0,
        discountRate: 0,
        description: '',
        accountCode: bill ? '429' : '200',
        taxType: bill ? 'INPUT2' : 'OUTPUT2'
      }],
      ...(copy ? {
        ...copy,
        id: undefined,
        status: undefined,
        invoiceNumber: bill ? '' : defaultNumber,
        date: today,
        dueDate: dueDateFromTerms(today, settings[bill ? 'billsPaymentTerms' : 'salesPaymentTerms']),
        amountPaid: 0,
        amountCredited: 0,
        paymentIds: [],
        creditNoteIds: [],
        sentToContact: false
      } : {})
    }),
    [doc, setDoc] = useState(() => structuredClone(existing || blank())),
    [optional, setOptional] = useState(false),
    [error, setError] = useState(''),
    [emailId, setEmailId] = useState(null),
    [discard, setDiscard] = useState(false),
    [dirty, setDirty] = useState(false);
  const change = next => {
      setDoc(next);
      setDirty(true);
    },
    field = (k, v) => change({
      ...doc,
      [k]: v
    });
  useEffect(() => {
    const before = e => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty]);
  if (id && !existing) return <NotFound name={kind} back={`/${key}`} />;
  if (existing && (existing.amountPaid > 0 || !['DRAFT', 'SUBMITTED', 'AUTHORISED'].includes(existing.status))) return <><PageHeader title={`Edit ${kind}`} /><div className="content"><div className="info-banner">This {kind} has payments applied or cannot be edited. Remove the payments to edit. <SidLink to={`/${key}/${id}`}>Back to {kind}</SidLink></div></div></>;
  const save = (status, mode = 'close') => {
    try {
      const newDocumentId = existing?.id || newId(bill ? 'bill' : 'inv');
      dispatch({
        type: 'saveDocument',
        kind,
        id,
        newId: newDocumentId,
        data: doc,
        status
      });
      setDirty(false);
      toast(`${bill ? 'Bill' : 'Invoice'} saved`);
      if (mode === 'next') {
        const next = (state.bills || []).find(b => b.id !== id && ['DRAFT', 'SUBMITTED'].includes(b.status));
        navigate(next ? `/bills/${next.id}/edit` : '/bills');
        return;
      }
      if (mode === 'print') {
        navigate(`/invoices/${newDocumentId}/print`);
        return;
      }
      if (mode === 'email') {
        setEmailId(newDocumentId);
        return;
      }
      if (mode === 'another') {
        navigate(`/${key}/new`);
        setDoc({
          ...blank(),
          invoiceNumber: bill ? '' : `${settings.invoicePrefix || 'INV-'}${String((settings.nextInvoiceNumber || 1) + (doc.invoiceNumber === defaultNumber ? 1 : 0)).padStart(4, '0')}`
        });
        setError('');
        return;
      }
      navigate(`/${key}/${newDocumentId}`);
    } catch (e) {
      setError(e.message);
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  const cancel = () => dirty ? setDiscard(true) : navigate(`/${key}`);
  return <><PageHeader title={existing ? `Edit ${kind} ${existing.invoiceNumber || existing.reference}` : `New ${kind}`} breadcrumb={{
      label: bill ? 'Bills' : 'Invoices',
      to: `/${key}`,
      onClick: e => {
        e.preventDefault();
        cancel();
      }
    }} actions={existing && <StatusPill doc={existing} />} /><div className="content full"><section className="panel"><ErrorBanner error={error} /><div className="form-row"><Field label={bill ? 'From' : 'Contact'}><ContactPicker label={bill ? 'From' : 'Contact'} value={doc.contactId} onChange={v => {
              const c = (state.contacts || []).find(c => c.id === v);
              change({
                ...doc,
                contactId: v,
                dueDate: dueDateFromTerms(doc.date, c?.[bill ? 'billsPaymentTerms' : 'salesPaymentTerms'] || settings[bill ? 'billsPaymentTerms' : 'salesPaymentTerms']),
                lineItems: doc.lineItems.map(l => ({
                  ...l,
                  accountCode: c?.[bill ? 'defaultPurchaseAccountCode' : 'defaultSalesAccountCode'] || l.accountCode,
                  taxType: c?.[bill ? 'defaultPurchaseTaxType' : 'defaultSalesTaxType'] || l.taxType
                }))
              });
            }} /></Field><Field label={bill ? 'Date' : 'Issue date'}><DateInput value={doc.date} onChange={v => field('date', v)} /></Field><Field label="Due date"><DateInput value={doc.dueDate} onChange={v => field('dueDate', v)} /><select aria-label="Due date preset" value="" onChange={e => {
              if (e.target.value === 'month') field('dueDate', iso(new Date(Number(doc.date.slice(0, 4)), Number(doc.date.slice(5, 7)) + 1, 0)));else field('dueDate', addDays(doc.date, Number(e.target.value)));
            }}><option value="">Choose a due date</option>{[7, 14, 30].map(n => <option key={n} value={n}>In {n} days</option>)}<option value="month">End of next month</option></select></Field>{!bill && <Field label="Invoice number"><input value={doc.invoiceNumber || ''} onChange={e => field('invoiceNumber', e.target.value)} /></Field>}<Field label="Reference"><input value={doc.reference || ''} onChange={e => field('reference', e.target.value)} /></Field></div><div className="toolbar"><Button variant="borderless" onClick={() => setOptional(!optional)}>Optional details {optional ? '▴' : '▾'}</Button></div><div className="form-row">{optional && <><Field label="Branding theme"><select value={doc.brandingThemeId} onChange={e => field('brandingThemeId', e.target.value)}>{(state.brandingThemes || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field><Field label="Currency"><select disabled><option>GBP — British Pound</option></select></Field></>}<Field label="Amounts are" className="document-amounts"><select value={doc.lineAmountTypes || 'Exclusive'} onChange={e => field('lineAmountTypes', e.target.value)}><option value="Exclusive">Tax exclusive</option><option value="Inclusive">Tax inclusive</option><option value="NoTax">No tax</option></select></Field></div><LineEditor doc={doc} onChange={change} purchase={bill} /><footer className="form-footer"><Button onClick={cancel}>Cancel</Button>{bill ? <><Button onClick={() => save('DRAFT')}>Save draft</Button><Button onClick={() => save('SUBMITTED')}>Submit for approval</Button><SplitButton label="Approve" onClick={() => save('AUTHORISED')}><button onClick={() => save('AUTHORISED', 'another')}>Approve & add another</button><button onClick={() => save('AUTHORISED', 'next')}>Approve & view next</button></SplitButton></> : <><SplitButton variant="" label="Save & close" onClick={() => save(existing?.status === 'AUTHORISED' ? 'AUTHORISED' : 'DRAFT')}><button onClick={() => save('DRAFT', 'another')}>Save & add another</button><button onClick={() => save('SUBMITTED')}>Submit for approval</button></SplitButton><SplitButton label="Approve & email" onClick={() => save('AUTHORISED', 'email')}><button onClick={() => save('AUTHORISED')}>Approve</button><button onClick={() => save('AUTHORISED', 'another')}>Approve & add another</button><button onClick={() => save('AUTHORISED', 'print')}>Approve & print PDF</button></SplitButton></>}</footer></section></div>{discard && <ConfirmDialog title="Discard changes?" onClose={() => setDiscard(false)} onConfirm={() => navigate(`/${key}`)} destructive />}{emailId && <EmailModal doc={(state.invoices || []).find(d => d.id === emailId) || {
      ...doc,
      id: emailId
    }} onClose={() => navigate(`/invoices/${emailId}`)} />}</>;
}
export function DocumentView({
  bill = false
}) {
  const {
      state,
      dispatch
    } = useStore(),
    {
      id
    } = useParams(),
    [params, setParams] = useSearchParams(),
    navigate = useSidNavigate(),
    toast = useToast(),
    kind = bill ? 'bill' : 'invoice',
    key = bill ? 'bills' : 'invoices',
    doc = (state[key] || []).find(d => d.id === id),
    [email, setEmail] = useState(false),
    [confirm, setConfirm] = useState(null),
    [error, setError] = useState(''),
    [amount, setAmount] = useState(doc?.amountDue || 0),
    [date, setDate] = useState(todayISO()),
    [bank, setBank] = useState((state.bankAccounts || [])[0]?.id || ''),
    [reference, setReference] = useState(''),
    [schedule, setSchedule] = useState(false),
    [planned, setPlanned] = useState(doc?.plannedPaymentDate || todayISO());
  useEffect(() => setAmount(doc?.amountDue || 0), [doc?.amountDue]);
  if (!doc) return <NotFound name={kind} back={`/${key}`} />;
  const contact = (state.contacts || []).find(c => c.id === doc.contactId),
    name = contact?.name || doc.contactName || '(Unknown contact)',
    canEdit = ['DRAFT', 'SUBMITTED', 'AUTHORISED'].includes(doc.status) && !doc.amountPaid,
    payments = (state.payments || []).filter(p => p.documentId === id && p.status !== 'DELETED'),
    doAction = event => setConfirm({
      event,
      title: `${event === 'approve' ? 'Approve' : event === 'delete' ? 'Delete' : 'Void'} ${kind}?`
    }),
    action = event => {
      try {
        dispatch({
          type: 'documentAction',
          kind,
          id,
          event
        });
        toast(`${bill ? 'Bill' : 'Invoice'} updated`);
      } catch (e) {
        setError(e.message);
      }
    };
  return <><PageHeader title={bill ? `Bill — ${name} — ${doc.reference || ''}` : `Invoice ${doc.invoiceNumber || ''}`} breadcrumb={{
      label: bill ? 'Bills' : 'Invoices',
      to: `/${key}`
    }} actions={<><StatusPill doc={doc} />{canEdit && <Button onClick={() => navigate(`/${key}/${id}/edit`)}>Edit</Button>}{!bill && <Button onClick={() => navigate(`/invoices/${id}/print`)}>Print PDF</Button>}{!bill && ['AUTHORISED', 'PAID'].includes(doc.status) && <Button onClick={() => setEmail(true)}>Email</Button>}<Menu label="⋯"><button onClick={() => navigate(`/${key}/new`, {
          state: {
            copy: doc
          }
        })}>Copy to new {kind}</button>{!bill && <button onClick={() => navigate(`/credit-notes/new?invoiceId=${id}`)}>Add credit note</button>}{!bill && ['AUTHORISED', 'PAID'].includes(doc.status) && <button onClick={() => action(doc.sentToContact ? 'unsent' : 'sent')}>Mark as {doc.sentToContact ? 'unsent' : 'sent'}</button>}{bill && doc.status === 'AUTHORISED' && <button onClick={() => setSchedule(true)}>Schedule payment</button>}{doc.status === 'AUTHORISED' && !doc.amountPaid && <button onClick={() => doAction('void')}>Void</button>}{['DRAFT', 'SUBMITTED'].includes(doc.status) && <button onClick={() => doAction('delete')}>Delete</button>}</Menu></>} /><div className="content"><ErrorBanner error={error} />{['DRAFT', 'SUBMITTED'].includes(doc.status) && <div className="info-banner"><span>{doc.status === 'DRAFT' ? `This is a draft ${kind}` : `This ${kind} is awaiting approval`}</span><div className="actions"><Button onClick={() => navigate(`/${key}/${id}/edit`)}>Edit</Button><Button variant="primary" onClick={() => doAction('approve')}>Approve</Button></div></div>}<section className="panel"><div className="facts"><div><span>{bill ? 'From' : 'To'}</span><SidLink to={`/contacts/${doc.contactId}`}>{name}</SidLink></div><div><span>Date</span>{fmtDate(doc.date)}</div><div><span>Due date</span><div className={displayStatus(doc) === 'Overdue' ? 'red' : ''}>{fmtDate(doc.dueDate)}</div></div><div><span>Reference</span>{doc.reference || '—'}</div><div><span>Amount due</span><strong className="big">{fmtMoney(doc.amountDue)}</strong></div></div><DocumentLines doc={doc} />{payments.map(p => <div key={p.id} className="payment-row"><SidLink to={`/payments/${p.id}`}>Less Payment — {fmtDate(p.date)}</SidLink><span>{fmtMoney(p.amount)}</span></div>)}{doc.amountCredited > 0 && <div className="payment-row"><span>Less Credit Note</span><span>{fmtMoney(doc.amountCredited)}</span></div>}<div className="payment-row"><strong>Amount Due</strong><strong>GBP {fmtMoney(doc.amountDue)}</strong></div>{doc.status === 'AUTHORISED' && doc.amountDue > 0 && <div className="payment-form"><h2>{bill ? 'Make a payment' : 'Record a payment'}</h2><div className="form-row"><Field label="Amount paid"><MoneyInput value={amount} onChange={setAmount} /></Field><Field label="Date paid"><DateInput value={date} onChange={setDate} /></Field><Field label={bill ? 'Paid from' : 'Paid to'}><BankPicker label={bill ? 'Paid from' : 'Paid to'} value={bank} onChange={setBank} /></Field><Field label="Reference"><input value={reference} onChange={e => setReference(e.target.value)} /></Field></div><Button variant="primary" onClick={() => {
            try {
              dispatch({
                type: 'payment',
                data: {
                  documentType: kind,
                  documentId: id,
                  amount: Number(amount),
                  date,
                  bankAccountId: bank,
                  reference
                }
              });
              toast('Payment recorded');
              setError('');
            } catch (e) {
              setError(e.message);
            }
          }}>{bill ? 'Make payment' : 'Add payment'}</Button></div>}</section><Attachments kind={kind} id={id} files={doc.attachments || []} /><HistoryNotes kind={kind} id={id} /></div>{schedule && <Modal title="Schedule payment" onClose={() => setSchedule(false)}><Field label="Planned payment date"><DateInput value={planned} onChange={setPlanned} /></Field><footer><Button onClick={() => setSchedule(false)}>Cancel</Button><Button variant="primary" disabled={!planned} onClick={() => {
          dispatch({
            type: "schedule",
            id,
            date: planned
          });
          setSchedule(false);
          toast("Payment scheduled");
        }}>Save</Button></footer></Modal>}{email && <EmailModal doc={doc} onClose={() => setEmail(false)} />}{confirm && <ConfirmDialog title={confirm.title} onClose={() => setConfirm(null)} destructive={confirm.event !== 'approve'} onConfirm={reason => {
      dispatch({
        type: 'documentAction',
        kind,
        id,
        event: confirm.event,
        reason
      });
      toast(`${bill ? 'Bill' : 'Invoice'} updated`);
      if (confirm.event === 'delete') navigate(`/${key}`);
    }} />}</>;
}
export function BatchPayment() {
  const {
      state,
      dispatch
    } = useStore(),
    [params] = useSearchParams(),
    navigate = useSidNavigate(),
    toast = useToast(),
    ids = (params.get('ids') || '').split(',').filter(Boolean),
    valid = (state.bills || []).filter(b => ids.includes(b.id) && b.status === 'AUTHORISED'),
    [rows, setRows] = useState(() => valid.map(b => ({
      documentId: b.id,
      amount: b.amountDue
    }))),
    [date, setDate] = useState(todayISO()),
    [bank, setBank] = useState((state.bankAccounts || [])[0]?.id || ''),
    [reference, setReference] = useState(''),
    [error, setError] = useState(''),
    total = round2(rows.reduce((s, r) => s + Number(r.amount || 0), 0));
  return <><PageHeader title="New batch payment" breadcrumb={{
      label: 'Bills',
      to: '/bills'
    }} /><div className="content"><div className="panel"><ErrorBanner error={error} />{ids.length > valid.length && <div className="info-banner">{ids.length - valid.length} bills could not be included because they are not awaiting payment</div>}<div className="form-row"><Field label="Payment date"><DateInput value={date} onChange={setDate} /></Field><Field label="Pay from"><BankPicker label="Pay from" value={bank} onChange={setBank} /></Field><Field label="Reference"><input value={reference} onChange={e => setReference(e.target.value)} /></Field></div><DataTable rows={rows.map(r => ({
          ...r,
          id: r.documentId,
          bill: valid.find(b => b.id === r.documentId)
        }))} columns={[{
          key: 'contact',
          label: 'From',
          render: r => r.bill?.contactName || '(Unknown contact)'
        }, {
          key: 'reference',
          label: 'Reference',
          render: r => r.bill?.reference
        }, {
          key: 'dueDate',
          label: 'Due date',
          render: r => fmtDate(r.bill?.dueDate)
        }, {
          key: 'amountDue',
          label: 'Amount due',
          numeric: true,
          render: r => fmtMoney(r.bill?.amountDue)
        }, {
          key: 'amount',
          label: 'Payment',
          numeric: true,
          render: r => <MoneyInput aria-label={`Payment ${r.bill?.reference}`} value={r.amount} onChange={v => setRows(rows.map(x => x.documentId === r.documentId ? {
            ...x,
            amount: v
          } : x))} />
        }, {
          key: 'remove',
          label: '',
          render: r => <Button onClick={() => setRows(rows.filter(x => x.documentId !== r.documentId))}>×</Button>
        }]} /><div className="totals"><div className="total"><strong>Total GBP</strong><strong>{fmtMoney(total)}</strong></div></div><footer className="form-footer"><Button onClick={() => navigate('/bills')}>Cancel</Button><Button variant="green" disabled={!rows.length || total <= 0} onClick={() => {
            try {
              const id = newId('bp');
              dispatch({
                type: 'batch',
                newId: id,
                data: {
                  rows,
                  date,
                  bankAccountId: bank,
                  reference
                }
              });
              toast('Batch payment created');
              navigate(`/batch-payments/${id}`);
            } catch (e) {
              setError(e.message);
            }
          }}>Make payments</Button></footer></div></div></>;
}
