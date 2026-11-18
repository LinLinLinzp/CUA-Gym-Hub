import React, { useState } from 'react';
import { useStore } from '../store/StoreContext.jsx';
import { SidLink, useSidNavigate } from '../components/SidLink.jsx';
import { PageHeader, Button, Modal, SummaryTiles, DataTable } from '../components/UI.jsx';
import { BankCard } from './Bank.jsx';
import { fmtMoney, fmtDate, todayISO, iso, addDays } from '../utils/money.js';
import { displayStatus } from '../utils/status.js';
import { buildProfitAndLoss, bankItems, accountBalance, fyStart } from '../utils/ledger.js';
import { unreconciledCount } from '../utils/reconcile.js';
function monthlyPeriods() {
  const today = new Date();
  return Array.from({
    length: 6
  }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
    return {
      from: iso(d),
      to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      label: d.toLocaleDateString('en-GB', {
        month: 'short'
      })
    };
  });
}
function Bars({
  values,
  onClick,
  labels,
  dual = false
}) {
  const max = Math.max(...values.flat(), 1);
  return <div className="chart">{values.map((v, i) => <div className="chart-bar" key={i} title={`${labels[i]}: ${v.map(fmtMoney).join(' / ')}`}>{dual ? <><i style={{
          height: `${v[0] / max * 100}%`
        }} /><i className="out" style={{
          height: `${v[1] / max * 100}%`
        }} /></> : <button aria-label={`${labels[i]} ${fmtMoney(v[0])}`} style={{
        height: `${v[0] / max * 100}%`
      }} className={labels[i] === 'Older' ? 'overdue' : ''} onClick={() => onClick?.(i)} />}<small>{labels[i]}</small></div>)}</div>;
}
function OwedCard({
  bill = false
}) {
  const {
      state
    } = useStore(),
    navigate = useSidNavigate(),
    key = bill ? 'bills' : 'invoices',
    docs = (state[key] || []).filter(d => d.status !== 'DELETED'),
    today = todayISO(),
    start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const week = iso(start),
    buckets = [{
      label: 'Older',
      to: addDays(week, -8)
    }, {
      label: 'Last wk',
      from: addDays(week, -7),
      to: addDays(week, -1)
    }, {
      label: 'This wk',
      from: week,
      to: addDays(week, 6)
    }, ...Array.from({
      length: 3
    }, (_, i) => ({
      label: `${fmtDate(addDays(week, (i + 1) * 7)).split(' ').slice(0, 2).join(' ')}`,
      from: addDays(week, (i + 1) * 7),
      to: addDays(week, (i + 2) * 7 - 1)
    })), {
      label: 'Future',
      from: addDays(week, 28)
    }],
    values = buckets.map(b => [docs.filter(d => d.status === 'AUTHORISED' && (!b.from || d.dueDate >= b.from) && (!b.to || d.dueDate <= b.to)).reduce((n, d) => n + Number(d.amountDue || 0), 0)]);
  return <section className="card"><h2>{bill ? 'Bills to pay' : 'Invoices owed to you'}</h2>{[['DRAFT', 'Draft'], ['SUBMITTED', 'Awaiting approval'], ['AUTHORISED', 'Awaiting payment'], ['overdue', 'Overdue']].map(([status, label]) => {
      const rows = docs.filter(d => status === 'overdue' ? displayStatus(d) === 'Overdue' : d.status === status);
      return <SidLink key={status} className={`card-line ${status === 'overdue' ? 'red' : ''}`} to={`/${key}?${status === 'overdue' ? 'overdue=1' : `status=${status.toLowerCase()}`}`}><span>{rows.length} {label.toLowerCase()}{status === 'DRAFT' ? ` ${key}` : ''}</span><strong>{fmtMoney(rows.reduce((n, d) => n + Number(['DRAFT', 'SUBMITTED'].includes(status) ? d.total || 0 : d.amountDue || 0), 0))}</strong></SidLink>;
    })}<Bars values={values} labels={buckets.map(b => b.label)} onClick={i => navigate(`/${key}?status=authorised${buckets[i].from ? `&dueFrom=${buckets[i].from}` : ''}${buckets[i].to ? `&dueTo=${buckets[i].to}` : ''}`)} /><div className="card-footer"><SidLink to={`/${key}/new`}>{bill ? '+ New bill' : 'New invoice'}</SidLink></div></section>;
}
export function Dashboard() {
  const {
      state,
      dispatch
    } = useStore(),
    [editing, setEditing] = useState(false),
    [layout, setLayout] = useState(null),
    [drag, setDrag] = useState(null),
    today = todayISO(),
    periods = monthlyPeriods(),
    bank = (state.bankAccounts || []).flatMap(b => bankItems(state, b.id)).filter(t => t.kind !== 'bankTransfer'),
    cash = periods.map(p => [bank.filter(t => t.date >= p.from && t.date <= p.to && t.signedAmount > 0).reduce((n, t) => n + t.signedAmount, 0), bank.filter(t => t.date >= p.from && t.date <= p.to && t.signedAmount < 0).reduce((n, t) => n - t.signedAmount, 0)]),
    profit = buildProfitAndLoss(state, {
      fromDate: fyStart(today, state.organisation),
      toDate: today
    }).summary,
    watch = (state.accounts || []).filter(a => a.showOnDashboard),
    payments = (state.payments || []).filter(p => p.type === 'ACCRECPAYMENT' && p.status !== 'DELETED').sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5),
    tasks = [[unreconciledCount(state), 'bank items to reconcile', '/bank-accounts'], [(state.invoices || []).filter(d => d.status === 'SUBMITTED').length, 'invoices awaiting approval', '/invoices?status=submitted'], [(state.bills || []).filter(d => d.status === 'SUBMITTED').length, 'bills awaiting approval', '/bills?status=submitted'], [(state.invoices || []).filter(d => displayStatus(d) === 'Overdue').length, 'overdue invoices', '/invoices?overdue=1'], [(state.bills || []).filter(d => displayStatus(d) === 'Overdue').length, 'overdue bills', '/bills?overdue=1']].filter(t => t[0]),
    name = id => (state.contacts || []).find(c => c.id === id)?.name || '(Unknown contact)';
  return <><PageHeader title={state.organisation?.name || 'Brightwater Creative Ltd'} pageTitle="Home" actions={<Button onClick={() => {
      setLayout(structuredClone(state.dashboardLayout || {
        widgets: defaultWidgets,
        hidden: []
      }));
      setEditing(true);
    }}>Edit homepage</Button>} /><div className="content"><DashboardGrid layout={state.dashboardLayout}>{(state.bankAccounts || []).filter(b => b.showOnDashboard).map(b => <BankCard key={b.id} widgetId={`bank_${b.id}`} bank={b} chart />)}<OwedCard widgetId="invoicesOwed" /><OwedCard widgetId="billsToPay" bill /><section className="card" data-widget="cashInOut"><h2>Cash in and out</h2><p className="caption">Cash flow for the last 6 months</p><Bars values={cash} dual labels={periods.map(p => p.label)} /><div className="card-line"><span>Cash in</span><strong>{fmtMoney(cash.reduce((n, v) => n + v[0], 0))}</strong></div><div className="card-line"><span>Cash out</span><strong>{fmtMoney(cash.reduce((n, v) => n + v[1], 0))}</strong></div><div className="card-line"><span>Difference</span><strong>{fmtMoney(cash.reduce((n, v) => n + v[0] - v[1], 0))}</strong></div></section><section className="card" data-widget="profitLoss"><h2>Profit or loss</h2><p className="caption">Financial year to date</p><div className="card-line"><span>Income</span><strong>{fmtMoney(profit.totalTradingIncome + profit.totalOtherIncome)}</strong></div><div className="card-line"><span>Expenses</span><strong>{fmtMoney(profit.totalCostOfSales + profit.totalOperatingExpenses)}</strong></div><div className="card-line"><span>Net profit</span><strong className="big">{fmtMoney(profit.netProfit)}</strong></div><div className="card-footer"><SidLink to="/reports/profit-and-loss">View Profit and Loss report</SidLink></div></section><section className="card" data-widget="watchlist"><h2>Account watchlist</h2><table><thead><tr><th>Account</th><th className="num">This month</th><th className="num">YTD</th></tr></thead><tbody>{watch.map(a => <tr key={a.id}><td><SidLink to={`/reports/account-transactions?accountCode=${a.code}`}>{a.name}</SidLink></td><td className="num">{fmtMoney(accountBalance(state, a.code, today, `${today.slice(0, 7)}-01`) * (a.class === 'REVENUE' ? -1 : 1))}</td><td className="num">{fmtMoney(accountBalance(state, a.code, today, fyStart(today, state.organisation)) * (a.class === 'REVENUE' ? -1 : 1))}</td></tr>)}</tbody></table><div className="card-footer"><SidLink to="/chart-of-accounts">Edit watchlist</SidLink></div></section><section className="card" data-widget="tasks"><h2>Tasks</h2>{tasks.length ? tasks.map(([n, label, to]) => <SidLink key={to} to={to} className="card-line">{n} {label}<span>›</span></SidLink>) : <p>You're all caught up.</p>}</section><section className="card" data-widget="recentPayments"><h2>Recent invoice payments</h2>{payments.map(p => <div className="card-line" key={p.id}><span><SidLink to={`/invoices/${p.documentId}`}>{name(p.contactId)}</SidLink><small>{fmtDate(p.date)} · {p.documentNumber}</small></span><strong>{fmtMoney(p.amount)}</strong></div>)}{!payments.length && <p>No payments yet</p>}</section></DashboardGrid></div>{editing && layout && <Modal title="Edit homepage" onClose={() => setEditing(false)}><p>Drag cards to reorder them. Choose which cards appear on your homepage.</p>{layout.widgets.map((id, i) => <div key={id} className="dashboard-layout-row" draggable onDragStart={() => setDrag(i)} onDragOver={e => e.preventDefault()} onDrop={() => {
        if (drag === null || drag === i) return;
        const widgets = [...layout.widgets],
          item = widgets.splice(drag, 1)[0];
        widgets.splice(i, 0, item);
        setLayout({
          ...layout,
          widgets
        });
        setDrag(null);
      }}><span>☷</span><span>{widgetNames[id] || (state.bankAccounts || []).find(b => `bank_${b.id}` === id)?.name || id}</span><input type="checkbox" aria-label={`Show ${widgetNames[id] || id}`} checked={!(layout.hidden || []).includes(id)} onChange={e => setLayout({
          ...layout,
          hidden: e.target.checked ? (layout.hidden || []).filter(x => x !== id) : [...(layout.hidden || []), id]
        })} /><Button disabled={i === 0} onClick={() => {
          const widgets = [...layout.widgets];
          [widgets[i - 1], widgets[i]] = [widgets[i], widgets[i - 1]];
          setLayout({
            ...layout,
            widgets
          });
        }}>↑</Button><Button disabled={i === layout.widgets.length - 1} onClick={() => {
          const widgets = [...layout.widgets];
          [widgets[i + 1], widgets[i]] = [widgets[i], widgets[i + 1]];
          setLayout({
            ...layout,
            widgets
          });
        }}>↓</Button></div>)}<footer><Button onClick={() => setEditing(false)}>Cancel</Button><Button variant="primary" onClick={() => {
          dispatch({
            type: "dashboardLayout",
            data: layout
          });
          setEditing(false);
        }}>Save</Button></footer></Modal>}</>;
}
export function Overview({
  bill = false
}) {
  const {
      state
    } = useStore(),
    navigate = useSidNavigate(),
    key = bill ? 'bills' : 'invoices',
    docs = (state[key] || []).filter(d => d.status !== 'DELETED'),
    periods = monthlyPeriods(),
    totals = periods.map(p => [docs.filter(d => ['AUTHORISED', 'PAID'].includes(d.status) && d.date >= p.from && d.date <= p.to).reduce((s, d) => s + Number(d.total || 0), 0)]),
    top = (state.contacts || []).map(c => ({
      ...c,
      amount: docs.filter(d => d.status === 'AUTHORISED' && d.contactId === c.id).reduce((s, d) => s + Number(d.amountDue || 0), 0)
    })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);
  return <><PageHeader title={bill ? 'Purchases overview' : 'Sales overview'} actions={<Button variant="primary" onClick={() => navigate(`/${key}/new`)}>New {bill ? 'bill' : 'invoice'}</Button>} /><div className="content"><SummaryTiles docs={docs} onSelect={v => navigate(`/${key}?${v === 'overdue' ? 'overdue=1' : `status=${v}`}`)} /><div className="two-columns"><section className="panel"><h2>{bill ? 'Suppliers you owe the most' : 'Customers owing the most'}</h2>{top.map(c => <SidLink key={c.id} className="card-line" to={`/contacts/${c.id}`}><span>{c.name}</span><strong>{fmtMoney(c.amount)}</strong></SidLink>)}{!top.length && <p>No outstanding balances</p>}</section><section className="panel"><h2>{bill ? 'Monthly bills' : 'Monthly invoices'}</h2><Bars values={totals} labels={periods.map(p => p.label)} onClick={i => navigate(`/${key}?dateType=date&from=${periods[i].from}&to=${periods[i].to}`)} /></section></div></div></>;
}
const defaultWidgets = ['bank_ba_090', 'bank_ba_091', 'invoicesOwed', 'billsToPay', 'cashInOut', 'profitLoss', 'watchlist', 'tasks', 'recentPayments'];
const widgetNames = {
  invoicesOwed: 'Invoices owed to you',
  billsToPay: 'Bills to pay',
  cashInOut: 'Cash in and out',
  profitLoss: 'Profit or loss',
  watchlist: 'Account watchlist',
  tasks: 'Tasks',
  recentPayments: 'Recent invoice payments'
};
function DashboardGrid({
  layout,
  children
}) {
  const elements = React.Children.toArray(children),
    byId = new Map(elements.map(c => [c.props.widgetId || c.props['data-widget'], c])),
    order = [...(layout?.widgets || defaultWidgets), ...elements.map(c => c.props.widgetId || c.props['data-widget']).filter(id => !(layout?.widgets || defaultWidgets).includes(id))];
  return <div className="dashboard">{order.filter(id => !(layout?.hidden || []).includes(id)).map(id => byId.get(id)).filter(Boolean)}</div>;
}
