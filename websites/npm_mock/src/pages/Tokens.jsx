import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { appendRecord, byId, created, newId, records, useStore } from '../store.jsx'
import {
  AppLink, Badge, Confirm, Copy, Empty, ErrorText, Heading, Icon, Info, Missing, Panel, Search, Select, Table, TextField,
  contains, dateLabel, labels, relativeDate, tokenPath, useAppNavigate,
} from '../ui.jsx'

const basePath = '/access-tokens'
const accessOptions = ['none', 'read-only', 'read-write']
const packageOptions = [...accessOptions, 'stage-only']
const canBypass = (permission) => permission === 'read-write' || permission === 'stage-only'
const values = (value) => Array.isArray(value) ? value : []
function statusOf(token) {
  if (token.status === 'revoked') return 'revoked'
  const expired = token.expiresAt && Date.parse(token.expiresAt) <= new Date().getTime()
  return token.status === 'expired' || expired ? 'expired' : 'active'
}

function accessSummary(access, isPackage = false) {
  if (!access?.permission || access.permission === 'none') return 'No access'
  const permission = labels[access.permission] || access.permission
  if (isPackage && access.selection === 'all') return permission + ' · All packages'
  const count = isPackage ? values(access.packageIds).length + values(access.scopes).length : values(access.organizationIds).length
  return permission + ' · ' + count + ' selected'
}

function revoke(commit, ids) {
  commit((world, actor) => {
    const tokens = records(world.tokens)
    if (!tokens.some(token => ids.includes(token.id) && token.status !== 'revoked')) return world
    return { ...world, tokens: tokens.map(token => ids.includes(token.id) && token.status !== 'revoked'
      ? { ...token, status: 'revoked', revokedAt: actor.at, revokedBy: actor.by } : token) }
  }, ids.length === 1 ? 'Access token revoked.' : 'Access tokens revoked.')
}

function RevokeDialog({ tokens, onClose, onConfirm }) {
  return <Confirm title={tokens.length === 1 ? 'Revoke access token?' : 'Revoke selected access tokens?'}
    action={tokens.length === 1 ? 'Revoke token' : 'Revoke tokens'} onClose={onClose} onConfirm={onConfirm}>
    <p>These credentials will lose access immediately.</p>
    <ul className="dialog-list">{tokens.map(token => <li key={token.id}>{token.name || 'Unnamed token'}</li>)}</ul>
  </Confirm>
}

export function TokenInventory() {
  const { world, commit } = useStore()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [picked, setPicked] = useState([])
  const [confirming, setConfirming] = useState(false)
  const tokens = records(world.tokens)
  const filtered = tokens.filter(token => contains(token.name, search) && (!status || statusOf(token) === status))
  const selectable = filtered.filter(token => statusOf(token) !== 'revoked')
  const selected = tokens.filter(token => picked.includes(token.id) && statusOf(token) !== 'revoked')
  const all = selectable.length > 0 && selectable.every(token => picked.includes(token.id))
  const columns = [
    ['selection', <input type="checkbox" aria-label="Select all visible tokens" checked={all} disabled={!selectable.length}
      onChange={event => {
        const visible = selectable.map(token => token.id)
        setPicked(event.target.checked ? [...new Set([...picked, ...visible])] : picked.filter(id => !visible.includes(id)))
      }} />], ['token', 'Token'], ['package', 'Package access'], ['org', 'Organization access'],
    ['created', 'Created'], ['expires', 'Expires'], ['status', 'Status'], ['used', 'Last used'],
  ]
  return <>
    <Heading title="Access Tokens" description="Manage granular credentials for packages and organizations.">
      <AppLink to={basePath + '/new'} className="button primary">Generate access token</AppLink>
    </Heading>
    <section className="inventory" aria-label="Access token inventory">
      <div className="filters">
        <Search label="Search tokens" placeholder="Search tokens by name" value={search} onChange={setSearch} />
        <Select label="Token status" hiddenLabel value={status} onChange={setStatus} options={[[ '', 'All statuses' ], 'active', 'expired', 'revoked']} />
      </div>
      <div className="list-meta">
        <span aria-live="polite">{filtered.length} {filtered.length === 1 ? 'token' : 'tokens'}</span>
        {selected.length > 0 && <div className="actions"><span>{selected.length} selected</span>
          <button className="button compact danger" type="button" onClick={() => setConfirming(true)}>Revoke selected</button>
          <button className="button compact" type="button" onClick={() => setPicked([])}>Clear selection</button>
        </div>}
      </div>
      {filtered.length ? <div className="list-surface"><Table label="Tokens table" headers={columns}>
        {filtered.map(token => <tr key={token.id}>
          <td><input type="checkbox" aria-label={'Select ' + (token.name || 'unnamed token')} checked={picked.includes(token.id)}
            disabled={statusOf(token) === 'revoked'} onChange={event => setPicked(toggle(picked, token.id, event.target.checked))} /></td>
          <td><AppLink className="row-main" to={tokenPath(token.id)}>{token.name || 'Unnamed token'}</AppLink>
            <code className="row-description nowrap">{token.maskedValue ?? '—'}</code></td>
          <td>{accessSummary(token.packages, true)}</td><td>{accessSummary(token.organizations)}</td>
          <td className="nowrap">{dateLabel(token.createdAt)}</td><td className="nowrap">{dateLabel(token.expiresAt)}</td>
          <td><Badge value={statusOf(token)} /></td><td className="nowrap">{relativeDate(token.lastUsedAt)}</td>
        </tr>)}
      </Table></div> : <Empty title={search || status ? 'No matching tokens' : 'No access tokens yet'}>
        {search || status ? 'Try a different name or status.' : <AppLink to={basePath + '/new'}>Generate an access token</AppLink>}
      </Empty>}
    </section>
    {confirming && selected.length > 0 && <RevokeDialog tokens={selected} onClose={() => setConfirming(false)} onConfirm={() => {
      revoke(commit, selected.map(token => token.id))
      setPicked([])
      setConfirming(false)
    }} />}
  </>
}

function tokenAccessDetails(token, world) {
  const packages = token.packages || {}
  const organizations = token.organizations || {}
  const packageNames = values(packages.packageIds).map(id => byId(world.packages, id)?.name || 'Unavailable package')
  const orgNames = values(organizations.organizationIds).map(id => {
    const org = byId(world.organizations, id)
    return org?.scope || org?.name || 'Unavailable organization'
  })
  return [
    ['Package permission', labels[packages.permission] || 'No access'],
    ['Packages', packages.selection === 'all' && packages.permission && packages.permission !== 'none' ? 'All packages' : packageNames.join(', ') || '—'],
    ['Scopes', values(packages.scopes).join(', ') || '—'],
    ['Organization permission', labels[organizations.permission] || 'No access'],
    ['Organizations', orgNames.join(', ') || '—'],
    ['Allowed CIDRs', values(token.allowedCidrs).join(', ') || 'Any network'],
    ['Bypass publishing 2FA', token.bypass2fa ? 'Enabled' : 'Disabled'],
  ]
}

export function TokenDetail() {
  const { world, commit } = useStore()
  const { tokenId } = useParams()
  const [confirming, setConfirming] = useState(false)
  const token = byId(world.tokens, tokenId)
  if (!token) return <Missing title="Token unavailable" to={basePath} label="Return to Access Tokens" />
  const status = statusOf(token)
  return <>
    <Heading title={token.name || 'Unnamed token'} description={token.description}>
      <Badge value={status} />
      {status !== 'revoked' && <button type="button" className="button danger" onClick={() => setConfirming(true)}>Revoke token</button>}
    </Heading>
    <Panel title="Token details"><Info entries={[
      ['Token value', <code>{token.maskedValue ?? '—'}</code>], ['Created', dateLabel(token.createdAt)], ['Expires', dateLabel(token.expiresAt)],
      ['Last used', relativeDate(token.lastUsedAt)], ...(status === 'revoked' ? [['Revoked', dateLabel(token.revokedAt)]] : []),
    ]} /></Panel>
    <Panel title="Permissions and restrictions"><Info entries={tokenAccessDetails(token, world)} /></Panel>
    {confirming && status !== 'revoked' && <RevokeDialog tokens={[token]} onClose={() => setConfirming(false)} onConfirm={() => {
      revoke(commit, [token.id])
      setConfirming(false)
    }} />}
  </>
}

function toggle(items, id, checked) {
  return checked ? [...new Set([...items, id])] : items.filter(item => item !== id)
}

function Options({ title, choices, selected, onChange, mono }) {
  return <fieldset>
    <legend>{title}</legend>
    {choices.length ? <div className="option-list">{choices.map(([id, name]) => <label className="check" key={id}>
      <input type="checkbox" checked={selected.includes(id)} onChange={event => onChange(toggle(selected, id, event.target.checked))} />
      <span className={mono ? 'mono' : undefined}>{name}</span>
    </label>)}</div> : <p className="muted">No options available.</p>}
  </fieldset>
}

function isCidr(value) {
  const [address, prefix, ...rest] = value.split('/')
  if (rest.length || !/^\d{1,3}$/.test(prefix ?? '')) return false
  if (address.includes(':')) {
    if (!/^[\da-f:.]+$/i.test(address) || Number(prefix) > 128) return false
    try { return Boolean(new URL('http://[' + address + ']/').hostname) }
    catch { return false }
  }
  const octets = address.split('.')
  return Number(prefix) <= 32 && octets.length === 4 && octets.every(part => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255)
}

const initialForm = {
  name: '', description: '', duration: '30', customDate: '', cidrs: '', packagePermission: 'none',
  selection: 'all', packageIds: [], scopes: [], orgPermission: 'none', organizationIds: [], bypass2fa: false,
}

function formRecord(form, world) {
  const name = form.name.trim()
  if (!name) return { error: 'Enter a token name.' }
  if (form.packagePermission === 'none' && form.orgPermission === 'none') return { error: 'Select at least one package or organization permission.' }
  const allowedCidrs = [...new Set(form.cidrs.trim().split(/[\s,]+/).filter(Boolean))]
  if (allowedCidrs.some(cidr => !isCidr(cidr))) return { error: 'Enter valid IPv4 or IPv6 CIDRs such as 192.0.2.0/24 or 2001:db8::/32.' }
  const now = new Date().getTime()
  const expiry = form.duration === 'custom' ? Date.parse(form.customDate + 'T23:59:59.999Z') : now + Number(form.duration) * 86400000
  if (!Number.isFinite(expiry) || expiry <= now || (form.duration === 'custom' && form.customDate <= new Date(now).toISOString().slice(0, 10))) {
    return { error: 'Choose a future expiration date.' }
  }
  const selection = form.packagePermission === 'none' ? 'none' : form.selection
  const packageIds = selection === 'selected' ? form.packageIds : []
  const scopes = selection === 'selected' ? form.scopes : []
  const organizationIds = form.orgPermission === 'none' ? [] : form.organizationIds
  if (selection === 'selected' && !packageIds.length && !scopes.length) return { error: 'Select at least one package or scope.' }
  if (packageIds.length + scopes.length > 50) return { error: 'Select up to 50 packages and scopes combined.' }
  if (form.orgPermission !== 'none' && !organizationIds.length) return { error: 'Select at least one organization.' }
  if (organizationIds.length > 50) return { error: 'Select up to 50 organizations.' }
  if (packageIds.some(id => !byId(world.packages, id)) || organizationIds.some(id => !byId(world.organizations, id)) ||
    scopes.some(scope => !tokenScopes(world).includes(scope))) return { error: 'Choose available packages, scopes, and organizations.' }
  return { record: {
    name, description: form.description.trim() || null, allowedCidrs,
    bypass2fa: canBypass(form.packagePermission) && form.bypass2fa,
    packages: { permission: form.packagePermission, selection, packageIds, scopes },
    organizations: { permission: form.orgPermission, organizationIds },
    expiresAt: new Date(expiry).toISOString(),
  } }
}

function tokenScopes(world) {
  return [...new Set([...(world.account.username ? ['@' + world.account.username] : []),
    ...records(world.organizations).map(org => org.scope), ...records(world.packages).map(pkg => pkg.scope)].filter(Boolean))].sort()
}

export function TokenForm() {
  const { world, commit } = useStore()
  const navigate = useAppNavigate()
  const [form, setForm] = useState(initialForm)
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const [issued, setIssued] = useState(null)
  const change = (key) => (value) => { setForm(current => ({ ...current, [key]: value })); setError('') }

  function generate() {
    if (issued || !review) return
    const id = newId('tok')
    const secret = 'sim_' + crypto.randomUUID().replaceAll('-', '')
    const next = commit((state, actor) => {
      if (Date.parse(review.expiresAt) <= Date.parse(actor.at)) return state
      return appendRecord(state, 'tokens', {
        ...review, id, maskedValue: secret.slice(0, 8) + '••••' + secret.slice(-4),
        status: 'active', lastUsedAt: null, revokedAt: null, revokedBy: null, ...created(actor),
      })
    })
    setReview(null)
    if (next) setIssued({ id, secret })
    else setError('Choose a future expiration date.')
  }

  if (issued) return <>
    <Heading title="Access token generated" description="Copy the value before leaving this page." />
    <Panel title="Token value" className="form-width">
      <div className="command"><code>{issued.secret}</code><Copy value={issued.secret} label="Copy token" /></div>
      <div className="actions">
        <AppLink className="button primary" to={tokenPath(issued.id)}>View token details</AppLink>
        <AppLink className="button" to={basePath}>Return to Access Tokens</AppLink>
      </div>
    </Panel>
  </>

  return <>
    <Heading title="Generate access token" description="Set an expiration date and choose what this token can access." />
    <form className="form-stack form-width" onSubmit={event => {
      event.preventDefault()
      const result = formRecord(form, world)
      if (result.error) setError(result.error)
      else setReview(result.record)
    }} noValidate>
      <Panel title="Token information">
        <TextField label="Token name" value={form.name} onChange={change('name')} maxLength={100} autoComplete="off" />
        <TextField label="Description (optional)" value={form.description} onChange={change('description')} maxLength={300} multiline />
        <div className="form-row">
          <Select label="Expiration" value={form.duration} onChange={change('duration')}
            options={[[ '7', '7 days' ], ['30', '30 days'], ['60', '60 days'], ['90', '90 days'], ['custom', 'Custom date']]} />
          {form.duration === 'custom' && <TextField label="Expiration date (UTC)" type="date" value={form.customDate} onChange={change('customDate')} />}
        </div>
        <TextField label="Allowed CIDRs (optional)" value={form.cidrs} onChange={change('cidrs')} placeholder="192.0.2.0/24, 2001:db8::/32" />
        <p className="muted">Separate network ranges with spaces or commas. Leave blank to allow any network.</p>
      </Panel>
      <Panel title="Packages and scopes">
        <Select label="Package permission" value={form.packagePermission} onChange={change('packagePermission')} options={packageOptions} />
        {form.packagePermission !== 'none' && <>
          <Select label="Package access" value={form.selection} onChange={change('selection')}
            options={[[ 'all', 'All packages' ], ['selected', 'Selected packages and scopes']]} />
          {form.selection === 'selected' && <>
            <Options title="Select packages" choices={records(world.packages).map(pkg => [pkg.id, pkg.name || 'Unnamed package'])}
              selected={form.packageIds} onChange={change('packageIds')} mono />
            <Options title="Select scopes" choices={tokenScopes(world).map(scope => [scope, scope])} selected={form.scopes} onChange={change('scopes')} mono />
            <p className="muted">{form.packageIds.length + form.scopes.length} of 50 selections</p>
          </>}
          {canBypass(form.packagePermission) && <label className="check"><input type="checkbox" checked={form.bypass2fa}
            onChange={event => change('bypass2fa')(event.target.checked)} />Bypass publishing 2FA</label>}
        </>}
      </Panel>
      <Panel title="Organizations">
        <Select label="Organization permission" value={form.orgPermission} onChange={change('orgPermission')} options={accessOptions} />
        {form.orgPermission !== 'none' && <>
          <Options title="Select organizations" choices={records(world.organizations).map(org => [org.id, org.scope || org.name || 'Unnamed organization'])}
            selected={form.organizationIds} onChange={change('organizationIds')} mono />
          <p className="muted">{form.organizationIds.length} of 50 selections</p>
        </>}
      </Panel>
      <ErrorText>{error}</ErrorText>
      <div className="actions"><button className="button primary">Review token</button>
        <button type="button" className="button" onClick={() => navigate(basePath)}>Cancel</button></div>
    </form>
    {review && <Confirm title="Review access token" action="Generate token" danger={false} onConfirm={generate} onClose={() => setReview(null)}>
      <strong>{review.name}</strong>
      {review.description && <p>{review.description}</p>}
      <Info entries={[[ 'Expires (UTC)', dateLabel(review.expiresAt) ], ...tokenAccessDetails(review, world)]} />
    </Confirm>}
  </>
}
