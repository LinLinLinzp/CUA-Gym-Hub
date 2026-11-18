import React, { useState } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { newId } from '../store/reducer.js';
import { SidLink, useSidNavigate } from '../components/SidLink.jsx';
import { Attachments, Button, Menu, Modal, ConfirmDialog, ErrorBanner, PageHeader, Field, DateInput, MoneyInput, ContactPicker, AccountPicker, TaxRatePicker, BankPicker, LineEditor, DocumentLines, DataTable, HistoryNotes, Tabs, NotFound, useToast } from '../components/UI.jsx';
import { fmtMoney, fmtGBP, fmtDate, todayISO, round2, calcDocumentTotals } from '../utils/money.js';
import { bankItems, accountBalance } from '../utils/ledger.js';
import { CashCoding, ImportStatement } from './Accounting.jsx';
import { candidatesFor, suggestionFor, statementBalance, unreconciledCount, ruleFor } from '../utils/reconcile.js';
const candidateType = c => ({ invoice: 'Invoice', bill: 'Bill', payment: 'Payment', bankTransfer: 'Transfer', batchPayment: 'Batch payment' }[c.kind] || (c.type === 'SPEND' ? 'Spend Money' : 'Receive Money'));
export function BankManage({
  bank
}) {
  const [importing, setImporting] = useState(false);
  return <><Menu label="Manage account ▾"><SidLink to={`/bank-accounts/${bank.id}/reconcile`}>Reconcile</SidLink><button onClick={() => setImporting(true)}>Import a statement</button><SidLink to={`/bank-accounts/${bank.id}/statements`}>Bank statements</SidLink><SidLink to={`/bank-accounts/${bank.id}/transactions`}>Account transactions</SidLink><SidLink to={`/bank-transactions/new?type=spend&bankAccountId=${bank.id}`}>Spend money</SidLink><SidLink to={`/bank-transactions/new?type=receive&bankAccountId=${bank.id}`}>Receive money</SidLink><SidLink to={`/bank-transfers/new?from=${bank.id}`}>Transfer money</SidLink></Menu>{importing && <ImportStatement bank={bank} onClose={() => setImporting(false)} />}</>;
}
export function BankCard({
  bank,
  chart = false
}) {
  const {
      state
    } = useStore(),
    navigate = useSidNavigate(),
    n = unreconciledCount(state, bank.id),
    latest = (state.bankStatementLines || []).filter(l => l.bankAccountId === bank.id && l.status !== 'deleted').map(l => l.date).sort().at(-1),
    points = [0, 1, 2, 3, 4, 5].map(i => {
      const now = new Date(),
        date = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 0);
      return accountBalance(state, bank.accountCode, `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    }),
    min = Math.min(...points),
    max = Math.max(...points),
    path = points.map((n, i) => `${i * 64},${70 - (n - min) / (max - min || 1) * 55}`).join(' ');
  return <section className="card bank-card"><div className="bank-card-header"><h2><SidLink to={`/bank-accounts/${bank.id}/transactions`}>{bank.name}</SidLink></h2><BankManage bank={bank} /></div><p className="caption">{bank.bankName} · {bank.type === 'CREDITCARD' ? `ending ${bank.accountNumber}` : `${bank.sortCode || ''} ${bank.accountNumber || ''}`}</p>{n > 0 ? <Button variant="primary" onClick={() => navigate(`/bank-accounts/${bank.id}/reconcile`)}>Reconcile {n} items</Button> : <p className="green-text">Account reconciled ✓</p>}<div className="card-line"><span>Statement balance<small>{fmtDate(latest || bank.openingBalanceDate)}</small></span><strong>{fmtMoney(statementBalance(state, bank.id))}</strong></div><div className="card-line"><span>Balance in Xero<small>{fmtDate(todayISO())}</small></span><strong>{fmtMoney(accountBalance(state, bank.accountCode, todayISO()))}</strong></div>{chart && <svg className="sparkline" viewBox="0 0 320 80" preserveAspectRatio="none"><polygon points={`0,80 ${path} 320,80`} fill="#e6f2fa" /><polyline points={path} fill="none" stroke="#0078c8" strokeWidth="2" /></svg>}</section>;
}
export function BankAccounts() {
  const {
      state,
      dispatch
    } = useStore(),
    [add, setAdd] = useState(false),
    [data, setData] = useState({
      name: '',
      bankName: '',
      sortCode: '',
      accountNumber: ''
    }),
    [error, setError] = useState('');
  return <><PageHeader title="Bank accounts" actions={<><SidLink to="/bank-rules">Bank rules</SidLink><Button variant="primary" onClick={() => setAdd(true)}>+ Add bank account</Button></>} /><div className="content"><div className="dashboard">{(state.bankAccounts || []).map(b => <BankCard key={b.id} bank={b} chart />)}</div>{!(state.bankAccounts || []).length && <div className="panel empty">There are no bank accounts to display</div>}</div>{add && <Modal title="Add bank account" onClose={() => setAdd(false)}><ErrorBanner error={error} />{[["name", "Account name"], ["bankName", "Bank name"], ["sortCode", "Sort code"], ["accountNumber", "Account number"]].map(([k, t]) => <Field key={k} label={t}><input value={data[k]} onChange={e => setData({
          ...data,
          [k]: e.target.value
        })} /></Field>)}<footer><Button onClick={() => setAdd(false)}>Cancel</Button><Button variant="primary" onClick={() => {
          try {
            dispatch({
              type: "addBankAccount",
              data,
              date: todayISO()
            });
            setAdd(false);
          } catch (e) {
            setError(e.message);
          }
        }}>Add account</Button></footer></Modal>}</>;
}
function CandidateDetails({
  candidate,
  onClose
}) {
  return <Modal drawer title="Transaction details" onClose={onClose}><div className="facts"><div><span>Name</span>{candidate.name}</div><div><span>Type</span>{candidateType(candidate)}</div><div><span>Date</span>{fmtDate(candidate.date)}</div><div><span>Amount</span>{fmtMoney(candidate.amount)}</div></div><p>{candidate.invoiceNumber || candidate.reference}</p><DocumentLines doc={candidate} /><footer><SidLink to={candidate.path}>Open transaction →</SidLink><Button onClick={onClose}>Close</Button></footer></Modal>;
}
function FindMatch({
  line,
  onClose
}) {
  const {
      state,
      dispatch
    } = useStore(),
    toast = useToast(),
    [q, setQ] = useState(''),
    [amountQ, setAmountQ] = useState(''),
    [opposite, setOpposite] = useState(false),
    [selected, setSelected] = useState([]),
    [adjustments, setAdjustments] = useState([]),
    [error, setError] = useState(''),
    all = candidatesFor(state, opposite ? {
      ...line,
      amount: -line.amount
    } : line),
    rows = all.filter(c => [c.name, c.invoiceNumber, c.reference].join(' ').toLowerCase().includes(q.toLowerCase()) && (!amountQ || Number(amountQ) === c.amount)),
    total = round2(selected.reduce((s, r) => s + Number(r.amount || 0), 0)),
    adj = round2(adjustments.reduce((s, r) => s + Number(r.amount || 0), 0)),
    out = round2(Math.abs(line.amount) - total - adj),
    toggle = (c, checked) => setSelected(checked ? [...selected, {
      id: c.id,
      kind: c.kind,
      amount: c.amount
    }] : selected.filter(r => r.id !== c.id));
  return <section className="find-match"><h2>Find & select matching transactions</h2><ErrorBanner error={error} /><div className="toolbar"><input aria-label="Search by name or reference" placeholder="Search by name or reference" value={q} onChange={e => setQ(e.target.value)} /><MoneyInput aria-label="Search by amount" placeholder="Search by amount" value={amountQ} onChange={setAmountQ} /><label><input type="checkbox" checked={opposite} onChange={e => {
          setOpposite(e.target.checked);
          setSelected([]);
        }} /> Show {line.amount > 0 ? 'Spent' : 'Received'} items</label></div><DataTable rows={rows} columns={[{
      key: 'check',
      label: '',
      render: c => <input type="checkbox" aria-label={`Match ${c.invoiceNumber || c.reference || c.name}`} checked={selected.some(r => r.id === c.id)} onChange={e => toggle(c, e.target.checked)} />
    }, {
      key: 'date',
      label: 'Date',
      render: c => fmtDate(c.date)
    }, {
      key: 'name',
      label: 'Name'
    }, {
      key: 'reference',
      label: 'Reference',
      render: c => c.invoiceNumber || c.reference
    }, {
      key: 'kind',
      label: 'Type',
      render: candidateType,
      sortValue: candidateType
    }, {
      key: 'amount',
      label: 'Amount',
      numeric: true,
      render: c => fmtMoney(c.amount)
    }, {
      key: 'applied',
      label: 'Amount applied',
      numeric: true,
      render: c => selected.some(r => r.id === c.id) && (['invoice', 'bill'].includes(c.kind) ? <MoneyInput aria-label={`Amount applied ${c.invoiceNumber || c.reference}`} value={selected.find(r => r.id === c.id).amount} onChange={v => setSelected(selected.map(r => r.id === c.id ? {
        ...r,
        amount: v
      } : r))} /> : fmtMoney(c.amount))
    }]} /><div className="toolbar" style={{
      marginTop: 18
    }}><Menu label="Adjustments ▾"><button onClick={() => setAdjustments([...adjustments, {
          kind: 'bankFee',
          amount: '',
          id: newId('adj')
        }])}>Bank fee</button><button onClick={() => setAdjustments([...adjustments, {
          kind: 'minorAdjustment',
          amount: '',
          id: newId('adj')
        }])}>Minor adjustment</button></Menu></div>{adjustments.map(a => <div className="form-row" key={a.id}><Field label={a.kind === 'bankFee' ? 'Bank fee (signed amount)' : 'Minor adjustment (signed amount)'}><MoneyInput value={a.amount} onChange={v => setAdjustments(adjustments.map(x => x.id === a.id ? {
          ...x,
          amount: v
        } : x))} /></Field><Button onClick={() => setAdjustments(adjustments.filter(x => x.id !== a.id))}>Remove</Button></div>)}<div className="out-by"><span>Statement line {fmtMoney(Math.abs(line.amount))}</span><span>Total selected {fmtMoney(total)}</span><span>Adjustments {fmtMoney(adj)}</span><strong className={out ? 'red' : 'green-text'}>Out by {fmtMoney(out)}</strong></div><div className="actions"><Button onClick={onClose}>Cancel</Button><Button variant="green" disabled={out !== 0 || !selected.length || opposite} onClick={() => {
        try {
          dispatch({
            type: 'reconcile',
            id: line.id,
            data: {
              method: 'findmatch',
              selected,
              adjustments
            }
          });
          toast('Bank statement line reconciled');
          onClose();
        } catch (e) {
          setError(e.message);
        }
      }}>Reconcile</Button></div></section>;
}
function ReconcileRow({
  line,
  findOpen,
  setFindOpen
}) {
  const {
      state,
      dispatch
    } = useStore(),
    toast = useToast(),
    suggestion = suggestionFor(state, line),
    rule = ruleFor(state, line),
    [tab, setTab] = useState(suggestion ? 'match' : rule?.type === 'TRANSFER' ? 'transfer' : 'create'),
    [contact, setContact] = useState(rule?.contactId || (rule ? `new:${line.payee}` : '')),
    [account, setAccount] = useState(rule?.lines?.[0]?.accountCode || ''),
    [description, setDescription] = useState(rule?.lines?.[0]?.description || ''),
    [tax, setTax] = useState(rule?.lines?.[0]?.taxType || 'NONE'),
    [other, setOther] = useState(rule?.transferBankAccountId || ''),
    [note, setNote] = useState(line.discussNote || ''),
    [error, setError] = useState(''),
    [details, setDetails] = useState(false);
  const valid = tab === 'match' ? !!suggestion : tab === 'create' ? !!(contact && account && description.trim()) : tab === 'transfer' ? !!other : false;
  const reconcile = () => {
    try {
      let data = tab === 'match' ? {
        method: 'match',
        selected: [{
          kind: suggestion.kind,
          id: suggestion.id,
          amount: suggestion.amount
        }]
      } : tab === 'transfer' ? {
        method: 'transfer',
        otherBankAccountId: other,
        bankRuleId: rule?.id || null,
        description
      } : {
        method: 'create',
        contactId: contact.startsWith('new:') ? null : contact,
        contactName: contact.startsWith('new:') ? contact.slice(4) : null,
        accountCode: account,
        taxType: tax,
        description,
        bankRuleId: rule?.id || null
      };
      dispatch({
        type: 'reconcile',
        id: line.id,
        data
      });
      toast('Bank statement line reconciled');
    } catch (e) {
      setError(e.message);
    }
  };
  return <div className="reconcile-row" onKeyDown={e => {
    if (e.key === 'Enter' && valid && e.target.tagName !== 'TEXTAREA' && e.target.getAttribute('role') !== 'combobox' && !e.target.closest('.find-match')) {
      e.preventDefault();
      reconcile();
    }
  }}><div className="statement-box"><div className="statement-info"><small>{fmtDate(line.date)}</small><p><strong>{line.payee || 'Bank transaction'}</strong></p><small>{line.reference}</small><p className="caption">{line.description}</p><Menu align="left" label={`more ▾ ${line.discussNote ? '💬' : ''}`}><button onClick={() => setTab('discuss')}>Discuss</button><button onClick={() => setDetails('statement')}>View statement line details</button></Menu></div><div className="statement-amount"><div><small>Spent</small><strong>{line.amount < 0 ? fmtMoney(-line.amount) : ''}</strong></div><div><small>Received</small><strong>{line.amount > 0 ? fmtMoney(line.amount) : ''}</strong></div></div></div><div className="reconcile-ok"><Button variant="green" disabled={!valid} onClick={reconcile}>OK</Button></div><div className={`match-box ${tab === 'match' && suggestion ? 'suggested' : ''}`}><Tabs items={['match', 'create', 'transfer', 'discuss'].map(t => [t, t[0].toUpperCase() + t.slice(1)])} value={tab} onChange={setTab} /><div className="match-body"><ErrorBanner error={error} />{tab === 'match' && <><div className="actions"><Button variant="borderless" onClick={() => setFindOpen(findOpen ? null : line.id)}>Find & Match</Button></div>{suggestion ? <><div className="match-title">{suggestion.name}</div><div className="match-amount"><span>{candidateType(suggestion)}: {suggestion.invoiceNumber || suggestion.reference}</span><strong>{fmtMoney(suggestion.amount)}</strong></div><div className="match-amount"><small>{fmtDate(suggestion.date)}</small><button className="link icon-button" style={{
                fontSize: 12
              }} onClick={() => setDetails('candidate')}>View details</button></div></> : <p>No matches found.</p>}</>}{tab === 'create' && <>{rule && <div className="rule-banner">Bank rule: {rule.name}</div>}<div className="form-row"><Field label="Who"><ContactPicker label="Who" value={contact} onChange={setContact} allowTyped /></Field><Field label="What"><AccountPicker label="What" value={account} onChange={v => {
                setAccount(v);
                setTax((state.accounts || []).find(a => a.code === v)?.taxType || 'NONE');
              }} /></Field></div><div className="form-row"><Field label="Why"><input aria-label="Why" value={description} onChange={e => setDescription(e.target.value)} /></Field><Field label="VAT"><TaxRatePicker label="VAT" value={tax} onChange={setTax} purchase={line.amount < 0} /></Field></div><Button variant="borderless" onClick={() => {
            setTab('match');
            setFindOpen(line.id);
          }}>Find & Match</Button><SidLink to={`/bank-transactions/new?type=${line.amount < 0 ? 'spend' : 'receive'}&bankAccountId=${line.bankAccountId}&statementLineId=${line.id}&contactId=${encodeURIComponent(contact.startsWith('new:') ? '' : contact)}&accountCode=${account}&taxType=${tax}&description=${encodeURIComponent(description)}`}>Add details</SidLink></>}{tab === 'transfer' && <><Field label={line.amount < 0 ? 'Transfer to' : 'Transfer from'}><BankPicker label={line.amount < 0 ? 'Transfer to' : 'Transfer from'} value={other} onChange={setOther} exclude={line.bankAccountId} /></Field><Field label="Description"><input value={description} onChange={e => setDescription(e.target.value)} /></Field></>}{tab === 'discuss' && <><Field label="Discuss"><textarea value={note} onChange={e => setNote(e.target.value)} /></Field><Button variant="primary" onClick={() => {
            dispatch({
              type: 'discuss',
              id: line.id,
              note
            });
            toast('Discussion saved');
          }}>Save</Button></>}</div></div>{findOpen && <FindMatch line={line} onClose={() => setFindOpen(null)} />}{details === 'candidate' && suggestion && <CandidateDetails candidate={suggestion} onClose={() => setDetails(false)} />}{details === 'statement' && <StatementDetails line={line} onClose={() => setDetails(false)} />}</div>;
}
function StatementDetails({
  line,
  onClose
}) {
  const {
    state,
    dispatch
  } = useStore();
  return <Modal drawer title="Statement line details" onClose={onClose}><div className="facts"><div><span>Date</span>{fmtDate(line.date)}</div><div><span>Payee</span>{line.payee}</div><div><span>Amount</span>{fmtMoney(line.amount)}</div></div><p>Reference: {line.reference || '—'}</p><p>Description: {line.description || '—'}</p><p>Status: {line.status}</p>{line.reconciliation && <><p>Method: {line.reconciliation.method}</p><p>Reconciled {fmtDate(line.reconciliation.reconciledAt)} by {(state.users || []).find(u => u.id === line.reconciliation.reconciledBy)?.name || line.reconciliation.reconciledBy}</p>{(line.reconciliation.matched || []).map(m => <p key={m.id}><SidLink to={`/${{
          payment: 'payments',
          bankTransaction: 'bank-transactions',
          bankTransfer: 'bank-transfers',
          batchPayment: 'batch-payments'
        }[m.kind]}/${m.id}`}>{m.kind}: {m.id}</SidLink> · {fmtMoney(m.amount)}</p>)}</>}{line.discussNote && <p className="notes">💬 {line.discussNote}</p>}{line.status !== "reconciled" && <footer><Button onClick={() => {
        dispatch({
          type: "statementStatus",
          id: line.id,
          status: line.status === "deleted" ? "unreconciled" : "deleted"
        });
        onClose();
      }}>{line.status === "deleted" ? "Restore" : "Delete statement line"}</Button></footer>}</Modal>;
}
export function BankWorkspace() {
  const {
      state,
      dispatch
    } = useStore(),
    {
      bankAccountId
    } = useParams(),
    location = useLocation(),
    navigate = useSidNavigate(),
    bank = (state.bankAccounts || []).find(b => b.id === bankAccountId),
    view = location.pathname.split('/').at(-1),
    [q, setQ] = useState(''),
    [filter, setFilter] = useState('all'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [size, setSize] = useState(10),
    [page, setPage] = useState(0),
    [sort, setSort] = useState('oldest'),
    [find, setFind] = useState(null),
    [drawer, setDrawer] = useState(null),
    [selected, setSelected] = useState([]),
    [confirmDelete, setConfirmDelete] = useState(false);
  if (!bank) return <NotFound name="Bank account" back="/bank-accounts" />;
  const n = unreconciledCount(state, bank.id),
    matches = l => [l.payee, l.reference, l.description, l.amount].join(' ').toLowerCase().includes(q.toLowerCase()),
    unrec = (state.bankStatementLines || []).filter(l => l.bankAccountId === bank.id && l.status === 'unreconciled' && matches(l)).sort((a, b) => (a.date || '').localeCompare(b.date || '') * (sort === 'oldest' ? 1 : -1)),
    max = Math.max(0, Math.ceil(unrec.length / size) - 1),
    current = Math.min(page, max),
    visible = unrec.slice(current * size, (current + 1) * size),
    statement = (state.bankStatementLines || []).filter(l => l.bankAccountId === bank.id && (filter === 'all' || l.status === filter) && matches(l)).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    transactions = bankItems(state, bank.id).filter(t => [t.description, t.reference, t.signedAmount].join(' ').toLowerCase().includes(q.toLowerCase()) && (!from || t.date >= from) && (!to || t.date <= to));
  return <><PageHeader title={bank.name || 'Bank account'} breadcrumb={{
      label: 'Bank accounts',
      to: '/bank-accounts'
    }} actions={<><div className="balance-pair"><div><small>Statement balance</small><strong>{fmtGBP(statementBalance(state, bank.id))}</strong></div><div><small>Balance in Xero</small><strong>{fmtGBP(accountBalance(state, bank.accountCode, todayISO()))}</strong></div></div><BankManage bank={bank} /></>} /><div className="content full"><div className="toolbar"><BankPicker value={bank.id} onChange={id => {
          setQ('');
          setPage(0);
          navigate(`/bank-accounts/${id}/${view}`);
        }} /></div><Tabs value={view} items={[["reconcile", `Reconcile (${n})`], ['cash-coding', 'Cash coding'], ['statements', 'Bank statements'], ['transactions', 'Account transactions']]} onChange={v => {
        setQ('');
        navigate(`/bank-accounts/${bank.id}/${v}`);
      }} />{view === 'cash-coding' ? <CashCoding bank={bank} /> : view === 'reconcile' ? <><div className="toolbar"><span>Items {unrec.length ? current * size + 1 : 0}–{Math.min((current + 1) * size, unrec.length)} of {unrec.length}</span><select aria-label="Reconcile page size" value={size} onChange={e => {
            setSize(Number(e.target.value));
            setPage(0);
          }}>{[10, 25, 50].map(n => <option key={n}>{n}</option>)}</select><select aria-label="Sort statement lines" value={sort} onChange={e => setSort(e.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select><input aria-label="Search statement lines" placeholder="Search statement lines" value={q} onChange={e => {
            setQ(e.target.value);
            setPage(0);
          }} /><div className="spacer" /><Button disabled={!current} onClick={() => setPage(current - 1)}>Previous</Button><Button disabled={current >= max} onClick={() => setPage(current + 1)}>Next</Button></div>{visible.map(l => <ReconcileRow key={l.id} line={l} findOpen={find === l.id} setFindOpen={setFind} />)}{!unrec.length && <div className="panel empty"><h2>{n ? 'No statement lines match your search' : "You've reconciled all your bank statement lines 🎉"}</h2><SidLink to={`/bank-accounts/${bank.id}/transactions`}>View account transactions</SidLink></div>}</> : view === 'statements' ? <><div className="toolbar"><select aria-label="Statement status" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option><option value="unreconciled">Unreconciled</option><option value="reconciled">Reconciled</option><option value="deleted">Deleted</option></select><input placeholder="Search statements" value={q} onChange={e => setQ(e.target.value)} /></div><div className="toolbar">{selected.length > 0 && <Button onClick={() => setConfirmDelete(true)}>Delete {selected.length} statement lines</Button>}</div><DataTable rows={statement} selected={selected} onSelect={setSelected} onRow={setDrawer} columns={[{
          key: 'date',
          label: 'Date',
          render: l => fmtDate(l.date)
        }, {
          key: 'type',
          label: 'Type'
        }, {
          key: 'payee',
          label: 'Payee'
        }, {
          key: 'reference',
          label: 'Reference'
        }, {
          key: 'description',
          label: 'Description'
        }, {
          key: 'spent',
          label: 'Spent',
          numeric: true,
          sortValue: l => Math.max(0, -l.amount),
          render: l => l.amount < 0 ? fmtMoney(-l.amount) : ''
        }, {
          key: 'received',
          label: 'Received',
          numeric: true,
          sortValue: l => Math.max(0, l.amount),
          render: l => l.amount > 0 ? fmtMoney(l.amount) : ''
        }, {
          key: 'status',
          label: 'Status',
          render: l => <span className={`status ${l.status === 'reconciled' ? 'paid' : l.status === 'unreconciled' ? 'awaiting-approval' : ''}`}>{l.status === 'reconciled' ? 'Reconciled' : l.status === 'deleted' ? 'Deleted' : 'Unreconciled'}</span>
        }]} /></> : <><div className="toolbar"><Button onClick={() => navigate(`/bank-transactions/new?type=spend&bankAccountId=${bank.id}`)}>Spend money</Button><Button onClick={() => navigate(`/bank-transactions/new?type=receive&bankAccountId=${bank.id}`)}>Receive money</Button><Button onClick={() => navigate(`/bank-transfers/new?from=${bank.id}`)}>Transfer money</Button><input placeholder="Search account transactions" value={q} onChange={e => setQ(e.target.value)} /><DateInput aria-label="From date" value={from} onChange={setFrom} /><DateInput aria-label="To date" value={to} onChange={setTo} /></div><div className="toolbar">{selected.length > 0 && <Button onClick={() => {
            dispatch({
              type: "markReconciled",
              bankAccountId: bank.id,
              items: transactions.filter(t => selected.includes(t.id) && !t.isReconciled).map(t => ({
                kind: t.kind,
                id: t.id
              }))
            });
            setSelected([]);
          }}>Mark as reconciled</Button>}</div><DataTable rows={transactions} selected={selected} onSelect={setSelected} onRow={t => navigate(t.path)} columns={[{
          key: 'date',
          label: 'Date',
          render: t => fmtDate(t.date)
        }, {
          key: 'description',
          label: 'Description',
          render: t => <SidLink to={t.path}>{t.description}</SidLink>
        }, {
          key: 'reference',
          label: 'Reference'
        }, {
          key: 'kind',
          label: 'Type'
        }, {
          key: 'spent',
          label: 'Spent',
          numeric: true,
          render: t => t.signedAmount < 0 ? fmtMoney(-t.signedAmount) : ''
        }, {
          key: 'received',
          label: 'Received',
          numeric: true,
          render: t => t.signedAmount > 0 ? fmtMoney(t.signedAmount) : ''
        }, {
          key: 'isReconciled',
          label: 'Reconciled',
          render: t => t.isReconciled ? <span className="green-text">✓</span> : ''
        }]} /></>}</div>{drawer && <StatementDetails line={drawer} onClose={() => setDrawer(null)} />}{confirmDelete && <ConfirmDialog title="Delete statement lines?" onClose={() => setConfirmDelete(false)} destructive onConfirm={() => {
      const lines = (state.bankStatementLines || []).filter(l => selected.includes(l.id));
      if (lines.some(l => l.status === 'reconciled')) throw Error('Unreconcile selected lines first');
      for (const l of lines) dispatch({
        type: 'statementStatus',
        id: l.id,
        status: 'deleted'
      });
      setSelected([]);
    }} />}</>;
}
export function BankTransactionForm() {
  const {
      state,
      dispatch
    } = useStore(),
    {
      id
    } = useParams(),
    [params] = useSearchParams(),
    navigate = useSidNavigate(),
    existing = (state.bankTransactions || []).find(t => t.id === id),
    purchase = params.get('type') !== 'receive',
    statementLine = (state.bankStatementLines || []).find(l => l.id === params.get('statementLineId')),
    [doc, setDoc] = useState(() => structuredClone(existing || {
      type: purchase ? 'SPEND' : 'RECEIVE',
      contactId: params.get('contactId') || '',
      date: statementLine?.date || todayISO(),
      bankAccountId: params.get('bankAccountId') || (state.bankAccounts || [])[0]?.id || '',
      reference: statementLine?.reference || '',
      lineAmountTypes: 'Inclusive',
      lineItems: [{
        id: newId('li'),
        description: params.get('description') || statementLine?.description || '',
        quantity: 1,
        unitAmount: Math.abs(statementLine?.amount || 0),
        accountCode: params.get('accountCode') || (purchase ? '429' : '200'),
        taxType: params.get('taxType') || (purchase ? 'INPUT2' : 'OUTPUT2')
      }]
    })),
    [error, setError] = useState(''),
    toast = useToast();
  if (id && !existing) return <NotFound name="Transaction" back="/bank-accounts" />;
  const field = (k, v) => setDoc({
    ...doc,
    [k]: v
  });
  return <><PageHeader title={doc.type === 'SPEND' ? 'Spend Money' : 'Receive Money'} /><div className="content full"><section className="panel"><ErrorBanner error={error} /><div className="form-row"><Field label={doc.type === 'SPEND' ? 'To' : 'From'}><ContactPicker label={doc.type === 'SPEND' ? 'To' : 'From'} value={doc.contactId} onChange={v => field('contactId', v)} /></Field><Field label="Date"><DateInput value={doc.date} onChange={v => field('date', v)} /></Field><Field label="Reference"><input value={doc.reference} onChange={e => field('reference', e.target.value)} /></Field><Field label="Bank account"><BankPicker value={doc.bankAccountId} onChange={v => field('bankAccountId', v)} /></Field><Field label="Amounts are"><select value={doc.lineAmountTypes} onChange={e => field('lineAmountTypes', e.target.value)}><option value="Inclusive">Tax inclusive</option><option value="Exclusive">Tax exclusive</option><option value="NoTax">No tax</option></select></Field></div><LineEditor doc={doc} onChange={setDoc} purchase={doc.type === 'SPEND'} /><footer className="form-footer"><Button onClick={() => navigate('/bank-accounts')}>Cancel</Button><Button variant="primary" onClick={() => {
            try {
              const newRecordId = id || newId('btx');
              dispatch({
                type: 'saveBankTransaction',
                statementLineId: statementLine?.id,
                id,
                newId: newRecordId,
                data: doc
              });
              toast('Transaction saved');
              navigate(`/bank-transactions/${newRecordId}`);
            } catch (e) {
              setError(e.message);
            }
          }}>Save</Button></footer></section></div></>;
}
export function TransferForm() {
  const {
      state,
      dispatch
    } = useStore(),
    [params] = useSearchParams(),
    navigate = useSidNavigate(),
    [from, setFrom] = useState(params.get('from') || (state.bankAccounts || [])[0]?.id || ''),
    [to, setTo] = useState(''),
    [date, setDate] = useState(todayISO()),
    [amount, setAmount] = useState(''),
    [reference, setReference] = useState(''),
    [error, setError] = useState('');
  return <><PageHeader title="Transfer money" /><div className="content"><section className="panel"><ErrorBanner error={error} /><div className="form-row"><Field label="From account"><BankPicker label="From account" value={from} onChange={setFrom} /></Field><Field label="To account"><BankPicker label="To account" value={to} onChange={setTo} exclude={from} /></Field></div><div className="form-row"><Field label="Date"><DateInput value={date} onChange={setDate} /></Field><Field label="Amount"><MoneyInput value={amount} onChange={setAmount} /></Field><Field label="Reference"><input value={reference} onChange={e => setReference(e.target.value)} /></Field></div><footer className="form-footer"><Button onClick={() => navigate('/bank-accounts')}>Cancel</Button><Button variant="primary" onClick={() => {
            try {
              const id = newId('btr');
              dispatch({
                type: 'transfer',
                newId: id,
                data: {
                  fromBankAccountId: from,
                  toBankAccountId: to,
                  date,
                  amount: Number(amount),
                  reference
                }
              });
              navigate(`/bank-transfers/${id}`);
            } catch (e) {
              setError(e.message);
            }
          }}>Transfer</Button></footer></section></div></>;
}
export function TransactionDetail({
  kind
}) {
  const {
      state,
      dispatch
    } = useStore(),
    {
      id
    } = useParams(),
    navigate = useSidNavigate(),
    toast = useToast(),
    key = {
      payment: 'payments',
      batchPayment: 'batchPayments',
      bankTransaction: 'bankTransactions',
      bankTransfer: 'bankTransfers'
    }[kind],
    record = (state[key] || []).find(t => t.id === id),
    [confirm, setConfirm] = useState(null),
    [error, setError] = useState('');
  if (!record) return <NotFound name="Transaction" back="/bank-accounts" />;
  const name = id => (state.bankAccounts || []).find(b => b.id === id)?.name || '(Unknown account)',
    contact = (state.contacts || []).find(c => c.id === record.contactId),
    reconciled = record.isReconciled || record.fromIsReconciled || record.toIsReconciled,
    lines = [record.statementLineId, record.fromStatementLineId, record.toStatementLineId].filter(Boolean),
    confirmAction = (title, action) => setConfirm({
      title,
      action
    });
  return <><PageHeader title={kind === 'payment' ? 'Payment' : kind === 'batchPayment' ? 'Batch payment' : kind === 'bankTransfer' ? 'Bank transfer' : `${record.type === 'SPEND' ? 'Spend Money' : 'Receive Money'} — ${record.contactName || contact?.name || name(record.bankAccountId)}`} breadcrumb={{
      label: 'Bank accounts',
      to: '/bank-accounts'
    }} actions={<>{record.status !== 'DELETED' && <Menu label="Options ▾">{kind === 'bankTransaction' && !reconciled && <button onClick={() => navigate(`/bank-transactions/${id}/edit`)}>Edit</button>}{reconciled && lines.map(l => <button key={l} onClick={() => confirmAction('Unreconcile transaction?', {
          type: 'unreconcile',
          id: l
        })}>Unreconcile {kind === 'bankTransfer' ? record.fromStatementLineId === l ? 'from side' : 'to side' : ''}</button>)}{kind === 'batchPayment' && <button onClick={() => confirmAction('Remove batch payment?', {
          type: 'removeBatch',
          id
        })}>Remove batch payment</button>}{kind === 'payment' && <button onClick={() => confirmAction('Remove payment?', {
          type: 'removePayment',
          id
        })}>Remove payment</button>}{kind === 'bankTransaction' && <button onClick={() => confirmAction(reconciled ? 'Remove & Redo?' : 'Delete transaction?', {
          type: 'removeRedo',
          kind,
          id
        })}>{reconciled ? 'Remove & Redo' : 'Delete'}</button>}{kind === 'bankTransfer' && !reconciled && <button onClick={() => confirmAction('Delete transfer?', {
          type: 'deleteTransfer',
          id
        })}>Delete</button>}</Menu>}</>} /><div className="content"><ErrorBanner error={error} /><section className="panel"><div className="info-banner">{record.status === 'DELETED' ? 'Deleted' : reconciled ? 'Reconciled ✓' : 'Unreconciled'}</div><div className="facts"><div><span>Date</span>{fmtDate(record.date)}</div><div><span>Contact</span>{contact?.name || record.contactName || '—'}</div><div><span>Bank account</span>{kind === 'bankTransfer' ? `${name(record.fromBankAccountId)} → ${name(record.toBankAccountId)}` : name(record.bankAccountId)}</div><div><span>Reference</span>{record.reference || '—'}</div><div><span>Amount</span><strong className="big">{fmtMoney(record.amount ?? record.total)}</strong></div></div>{kind === 'bankTransfer' && <><p>From side: {record.fromIsReconciled ? 'Reconciled ✓' : 'Unreconciled'}</p><p>To side: {record.toIsReconciled ? 'Reconciled ✓' : 'Unreconciled'}</p></>}{kind === 'payment' && <p>Document: <SidLink to={`/${record.documentType === 'bill' ? 'bills' : 'invoices'}/${record.documentId}`}>{record.documentNumber || record.documentId}</SidLink></p>}{record.statementLineId && <p><SidLink to={`/bank-accounts/${record.bankAccountId}/statements`}>View bank statement line {record.statementLineId}</SidLink></p>}{kind === 'bankTransaction' && <DocumentLines doc={record} />}{kind === 'batchPayment' && <DataTable rows={(state.payments || []).filter(p => p.batchPaymentId === id)} onRow={p => navigate(`/payments/${p.id}`)} columns={[{
          key: 'documentNumber',
          label: 'Bill',
          render: p => <SidLink to={`/bills/${p.documentId}`}>{p.documentNumber}</SidLink>
        }, {
          key: 'amount',
          label: 'Amount',
          numeric: true,
          render: p => fmtMoney(p.amount)
        }, {
          key: 'isReconciled',
          label: 'Reconciled',
          render: p => p.isReconciled ? '✓' : 'No'
        }]} />}</section>{kind === 'bankTransaction' && <Attachments kind={kind} id={id} files={record.attachments || []} />}<HistoryNotes kind={kind} id={id} /></div>{confirm && <ConfirmDialog title={confirm.title} onClose={() => setConfirm(null)} destructive={confirm.action.type !== 'unreconcile'} onConfirm={() => {
      dispatch(confirm.action);
      toast('Transaction updated');
    }}>{kind === 'payment' && reconciled ? <p>This will also unreconcile the bank statement line.</p> : null}</ConfirmDialog>}</>;
}
