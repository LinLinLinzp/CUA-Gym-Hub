import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { SidLink } from '../components/SidLink.jsx';
import { PageHeader, Button, Modal, Field, DateInput, DataTable, ErrorBanner, useToast } from '../components/UI.jsx';
const settingsPages = [['Organisation details', 'organisation', 'Business information, address and contact details'], ['Users', 'users', 'Manage access to your organisation'], ['Invoice settings', 'invoice', 'Payment terms and invoice numbers'], ['Financial settings', 'financial', 'Financial year, VAT and lock dates'], ['Tax rates', 'tax-rates', 'VAT rates for sales and purchases'], ['Tracking categories', 'tracking', 'Departments and reporting options'], ['Chart of accounts', '/chart-of-accounts', 'View and manage your chart of accounts']];
export function Settings() {
  const {
      state,
      dispatch
    } = useStore(),
    location = useLocation(),
    page = location.pathname.split('/').at(-1),
    [org, setOrg] = useState(() => structuredClone(state.organisation || {})),
    [themes, setThemes] = useState(() => structuredClone(state.brandingThemes || [])),
    [error, setError] = useState(''),
    [taxModal, setTaxModal] = useState(false),
    [tax, setTax] = useState({
      name: '',
      rate: 20,
      appliesTo: 'both'
    }),
    [option, setOption] = useState(null),
    [optionName, setOptionName] = useState(''),
    toast = useToast(),
    title = settingsPages.find(p => p[1] === page)?.[0] || 'Settings',
    field = (key, value) => setOrg({
      ...org,
      [key]: value
    }),
    invoice = org.invoiceSettings || {},
    inv = (key, value) => field('invoiceSettings', {
      ...invoice,
      [key]: value
    }),
    save = () => {
      try {
        if (page === 'organisation' && !org.name?.trim()) throw Error('Organisation name is required');
        if (page === 'invoice' && ['nextInvoiceNumber', 'nextQuoteNumber', 'nextCreditNoteNumber', 'nextPurchaseOrderNumber'].some(k => !Number.isInteger(Number(invoice[k])) || Number(invoice[k]) < 1)) throw Error('Next document numbers must be positive whole numbers');
        dispatch({
          type: 'saveSettings',
          data: org
        });
        if (page === 'invoice') dispatch({
          type: 'saveBrandingThemes',
          data: themes
        });
        toast('Settings saved');
        setError('');
      } catch (e) {
        setError(e.message);
      }
    };
  return <><PageHeader title={title} breadcrumb={page !== 'settings' ? {
      label: 'Settings',
      to: '/settings'
    } : null} /><div className="content"><ErrorBanner error={error} />{page === 'settings' ? <div className="dashboard">{settingsPages.map(([name, path, description]) => <SidLink className="card settings-card" key={path} to={path.startsWith('/') ? path : `/settings/${path}`}><h2>{name} <span>›</span></h2><p>{description}</p></SidLink>)}</div> : page === 'users' ? <DataTable rows={state.users || []} columns={[{
        key: 'name',
        label: 'Name'
      }, {
        key: 'email',
        label: 'Email address'
      }, {
        key: 'role',
        label: 'Role'
      }]} /> : page === 'tax-rates' ? <section className="panel"><div className="toolbar"><Button variant="primary" onClick={() => setTaxModal(true)}>New tax rate</Button></div><DataTable rows={state.taxRates || []} columns={[{
          key: 'name',
          label: 'Tax rate'
        }, {
          key: 'rate',
          label: 'Rate (%)'
        }, {
          key: 'appliesTo',
          label: 'Applies to'
        }, {
          key: 'status',
          label: 'Status'
        }]} /></section> : page === 'tracking' ? <>{(state.trackingCategories || []).map(c => <section className="panel" key={c.id}><h2>{c.name}</h2>{(c.options || []).map(o => <div className="card-line" key={o.id}><span>{o.name}</span><Button onClick={() => {
              setOption({
                id: c.id,
                optionId: o.id
              });
              setOptionName(o.name);
            }}>Rename</Button></div>)}<p><Button onClick={() => {
              setOption({
                id: c.id
              });
              setOptionName('');
            }}>Add option</Button></p></section>)}</> : <section className="panel">{page === 'organisation' ? <>{[['name', 'Organisation name'], ['legalName', 'Legal name'], ['registrationNumber', 'Registration number'], ['taxNumber', 'VAT number'], ['phone', 'Phone'], ['email', 'Email'], ['website', 'Website']].map(([k, t]) => <Field label={t} key={k}><input value={org[k] || ''} onChange={e => field(k, e.target.value)} /></Field>)}<h3>Address</h3><div className="form-row">{[['line1', 'Line 1'], ['city', 'Town/City'], ['postalCode', 'Postal code'], ['country', 'Country']].map(([k, t]) => <Field label={t} key={k}><input value={org.address?.[k] || ''} onChange={e => field('address', {
                ...org.address,
                [k]: e.target.value
              })} /></Field>)}</div></> : page === 'invoice' ? <><h2>Branding themes</h2>{themes.map((t, i) => <div key={t.id}><h3>{t.name}</h3><Field label="Payment terms text"><textarea value={t.paymentTermsText || ''} onChange={e => setThemes(themes.map((x, j) => i === j ? {
                ...x,
                paymentTermsText: e.target.value
              } : x))} /></Field></div>)}<h2>Payment terms</h2>{[['salesPaymentTerms', 'Invoice payment terms'], ['billsPaymentTerms', 'Bills payment terms']].map(([k, t]) => <div className="form-row" key={k}><Field label={t}><input type="number" min="0" value={invoice[k]?.day ?? 30} onChange={e => inv(k, {
                ...invoice[k],
                day: Number(e.target.value)
              })} /></Field><Field label="Type"><select value={invoice[k]?.type || 'DAYSAFTERBILLDATE'} onChange={e => inv(k, {
                ...invoice[k],
                type: e.target.value
              })}><option value="DAYSAFTERBILLDATE">days after invoice date</option><option value="DAYSAFTERBILLMONTH">days after end of invoice month</option><option value="OFCURRENTMONTH">of current month</option><option value="OFFOLLOWINGMONTH">of following month</option></select></Field></div>)}<h2>Document numbering</h2>{[['invoice', 'Invoice', 'nextInvoiceNumber'], ['quote', 'Quote', 'nextQuoteNumber'], ['creditNote', 'Credit note', 'nextCreditNoteNumber'], ['purchaseOrder', 'Purchase order', 'nextPurchaseOrderNumber']].map(([k, t, next]) => <div className="form-row" key={k}><Field label={`${t} prefix`}><input value={invoice[`${k}Prefix`] || ''} onChange={e => inv(`${k}Prefix`, e.target.value)} /></Field><Field label="Next number"><input type="number" min="1" value={invoice[next] || 1} onChange={e => inv(next, Number(e.target.value))} /></Field></div>)}</> : page === 'financial' ? <><h2>Financial year</h2><div className="form-row"><Field label="Financial year end day"><input type="number" min="1" max="31" value={org.financialYearEnd?.day || 31} onChange={e => field('financialYearEnd', {
                ...org.financialYearEnd,
                day: Number(e.target.value)
              })} /></Field><Field label="Month"><select value={org.financialYearEnd?.month || 3} onChange={e => field('financialYearEnd', {
                ...org.financialYearEnd,
                month: Number(e.target.value)
              })}>{Array.from({
                  length: 12
                }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2026, i, 1).toLocaleDateString('en-GB', {
                    month: 'long'
                  })}</option>)}</select></Field></div><Field label="Lock date"><DateInput value={org.lockDate} onChange={v => field('lockDate', v || null)} /></Field><Field label="VAT period"><select value={org.vatPeriod || 'Quarterly'} onChange={e => field('vatPeriod', e.target.value)}><option>Quarterly</option><option>Monthly</option><option>Annual</option></select></Field></> : <p>Select a settings page from <SidLink to="/settings">Settings</SidLink>.</p>}{['organisation', 'invoice', 'financial'].includes(page) && <footer className="form-footer"><Button onClick={() => {
            setOrg(structuredClone(state.organisation || {}));
            setThemes(structuredClone(state.brandingThemes || []));
          }}>Cancel changes</Button><Button variant="primary" onClick={save}>Save</Button></footer>}</section>}</div>{taxModal && <Modal title="New tax rate" onClose={() => setTaxModal(false)}><ErrorBanner error={error} /><Field label="Name"><input value={tax.name} onChange={e => setTax({
          ...tax,
          name: e.target.value
        })} /></Field><Field label="Rate (%)"><input type="number" min="0" max="100" value={tax.rate} onChange={e => setTax({
          ...tax,
          rate: e.target.value
        })} /></Field><Field label="Applies to"><select value={tax.appliesTo} onChange={e => setTax({
          ...tax,
          appliesTo: e.target.value
        })}><option value="both">Sales and purchases</option><option value="sales">Sales</option><option value="purchases">Purchases</option></select></Field><footer><Button onClick={() => setTaxModal(false)}>Cancel</Button><Button variant="primary" onClick={() => {
          try {
            dispatch({
              type: 'saveTaxRate',
              data: tax
            });
            setTaxModal(false);
          } catch (e) {
            setError(e.message);
          }
        }}>Save</Button></footer></Modal>}{option && <Modal title={option.optionId ? 'Rename option' : 'Add option'} onClose={() => setOption(null)}><Field label="Name"><input value={optionName} onChange={e => setOptionName(e.target.value)} /></Field><footer><Button onClick={() => setOption(null)}>Cancel</Button><Button variant="primary" disabled={!optionName.trim()} onClick={() => {
          dispatch({
            type: 'trackingOption',
            ...option,
            name: optionName
          });
          setOption(null);
        }}>Save</Button></footer></Modal>}</>;
}
