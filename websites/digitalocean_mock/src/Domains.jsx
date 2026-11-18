import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { defaultNameServers, dnsTypes, isDomain, isHostLabel, normalizeDomain } from './data/catalog.js'
import { newId, useWorkspace } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import {
  Confirm, Field, FormActions, formValues, Heading, includes, invalid, labelOf, Missing, Modal,
  resourcePath, Search, Select, shown, SiteLink, Table,
} from './ui.jsx'

const base = '/networking/domains'
const detailPath = id => resourcePath(base, id)
const projectOptions = projects => projects.map(project => [project.id, project.name || project.id])

export function Domains() {
  const { world, commit } = useWorkspace()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [project, setProject] = useState('')
  const [adding, setAdding] = useState(false)
  const counts = new Map()
  for (const record of world.dnsRecords) counts.set(record.domainId, (counts.get(record.domainId) || 0) + 1)
  const rows = world.domains.filter(row => includes(search, row.name) && (!project || row.projectId === project))
  const filtered = Boolean(search || project)

  function create(event) {
    const form = event.currentTarget
    const values = formValues(event)
    const name = normalizeDomain(values.name)
    if (!isDomain(name)) return invalid(form, 'name', 'Enter an apex domain such as studio.example.')
    if (world.domains.some(row => row.name && normalizeDomain(row.name) === name)) {
      return invalid(form, 'name', 'This domain is already in your workspace.')
    }
    if (!world.projects.some(row => row.id === values.projectId)) return
    const createdAt = new Date().toISOString()
    const createdBy = world.account.id
    const domain = { id: newId('dom'), name, projectId: values.projectId, status: 'active', createdAt, createdBy }
    const records = defaultNameServers(domain.id, createdBy, createdAt, () => newId('dns'))
    commit({
      entityType: 'domain', entityId: domain.id, kind: 'created', createdAt,
      details: { projectId: domain.projectId, after: domain, recordIds: records.map(row => row.id) },
      changes: { domains: [...world.domains, domain], dnsRecords: [...world.dnsRecords, ...records] },
      message: `${name} was added.`,
    })
    setAdding(false)
    navigate(withSid(detailPath(domain.id)))
  }

  return <>
    <Heading title="Domains" subtitle="Manage DNS zones and their records across projects."
      action={<button type="button" className="primary" onClick={() => setAdding(true)}>Add Domain</button>} />
    <div className="filters">
      <Search label="Search domains" value={search} onChange={event => setSearch(event.target.value)} />
      <Select aria-label="Filter by project" options={projectOptions(world.projects)} placeholder="All projects" value={project} onChange={event => setProject(event.target.value)} />
      {filtered && <button type="button" onClick={() => { setSearch(''); setProject('') }}>Clear filters</button>}
    </div>
    <p className="results">{rows.length} of {world.domains.length} domains</p>
    <Table label="Domains" columns={['Domain', 'Project', 'DNS records']} rows={rows}
      empty={filtered ? 'No domains match these filters.' : 'Add a domain to manage its DNS records.'}
      renderRow={row => <>
        <td><SiteLink to={detailPath(row.id)}>{row.name || row.id}</SiteLink></td>
        <td>{labelOf(world.projects, row.projectId)}</td><td>{counts.get(row.id) || 0}</td>
      </>} />
    {adding && <Modal title="Add Domain" close={() => setAdding(false)} drawer>
      <form className="form" onSubmit={create}>
        <Field label="Domain name" hint="Enter an apex domain such as studio.example."><input name="name" required autoComplete="off" placeholder="studio.example" /></Field>
        <Field label="Project"><Select name="projectId" required defaultValue={world.projects[0]?.id || ''} placeholder="Choose a project" options={projectOptions(world.projects)} /></Field>
        {!world.projects.length && <p className="caution">A project is required to add a domain.</p>}
        <FormActions close={() => setAdding(false)} label="Add Domain" disabled={!world.projects.length} />
      </form>
    </Modal>}
  </>
}

export function DomainDetail() {
  const { id } = useParams()
  return <DomainView key={id} id={id} />
}

function DomainView({ id }) {
  const { world, commit } = useWorkspace()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [dialog, setDialog] = useState(null)
  const domain = world.domains.find(row => row.id === id)
  if (!domain) return <Missing title="Domain unavailable" to={base} label="Back to Domains" />
  const name = domain.name || domain.id
  const records = world.dnsRecords.filter(row => row.domainId === id)
  const rows = records.filter(row => (!type || row.type === type) && includes(search, row.name, row.data))
  const close = () => setDialog(null)

  function saveRecord(values, existing) {
    const createdAt = new Date().toISOString()
    const record = existing
      ? { id: existing.id, domainId: id, type: existing.type, createdBy: existing.createdBy, createdAt: existing.createdAt, ...values, updatedAt: createdAt }
      : { id: newId('dns'), domainId: id, ...values, createdAt, createdBy: world.account.id }
    const dnsRecords = existing
      ? world.dnsRecords.map(row => row.id === record.id ? record : row)
      : [...world.dnsRecords, record]
    commit({
      entityType: 'dns_record', entityId: record.id, kind: existing ? 'updated' : 'created', createdAt,
      details: { domainId: id, ...(existing && { before: existing }), after: record },
      changes: { dnsRecords }, message: `${record.type} record ${existing ? 'updated' : 'created'}.`,
    })
    close()
  }

  function removeRecord(record) {
    commit({
      entityType: 'dns_record', entityId: record.id, kind: 'deleted', createdAt: new Date().toISOString(),
      details: { domainId: id, before: record },
      changes: { dnsRecords: world.dnsRecords.filter(row => row.id !== record.id) },
      message: `${record.type || 'DNS'} record deleted.`,
    })
    close()
  }

  function removeDomain() {
    commit({
      entityType: 'domain', entityId: id, kind: 'deleted', createdAt: new Date().toISOString(),
      details: { projectId: domain.projectId, before: domain, recordIds: records.map(row => row.id) },
      changes: { domains: world.domains.filter(row => row.id !== id), dnsRecords: world.dnsRecords.filter(row => row.domainId !== id) },
      message: `${name} was removed.`,
    })
    navigate(withSid(base))
  }

  return <>
    <Heading title={name} subtitle={labelOf(world.projects, domain.projectId)} back={[base, 'Domains']}
      action={<button type="button" className="primary" onClick={() => setDialog({ kind: 'add' })}>Add DNS Record</button>} />
    <section>
      <div className="section-heading"><h2>DNS records</h2><button type="button" className="compact destructive-link" onClick={() => setDialog({ kind: 'domain' })}>Remove Domain</button></div>
      <div className="filters">
        <Search label="Search by hostname or value" value={search} onChange={event => setSearch(event.target.value)} />
        <Select aria-label="Filter by record type" options={dnsTypes.map(value => [value, value])} placeholder="All record types" value={type} onChange={event => setType(event.target.value)} />
        {(search || type) && <button type="button" onClick={() => { setSearch(''); setType('') }}>Clear filters</button>}
      </div>
      <p className="results">{rows.length} of {records.length} records</p>
      <Table label="DNS records" columns={['Type', 'Hostname', 'Value', 'TTL (seconds)', 'Options', 'Actions']} rows={rows}
        empty={search || type ? 'No DNS records match these filters.' : 'Add a DNS record to configure this zone.'}
        renderRow={row => <>
          <td><strong>{shown(row.type)}</strong></td><td className="mono">{shown(row.name)}</td>
          <td className="mono dns-value">{shown(row.data)}</td><td>{shown(row.ttl)}</td>
          <td className="dns-options">{recordOptions(row)}</td>
          <td><div className="row-actions">
            <button type="button" onClick={() => setDialog({ kind: 'edit', row })} aria-label={`Edit ${row.type || 'DNS'} record ${row.name || row.id}`}>Edit</button>
            <button type="button" className="destructive-link" onClick={() => setDialog({ kind: 'delete', row })} aria-label={`Delete ${row.type || 'DNS'} record ${row.name || row.id}`}>Delete</button>
          </div></td>
        </>} />
    </section>
    {(dialog?.kind === 'add' || dialog?.kind === 'edit') && <RecordDialog key={dialog.row?.id || 'new'} existing={dialog.row} domain={domain} close={close} save={saveRecord} />}
    {dialog?.kind === 'domain' && <Confirm title="Remove Domain" name={name} close={close} onConfirm={removeDomain}>
      <p>Remove <strong>{name}</strong> and all {records.length} DNS records in this zone.</p>
    </Confirm>}
    {dialog?.kind === 'delete' && <Confirm title="Delete DNS Record" name={name} close={close} onConfirm={() => removeRecord(dialog.row)}>
      <p>Delete the <strong>{dialog.row.type} {dialog.row.name}</strong> record pointing to <code>{shown(dialog.row.data)}</code>.</p>
    </Confirm>}
  </>
}

function recordOptions(record) {
  const labels = { priority: 'Priority', weight: 'Weight', port: 'Port', flags: 'Flags', tag: 'Tag' }
  return Object.entries(labels).filter(([key]) => record[key] != null)
    .map(([key, label]) => `${label} ${record[key]}`).join(' · ') || '—'
}

const isIpv4 = value => /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) &&
  value.split('.').every(octet => Number(octet) <= 255)

function isIpv6(value) {
  if (!value.includes(':') || !/^[0-9a-f:.]+$/i.test(value)) return false
  try { return new URL(`http://[${value}]`).hostname.startsWith('[') }
  catch { return false }
}

function validOwner(name, type) {
  if (type === 'SRV') {
    const [service, protocol, ...tail] = name.split('.')
    return name.length <= 253 && service.startsWith('_') && isHostLabel(service.slice(1)) &&
      Boolean(protocol?.startsWith('_')) && isHostLabel(protocol.slice(1)) && tail.every(isHostLabel)
  }
  if (name === '@') return true
  const labels = name.split('.')
  if (labels[0] === '*' && type !== 'NS') labels.shift()
  return name.length <= 253 && labels.every(part =>
    isHostLabel(part) || (/^_/.test(part) && ['TXT', 'CNAME'].includes(type) && isHostLabel(part.slice(1)))
  )
}

const valueLabels = {
  A: 'IPv4 address', AAAA: 'IPv6 address', CNAME: 'Target hostname', MX: 'Mail server',
  TXT: 'Text value', NS: 'Name server', SRV: 'Target hostname', CAA: 'CAA value',
}
const valueHints = {
  A: 'Example 192.0.2.24', AAAA: 'Example 2001:db8::24', CNAME: 'Example app.example.',
  MX: 'Example mail.example.', NS: 'Example ns1.example.', SRV: 'Example voice.example.',
  CAA: 'Enter the issuer domain or reporting address for the selected tag.',
}

function validCaa(value, tag) {
  if (tag === 'issue' || tag === 'issuewild') {
    const [issuer, ...parameters] = value.split(';').map(part => part.trim())
    return (issuer ? isDomain(normalizeDomain(issuer)) : parameters.length > 0) &&
      parameters.every(parameter => !parameter || /^[a-z\d-]+=[^;]+$/i.test(parameter))
  }
  if (tag === 'iodef') {
    try {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) ? Boolean(url.hostname) :
        url.protocol === 'mailto:' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(url.pathname)
    } catch { return false }
  }
  if (tag === 'contactemail') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
  return tag === 'contactphone' && /^\+?[\d(). -]{5,}$/.test(value) && /\d{5}/.test(value.replace(/\D/g, ''))
}

function RecordDialog({ domain, existing, close, save }) {
  const [type, setType] = useState(existing?.type || 'A')
  const [hostname, setHostname] = useState(existing?.name ?? '@')
  const [ttl, setTtl] = useState(existing?.ttl ?? 3600)

  function chooseType(next) {
    if (next === 'SRV' && hostname === '@') setHostname('')
    if (type === 'SRV' && !hostname) setHostname('@')
    setType(next)
  }

  return <Modal title={existing ? 'Edit DNS Record' : 'Add DNS Record'} close={close} drawer>
    <Field label="Record type"><Select options={dnsTypes.map(value => [value, value])} value={type}
      disabled={Boolean(existing)} onChange={event => chooseType(event.target.value)} /></Field>
    <RecordForm key={type} type={type} domain={domain} existing={existing} close={close} save={save}
      hostname={hostname} setHostname={setHostname} ttl={ttl} setTtl={setTtl} />
  </Modal>
}

function RecordForm({ type, domain, existing, close, save, hostname, setHostname, ttl, setTtl }) {
  const { world } = useWorkspace()
  const [dropletId, setDropletId] = useState(existing?.dropletId || '')
  const [data, setData] = useState(existing?.data || '')
  const eligible = world.droplets.filter(row => row.projectId === domain.projectId && isIpv4(row.ipv4))
  const selected = eligible.find(row => row.id === dropletId)

  function submit(event) {
    const form = event.currentTarget
    const values = formValues(event)
    const name = normalizeDomain(values.name)
    const value = type === 'TXT' ? values.data : values.data.trim()
    const ttlSeconds = Number(values.ttl)
    if (!dnsTypes.includes(type)) return
    if (!validOwner(name, type)) return invalid(form, 'name', type === 'SRV' ? 'Use a service and protocol such as _sip._tcp.' : 'Enter a valid DNS hostname, wildcard, or @ for the apex.')
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 2147483647) return invalid(form, 'ttl', 'Enter a positive whole number of seconds.')
    if (type === 'A' && !isIpv4(value)) return invalid(form, 'data', 'Enter a valid IPv4 address.')
    if (type === 'AAAA' && !isIpv6(value)) return invalid(form, 'data', 'Enter a valid IPv6 address.')
    const nullTarget = value === '.' && (type === 'SRV' || (type === 'MX' && Number(values.priority) === 0))
    if (['CNAME', 'MX', 'NS', 'SRV'].includes(type) && !nullTarget && !isDomain(normalizeDomain(value))) {
      return invalid(form, 'data', 'Enter a fully qualified hostname.')
    }
    if (!value.trim()) return invalid(form, 'data', 'Enter a value for this record.')
    if (type === 'CAA' && !validCaa(value, values.tag)) return invalid(form, 'data', 'Enter a valid value for the selected CAA tag.')
    const extra = {}
    if (type === 'A' && dropletId) extra.dropletId = dropletId
    if (type === 'MX' || type === 'SRV') extra.priority = Number(values.priority)
    if (type === 'SRV') { extra.weight = Number(values.weight); extra.port = Number(values.port) }
    if (type === 'CAA') { extra.flags = Number(values.flags); extra.tag = values.tag }
    save({ type, name, data: value, ttl: ttlSeconds, ...extra }, existing)
  }

  return <form className="form" onSubmit={submit}>
    <Field label="Hostname" hint={type === 'SRV' ? 'Example _sip._tcp' : 'Use @ for the zone apex.'}>
      <input name="name" required value={hostname} onChange={event => setHostname(event.target.value)} autoComplete="off" />
    </Field>
    {type === 'A' && eligible.length > 0 && <Field label="Target Droplet">
      <Select value={selected?.id || ''} placeholder="Enter an IPv4 address"
        options={eligible.map(row => [row.id, `${row.name || row.id} · ${row.ipv4}`])}
        onChange={event => {
          const chosen = eligible.find(row => row.id === event.target.value)
          setDropletId(chosen?.id || '')
          if (chosen) setData(chosen.ipv4)
        }} />
    </Field>}
    <Field label={valueLabels[type] || 'Value'} hint={valueHints[type]}>
      {type === 'TXT'
        ? <textarea name="data" required rows={3} value={data} onChange={event => setData(event.target.value)} />
        : <input name="data" required value={data} onChange={event => { setData(event.target.value); setDropletId('') }} autoComplete="off" />}
    </Field>
    <div className="form-grid">
      <Field label="TTL (seconds)"><input name="ttl" type="number" min="1" max="2147483647" step="1" required value={ttl} onChange={event => setTtl(event.target.value)} /></Field>
      {(type === 'MX' || type === 'SRV') && <NumberField name="priority" label="Priority" value={existing?.priority ?? 10} />}
      {type === 'SRV' && <>
        <NumberField name="weight" label="Weight" value={existing?.weight ?? 5} />
        <NumberField name="port" label="Port" value={existing?.port ?? 5060} />
      </>}
      {type === 'CAA' && <>
        <NumberField name="flags" label="Flags" value={existing?.flags ?? 0} max={255} />
        <Field label="Tag"><Select name="tag" defaultValue={existing?.tag || 'issue'} options={ [['issue', 'issue'], ['issuewild', 'issuewild'], ['iodef', 'iodef'], ['contactemail', 'contactemail'], ['contactphone', 'contactphone']] } required /></Field>
      </>}
    </div>
    <FormActions close={close} label={existing ? 'Save Record' : 'Create Record'} disabled={!dnsTypes.includes(type)} />
  </form>
}

function NumberField({ name, label, value, max = 65535 }) {
  return <Field label={label}><input name={name} type="number" required min="0" max={max} step="1" defaultValue={value} /></Field>
}
