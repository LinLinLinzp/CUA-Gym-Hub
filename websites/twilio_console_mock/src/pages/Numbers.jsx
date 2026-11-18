import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { newSid, useWorkspace } from '../store.jsx'
import { active, AppLink, Badge, byId, Confirm, contains, display, Empty, Field, httpUrl, label, List, Missing, Notice, Page, phoneMatches, routeId, rows, Toolbar, useForm, useRouteId, useSidNavigate } from '../ui.jsx'

const types = [['local', 'Local'], ['toll_free', 'Toll-free']]
const capabilities = [['voice', 'Voice'], ['sms', 'SMS'], ['mms', 'MMS']]
const methods = [['POST', 'HTTP POST'], ['GET', 'HTTP GET']]
const numberPath = (id) => '/numbers/' + routeId(id)
const servicePath = (id) => '/messaging/services/' + routeId(id)
const available = (item) => (item.status ?? 'available') === 'available'
const activeFilters = { query: '', type: '', capability: '', sort: 'number' }
const buyFilters = { country: '', type: '', digits: '', caps: [] }

function NumberType({ number }) {
  return <>{types.find(([key]) => key === number.type)?.[1] ?? label(number.type)}</>
}

function Capabilities({ values }) {
  const list = rows(values)
  return list.length ? <div className="tags">{list.map((value) => <span className="tag" key={value}>{capabilities.find(([key]) => key === value)?.[1] ?? label(value)}</span>)}</div> : '—'
}

function price(number) {
  if (number.monthlyPrice == null || number.monthlyPrice === '' || !Number.isFinite(Number(number.monthlyPrice))) return '—'
  return '$' + Number(number.monthlyPrice).toFixed(2) + ' ' + (number.currency || 'USD')
}

export function ActiveNumbers() {
  const { state } = useWorkspace()
  const releasedNumber = useLocation().state?.releasedNumber
  const [filter, setFilter] = useState(activeFilters)
  const bind = (key) => ({ value: filter[key], onChange: (event) => setFilter({ ...filter, [key]: event.target.value }) })
  const all = rows(state.phoneNumbers).filter(active)
  const items = all.filter((item) => (
    (!filter.type || item.type === filter.type) &&
    (!filter.capability || rows(item.capabilities).includes(filter.capability)) &&
    (phoneMatches(item.phoneNumber, filter.query) || contains(item.friendlyName, filter.query) || contains(item.id, filter.query))
  )).sort((a, b) => display(a[filter.sort === 'name' ? 'friendlyName' : 'phoneNumber']).localeCompare(display(b[filter.sort === 'name' ? 'friendlyName' : 'phoneNumber'])))
  const services = new Map()
  rows(state.messagingServices).forEach((service) => rows(service.senderNumberIds).forEach((id) => {
    if (!services.has(id)) services.set(id, service)
  }))
  const clear = () => setFilter(activeFilters)
  return <Page title="Active Numbers" description="Manage the phone numbers and routing in your account." action={<AppLink className="button primary" to="/numbers/buy">Buy a Number</AppLink>}>
    {releasedNumber && <Notice>{releasedNumber} was released.</Notice>}
    <section className="panel" aria-label="Active number inventory">
      <Toolbar count={items.length} clear={clear}>
        <Field label="Search numbers" type="search" placeholder="Number, name, or SID" {...bind('query')} />
        <Field label="Type" options={[[ '', 'All types' ], ...types]} {...bind('type')} />
        <Field label="Capability" options={[[ '', 'All capabilities' ], ...capabilities]} {...bind('capability')} />
        <Field label="Sort by" options={[[ 'number', 'Phone number' ], ['name', 'Friendly name']]} {...bind('sort')} />
      </Toolbar>
      <List key={JSON.stringify(filter)} headers={['Phone number', 'Friendly name', 'Location / type', 'Capabilities', 'Messaging service']} items={items}
        empty={all.length ? <Empty title="No matching numbers" action={<button className="button secondary" onClick={clear}>Clear filters</button>} />
          : <Empty title="No active numbers" action={<AppLink className="button secondary" to="/numbers/buy">Buy a Number</AppLink>} />}
        render={(item) => {
          const service = services.get(item.id)
          return <tr key={item.id}>
            <td><AppLink className="inline-link nowrap" to={numberPath(item.id)}>{display(item.phoneNumber)}</AppLink><div className="mono muted">{item.id}</div></td>
            <td>{display(item.friendlyName)}</td>
            <td>{display(item.locality)}<div className="muted"><NumberType number={item} /></div></td>
            <td><Capabilities values={item.capabilities} /></td>
            <td>{service ? <AppLink className="inline-link" to={servicePath(service.id)}>{service.friendlyName || service.id}</AppLink> : '—'}</td>
          </tr>
        }} />
    </section>
  </Page>
}

export function BuyNumber() {
  const { state, mutate } = useWorkspace()
  const [draft, setDraft] = useState(buyFilters)
  const [filter, setFilter] = useState(buyFilters)
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const bind = (key) => ({ value: draft[key], onChange: (event) => setDraft({ ...draft, [key]: event.target.value }) })
  const inventory = rows(state.availableNumbers).filter(available)
  const countries = [...new Set(inventory.map((item) => item.country).filter(Boolean))].sort()
  const items = inventory.filter((item) => (
    (!filter.country || item.country === filter.country) &&
    (!filter.type || item.type === filter.type) &&
    phoneMatches(item.phoneNumber, filter.digits) &&
    filter.caps.every((value) => rows(item.capabilities).includes(value))
  ))
  const clear = () => { setDraft(buyFilters); setFilter(buyFilters); setError('') }
  function purchase() {
    let record
    const saved = mutate((previous, now, actor) => {
      const item = byId(previous.availableNumbers, selected?.id)
      if (!item || !available(item) || !item.phoneNumber || rows(previous.phoneNumbers).some((number) => active(number) && number.phoneNumber === item.phoneNumber)) return null
      record = {
        id: newSid('PN'), inventoryId: item.id, phoneNumber: item.phoneNumber, friendlyName: item.phoneNumber,
        country: item.country ?? null, locality: item.locality ?? null, type: item.type ?? null,
        capabilities: rows(item.capabilities), monthlyPrice: item.monthlyPrice ?? null, currency: item.currency || 'USD',
        status: 'active', voiceUrl: '', voiceMethod: 'POST', smsUrl: '', smsMethod: 'POST',
        actorId: actor, createdAt: now, updatedAt: now, updatedBy: actor,
      }
      return {
        ...previous,
        phoneNumbers: [...previous.phoneNumbers, record],
        availableNumbers: previous.availableNumbers.map((number) => number?.id === item.id
          ? { ...number, status: 'purchased', purchasedNumberId: record.id, purchasedAt: now } : number),
      }
    })
    setSelected(null)
    if (saved) { setError(''); setResult(record) }
    else setError('This number is no longer available. Choose another number.')
  }
  return <Page title="Buy a Number" description="Find an available number by region, type, and capability.">
    {result && <Notice>{result.phoneNumber} was added to your account. <AppLink className="inline-link" to={numberPath(result.id)}>Configure number</AppLink></Notice>}
    {error && <Notice error>{error}</Notice>}
    <section className="panel" aria-label="Available number inventory">
      <form onSubmit={(event) => { event.preventDefault(); setFilter({ ...draft, digits: draft.digits.trim() }); setError('') }}>
        <Toolbar count={items.length} clear={clear} noun="available number">
          <Field label="Country" options={[[ '', 'All countries' ], ...countries.map((key) => [key, ({ US: 'United States', CA: 'Canada' })[key] || key])]} {...bind('country')} />
          <Field label="Type" options={[[ '', 'All types' ], ...types]} {...bind('type')} />
          <Field label="Area code or digits" type="search" placeholder="e.g. 415" {...bind('digits')} />
          <fieldset className="checks"><legend>Capabilities</legend>{capabilities.map(([value, name]) => <label key={value}>
            <input type="checkbox" checked={draft.caps.includes(value)} onChange={(event) => setDraft({ ...draft, caps: event.target.checked ? [...draft.caps, value] : draft.caps.filter((capability) => capability !== value) })} />{name}
          </label>)}</fieldset>
          <div><button className="button primary" type="submit">Search</button></div>
        </Toolbar>
      </form>
      <List key={JSON.stringify(filter)} headers={['Phone number', 'Location / type', 'Capabilities', 'Monthly price', 'Action']} items={items}
        empty={<Empty title={inventory.length ? 'No matching numbers' : 'No numbers available'} text={inventory.length ? 'Try a different area code or fewer capabilities.' : 'Browse the numbers already in your account.'}
          action={inventory.length ? <button className="button secondary" onClick={clear}>Clear filters</button> : <AppLink className="button secondary" to="/numbers">Active Numbers</AppLink>} />}
        render={(item) => <tr key={item.id}>
          <td className="nowrap"><strong>{display(item.phoneNumber)}</strong></td>
          <td>{display(item.locality)}<div className="muted"><NumberType number={item} /></div></td>
          <td><Capabilities values={item.capabilities} /></td><td className="nowrap">{price(item)}</td>
          <td><button type="button" className="button secondary" aria-label={'Buy ' + display(item.phoneNumber)} disabled={!item.phoneNumber} onClick={() => setSelected(item)}>Buy</button></td>
        </tr>} />
    </section>
    {selected && <Confirm title={'Buy ' + selected.phoneNumber + '?'} description={'Add this number to your account at ' + price(selected) + ' per month.'}
      action="Confirm purchase" onClose={() => setSelected(null)} onConfirm={purchase} />}
  </Page>
}

export function NumberDetail() {
  const id = useRouteId()
  const { state } = useWorkspace()
  const number = byId(state.phoneNumbers, id)
  if (!number) return <Missing title="Number Configuration" to="/numbers" back="Active Numbers" />
  return <NumberConfiguration key={id} number={number} />
}

function NumberConfiguration({ number }) {
  const { state, mutate } = useWorkspace()
  const navigate = useSidNavigate()
  const [confirm, setConfirm] = useState(false)
  const [result, setResult] = useState(null)
  const { values, bind, setErrors } = useForm({
    friendlyName: number.friendlyName || '', voiceUrl: number.voiceUrl || '', voiceMethod: number.voiceMethod || 'POST',
    smsUrl: number.smsUrl || '', smsMethod: number.smsMethod || 'POST',
  })
  const caps = rows(number.capabilities)
  const service = rows(state.messagingServices).find((item) => rows(item.senderNumberIds).includes(number.id))
  const editable = active(number)
  function save(event) {
    event.preventDefault()
    const friendlyName = values.friendlyName.trim()
    const voiceUrl = values.voiceUrl.trim()
    const smsUrl = values.smsUrl.trim()
    const errors = {}
    if (!friendlyName) errors.friendlyName = 'Enter a friendly name.'
    if (caps.includes('voice') && voiceUrl && !httpUrl(voiceUrl)) errors.voiceUrl = 'Enter a valid HTTP or HTTPS URL.'
    if (caps.includes('sms') && smsUrl && !httpUrl(smsUrl)) errors.smsUrl = 'Enter a valid HTTP or HTTPS URL.'
    setErrors(errors)
    if (Object.keys(errors).length) { setResult({ error: true, text: 'Review the highlighted fields.' }); return }
    const saved = mutate((previous, now, actor) => {
      const owned = byId(previous.phoneNumbers, number.id)
      if (!owned || !active(owned)) return null
      const changes = {
        friendlyName, voiceUrl: caps.includes('voice') ? voiceUrl : owned.voiceUrl ?? '',
        voiceMethod: caps.includes('voice') ? values.voiceMethod : owned.voiceMethod || 'POST',
        smsUrl: caps.includes('sms') ? smsUrl : owned.smsUrl ?? '',
        smsMethod: caps.includes('sms') ? values.smsMethod : owned.smsMethod || 'POST',
        updatedAt: now, updatedBy: actor,
      }
      return { ...previous, phoneNumbers: previous.phoneNumbers.map((item) => item?.id === number.id ? { ...item, ...changes } : item) }
    })
    setResult(saved ? { text: 'Number configuration saved.' } : { error: true, text: 'This number is no longer active.' })
  }
  function release() {
    const saved = mutate((previous, now, actor) => {
      const record = byId(previous.phoneNumbers, number.id)
      if (!record || !active(record)) return null
      return {
        ...previous,
        phoneNumbers: previous.phoneNumbers.map((item) => item?.id === number.id
          ? { ...item, status: 'released', releasedAt: now, releasedBy: actor, updatedAt: now, updatedBy: actor } : item),
        messagingServices: Array.isArray(previous.messagingServices) ? previous.messagingServices.map((item) => rows(item?.senderNumberIds).includes(number.id)
          ? { ...item, senderNumberIds: item.senderNumberIds.filter((id) => id !== number.id), updatedAt: now, updatedBy: actor } : item) : previous.messagingServices,
      }
    })
    setConfirm(false)
    if (saved) navigate('/numbers', { replace: true, state: { releasedNumber: number.phoneNumber || number.id } })
    else setResult({ error: true, text: 'This number is no longer active.' })
  }
  return <Page title="Number Configuration" description={display(number.phoneNumber)} back={{ to: '/numbers', label: 'Active Numbers' }}>
    {result && <Notice error={result.error}>{result.text}</Notice>}
    <section className="panel narrow">
      <div className="panel-head"><h2>Number details</h2><Badge value={number.status || 'active'} /></div>
      <dl className="detail-grid">
        <div><dt>Phone Number SID</dt><dd className="mono">{number.id}</dd></div>
        <div><dt>Location</dt><dd>{display(number.locality)}</dd></div>
        <div><dt>Type</dt><dd><NumberType number={number} /></dd></div>
        <div><dt>Capabilities</dt><dd><Capabilities values={number.capabilities} /></dd></div>
        <div><dt>Messaging service</dt><dd>{service ? <AppLink className="inline-link" to={servicePath(service.id)}>{service.friendlyName || service.id}</AppLink> : '—'}</dd></div>
      </dl>
    </section>
    <form className="detail-form narrow" onSubmit={save} noValidate>
      <section className="panel">
        <div className="panel-head"><h2>General settings</h2></div>
        <div className="form-layout"><Field label="Friendly name" {...bind('friendlyName')} disabled={!editable} /></div>
      </section>
      {caps.includes('voice') && <section className="panel">
        <div className="panel-head"><h2>Voice routing</h2></div>
        <div className="form-layout form-pair"><Field label="Voice webhook URL" type="url" {...bind('voiceUrl')} disabled={!editable} /><Field label="Voice webhook method" options={methods} {...bind('voiceMethod')} disabled={!editable} /></div>
      </section>}
      {caps.includes('sms') && <section className="panel">
        <div className="panel-head"><h2>SMS routing</h2></div>
        <div className="form-layout form-pair"><Field label="SMS webhook URL" type="url" {...bind('smsUrl')} disabled={!editable} /><Field label="SMS webhook method" options={methods} {...bind('smsMethod')} disabled={!editable} /></div>
      </section>}
      {editable && <div className="actions form-actions"><button type="submit" className="button primary">Save configuration</button><button type="button" className="button danger" onClick={() => setConfirm(true)}>Release number</button></div>}
    </form>
    {confirm && <Confirm title={'Release ' + (number.phoneNumber || number.id) + '?'} description="This removes the number from active inventory and all sender pools. Its historical messages stay in the logs."
      action="Confirm release" danger onClose={() => setConfirm(false)} onConfirm={release} />}
  </Page>
}
