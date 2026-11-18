import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dateLabel, findProperty, label, list, normalizeProperty, removeProperty, saveProperty } from '../data/records'
import { Confirm, DetailFields, Dialog, Empty, Icon, Missing, PageHead, propertyPath, Status, typeLabel } from '../ui'

const methods = {
  dns_txt: ['DNS TXT record', 'Add this TXT record to the DNS records for the domain.', 'google-site-verification=console-northwind-demo'],
  html_file: ['HTML file', 'Place this verification file at the root of the property scope.', 'google-console-ownership-demo.html'],
  html_tag: ['HTML tag', 'Add this tag inside the homepage head element.', '<meta name="google-site-verification" content="console-demo">'],
}

export function Properties({ state, property, to, choose, openSheet }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const visible = list(state.properties).filter(p => p.status !== 'removed')
  const rows = visible.filter(p => (!type || p.type === type) && (!status || p.status === status)
    && label(p).toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <PageHead eyebrow="Account" title="Properties" description="Manage ownership and choose the site you want to work with."
      actions={<button className="primary" onClick={() => openSheet()}><Icon name="plus" />Add property</button>} />
    <section className="card report">
      <div className="section-heading"><div><h2>Account properties</h2><p>{visible.length} {visible.length === 1 ? 'property' : 'properties'}</p></div></div>
      <div className="toolbar">
        <label className="filter-label">Search properties<input type="search" placeholder="Domain or URL prefix" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <label className="filter-label">Property type<select value={type} onChange={e => setType(e.target.value)}><option value="">All types</option><option value="domain">Domain</option><option value="url_prefix">URL prefix</option></select></label>
        <label className="filter-label">Verification<select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="verified">Verified</option><option value="pending">Pending</option></select></label>
      </div>
      {rows.length ? <div className="table-scroll"><table>
        <thead><tr><th>Property</th><th>Type</th><th>Verification</th><th>Date added</th><th>Workspace</th></tr></thead>
        <tbody>{rows.map(p => <tr key={p.id}>
          <td>{p.status === 'pending' ? <button className="text-button mono" onClick={() => openSheet(p)}>{label(p)}</button>
            : <Link className="table-link mono" to={to(propertyPath(p))}>{label(p)}</Link>}</td>
          <td>{typeLabel(p.type)}</td><td><Status value={p.status} /></td><td>{dateLabel(p.createdAt)}</td>
          <td>{p.id === property?.id ? <span className="current-label"><Icon name="check" size={15} />Current</span>
            : p.status === 'pending' ? <button className="text-button" onClick={() => openSheet(p)}>Verify</button>
              : p.status === 'verified' ? <button className="text-button" onClick={() => choose(p)} aria-label={'Select ' + label(p)}>Select</button> : '—'}</td>
        </tr>)}</tbody>
      </table></div> : <Empty title={visible.length ? 'No matching properties' : 'No properties yet'}>{visible.length ? 'Change the search or filters.' : 'Add a domain or URL prefix to get started.'}</Empty>}
      <div className="table-footer">{rows.length} of {visible.length} properties</div>
    </section>
  </>
}

export function PropertySheet({ state, pending, close, commit, onSaved }) {
  const [type, setType] = useState(pending?.type || 'domain')
  const [input, setInput] = useState(pending ? label(pending) : '')
  const [siteUrl, setSiteUrl] = useState(pending?.siteUrl || '')
  const [method, setMethod] = useState(pending?.verificationMethod || (pending?.type === 'url_prefix' ? 'html_file' : 'dns_txt'))
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const allowedMethods = type === 'domain' ? ['dns_txt'] : ['html_file', 'html_tag']
  const selectedMethod = allowedMethods.includes(method) ? method : allowedMethods[0]
  const [, instructions, token] = methods[selectedMethod]

  const nextStep = event => {
    event.preventDefault()
    const scope = normalizeProperty(type, input)
    if (!scope) {
      setError(type === 'domain' ? 'Enter a domain such as example.com, without a protocol or path.' : 'Enter a full URL prefix without a query or fragment.')
      return
    }
    if (findProperty(state, type, scope)) { setError('This property is already in your account.'); return }
    setError('')
    setSiteUrl(scope)
  }
  const save = defer => {
    const result = saveProperty(state, { type, siteUrl, method: selectedMethod, pending: defer, verify: pending })
    if (!result) { setError('This property is already in your account.'); return }
    commit(result.state)
    onSaved(result.property)
  }
  return <Dialog sheet title={siteUrl ? 'Verify ownership' : 'Add property'} close={close}>
    {siteUrl ? <>
      <p className="target mono wrap">{label({ siteUrl })}</p>
      <label className="filter-label">Verification method<select value={selectedMethod} onChange={e => { setMethod(e.target.value); setCopied(false) }}>
        {allowedMethods.map(key => <option key={key} value={key}>{methods[key][0]}</option>)}
      </select></label>
      <p>{instructions}</p>
      <div className="verification-token"><code>{token}</code><button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(token); setCopied(true) } catch { setError('Select and copy the value directly.') }
      }}>{copied ? 'Copied' : 'Copy'}</button></div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button onClick={() => { if (pending) close(); else { setSiteUrl(''); setError(''); setCopied(false) } }}>{pending ? 'Cancel' : 'Back'}</button>
        {!pending && <button onClick={() => save(true)}>Verify later</button>}
        <button className="primary" onClick={() => save(false)}>Verify</button>
      </div>
    </> : <form onSubmit={nextStep} noValidate>
      <fieldset className="type-choices"><legend>Property type</legend>
        {[['domain', 'Domain', 'All protocols and subdomains.'], ['url_prefix', 'URL prefix', 'URLs under the specified origin and path.']].map(([key, title, info]) =>
          <label key={key} className={type === key ? 'chosen' : ''}><input type="radio" name="property-type" checked={type === key}
            onChange={() => { setType(key); setInput(''); setError('') }} /><span><strong>{title}</strong><small>{info}</small></span></label>)}
      </fieldset>
      <label className="filter-label">{type === 'domain' ? 'Domain' : 'URL prefix'}<input value={input} onChange={e => { setInput(e.target.value); setError('') }}
        placeholder={type === 'domain' ? 'example.com' : 'https://example.com/guides/'} aria-invalid={Boolean(error)} aria-describedby={error ? 'property-error' : undefined} /></label>
      {error && <p className="error" role="alert" id="property-error">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={close}>Cancel</button><button className="primary">Continue</button></div>
    </form>}
  </Dialog>
}

export function PropertyDetail({ target, property, to, go, commit, openSheet, setNotice }) {
  const [confirmation, setConfirmation] = useState(false)
  if (!target) return <Missing title="Property unavailable" path={to('/properties')}>Back to properties</Missing>
  const name = label(target)
  return <>
    <Link className="back-link" to={to('/properties', { property: property?.id })}><Icon name="back" />All properties</Link>
    <PageHead eyebrow="Property details" title={<span className="wrap">{name}</span>}
      actions={target.status === 'pending' ? <button className="primary" onClick={() => openSheet(target)}>Verify ownership</button>
        : <Link className="button primary" to={to('/', { property: target.id })}>Open overview <Icon name="arrow" /></Link>} />
    <section className="card padded">
      <h2>Property information</h2>
      <DetailFields rows={[
        ['Scope', <span className="mono wrap">{name}</span>], ['Type', typeLabel(target.type)],
        ['Verification', <Status value={target.status} />], ['Verification method', methods[target.verificationMethod]?.[0]],
        ['Permission', ({ siteOwner: 'Owner', siteUnverifiedUser: 'Unverified user' })[target.permissionLevel]],
        ['Date added', dateLabel(target.createdAt)], ['Verified on', dateLabel(target.verifiedAt)],
      ]} />
    </section>
    <section className="card padded management">
      <div><h2>Manage property</h2><p>Remove this property from your account.</p></div>
      <button className="danger-outline" onClick={() => setConfirmation(true)}>Remove property</button>
    </section>
    {confirmation && <Confirm title="Remove property" target={name} description="The property will be removed from your account’s property list."
      close={() => setConfirmation(false)} onConfirm={() => {
        commit(current => removeProperty(current, target))
        setConfirmation(false)
        setNotice('Property removed.')
        go(to('/properties'), { replace: true })
      }} />}
  </>
}
