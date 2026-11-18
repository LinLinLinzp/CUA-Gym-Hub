import React, { useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAccount } from './account.jsx'
import { associatedCases, belongsToAccount, catalogEntry, dateLabel, latest, records, recordPath, statusLabel } from './model.js'
import { withSid } from './utils/dataManager.js'

export function AccountLink({ to, ...props }) {
  return <Link to={withSid(to)} {...props} />
}

export function AccountNavLink({ to, ...props }) {
  return <NavLink to={withSid(to)} {...props} />
}

export function useAccountNavigate() {
  const navigate = useNavigate()
  return (path, options) => navigate(withSid(path), options)
}

export function Icon({ name }) {
  return <span className={'icon icon-' + name} aria-hidden="true" />
}

export function Badge({ status, children }) {
  const tones = {
    approved: 'green', submitted: 'green', action_needed: 'amber', closed: 'gray',
    decision_issued: 'green', open: 'teal',
  }
  const tone = Object.hasOwn(tones, status) ? tones[status] : 'gray'
  return <span className={'badge ' + tone}>{children || statusLabel(status)}</span>
}

export function Heading({ title, children, action, back }) {
  return <div className="page-heading">
    {back && <AccountLink className="back-link" to={back.to}>← {back.label}</AccountLink>}
    <div className="heading-row">
      <div><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}
    </div>
  </div>
}

export function Panel({ title, action, children, className = '' }) {
  return <section className={'panel ' + className}>
    {(title || action) && <div className="panel-head">{title && <h2>{title}</h2>}{action}</div>}
    {children}
  </section>
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>
}

export function Missing({ title, to, label }) {
  return <><Heading title={title}>This record could not be found in your account.</Heading>
    <AccountLink className="button secondary" to={to}>{label}</AccountLink></>
}

export function Confirmation({ title, children }) {
  const heading = useRef(null)
  useEffect(() => heading.current?.focus(), [])
  return <section className="panel confirmation">
    <span className="confirmation-mark" aria-hidden="true">✓</span>
    <h1 tabIndex={-1} ref={heading}>{title}</h1>
    {children}
  </section>
}

export function StepList({ steps, current }) {
  return <ol className="steps" aria-label="Progress">
    {steps.map((name, index) => <li key={name} aria-current={index === current ? 'step' : undefined}
      className={index < current ? 'finished' : ''}><span>{index < current ? '✓' : index + 1}</span>{name}</li>)}
  </ol>
}

export function Field({ id, label, error, hint, options, children, ...props }) {
  const describedBy = [hint && id + '-hint', error && id + '-error'].filter(Boolean).join(' ') || undefined
  const fieldProps = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, ...props }
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {hint && <small id={id + '-hint'}>{hint}</small>}
    {options ? <select {...fieldProps}><option value="">Select an option</option>
      {options.map(option => <option key={option}>{option}</option>)}</select> : <input {...fieldProps} />}
    {error && <small className="error-text" id={id + '-error'}>{error}</small>}
    {children}
  </div>
}

export function ErrorSummary({ children }) {
  const box = useRef(null)
  useEffect(() => box.current?.focus(), [children])
  return <div className="notice error" role="alert" tabIndex={-1} ref={box}>{children}</div>
}

export function AddressText({ address }) {
  if (!address?.line1 && !address?.city && !address?.postalCode) return <span className="muted">Address unavailable</span>
  return <address>{address.line1}{address.line2 && <><br />{address.line2}</>}<br />
    {[address.city, [address.region, address.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
  </address>
}

export function CaseRows({ cases }) {
  return cases.length ? <ul className="record-list">
    {cases.map(item => <li className="record-row" key={item.id}>
      <div className="record-main"><AccountLink className="record-title numeric" to={recordPath('/cases', item.id)}>{item.receiptNumber || 'View case'}</AccountLink>
        <span className="meta">{[item.formCode, item.formTitle].filter(Boolean).join(' · ') || 'Form details unavailable'}</span>
      </div>
      <div className="record-side"><Badge status={item.status} /><span className="meta numeric">{dateLabel(item.statusUpdatedAt)}</span></div>
    </li>)}
  </ul> : <Empty>No cases to show.</Empty>
}

export function DraftRows({ state, drafts }) {
  return drafts.length ? <ul className="record-list">
    {drafts.map((draft, index) => {
      const item = catalogEntry(state, draft.formId)
      return <li className="record-row" key={draft.id || index}>
        <div className="record-main"><strong>{item?.code || 'Form draft'}</strong>
          <span className="meta">{item?.title || 'Form details unavailable'}</span>
          <span className="meta">{[item?.category, dateLabel(draft.updatedAt)].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="record-side"><Badge status={draft.status || 'draft'} />
          {draft.id && <AccountLink to={recordPath('/forms/drafts', draft.id)}>{draft.status === 'submitted' ? 'View filing' : 'Continue'}</AccountLink>}
        </div>
      </li>
    })}
  </ul> : <Empty>No drafts to show.</Empty>
}

export function Overview() {
  const { state } = useAccount()
  const cases = latest(associatedCases(state), 'statusUpdatedAt')
  const drafts = latest(records(state.formDrafts).filter(item => item.status === 'draft' && belongsToAccount(state, item)), 'updatedAt')
  const request = latest(records(state.addressChanges).filter(item => item.id && belongsToAccount(state, item)), 'createdAt')[0]
  const firstName = state.profile?.displayName?.trim().split(/\s+/)[0]
  return <>
    <section className="welcome">
      <div><h1>{firstName ? 'Welcome, ' + firstName : 'Welcome'}</h1>
        <p>Follow your cases, continue a form, or update your address from your account.</p>
      </div>
      <div className="welcome-art" aria-hidden="true"><span className="art-sun" /><span className="art-back" />
        <span className="art-sheet"><i /><i /><i /><i /></span><span className="art-stamp">✓</span></div>
    </section>
    <div className="overview-grid">
      <Panel title="Tracked cases" action={<AccountLink to="/cases">View all cases <span aria-hidden="true">→</span></AccountLink>}>
        <p className="section-intro">Latest updates on cases linked to your account.</p>
        <CaseRows cases={cases.slice(0, 4)} />
        <AccountLink className="button secondary panel-action" to="/cases#lookup">Check case status</AccountLink>
      </Panel>
      <Panel title="Form drafts" action={<AccountLink to="/forms">View forms <span aria-hidden="true">→</span></AccountLink>}>
        <p className="section-intro">Pick up where you left off.</p>
        <DraftRows state={state} drafts={drafts.slice(0, 3)} />
      </Panel>
      <Panel title="Address change" className="address-summary" action={<AccountLink to="/address-change">Manage addresses <span aria-hidden="true">→</span></AccountLink>}>
        <div className="address-summary-body">
          <div><h3>Current mailing address</h3><AddressText address={state.profile?.mailingAddress} /></div>
          <div><h3>Latest request</h3>{request ? <>
            <AccountLink className="numeric" to={recordPath('/address-change', request.id)}>{request.confirmationNumber || 'View request'}</AccountLink>
            <p className="meta">{dateLabel(request.createdAt)}</p>
          </> : <p className="meta">No address change requests yet.</p>}</div>
        </div>
      </Panel>
    </div>
  </>
}
