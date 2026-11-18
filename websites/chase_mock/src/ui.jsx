import { useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { accountLabel, statusLabel } from './utils/banking'
import { withSid } from './utils/dataManager'

const paths = {
  accounts: 'M3 10h18M5 10v8m5-8v8m4-8v8m5-8v8M3 21h18M2 8l10-5 10 5',
  transfer: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  bill: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3',
  dispute: 'M12 22s7-3 7-11V6l-7-3-7 3v5c0 8 7 11 7 11Zm0-14v5m0 3h.01',
  bell: 'M18 8a6 6 0 0 0-12 0v4l-2 4h16l-2-4V8Zm-8 12a2 2 0 0 0 4 0',
  checking: 'M4 6h16a1 1 0 0 1 1 1v11H3V7a1 1 0 0 1 1-1Zm-1 4h18m-14 4h3',
  savings: 'M4 11h16l-2 9H6l-2-9Zm-1-3h18v3H3V8Zm6 0V6a3 3 0 0 1 6 0v2',
  credit_card: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 5h18m-14 5h4',
  right: 'm9 5 7 7-7 7',
  left: 'm15 5-7 7 7 7',
  plus: 'M12 5v14M5 12h14',
  search: 'M15 15l5 5m-9-3a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z',
  check: 'm5 12 4 4L19 6',
}

export function Icon({ name, size = 20 }) {
  return <svg className="icon" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name] || paths.accounts} />
  </svg>
}

export function SessionLink({ to, ...props }) {
  const { search } = useLocation()
  const [path, extra = ''] = to.split('?')
  const query = new URLSearchParams(extra)
  const sid = new URLSearchParams(search).get('sid')
  if (!sid) return <Link to={withSid(to)} {...props} />
  query.set('sid', sid)
  return <Link to={{ pathname: path, search: query.toString() }} {...props} />
}

export function BackLink({ to, children }) {
  return <SessionLink className="back-link" to={to}><Icon name="left" size={15} />{children}</SessionLink>
}

export function PageTitle({ title, description, children }) {
  return <div className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}
  </div>
}

export function Panel({ title, children, className = '', side, headingRef }) {
  return <section className={'panel ' + className}>
    {title && <div className="panel-heading"><h2 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>{title}</h2>{side}</div>}
    {children}
  </section>
}

export function Missing({ title, to = '/accounts', label = 'Back to accounts' }) {
  return <><PageTitle title={title} /><Panel><BackLink to={to}>{label}</BackLink></Panel></>
}

export function Status({ value }) {
  return <span className={'status ' + (value || '')}>{statusLabel(value)}</span>
}

export function Field({ label, error, children, className = '' }) {
  const id = useId()
  return <div className={'field ' + className}>
    <label htmlFor={id}>{label}</label>
    {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? id + '-error' : undefined })}
    {error && <span id={id + '-error'} className="error-text">{error}</span>}
  </div>
}

export function AccountOptions({ accounts, placeholder = 'Select an account' }) {
  return <><option value="">{placeholder}</option>
    {accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
  </>
}

export function Details({ rows }) {
  return <dl className="details">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

export function Review({ title, rows, back, confirm, confirmLabel, error }) {
  return <Panel title={title} className="review">
    <Details rows={rows} />
    {error && <Notice error>{error}</Notice>}
    <div className="actions">
      <button className="secondary" onClick={back}>Back</button>
      <button className="primary" onClick={confirm}>{confirmLabel}</button>
    </div>
  </Panel>
}

export function Notice({ children, error = false }) {
  if (!children) return null
  return <p className={'notice' + (error ? ' notice-error' : '')} role={error ? 'alert' : 'status'}>
    {!error && <Icon name="check" size={18} />}{children}
  </p>
}

export function Search({ label, value, onChange }) {
  return <Field label={label}>{(props) => <div className="search">
    <Icon name="search" size={17} />
    <input {...props} type="search" placeholder={label} value={value} onChange={(event) => onChange(event.target.value)} />
  </div>}</Field>
}

export function PageList({ items, render, size = 8, label = 'results', empty = 'No results found.' }) {
  const [page, setPage] = useState(0)
  const count = Math.ceil(items.length / size)
  const index = Math.min(page, Math.max(0, count - 1))
  if (!items.length) return <p className="empty">{empty}</p>
  return <>
    {render(items.slice(index * size, (index + 1) * size))}
    {count > 1 && <div className="pagination" aria-label={label + ' pagination'}>
      <span>{index * size + 1}–{Math.min((index + 1) * size, items.length)} of {items.length} {label}</span>
      <div>
        <button className="secondary icon-button" aria-label={'Previous ' + label + ' page'} disabled={index === 0} onClick={() => setPage(index - 1)}><Icon name="left" size={16} /></button>
        <button className="secondary icon-button" aria-label={'Next ' + label + ' page'} disabled={index + 1 >= count} onClick={() => setPage(index + 1)}><Icon name="right" size={16} /></button>
      </div>
    </div>}
  </>
}

export function CancelButton({ label, description, onConfirm, focusAfterConfirm, children }) {
  const ref = useRef(null)
  const title = useId()
  const details = useId()
  return <>
    <button className="subtle" onClick={(event) => {
      event.currentTarget.focus()
      ref.current.showModal()
    }}>{label}</button>
    <dialog ref={ref} aria-labelledby={title} aria-describedby={details}>
      <h2 id={title}>{label}?</h2>
      <p id={details}>{description}</p>
      <div className="actions">
        <button className="secondary" autoFocus onClick={() => ref.current.close()}>Go back</button>
        <button className="danger" onClick={() => {
          ref.current.close()
          focusAfterConfirm.current?.focus()
          onConfirm()
        }}>{children}</button>
      </div>
    </dialog>
  </>
}
