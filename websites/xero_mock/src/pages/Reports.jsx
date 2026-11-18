import React, { useState } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { newId } from '../store/reducer.js';
import { SidLink, useSidNavigate } from '../components/SidLink.jsx';
import { PageHeader, Button, Menu, Modal, ConfirmDialog, Field, DateInput, AccountPicker, BankPicker, Tabs, DataTable, NotFound, ErrorBanner, useToast, downloadCsv } from '../components/UI.jsx';
import { fmtDate, fmtMoney, todayISO, iso, addDays, round2 } from '../utils/money.js';
import { buildReport, reportDefinitions, fyStart, periods } from '../utils/ledger.js';
export function ReportCentre() {
  const {
      state,
      dispatch
    } = useStore(),
    [params, setParams] = useSearchParams(),
    [q, setQ] = useState(''),
    [confirm, setConfirm] = useState(null),
    navigate = useSidNavigate(),
    tab = params.get('tab') || 'all',
    reports = reportDefinitions.filter(d => d[1].toLowerCase().includes(q.toLowerCase())),
    saved = (state.savedReports || []).filter(r => r.status === {
      drafts: 'draft',
      published: 'published',
      archived: 'archived'
    }[tab] && r.title?.toLowerCase().includes(q.toLowerCase())),
    groups = ['Favourites', ...new Set(reportDefinitions.map(d => d[3]))];
  return <><PageHeader title="Reports" /><div className="content"><Tabs value={tab} items={['all', 'drafts', 'published', 'archived'].map(k => [k, k === 'all' ? 'All reports' : `${k[0].toUpperCase() + k.slice(1)} (${(state.savedReports || []).filter(r => r.status === {
        drafts: 'draft',
        published: 'published',
        archived: 'archived'
      }[k]).length})`])} onChange={v => {
        const next = new URLSearchParams(params);
        next.set('tab', v);
        setParams(next);
      }} /><div className="toolbar"><input aria-label="Find a report" placeholder="Find a report" value={q} onChange={e => setQ(e.target.value)} /></div>{tab === 'all' ? groups.map(g => {
        const rows = reports.filter(d => g === 'Favourites' ? (state.favouriteReports || []).includes(d[0]) : d[3] === g);
        return rows.length > 0 && <section className="panel" key={g}><h2>{g}</h2>{rows.map(d => <div className="report-list-row" key={d[0]}><button aria-label={`${(state.favouriteReports || []).includes(d[0]) ? 'Unfavourite' : 'Favourite'} ${d[1]}`} onClick={() => dispatch({
              type: 'favourite',
              id: d[0]
            })}>{(state.favouriteReports || []).includes(d[0]) ? '★' : '☆'}</button><SidLink to={`/reports/${d[2]}`}>{d[1]}</SidLink></div>)}</section>;
      }) : <DataTable rows={saved} onRow={r => navigate(`/reports/saved/${r.id}`)} columns={[{
        key: 'title',
        label: 'Title',
        render: r => <SidLink to={`/reports/saved/${r.id}`}>{r.title}</SidLink>
      }, {
        key: 'reportType',
        label: 'Report type',
        render: r => reportDefinitions.find(d => d[0] === r.reportType)?.[1] || r.reportType
      }, {
        key: 'period',
        label: 'Date range / As at',
        render: r => r.settings?.asAtDate ? fmtDate(r.settings.asAtDate) : `${fmtDate(r.settings?.fromDate)} – ${fmtDate(r.settings?.toDate)}`
      }, {
        key: 'createdBy',
        label: 'Created by',
        render: r => (state.users || []).find(u => u.id === r.createdBy)?.name || r.createdBy
      }, {
        key: 'updatedAt',
        label: 'Updated date',
        render: r => fmtDate(r.updatedAt)
      }, {
        key: 'actions',
        label: '',
        render: r => <span onClick={e => e.stopPropagation()}><Menu label="⋯"><button onClick={() => dispatch({
              type: 'reportAction',
              id: r.id,
              event: r.status === 'archived' ? 'restore' : 'archive'
            })}>{r.status === 'archived' ? 'Restore' : 'Archive'}</button><button onClick={() => setConfirm(r.id)}>Delete</button></Menu></span>
      }]} />}</div>{confirm && <ConfirmDialog title="Delete report?" onClose={() => setConfirm(null)} destructive onConfirm={() => dispatch({
      type: 'reportAction',
      id: confirm,
      event: 'delete'
    })} />}</>;
}
export function reportPreset(name, org) {
  const now = new Date(),
    year = now.getFullYear(),
    month = now.getMonth(),
    today = iso(now),
    quarter = Math.floor(month / 3) * 3,
    dates = (start, end) => ({
      fromDate: iso(start),
      toDate: iso(end),
      asAtDate: iso(end)
    });
  switch (name) {
    case 'This month':
      return dates(new Date(year, month, 1), new Date(year, month + 1, 0));
    case 'Last month':
    case 'End of last month':
      return dates(new Date(year, month - 1, 1), new Date(year, month, 0));
    case 'This quarter':
      return dates(new Date(year, quarter, 1), new Date(year, quarter + 3, 0));
    case 'Last quarter':
    case 'End of last quarter':
      return dates(new Date(year, quarter - 3, 1), new Date(year, quarter, 0));
    case 'This financial year':
      return {
        fromDate: fyStart(today, org),
        toDate: iso(new Date(Number(fyStart(today, org).slice(0, 4)) + 1, org?.financialYearEnd?.month || 3, 0)),
        asAtDate: today
      };
    case 'Last financial year':
    case 'End of last financial year':
      {
        const start = fyStart(today, org),
          end = addDays(start, -1);
        return {
          fromDate: fyStart(end, org),
          toDate: end,
          asAtDate: end
        };
      }
    case 'Month to date':
      return {
        fromDate: iso(new Date(year, month, 1)),
        toDate: today,
        asAtDate: today
      };
    case 'Quarter to date':
      return {
        fromDate: iso(new Date(year, quarter, 1)),
        toDate: today,
        asAtDate: today
      };
    case 'Year to date':
      return {
        fromDate: fyStart(today, org),
        toDate: today,
        asAtDate: today
      };
    default:
      return {
        fromDate: today,
        toDate: today,
        asAtDate: today
      };
  }
}
function initialSettings(state, params, type) {
  const base = reportPreset('This month', state.organisation),
    today = todayISO();
  return {
    ...base,
    asAtDate: type === 'TrialBalance' ? reportPreset('End of last month', state.organisation).asAtDate : ['BalanceSheet'].includes(type) ? base.asAtDate : today,
    fromDate: params.get('from') || base.fromDate,
    toDate: params.get('to') || base.toDate,
    ...(params.get('date') ? {
      asAtDate: params.get('date')
    } : {}),
    compare: {
      periods: Number(params.get('compare') || 0),
      periodType: params.get('periodType') || 'month'
    },
    basis: 'accrual',
    bankAccountId: params.get('bankAccountId') || (state.bankAccounts || [])[0]?.id || '',
    accountCode: params.get('accountCode') || '200',
    contactId: params.get('contactId') || null,
    ageingBy: 'dueDate',
    ageingPeriods: 4,
    ageingPeriodLength: 'month',
    showTotalColumn: false,
    showYtdColumn: false,
    hideZeroRows: true
  };
}
function extendReport(state, type, settings) {
  const report = buildReport(state, type, settings);
  if (type === 'ProfitAndLoss' && settings.showYtdColumn) {
    const ytd = buildReport(state, type, {
      ...settings,
      fromDate: fyStart(settings.toDate, state.organisation),
      compare: {
        periods: 0
      }
    });
    report.columns.push('Year to date');
    report.rows = report.rows.map(r => ({
      ...r,
      amounts: r.heading ? [] : [...r.amounts, ytd.rows.find(y => y.accountName === r.accountName && y.accountCode === r.accountCode)?.amounts?.[0] || 0]
    }));
  }
  if (type === 'ProfitAndLoss' && settings.showTotalColumn) {
    report.columns.push('Total');
    report.rows = report.rows.map(r => ({
      ...r,
      amounts: r.heading ? [] : [...r.amounts, round2(r.amounts.reduce((a, b) => a + b, 0))]
    }));
  }
  return report;
}
export function ReportPage({
  saved = false
}) {
  const {
      state,
      dispatch
    } = useStore(),
    {
      id
    } = useParams(),
    [params, setParams] = useSearchParams(),
    location = useLocation(),
    navigate = useSidNavigate(),
    toast = useToast(),
    snapshot = saved ? (state.savedReports || []).find(r => r.id === id) : null,
    slug = location.pathname.split('/').at(-1),
    def = saved ? reportDefinitions.find(d => d[0] === snapshot?.reportType) : reportDefinitions.find(d => d[2] === `${slug}${params.get('view') === 'detail' ? '?view=detail' : ''}`) || reportDefinitions.find(d => d[2] === slug),
    type = snapshot?.reportType || def?.[0] || 'ProfitAndLoss',
    name = def?.[1] || 'Report',
    [draft, setDraft] = useState(() => snapshot?.settings || initialSettings(state, params, type)),
    [applied, setApplied] = useState(() => snapshot?.settings || initialSettings(state, params, type)),
    [save, setSave] = useState(null),
    [title, setTitle] = useState(''),
    [note, setNote] = useState(''),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  if (saved && !snapshot) return <NotFound name="Report" back="/reports" />;
  if (!saved && !def) return <NotFound name="Report" back="/reports" />;
  const report = snapshot ? {
      columns: snapshot.columns || [],
      rows: snapshot.rows || [],
      summary: snapshot.summary || {}
    } : extendReport(state, type, applied),
    asAt = ['BalanceSheet', 'TrialBalance', 'BankReconciliationSummary'].includes(type) || type.startsWith('Aged'),
    pending = JSON.stringify(draft) !== JSON.stringify(applied),
    agedDetail = type.startsWith('Aged') && type.endsWith('Detail'),
    transactions = type === 'AccountTransactions',
    field = (k, v) => setDraft({
      ...draft,
      [k]: v
    }),
    run = () => {
      if (!draft.fromDate || !draft.toDate || !draft.asAtDate || draft.fromDate > draft.toDate) {
        setError('Choose a valid date range');
        return;
      }
      setApplied(structuredClone(draft));
      const next = new URLSearchParams(params);
      Object.entries({
        from: draft.fromDate,
        to: draft.toDate,
        date: draft.asAtDate,
        compare: draft.compare.periods,
        periodType: draft.compare.periodType,
        accountCode: draft.accountCode,
        bankAccountId: draft.bankAccountId
      }).forEach(([k, v]) => {
        if (v !== null && v !== undefined) next.set(k, String(v));
      });
      setParams(next);
      setError('');
    };
  const exportReport = format => {
    const fileName = `${state.organisation?.name || 'Brightwater Creative Ltd'} - ${name}.${format === 'PDF' ? 'pdf' : 'csv'}`;
    dispatch({
      type: 'exportReport',
      data: {
        reportType: type,
        savedReportId: snapshot?.id || null,
        format,
        settings: applied,
        summary: report.summary,
        fileName
      }
    });
    if (format === 'Excel') downloadCsv(fileName, ['Account', ...report.columns], report.rows.map(r => [r.accountName, ...r.amounts]));
    if (format === 'PDF') window.print();
    toast(`Exporting ${name}…`);
  };
  const openSave = status => {
    setSave(status);
    setTitle(`${name} – ${fmtDate(asAt ? applied.asAtDate : applied.toDate)}`);
    setNote('');
  };
  const drill = (r, column) => {
    if (r.contactId && !r.documentId) {
      navigate(`/reports/${type.includes('Payables') ? 'aged-payables' : 'aged-receivables'}?view=detail&contactId=${r.contactId}&date=${applied.asAtDate}`);
      return;
    }
    if (r.documentId) {
      navigate(`/${type.includes('Payables') ? 'bills' : 'invoices'}/${r.documentId}`);
      return;
    }
    if (r.sourceId) {
      navigate(`/${{
        invoice: 'invoices',
        bill: 'bills',
        payment: 'payments',
        bankTransaction: 'bank-transactions',
        bankTransfer: 'bank-transfers',
        manualJournal: 'manual-journals'
      }[r.sourceType] || 'invoices'}/${r.sourceId}`);
      return;
    }
    if (r.accountCode === 'CYE') {
      navigate(`/reports/profit-and-loss?from=${fyStart(applied.asAtDate, state.organisation)}&to=${applied.asAtDate}`);
      return;
    }
    if (r.accountCode) {
      let from = asAt ? fyStart(applied.asAtDate, state.organisation) : applied.fromDate,
        to = asAt ? applied.asAtDate : applied.toDate;
      const ps = periods(applied, asAt);
      if (column < ps.length) {
        from = asAt ? fyStart(ps[column].to, state.organisation) : ps[column].from;
        to = ps[column].to;
      } else if (applied.showYtdColumn && column === ps.length) {
        from = fyStart(applied.toDate, state.organisation);
        to = applied.toDate;
      }
      navigate(`/reports/account-transactions?accountCode=${r.accountCode}&from=${from}&to=${to}`);
    }
  };
  return <><PageHeader title={snapshot?.title || name} breadcrumb={{
      label: 'Reports',
      to: '/reports'
    }} actions={<><Button onClick={() => dispatch({
        type: 'favourite',
        id: type
      })}>{(state.favouriteReports || []).includes(type) ? '★' : '☆'}</Button><Menu label="Export ▾">{['PDF', 'Excel', 'Google Sheets'].map(f => <button key={f} onClick={() => exportReport(f)}>{f}</button>)}</Menu>{snapshot ? <Menu label="Options ▾">{snapshot.status === 'draft' && <><button onClick={() => dispatch({
            type: 'reportAction',
            id,
            event: 'publish'
          })}>Publish</button><button onClick={() => {
            setSave('edit');
            setTitle(snapshot.title);
            setNote(snapshot.note || '');
          }}>Edit title & note</button><button onClick={() => {
            const r = extendReport(state, type, applied);
            dispatch({
              type: 'reportAction',
              id,
              event: 'refresh',
              data: {
                rows: r.rows,
                columns: r.columns,
                summary: r.summary
              }
            });
            toast('Report refreshed');
          }}>Refresh with latest data</button></>}<button onClick={() => dispatch({
          type: 'reportAction',
          id,
          event: snapshot.status === 'archived' ? 'restore' : 'archive'
        })}>{snapshot.status === 'archived' ? 'Restore' : 'Archive'}</button><button onClick={() => setConfirm(true)}>Delete</button></Menu> : <Menu label="Save as ▾"><button onClick={() => openSave('draft')}>Save as draft</button><button onClick={() => openSave('published')}>Publish</button></Menu>}</>} /><div className="content full"><ErrorBanner error={error} />{snapshot ? <div className="info-banner">{snapshot.status === 'published' ? `Published ${fmtDate(snapshot.publishedAt)} by ${(state.users || []).find(u => u.id === snapshot.publishedBy)?.name || snapshot.publishedBy}` : `${snapshot.status === 'draft' ? 'Draft' : 'Archived'} report — last edited ${fmtDate(snapshot.updatedAt)} by ${(state.users || []).find(u => u.id === snapshot.createdBy)?.name || snapshot.createdBy}`}</div> : <div className="report-toolbar">{asAt ? <Field label="Date"><DateInput value={draft.asAtDate} onChange={v => field('asAtDate', v)} /></Field> : <><Field label="From"><DateInput value={draft.fromDate} onChange={v => field('fromDate', v)} /></Field><Field label="To"><DateInput value={draft.toDate} onChange={v => field('toDate', v)} /></Field></>}<Field label="Date presets"><select value="" onChange={e => setDraft({
            ...draft,
            ...reportPreset(e.target.value, state.organisation)
          })}><option value="">Choose a period</option>{['This month', 'This quarter', 'This financial year', 'Last month', 'Last quarter', 'Last financial year', 'Month to date', 'Quarter to date', 'Year to date', 'End of last month', 'End of last quarter', 'End of last financial year'].map(n => <option key={n}>{n}</option>)}</select></Field>{['ProfitAndLoss', 'BalanceSheet'].includes(type) && <><Field label="Compare with"><select value={draft.compare?.periods || 0} onChange={e => field('compare', {
              ...draft.compare,
              periods: Number(e.target.value)
            })}><option value="0">None</option>{Array.from({
                length: 11
              }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} previous periods</option>)}</select></Field><Field label="Period type"><select value={draft.compare?.periodType || 'month'} onChange={e => field('compare', {
              ...draft.compare,
              periodType: e.target.value
            })}>{['month', 'quarter', 'year'].map(p => <option key={p}>{p}</option>)}</select></Field></>}{type.startsWith('Aged') && <><Field label="Ageing by"><select value={draft.ageingBy} onChange={e => field('ageingBy', e.target.value)}><option value="dueDate">Due date</option><option value="invoiceDate">Invoice date</option></select></Field><Field label="View"><select value={type.endsWith('Detail') ? 'detail' : 'summary'} onChange={e => navigate(`/reports/${type.includes('Payables') ? 'aged-payables' : 'aged-receivables'}?view=${e.target.value}&date=${applied.asAtDate}`)}><option value="summary">Summary</option><option value="detail">Detail</option></select></Field></>}{type === 'BankReconciliationSummary' && <Field label="Bank account"><BankPicker value={draft.bankAccountId} onChange={v => field('bankAccountId', v)} /></Field>}{type === 'ProfitAndLoss' && (state.trackingCategories || []).length > 0 && <Field label="Department"><select value={draft.trackingOptionId || ''} onChange={e => field('trackingOptionId', e.target.value)}><option value="">All departments</option>{(state.trackingCategories || []).flatMap(c => c.options || []).map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select></Field>}{type === 'VatReturn' && <Field label="VAT quarter"><select value="" onChange={e => {
            const [y, m] = e.target.value.split('-').map(Number);
            setDraft({
              ...draft,
              fromDate: iso(new Date(y, m - 3, 1)),
              toDate: iso(new Date(y, m, 0))
            });
          }}><option value="">Select quarter</option>{[new Date().getFullYear() - 1, new Date().getFullYear()].flatMap(y => [3, 6, 9, 12].map(m => <option key={`${y}-${m}`} value={`${y}-${m}`}>Quarter ended {fmtDate(iso(new Date(y, m, 0)))}</option>))}</select></Field>}{type === 'AccountTransactions' && <Field label="Account"><select value={draft.accountCode || ''} onChange={e => field('accountCode', e.target.value)}>{(state.accounts || []).map(a => <option key={a.id} value={a.code}>{a.code} - {a.name}</option>)}</select></Field>}<Menu label="More ▾"><label>Accounting basis <select value={draft.basis || 'accrual'} onChange={e => field('basis', e.target.value)}><option value="accrual">Accrual</option><option value="cash">Cash</option></select></label><label><input type="checkbox" checked={draft.hideZeroRows !== false} onChange={e => field('hideZeroRows', e.target.checked)} /> Hide accounts with zero balance</label>{type === 'ProfitAndLoss' && <><label><input type="checkbox" checked={draft.showTotalColumn || false} onChange={e => field('showTotalColumn', e.target.checked)} /> Show total column</label><label><input type="checkbox" checked={draft.showYtdColumn || false} onChange={e => field('showYtdColumn', e.target.checked)} /> Show YTD column</label></>}</Menu><Button variant="primary" onClick={run}>Update</Button>{pending && <small>Update to see changes</small>}</div>}<section className="report"><div className="report-title"><h1>{name}</h1><h2>{state.organisation?.name || 'Brightwater Creative Ltd'}</h2><p>{asAt ? `As at ${fmtDate(applied.asAtDate)}` : `For the period ${fmtDate(applied.fromDate)} to ${fmtDate(applied.toDate)}`}</p>{type === 'AccountTransactions' && <p>{applied.accountCode} — {(state.accounts || []).find(a => a.code === applied.accountCode)?.name || 'Unknown account'}</p>}</div><div className="table-scroll"><table><thead><tr>{agedDetail ? <><th>Date</th><th>Number</th><th>Reference</th><th>Due date</th><th className="num">Overdue days</th></> : transactions ? <><th>Date</th><th>Source</th><th>Description</th><th>Reference</th></> : <th>{type.startsWith('Aged') ? 'Contact' : 'Account'}</th>}{report.columns.map((c, i) => <th className="num" key={i}>{c}</th>)}</tr></thead><tbody>{report.rows.map((r, i) => <tr key={i} className={r.heading ? 'report-heading' : r.total ? 'report-total' : ''}>{agedDetail ? <><td>{r.date ? fmtDate(r.date) : ''}</td><td>{r.documentId ? <button className="report-link" onClick={() => drill(r, 0)}>{r.documentNumber || r.accountName}</button> : r.accountName}</td><td>{r.reference || ''}</td><td>{r.dueDate ? fmtDate(r.dueDate) : ''}</td><td>{r.overdueDays ?? ''}</td></> : transactions ? <><td>{r.date ? fmtDate(r.date) : ''}</td><td>{r.sourceId ? <button className="report-link" onClick={() => drill(r, 0)}>{r.sourceName || r.sourceType}</button> : ''}</td><td>{r.sourceId ? r.description : r.accountName}</td><td>{r.reference || ''}</td></> : <td>{r.documentId || r.contactId || r.sourceId ? <button className="report-link" onClick={() => drill(r, 0)}>{r.accountName}</button> : r.accountName}</td>}{report.columns.map((_, j) => <td key={j}>{r.amounts?.[j] !== undefined ? r.accountCode && !saved ? <button className="report-link" onClick={() => drill(r, j)}>{fmtMoney(r.amounts[j])}</button> : <span>{fmtMoney(r.amounts[j])}{r.percentage ? '%' : ''}</span> : ''}</td>)}</tr>)}</tbody></table></div>{snapshot?.note && <p className="notes">{snapshot.note}</p>}</section></div>{save && <Modal title={save === 'edit' ? 'Edit report' : save === 'published' ? 'Publish report' : 'Save as draft'} onClose={() => setSave(null)}><Field label="Title"><input value={title} onChange={e => setTitle(e.target.value)} /></Field><Field label="Note (optional)"><textarea value={note} onChange={e => setNote(e.target.value)} /></Field><footer><Button onClick={() => setSave(null)}>Cancel</Button><Button variant="primary" disabled={!title.trim()} onClick={() => {
          if (save === 'edit') {
            dispatch({
              type: 'reportAction',
              id,
              event: 'edit',
              data: {
                title: title.trim(),
                note
              }
            });
            setSave(null);
          } else {
            const id = newId('rep');
            dispatch({
              type: 'saveReport',
              newId: id,
              data: {
                reportType: type,
                title: title.trim(),
                status: save,
                settings: structuredClone(applied),
                columns: report.columns,
                rows: report.rows,
                summary: report.summary,
                note
              }
            });
            navigate(`/reports/saved/${id}`);
          }
          toast(save === 'published' ? 'Report published' : 'Report saved');
        }}>{save === 'published' ? 'Publish' : 'Save'}</Button></footer></Modal>}{confirm && <ConfirmDialog title="Delete report?" onClose={() => setConfirm(false)} destructive onConfirm={() => {
      dispatch({
        type: 'reportAction',
        id,
        event: 'delete'
      });
      navigate('/reports');
    }} />}</>;
}
