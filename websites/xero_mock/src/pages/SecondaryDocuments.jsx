import React, { useState } from 'react';
import { useParams, useLocation, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { newId } from '../store/reducer.js';
import { SidLink, useSidNavigate } from '../components/SidLink.jsx';
import { PageHeader, Button, Menu, Modal, ConfirmDialog, Field, DateInput, MoneyInput, ContactPicker, LineEditor, DocumentLines, DataTable, Tabs, HistoryNotes, NotFound, ErrorBanner, StatusPill, useToast } from '../components/UI.jsx';
import { creditNoteStatus, displayStatus } from '../utils/status.js';
import { fmtMoney, fmtDate, todayISO, addDays, calcDocumentTotals } from '../utils/money.js';
const configs = {
  quote: {
    key: 'quotes',
    route: 'quotes',
    title: 'Quotes',
    singular: 'Quote',
    number: 'quoteNumber',
    statuses: ['DRAFT', 'SENT', 'DECLINED', 'ACCEPTED', 'INVOICED']
  },
  purchaseOrder: {
    key: 'purchaseOrders',
    route: 'purchase-orders',
    title: 'Purchase orders',
    singular: 'Purchase order',
    number: 'purchaseOrderNumber',
    statuses: ['DRAFT', 'SUBMITTED', 'AUTHORISED', 'BILLED']
  },
  creditNote: {
    key: 'creditNotes',
    route: 'credit-notes',
    title: 'Credit notes',
    singular: 'Credit note',
    number: 'creditNoteNumber',
    statuses: ['DRAFT', 'AUTHORISED', 'PAID']
  }
};
export function SecondaryDocuments({
  kind = 'quote'
}) {
  const {
      state,
      dispatch
    } = useStore(),
    {
      id
    } = useParams(),
    [params] = useSearchParams(),
    location = useLocation(),
    navigate = useSidNavigate(),
    toast = useToast(),
    config = configs[kind],
    record = (state[config.key] || []).find(r => r.id === id),
    isNew = location.pathname.endsWith('/new'),
    [editing, setEditing] = useState(isNew),
    [filter, setFilter] = useState('all'),
    [q, setQ] = useState(''),
    [error, setError] = useState(''),
    [email, setEmail] = useState(false),
    [confirm, setConfirm] = useState(false),
    [allocate, setAllocate] = useState(false),
    [allocations, setAllocations] = useState({}),
    copy = location.state?.copy,
    source = (state.invoices || []).find(i => i.id === params.get('invoiceId')),
    [doc, setDoc] = useState(() => structuredClone(record || {
      contactId: params.get('contactId') || source?.contactId || '',
      date: todayISO(),
      expiryDate: addDays(todayISO(), 30),
      deliveryDate: addDays(todayISO(), 14),
      reference: '',
      title: '',
      summary: '',
      terms: '',
      deliveryAddress: '',
      attentionTo: '',
      telephone: '',
      deliveryInstructions: '',
      lineAmountTypes: 'Exclusive',
      type: 'ACCRECCREDIT',
      lineItems: source?.lineItems || [{
        id: newId('li'),
        description: '',
        quantity: 1,
        unitAmount: 0,
        accountCode: kind === 'purchaseOrder' ? '429' : '200',
        taxType: kind === 'purchaseOrder' ? 'INPUT2' : 'OUTPUT2'
      }],
      ...(copy || {})
    })),
    contact = (state.contacts || []).find(c => c.id === (record || doc).contactId),
    [to, setTo] = useState(contact?.email || ''),
    [subject, setSubject] = useState(`${config.singular} ${record?.[config.number] || ''} from ${state.organisation?.name}`),
    [body, setBody] = useState(`Hi ${contact?.firstName || ''},\n\nPlease find the attached ${config.singular.toLowerCase()}.\n\nThanks,\n${state.currentUser?.name}`);
  if (id && !record) return <NotFound name={config.singular} back={`/${config.route}`} />;
  const field = (k, v) => setDoc({
      ...doc,
      [k]: v
    }),
    action = event => {
      try {
        const newRecordId = newId(kind === 'quote' ? 'inv' : 'bill');
        dispatch({
          type: 'secondaryAction',
          kind,
          id,
          event,
          newId: newRecordId,
          date: todayISO()
        });
        toast(`${config.singular} updated`);
        if (event === 'convert') navigate(`/${kind === 'quote' ? 'invoices' : 'bills'}/${newRecordId}/edit`);
      } catch (e) {
        setError(e.message);
      }
    };
  const rows = (state[config.key] || []).filter(r => {
    const status = kind === 'creditNote' ? creditNoteStatus(r) : r.status;
    return status !== 'DELETED' && (filter === 'all' || status === filter) && [r[config.number], r.reference, r.contactName].join(' ').toLowerCase().includes(q.toLowerCase());
  });
  const save = status => {
    try {
      const newRecordId = id || newId(kind === 'quote' ? 'qu' : kind === 'purchaseOrder' ? 'po' : 'cn');
      dispatch({
        type: 'secondarySave',
        kind,
        id,
        newId: newRecordId,
        data: doc,
        status
      });
      setEditing(false);
      navigate(`/${config.route}/${newRecordId}`);
      toast(`${config.singular} saved`);
    } catch (e) {
      setError(e.message);
    }
  };
  return <><PageHeader title={isNew ? `New ${config.singular.toLowerCase()}` : record ? `${config.singular} ${record[config.number]}` : config.title} breadcrumb={record || isNew ? {
      label: config.title,
      to: `/${config.route}`
    } : null} actions={record && !editing ? <><StatusPill doc={record} kind={kind} />{record.status !== 'DELETED' && <><Button onClick={() => setEditing(true)}>Edit</Button>{kind !== 'creditNote' && <Button onClick={() => setEmail(true)}>Send</Button>}{kind === 'quote' && ['SENT', 'DRAFT'].includes(record.status) && <><Button onClick={() => action('ACCEPTED')}>Mark as accepted</Button><Button onClick={() => action('DECLINED')}>Mark as declined</Button></>}{kind === 'quote' && !record.invoiceId && !['DECLINED', 'INVOICED'].includes(record.status) && <Button variant="primary" onClick={() => action('convert')}>Create invoice</Button>}{kind === 'purchaseOrder' && ['DRAFT', 'SUBMITTED'].includes(record.status) && <Button variant="primary" onClick={() => action('AUTHORISED')}>Approve</Button>}{kind === 'purchaseOrder' && record.status === 'AUTHORISED' && <Button variant="primary" onClick={() => action('convert')}>Copy to bill</Button>}{kind === 'creditNote' && record.status === 'DRAFT' && <Button variant="primary" onClick={() => action('AUTHORISED')}>Approve</Button>}{kind === 'creditNote' && record.status === 'AUTHORISED' && record.remainingCredit > 0 && record.type !== 'ACCPAYCREDIT' && <Button variant="primary" onClick={() => setAllocate(true)}>Allocate credit</Button>}<Menu label="⋯"><button onClick={() => navigate(`/${config.route}/new`, {
            state: {
              copy: {
                ...record,
                id: undefined,
                [config.number]: undefined,
                status: undefined,
                invoiceId: undefined,
                billId: undefined,
                allocations: [],
                remainingCredit: undefined
              }
            }
          })}>Copy</button><button onClick={() => setConfirm(true)}>Delete</button></Menu></>}</> : !record && !isNew ? <Button variant="primary" onClick={() => navigate(`/${config.route}/new`)}>New {config.singular.toLowerCase()}</Button> : null} /><div className="content full"><ErrorBanner error={error} />{!record && !isNew ? <><Tabs value={filter} items={[['all', 'All'], ...config.statuses.map(s => [s, displayStatus({ status: s }, undefined, kind)])]} onChange={setFilter} /><div className="toolbar"><input placeholder={`Search ${config.title.toLowerCase()}`} value={q} onChange={e => setQ(e.target.value)} /></div><DataTable rows={rows} onRow={r => navigate(`/${config.route}/${r.id}`)} columns={[{
          key: config.number,
          label: 'Number',
          render: r => <SidLink to={`/${config.route}/${r.id}`}>{r[config.number]}</SidLink>
        }, {
          key: 'contactName',
          label: 'Contact',
          render: r => r.contactName || (state.contacts || []).find(c => c.id === r.contactId)?.name || '(Unknown contact)'
        }, {
          key: 'reference',
          label: 'Reference'
        }, {
          key: 'date',
          label: 'Date',
          render: r => fmtDate(r.date)
        }, {
          key: 'total',
          label: 'Total',
          numeric: true,
          render: r => fmtMoney(r.total)
        }, {
          key: 'status',
          label: 'Status',
          render: r => <StatusPill doc={r} kind={kind} />
        }]} /></> : editing ? <section className="panel"><div className="form-row"><Field label="Contact"><ContactPicker value={doc.contactId} onChange={v => field('contactId', v)} /></Field><Field label="Date"><DateInput value={doc.date} onChange={v => field('date', v)} /></Field>{kind !== 'creditNote' && <Field label={kind === 'quote' ? 'Expiry date' : 'Delivery date'}><DateInput value={kind === 'quote' ? doc.expiryDate : doc.deliveryDate} onChange={v => field(kind === 'quote' ? 'expiryDate' : 'deliveryDate', v)} /></Field>}<Field label="Reference"><input value={doc.reference || ''} onChange={e => field('reference', e.target.value)} /></Field><Field label="Amounts are"><select value={doc.lineAmountTypes} onChange={e => field('lineAmountTypes', e.target.value)}><option value="Exclusive">Tax exclusive</option><option value="Inclusive">Tax inclusive</option><option value="NoTax">No tax</option></select></Field></div>{kind === 'quote' && <><Field label="Title"><input value={doc.title || ''} onChange={e => field('title', e.target.value)} /></Field><Field label="Summary"><textarea value={doc.summary || ''} onChange={e => field('summary', e.target.value)} /></Field></>}{kind === 'purchaseOrder' && <div className="form-row">{[['deliveryAddress', 'Delivery address'], ['attentionTo', 'Attention'], ['telephone', 'Telephone'], ['deliveryInstructions', 'Delivery instructions']].map(([k, t]) => <Field label={t} key={k}><input value={doc[k] || ''} onChange={e => field(k, e.target.value)} /></Field>)}</div>}<LineEditor doc={doc} onChange={setDoc} purchase={kind === 'purchaseOrder' || doc.type === 'ACCPAYCREDIT'} />{kind === 'quote' && <Field label="Terms"><textarea value={doc.terms || ''} onChange={e => field('terms', e.target.value)} /></Field>}<footer className="form-footer"><Button onClick={() => id ? setEditing(false) : navigate(`/${config.route}`)}>Cancel</Button><Button onClick={() => save('DRAFT')}>Save draft</Button><Button variant="primary" onClick={() => save(kind === 'quote' ? 'DRAFT' : 'AUTHORISED')}>{kind === 'quote' ? 'Save' : 'Approve'}</Button></footer></section> : <section className="panel"><div className="facts"><div><span>Contact</span><SidLink to={`/contacts/${record.contactId}`}>{contact?.name || record.contactName || '(Unknown contact)'}</SidLink></div><div><span>Date</span>{fmtDate(record.date)}</div><div><span>Reference</span>{record.reference || '—'}</div>{kind !== 'creditNote' && <div><span>{kind === 'quote' ? 'Expiry date' : 'Delivery date'}</span>{fmtDate(record.expiryDate || record.deliveryDate)}</div>}</div>{record.title && <h2>{record.title}</h2>}{record.summary && <p className="notes">{record.summary}</p>}<DocumentLines doc={record} />{record.terms && <p className="notes">{record.terms}</p>}{record.invoiceId && <p><SidLink to={`/invoices/${record.invoiceId}`}>View invoice</SidLink></p>}{record.billId && <p><SidLink to={`/bills/${record.billId}`}>View bill</SidLink></p>}{kind === 'creditNote' && <><p>Remaining credit: <strong>{fmtMoney(record.remainingCredit)}</strong></p>{(record.allocations || []).map(a => <p key={a.id}><SidLink to={`/invoices/${a.invoiceId}`}>Allocation to {a.invoiceId}</SidLink> · {fmtMoney(a.amount)}</p>)}</>}</section>}{record && <HistoryNotes kind={kind} id={id} />}</div>{email && <Modal title={`Email ${config.singular.toLowerCase()}`} onClose={() => setEmail(false)}><ErrorBanner error={error} /><Field label="To"><input value={to} onChange={e => setTo(e.target.value)} /></Field><Field label="Subject"><input value={subject} onChange={e => setSubject(e.target.value)} /></Field><Field label="Message"><textarea rows={7} value={body} onChange={e => setBody(e.target.value)} /></Field><footer><Button onClick={() => setEmail(false)}>Cancel</Button><Button variant="primary" onClick={() => {
          try {
            dispatch({
              type: 'secondaryAction',
              kind,
              id,
              event: 'send',
              data: {
                to: to.split(',').map(x => x.trim()).filter(Boolean),
                subject,
                body,
                attachPdf: true
              }
            });
            setEmail(false);
            toast(`${config.singular} sent`);
          } catch (e) {
            setError(e.message);
          }
        }}>Send</Button></footer></Modal>}{confirm && <ConfirmDialog title={`Delete ${config.singular.toLowerCase()}?`} onClose={() => setConfirm(false)} destructive onConfirm={() => {
      dispatch({
        type: 'secondaryAction',
        kind,
        id,
        event: 'delete'
      });
      navigate(`/${config.route}`);
    }} />}{allocate && <Modal title="Allocate credit" onClose={() => setAllocate(false)}><ErrorBanner error={error} /><p>Remaining credit: {fmtMoney(record.remainingCredit)}</p>{(state.invoices || []).filter(d => d.contactId === record.contactId && d.status === 'AUTHORISED' && d.amountDue > 0).map(d => <Field key={d.id} label={`${d.invoiceNumber} — Due ${fmtMoney(d.amountDue)}`}><MoneyInput value={allocations[d.id] || ''} onChange={v => setAllocations({
          ...allocations,
          [d.id]: v
        })} /></Field>)}<footer><Button onClick={() => setAllocate(false)}>Cancel</Button><Button variant="primary" onClick={() => {
          try {
            const rows = Object.entries(allocations).filter(([, v]) => Number(v) > 0).map(([invoiceId, amount]) => ({
              invoiceId,
              amount: Number(amount)
            }));
            if (!rows.length) throw Error('Enter an amount to allocate');
            dispatch({
              type: 'allocateCredit',
              id,
              date: todayISO(),
              allocations: rows
            });
            setAllocate(false);
            toast('Credit allocated');
          } catch (e) {
            setError(e.message);
          }
        }}>Allocate</Button></footer></Modal>}</>;
}
export function RepeatingInvoices() {
  const {
      state,
      dispatch
    } = useStore(),
    navigate = useSidNavigate(),
    [edit, setEdit] = useState(null),
    [data, setData] = useState(null),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(null),
    rows = (state.repeatingInvoices || []).filter(r => r.status !== 'DELETED'),
    open = r => {
      setEdit(r?.id || 'new');
      setData(structuredClone(r || {
        templateInvoice: {
          contactId: '',
          reference: '',
          lineAmountTypes: 'Exclusive',
          lineItems: [{
            id: newId('li'),
            description: '',
            quantity: 1,
            unitAmount: 0,
            accountCode: '200',
            taxType: 'OUTPUT2'
          }]
        },
        schedule: {
          period: 1,
          unit: 'MONTHLY',
          startDate: todayISO(),
          nextScheduledDate: addDays(todayISO(), 30),
          endDate: null
        },
        saveAs: 'DRAFT'
      }));
    };
  return <><PageHeader title="Repeating invoices" breadcrumb={{
      label: 'Invoices',
      to: '/invoices'
    }} actions={<Button variant="primary" onClick={() => open(null)}>New repeating invoice</Button>} /><div className="content"><DataTable rows={rows} onRow={open} columns={[{
        key: 'contact',
        label: 'Contact',
        render: r => (state.contacts || []).find(c => c.id === r.templateInvoice?.contactId)?.name || '(Unknown contact)'
      }, {
        key: 'reference',
        label: 'Reference',
        render: r => r.templateInvoice?.reference
      }, {
        key: 'repeat',
        label: 'Repeat',
        render: r => `Every ${r.schedule?.period || 1} ${r.schedule?.unit === 'WEEKLY' ? 'week' : 'month'}`
      }, {
        key: 'next',
        label: 'Next invoice date',
        render: r => fmtDate(r.schedule?.nextScheduledDate)
      }, {
        key: 'end',
        label: 'End date',
        render: r => fmtDate(r.schedule?.endDate)
      }, {
        key: 'amount',
        label: 'Amount',
        numeric: true,
        render: r => fmtMoney(calcDocumentTotals(r.templateInvoice || {}, state.taxRates || []).total)
      }, {
        key: 'saveAs',
        label: 'Save as'
      }, {
        key: 'status',
        label: 'Status'
      }, {
        key: 'actions',
        label: '',
        render: r => <span onClick={e => e.stopPropagation()}><Menu label="⋯"><button onClick={() => {
              const id = newId('inv');
              dispatch({
                type: 'repeatingAction',
                id: r.id,
                event: 'generate',
                newId: id,
                date: todayISO()
              });
              navigate(`/invoices/${id}`);
            }}>Create invoice now</button><button onClick={() => dispatch({
              type: 'repeatingAction',
              id: r.id,
              event: r.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED'
            })}>{r.status === 'PAUSED' ? 'Resume' : 'Pause'}</button><button onClick={() => setConfirm(r.id)}>Delete</button></Menu></span>
      }]} /></div>{edit && <Modal title="Repeating invoice" wide onClose={() => setEdit(null)}><ErrorBanner error={error} /><Field label="Contact"><ContactPicker value={data.templateInvoice.contactId} onChange={v => setData({
          ...data,
          templateInvoice: {
            ...data.templateInvoice,
            contactId: v
          }
        })} /></Field><div className="form-row"><Field label="Repeat every"><input type="number" min="1" value={data.schedule.period} onChange={e => setData({
            ...data,
            schedule: {
              ...data.schedule,
              period: Number(e.target.value)
            }
          })} /></Field><Field label="Interval"><select value={data.schedule.unit} onChange={e => setData({
            ...data,
            schedule: {
              ...data.schedule,
              unit: e.target.value
            }
          })}><option value="MONTHLY">Month</option><option value="WEEKLY">Week</option></select></Field><Field label="Next invoice date"><DateInput value={data.schedule.nextScheduledDate} onChange={v => setData({
            ...data,
            schedule: {
              ...data.schedule,
              nextScheduledDate: v
            }
          })} /></Field><Field label="Due date rule"><input type="number" min="0" value={data.schedule.dueDateDay ?? 30} onChange={e => setData({
            ...data,
            schedule: {
              ...data.schedule,
              dueDateDay: Number(e.target.value)
            }
          })} /><select value={data.schedule.dueDateType || 'DAYSAFTERBILLDATE'} onChange={e => setData({
            ...data,
            schedule: {
              ...data.schedule,
              dueDateType: e.target.value
            }
          })}><option value="DAYSAFTERBILLDATE">days after invoice date</option><option value="OFFOLLOWINGMONTH">of following month</option><option value="DAYSAFTERBILLMONTH">days after invoice month</option></select></Field><Field label="End date"><DateInput value={data.schedule.endDate} onChange={v => setData({
            ...data,
            schedule: {
              ...data.schedule,
              endDate: v || null
            }
          })} /></Field><Field label="Save as"><select value={data.saveAs} onChange={e => setData({
            ...data,
            saveAs: e.target.value
          })}><option value="DRAFT">Draft</option><option value="AUTHORISED">Approve</option><option value="AUTHORISED_SEND">Approve for sending</option></select></Field></div><LineEditor doc={data.templateInvoice} onChange={v => setData({
        ...data,
        templateInvoice: v
      })} /><footer><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => {
          try {
            dispatch({
              type: 'saveRepeating',
              id: edit === 'new' ? null : edit,
              data
            });
            setEdit(null);
          } catch (e) {
            setError(e.message);
          }
        }}>Save</Button></footer></Modal>}{confirm && <ConfirmDialog title="Delete repeating invoice?" onClose={() => setConfirm(null)} destructive onConfirm={() => dispatch({
      type: 'repeatingAction',
      id: confirm,
      event: 'DELETED'
    })} />}</>;
}
