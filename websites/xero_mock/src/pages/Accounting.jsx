import React, { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { newId } from '../store/reducer.js';
import { SidLink, useSidNavigate } from '../components/SidLink.jsx';
import { PageHeader, Button, Menu, Modal, ConfirmDialog, Field, DateInput, MoneyInput, ContactPicker, AccountPicker, TaxRatePicker, BankPicker, DataTable, ErrorBanner, NotFound, useToast } from '../components/UI.jsx';
import { fmtMoney, fmtDate, todayISO, round2 } from '../utils/money.js';
export function ManualJournals() {
  const {
      state,
      dispatch
    } = useStore(),
    {
      id
    } = useParams(),
    location = useLocation(),
    navigate = useSidNavigate(),
    toast = useToast(),
    isNew = location.pathname.endsWith('/new'),
    record = (state.manualJournals || []).find(j => j.id === id),
    [doc, setDoc] = useState({
      narration: '',
      date: todayISO(),
      lineAmountTypes: 'NoTax',
      showOnCashBasis: true,
      lines: [{
        id: newId('mjl'),
        description: '',
        accountCode: '',
        taxType: 'NONE',
        debit: 0,
        credit: 0
      }, {
        id: newId('mjl'),
        description: '',
        accountCode: '',
        taxType: 'NONE',
        debit: 0,
        credit: 0
      }]
    }),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(null);
  if (id && !record) return <NotFound name="Journal" back="/manual-journals" />;
  const change = (i, k, v) => setDoc({
      ...doc,
      lines: doc.lines.map((l, j) => i === j ? {
        ...l,
        [k]: v
      } : l)
    }),
    debits = round2(doc.lines.reduce((n, l) => n + Number(l.debit || 0), 0)),
    credits = round2(doc.lines.reduce((n, l) => n + Number(l.credit || 0), 0)),
    save = status => {
      try {
        const id = newId('mj');
        dispatch({
          type: 'saveJournal',
          newId: id,
          data: {
            ...doc,
            status
          }
        });
        navigate(`/manual-journals/${id}`);
        toast('Journal saved');
      } catch (e) {
        setError(e.message);
      }
    };
  return <><PageHeader title={isNew ? 'New manual journal' : record ? record.narration : 'Manual journals'} breadcrumb={record || isNew ? {
      label: 'Manual journals',
      to: '/manual-journals'
    } : null} actions={isNew ? null : record ? record.status !== 'VOIDED' && <Button onClick={() => setConfirm(record.id)}>Void</Button> : <Button variant="primary" onClick={() => navigate('/manual-journals/new')}>New journal</Button>} /><div className="content full"><ErrorBanner error={error} />{isNew ? <section className="panel"><div className="form-row"><Field label="Narration"><input value={doc.narration} onChange={e => setDoc({
              ...doc,
              narration: e.target.value
            })} /></Field><Field label="Date"><DateInput value={doc.date} onChange={v => setDoc({
              ...doc,
              date: v
            })} /></Field><Field label="Amounts are"><select value={doc.lineAmountTypes} onChange={e => setDoc({
              ...doc,
              lineAmountTypes: e.target.value
            })}><option value="NoTax">No tax</option><option value="Exclusive">Tax exclusive</option><option value="Inclusive">Tax inclusive</option></select></Field></div><DataTable rows={doc.lines} columns={[{
          key: 'description',
          label: 'Description',
          render: l => <input aria-label="Journal description" value={l.description} onChange={e => change(doc.lines.indexOf(l), 'description', e.target.value)} />
        }, {
          key: 'accountCode',
          label: 'Account',
          render: l => <AccountPicker value={l.accountCode} onChange={v => change(doc.lines.indexOf(l), 'accountCode', v)} />
        }, {
          key: 'taxType',
          label: 'Tax rate',
          render: l => <TaxRatePicker purchase value={l.taxType} onChange={v => change(doc.lines.indexOf(l), 'taxType', v)} />
        }, {
          key: 'debit',
          label: 'Debit',
          numeric: true,
          render: l => <MoneyInput value={l.debit} onChange={v => change(doc.lines.indexOf(l), 'debit', v)} />
        }, {
          key: 'credit',
          label: 'Credit',
          numeric: true,
          render: l => <MoneyInput value={l.credit} onChange={v => change(doc.lines.indexOf(l), 'credit', v)} />
        }, {
          key: 'remove',
          label: '',
          render: l => <Button onClick={() => setDoc({
            ...doc,
            lines: doc.lines.filter(x => x.id !== l.id)
          })}>×</Button>
        }]} /><Button variant="borderless" onClick={() => setDoc({
          ...doc,
          lines: [...doc.lines, {
            id: newId('mjl'),
            description: '',
            accountCode: '',
            taxType: 'NONE',
            debit: 0,
            credit: 0
          }]
        })}>+ Add line</Button><div className="totals"><div><span>Total debit</span><strong>{fmtMoney(debits)}</strong></div><div><span>Total credit</span><strong>{fmtMoney(credits)}</strong></div><div className={debits === credits ? 'green-text' : 'red'}>Total is out by {fmtMoney(debits - credits)}</div></div><footer className="form-footer"><Button onClick={() => navigate('/manual-journals')}>Cancel</Button><Button onClick={() => save('DRAFT')}>Save as draft</Button><Button variant="primary" onClick={() => save('POSTED')}>Post</Button></footer></section> : record ? <section className="panel"><div className="facts"><div><span>Date</span>{fmtDate(record.date)}</div><div><span>Status</span>{record.status}</div></div><DataTable rows={record.lines || []} columns={[{
          key: 'description',
          label: 'Description'
        }, {
          key: 'accountCode',
          label: 'Account'
        }, {
          key: 'taxType',
          label: 'Tax rate'
        }, {
          key: 'debit',
          label: 'Debit',
          numeric: true,
          render: l => fmtMoney(l.debit)
        }, {
          key: 'credit',
          label: 'Credit',
          numeric: true,
          render: l => fmtMoney(l.credit)
        }]} /></section> : <DataTable rows={state.manualJournals || []} onRow={j => navigate(`/manual-journals/${j.id}`)} columns={[{
        key: 'date',
        label: 'Date',
        render: j => fmtDate(j.date)
      }, {
        key: 'narration',
        label: 'Narration',
        render: j => <SidLink to={`/manual-journals/${j.id}`}>{j.narration}</SidLink>
      }, {
        key: 'status',
        label: 'Status'
      }]} />}</div>{confirm && <ConfirmDialog title="Void journal?" destructive onClose={() => setConfirm(null)} onConfirm={() => dispatch({
      type: 'voidJournal',
      id: confirm
    })} />}</>;
}
export function BankRules() {
  const {
      state,
      dispatch
    } = useStore(),
    [edit, setEdit] = useState(null),
    [data, setData] = useState({}),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(null),
    open = r => {
      setEdit(r?.id || 'new');
      setData(structuredClone(r || {
        name: '',
        type: 'SPEND',
        contactId: '',
        bankAccountId: null,
        matchAll: true,
        conditions: [{
          field: 'payee',
          operator: 'contains',
          value: ''
        }],
        lines: [{
          accountCode: '',
          taxType: 'NONE',
          description: '',
          percent: 100
        }],
        referenceSource: 'payee'
      }));
    };
  return <><PageHeader title="Bank rules" actions={<Button variant="primary" onClick={() => open(null)}>Create rule</Button>} /><div className="content"><DataTable rows={state.bankRules || []} onRow={open} columns={[{
        key: 'name',
        label: 'Name'
      }, {
        key: 'type',
        label: 'Type'
      }, {
        key: 'conditions',
        label: 'Conditions',
        render: r => (r.conditions || []).map(c => `${c.field} ${c.operator} ${c.value}`).join(', ')
      }, {
        key: 'status',
        label: 'Status'
      }, {
        key: 'actions',
        label: '',
        render: r => <Button onClick={e => {
          e.stopPropagation();
          setConfirm(r.id);
        }}>Delete</Button>
      }]} /></div>{edit && <Modal title={edit === 'new' ? 'Create bank rule' : 'Edit bank rule'} wide onClose={() => setEdit(null)}><ErrorBanner error={error} /><div className="form-row"><Field label="Name"><input value={data.name} onChange={e => setData({
            ...data,
            name: e.target.value
          })} /></Field><Field label="Type"><select value={data.type} onChange={e => setData({
            ...data,
            type: e.target.value
          })}>{['SPEND', 'RECEIVE', 'TRANSFER'].map(t => <option key={t}>{t}</option>)}</select></Field></div><h3>Conditions</h3><label><input type="checkbox" checked={data.matchAll} onChange={e => setData({
          ...data,
          matchAll: e.target.checked
        })} /> All conditions must match</label>{data.conditions.map((c, i) => <div className="form-row" key={i}><Field label="Field"><select value={c.field} onChange={e => setData({
            ...data,
            conditions: data.conditions.map((x, j) => i === j ? {
              ...x,
              field: e.target.value
            } : x)
          })}>{['payee', 'reference', 'description', 'amount'].map(t => <option key={t}>{t}</option>)}</select></Field><Field label="Operator"><select value={c.operator} onChange={e => setData({
            ...data,
            conditions: data.conditions.map((x, j) => i === j ? {
              ...x,
              operator: e.target.value
            } : x)
          })}>{['contains', 'equals', 'startsWith'].map(t => <option key={t}>{t}</option>)}</select></Field><Field label="Value"><input value={c.value} onChange={e => setData({
            ...data,
            conditions: data.conditions.map((x, j) => i === j ? {
              ...x,
              value: e.target.value
            } : x)
          })} /></Field></div>)}<Button onClick={() => setData({
        ...data,
        conditions: [...data.conditions, {
          field: 'payee',
          operator: 'contains',
          value: ''
        }]
      })}>Add condition</Button><Field label="Contact"><ContactPicker value={data.contactId} onChange={v => setData({
          ...data,
          contactId: v
        })} /></Field><h3>Allocation</h3>{data.type === 'TRANSFER' && <Field label="Transfer bank account"><BankPicker label="Transfer bank account" value={data.transferBankAccountId || ''} onChange={v => setData({
          ...data,
          transferBankAccountId: v
        })} /></Field>}{data.lines.map((l, i) => <div className="form-row" key={i}><Field label="Account"><AccountPicker value={l.accountCode} onChange={v => setData({
            ...data,
            lines: data.lines.map((x, j) => i === j ? {
              ...x,
              accountCode: v
            } : x)
          })} /></Field><Field label="Tax rate"><TaxRatePicker purchase={data.type !== 'RECEIVE'} value={l.taxType} onChange={v => setData({
            ...data,
            lines: data.lines.map((x, j) => i === j ? {
              ...x,
              taxType: v
            } : x)
          })} /></Field><Field label="Description"><input value={l.description} onChange={e => setData({
            ...data,
            lines: data.lines.map((x, j) => i === j ? {
              ...x,
              description: e.target.value
            } : x)
          })} /></Field><Field label="Percent"><MoneyInput value={l.percent} onChange={v => setData({
            ...data,
            lines: data.lines.map((x, j) => i === j ? {
              ...x,
              percent: Number(v)
            } : x)
          })} /></Field></div>)}<Button onClick={() => setData({
        ...data,
        lines: [...data.lines, {
          accountCode: '',
          taxType: 'NONE',
          description: '',
          percent: 0
        }]
      })}>Add allocation line</Button><Field label="Reference source"><select value={data.referenceSource} onChange={e => setData({
          ...data,
          referenceSource: e.target.value
        })}>{['payee', 'reference', 'description'].map(t => <option key={t}>{t}</option>)}</select></Field><footer><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => {
          try {
            dispatch({
              type: 'saveRule',
              id: edit === 'new' ? null : edit,
              data
            });
            setEdit(null);
          } catch (e) {
            setError(e.message);
          }
        }}>Save</Button></footer></Modal>}{confirm && <ConfirmDialog title="Delete bank rule?" onClose={() => setConfirm(null)} destructive onConfirm={() => dispatch({
      type: 'deleteRule',
      id: confirm
    })} />}</>;
}
export function CashCoding({
  bank
}) {
  const {
      state,
      dispatch
    } = useStore(),
    [selected, setSelected] = useState([]),
    [values, setValues] = useState({}),
    [error, setError] = useState(''),
    toast = useToast(),
    rows = (state.bankStatementLines || []).filter(l => l.bankAccountId === bank.id && l.status === 'unreconciled'),
    change = (id, key, v) => setValues({
      ...values,
      [id]: {
        ...values[id],
        [key]: v
      }
    });
  return <><ErrorBanner error={error} /><div className="toolbar"><Button variant="green" disabled={!selected.length} onClick={() => {
        try {
          dispatch({
            type: 'cashCode',
            rows: selected.map(id => {
              const l = rows.find(l => l.id === id),
                v = values[id] || {};
              return {
                id,
                contactId: v.contactId?.startsWith('new:') ? null : v.contactId,
                contactName: v.contactId?.startsWith('new:') ? v.contactId.slice(4) : null,
                accountCode: v.accountCode,
                taxType: v.taxType || 'NONE',
                description: v.description || l.description || l.payee
              };
            })
          });
          setSelected([]);
          toast('Statement lines reconciled');
        } catch (e) {
          setError(e.message);
        }
      }}>Save & reconcile {selected.length} items</Button></div><DataTable rows={rows} selected={selected} onSelect={setSelected} columns={[{
      key: 'date',
      label: 'Date',
      render: l => fmtDate(l.date)
    }, {
      key: 'payee',
      label: 'Payee',
      render: l => <><small>{l.payee}</small><ContactPicker label={`Payee ${l.payee || l.id}`} value={values[l.id]?.contactId || ''} onChange={v => change(l.id, 'contactId', v)} allowTyped /></>
    }, {
      key: 'amount',
      label: 'Amount',
      numeric: true,
      render: l => fmtMoney(l.amount)
    }, {
      key: 'account',
      label: 'Account',
      render: l => <AccountPicker value={values[l.id]?.accountCode || ''} onChange={v => change(l.id, 'accountCode', v)} />
    }, {
      key: 'tax',
      label: 'Tax',
      render: l => <TaxRatePicker purchase={l.amount < 0} value={values[l.id]?.taxType || 'NONE'} onChange={v => change(l.id, 'taxType', v)} />
    }, {
      key: 'description',
      label: 'Description',
      render: l => <input value={values[l.id]?.description ?? l.description ?? l.payee ?? ''} onChange={e => change(l.id, 'description', e.target.value)} />
    }]} /></>;
}
export function parseStatementCsv(text) {
  const records = [],
    lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/),
    parse = line => {
      const cols = [];
      let value = '',
        quoted = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (quoted && line[i + 1] === '"') {
            value += '"';
            i++;
          } else quoted = !quoted;
        } else if (c === ',' && !quoted) {
          cols.push(value);
          value = '';
        } else value += c;
      }
      cols.push(value);
      return cols;
    };
  const headers = parse(lines[0]).map(s => s.trim().toLowerCase());
  if (!headers.includes('date') || !headers.includes('amount')) throw Error('CSV must include Date and Amount columns');
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const data = Object.fromEntries(headers.map((h, i) => [h, parse(line)[i] || '']));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(Number(data.amount.replaceAll(',', '')))) throw Error('Use dates as YYYY-MM-DD and numeric amounts');
    records.push({
      date: data.date,
      amount: Number(data.amount.replaceAll(',', '')),
      payee: data.payee || '',
      description: data.description || '',
      reference: data.reference || ''
    });
  }
  return records;
}
export function ImportStatement({
  bank,
  onClose
}) {
  const {
      state,
      dispatch
    } = useStore(),
    [rows, setRows] = useState([]),
    [error, setError] = useState(''),
    [filename, setFilename] = useState(''),
    toast = useToast(),
    duplicate = rows.filter(r => (state.bankStatementLines || []).some(l => l.bankAccountId === bank.id && l.date === r.date && l.amount === r.amount && l.reference === r.reference && l.payee === r.payee)).length;
  return <Modal title="Import a statement" wide onClose={onClose}><ErrorBanner error={error} /><p>Import a CSV with columns Date, Amount, Payee, Description, Reference. Dates use YYYY-MM-DD; spent amounts are negative.</p><Field label="Statement file"><input type="file" accept=".csv,text/csv" onChange={async e => {
        try {
          const f = e.target.files[0];
          if (!f) return;
          setFilename(f.name);
          setRows(parseStatementCsv(await f.text()));
          setError('');
        } catch (e) {
          setError(e.message);
        }
      }} /></Field>{rows.length > 0 && <><h3>Preview — {filename}</h3>{duplicate > 0 && <div className="info-banner">{duplicate} duplicate rows will be skipped.</div>}<DataTable rows={rows} columns={[{
        key: 'date',
        label: 'Date'
      }, {
        key: 'amount',
        label: 'Amount',
        render: r => fmtMoney(r.amount)
      }, {
        key: 'payee',
        label: 'Payee'
      }, {
        key: 'reference',
        label: 'Reference'
      }, {
        key: 'description',
        label: 'Description'
      }]} /></>}<footer><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!rows.length} onClick={() => {
        try {
          dispatch({
            type: 'importStatements',
            bankAccountId: bank.id,
            rows
          });
          toast('Statement imported');
          onClose();
        } catch (e) {
          setError(e.message);
        }
      }}>Import</Button></footer></Modal>;
}
