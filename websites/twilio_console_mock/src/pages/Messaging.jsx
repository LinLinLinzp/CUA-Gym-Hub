import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { newSid, useWorkspace } from '../store.jsx'
import { AppLink, byId, Confirm, contains, display, Empty, Field, formatDate, httpUrl, label, List, Missing, Modal, Notice, Page, routeId, rows, smsCapable, Table, Toolbar, useCases, useForm, useRouteId, useSidNavigate } from '../ui.jsx'

const servicePath = (id) => '/messaging/services/' + routeId(id)
const cases = useCases.map((value) => [value, label(value)])
const filters = { query: '', useCase: '' }
const modes = [['defer_to_sender', 'Defer to sender'], ['webhook', 'Send to a webhook']]
const nameError = (name) => name ? undefined : 'Enter a friendly name.'
const caseError = (value) => useCases.includes(value) ? undefined : 'Choose a use case.'
const hasErrors = (errors) => Object.values(errors).some(Boolean)
const numberLabel = (number) => number.friendlyName && number.friendlyName !== number.phoneNumber
  ? number.friendlyName + ' · ' + (number.phoneNumber || number.id) : number.phoneNumber || number.id
const assigned = (state, id) => rows(state.messagingServices).some((item) => rows(item.senderNumberIds).includes(id))
const availableSenders = (state) => rows(state.phoneNumbers).filter((item) => smsCapable(item) && item.phoneNumber)
const serviceSender = (numberMap, service) => numberMap.get(rows(service?.senderNumberIds).find((id) => numberMap.has(id)))

export function Services() {
  const { state } = useWorkspace()
  const [filter, setFilter] = useState(filters)
  const [creating, setCreating] = useState(false)
  const all = rows(state.messagingServices)
  const items = all.filter((item) => (
    (!filter.useCase || item.useCase === filter.useCase) && (contains(item.friendlyName, filter.query) || contains(item.id, filter.query))
  )).sort((a, b) => display(a.friendlyName).localeCompare(display(b.friendlyName)))
  const clear = () => setFilter(filters)
  return <Page title="Messaging Services" description="Group senders and manage shared messaging settings." action={<button type="button" className="button primary" onClick={() => setCreating(true)}>Create Messaging Service</button>}>
    <section className="panel">
      <Toolbar count={items.length} clear={clear}>
        <Field label="Search services" type="search" placeholder="Service name or SID" value={filter.query} onChange={(event) => setFilter({ ...filter, query: event.target.value })} />
        <Field label="Use case" options={[[ '', 'All use cases' ], ...cases]} value={filter.useCase} onChange={(event) => setFilter({ ...filter, useCase: event.target.value })} />
      </Toolbar>
      <List key={JSON.stringify(filter)} headers={['Service name', 'Use case', 'Senders', 'Updated (UTC)']} items={items}
        empty={all.length ? <Empty title="No matching services" action={<button type="button" className="button secondary" onClick={clear}>Clear filters</button>} />
          : <Empty title="No Messaging Services" action={<button type="button" className="button secondary" onClick={() => setCreating(true)}>Create a service</button>} />}
        render={(item) => <tr key={item.id}>
          <td><AppLink className="inline-link" to={servicePath(item.id)}>{item.friendlyName || item.id}</AppLink><div className="mono muted">{item.id}</div></td>
          <td>{label(item.useCase)}</td><td>{rows(item.senderNumberIds).length}</td><td>{formatDate(item.updatedAt)}</td>
        </tr>} />
    </section>
    {creating && <CreateService onClose={() => setCreating(false)} />}
  </Page>
}

function CreateService({ onClose }) {
  const { mutate } = useWorkspace()
  const navigate = useSidNavigate()
  const { values, bind, setErrors } = useForm({ friendlyName: '', useCase: '' })
  const [invalid, setInvalid] = useState(false)
  function create(event) {
    event.preventDefault()
    const friendlyName = values.friendlyName.trim()
    const errors = { friendlyName: nameError(friendlyName), useCase: caseError(values.useCase) }
    setErrors(errors)
    setInvalid(hasErrors(errors))
    if (hasErrors(errors)) return
    const id = newSid('MG')
    mutate((previous, now, actor) => ({
      ...previous,
      messagingServices: [...previous.messagingServices, {
        id, friendlyName, useCase: values.useCase, senderNumberIds: [], inboundMode: 'defer_to_sender',
        inboundUrl: '', statusCallbackUrl: '', actorId: actor, createdAt: now, updatedAt: now, updatedBy: actor,
      }],
    }))
    onClose()
    navigate(servicePath(id), { state: { serviceCreated: true } })
  }
  return <Modal title="Create Messaging Service" onClose={onClose}>
    <form className="dialog-form" onSubmit={create} noValidate>
      {invalid && <Notice error>Review the highlighted fields.</Notice>}
      <Field label="Friendly name" {...bind('friendlyName')} data-initial-focus />
      <Field label="Use case" options={[[ '', 'Select use case' ], ...cases]} {...bind('useCase')} />
      <div className="actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Create service</button></div>
    </form>
  </Modal>
}

export function ServiceDetail() {
  const id = useRouteId()
  const { state } = useWorkspace()
  const service = byId(state.messagingServices, id)
  if (!service) return <Missing title="Service Details" to="/messaging/services" back="Messaging Services" />
  return <ServiceConfiguration key={id} service={service} />
}

function ServiceConfiguration({ service }) {
  const { state, mutate } = useWorkspace()
  const created = useLocation().state?.serviceCreated
  const [selected, setSelected] = useState('')
  const [removing, setRemoving] = useState(null)
  const [settingsResult, setSettingsResult] = useState(null)
  const [senderResult, setSenderResult] = useState(null)
  const { values, bind, setErrors } = useForm({
    friendlyName: service.friendlyName || '',
    useCase: service.useCase || '',
    inboundMode: service.inboundMode || 'defer_to_sender',
    inboundUrl: service.inboundUrl || '',
    statusCallbackUrl: service.statusCallbackUrl || '',
  })
  const pool = rows(service.senderNumberIds)
  const eligible = rows(state.phoneNumbers).filter((number) => smsCapable(number) && number.phoneNumber && !assigned(state, number.id))
  function updateService(change) {
    return mutate((previous, now, actor) => {
      const current = byId(previous.messagingServices, service.id)
      if (!current) return null
      const changes = change(previous, current)
      if (!changes) return null
      return {
        ...previous,
        messagingServices: previous.messagingServices.map((item) => item?.id === service.id
          ? { ...item, ...changes, updatedAt: now, updatedBy: actor } : item),
      }
    })
  }
  function save(event) {
    event.preventDefault()
    const friendlyName = values.friendlyName.trim()
    const inboundUrl = values.inboundMode === 'webhook' ? values.inboundUrl.trim() : ''
    const statusCallbackUrl = values.statusCallbackUrl.trim()
    const errors = {
      friendlyName: nameError(friendlyName), useCase: caseError(values.useCase),
      inboundUrl: values.inboundMode === 'webhook' && !httpUrl(inboundUrl) ? 'Enter a valid HTTP or HTTPS URL.' : undefined,
      statusCallbackUrl: statusCallbackUrl && !httpUrl(statusCallbackUrl) ? 'Enter a valid HTTP or HTTPS URL.' : undefined,
    }
    setErrors(errors)
    if (hasErrors(errors)) { setSettingsResult({ error: true, text: 'Review the highlighted fields.' }); return }
    const saved = updateService(() => ({
      friendlyName, useCase: values.useCase, inboundMode: values.inboundMode, inboundUrl, statusCallbackUrl,
    }))
    setSettingsResult(saved ? { text: 'Service settings saved.' } : { error: true, text: 'This service is no longer available.' })
  }
  function add(event) {
    event.preventDefault()
    const saved = updateService((previous, current) => {
      const number = byId(previous.phoneNumbers, selected)
      if (!number || !number.phoneNumber || !smsCapable(number) || assigned(previous, selected)) return null
      return { senderNumberIds: [...(current.senderNumberIds ?? []), selected] }
    })
    if (saved) setSelected('')
    setSenderResult(saved ? { text: 'Sender added.' } : { error: true, text: 'Choose an active SMS number that is available for assignment.' })
  }
  function remove() {
    const saved = updateService((_, current) => {
      const ids = rows(current.senderNumberIds)
      if (!ids.includes(removing.id)) return null
      return { senderNumberIds: ids.filter((id) => id !== removing.id) }
    })
    setRemoving(null)
    setSenderResult(saved ? { text: 'Sender removed.' } : { error: true, text: 'This sender is no longer in the pool.' })
  }
  return <Page title="Service Details" description={service.friendlyName || service.id} back={{ to: '/messaging/services', label: 'Messaging Services' }}>
    {created && <Notice>Messaging Service created. Add a sender to start sending messages.</Notice>}
    <section className="panel narrow">
      <div className="panel-head"><h2>Service overview</h2></div>
      <dl className="detail-grid">
        <div><dt>Messaging Service SID</dt><dd className="mono">{service.id}</dd></div>
        <div><dt>Updated (UTC)</dt><dd>{formatDate(service.updatedAt)}</dd></div>
      </dl>
    </section>
    <form className="detail-form narrow" onSubmit={save} noValidate>
      <section className="panel">
        <div className="panel-head"><h2>Settings</h2></div>
        <div className="form-layout form-pair"><Field label="Friendly name" {...bind('friendlyName')} /><Field label="Use case" options={[[ '', 'Select use case' ], ...cases]} {...bind('useCase')} /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Integration</h2></div>
        <div className="form-layout">
          <Field label="Inbound handling" options={modes} {...bind('inboundMode')} />
          {values.inboundMode === 'webhook' && <Field label="Inbound webhook URL" type="url" {...bind('inboundUrl')} />}
          <Field label="Delivery callback URL" type="url" hint="Optional" {...bind('statusCallbackUrl')} />
          {settingsResult && <Notice error={settingsResult.error}>{settingsResult.text}</Notice>}
          <div className="actions"><button type="submit" className="button primary">Save settings</button></div>
        </div>
      </section>
    </form>
    <section className="panel narrow">
      <div className="panel-head"><h2>Sender pool</h2></div>
      <form className="form-layout" onSubmit={add}>
        <div className="sender-form">
          <Field label="Available SMS numbers" value={selected} onChange={(event) => setSelected(event.target.value)}
            options={[[ '', eligible.length ? 'Choose a number' : 'No eligible numbers available' ], ...eligible.map((number) => [number.id, numberLabel(number)])]} />
          <button type="submit" className="button primary" disabled={!selected}>Add sender</button>
        </div>
        {senderResult && <Notice error={senderResult.error}>{senderResult.text}</Notice>}
      </form>
      {pool.length ? <Table headers={['Phone number', 'Friendly name', 'Action']}>
        {pool.map((id, index) => {
          const number = byId(state.phoneNumbers, id)
          return <tr key={id + '-' + index}>
            <td>{number ? <AppLink className="inline-link nowrap" to={'/numbers/' + routeId(id)}>{number.phoneNumber || id}</AppLink> : <span className="mono">{id}</span>}</td>
            <td>{number ? display(number.friendlyName) : 'Number unavailable'}</td>
            <td><button type="button" className="button secondary" onClick={() => setRemoving({ id, name: number?.phoneNumber || id })}>Remove sender</button></td>
          </tr>
        })}
      </Table> : <Empty title="No senders assigned" text="Choose an available SMS number to add it to this service." />}
    </section>
    {removing && <Confirm title={'Remove ' + removing.name + '?'} description="The number will be available to assign to another service." action="Confirm removal" danger
      onClose={() => setRemoving(null)} onConfirm={remove} />}
  </Page>
}

const gsmBasic = new Set('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà')
const gsmExtension = new Set('\f^{}\\[~]|€')
function segmentCount(body) {
  let units = 0
  for (const character of body) {
    if (gsmBasic.has(character)) units += 1
    else if (gsmExtension.has(character)) units += 2
    else return body.length <= 70 ? 1 : Math.ceil(body.length / 67)
  }
  return units <= 160 ? 1 : Math.ceil(units / 153)
}

export function SendSms() {
  const { state, mutate } = useWorkspace()
  const [type, setType] = useState('number')
  const [sent, setSent] = useState(null)
  const [notice, setNotice] = useState('')
  const { values, bind, setErrors, setValue } = useForm({ number: '', service: '', to: '', body: '' })
  const numbers = availableSenders(state)
  const numberMap = new Map(numbers.map((item) => [item.id, item]))
  const services = rows(state.messagingServices).filter((item) => serviceSender(numberMap, item))
  const ids = type === 'number' ? numbers : services
  function send(event) {
    event.preventDefault()
    const to = values.to.trim()
    const body = values.body
    const errors = {
      [type]: !ids.some((item) => item.id === values[type]) ? 'Choose an eligible sender.' : undefined,
      to: !/^\+[1-9]\d{1,14}$/.test(to) ? 'Enter a phone number in E.164 format, including the + and country code.' : undefined,
      body: !body.trim() ? 'Enter a message.' : undefined,
    }
    setErrors(errors)
    if (hasErrors(errors)) { setNotice('Review the highlighted fields.'); return }
    let message
    const saved = mutate((previous, now, actor) => {
      const service = type === 'service' ? byId(previous.messagingServices, values.service) : null
      const currentNumbers = new Map(availableSenders(previous).map((item) => [item.id, item]))
      const candidate = type === 'service' ? serviceSender(currentNumbers, service) : currentNumbers.get(values.number)
      if (!candidate) return null
      const status = service ? 'accepted' : 'queued'
      message = {
        id: newSid('SM'), direction: 'outbound', from: candidate.phoneNumber, to, body,
        phoneNumberId: candidate.id, serviceId: service?.id ?? null, status, segments: segmentCount(body),
        errorCode: null, errorMessage: null, deliverySteps: [{ status, occurredAt: now, detail: 'Message submitted locally' }],
        actorId: actor, createdAt: now,
      }
      return { ...previous, messages: [...previous.messages, message] }
    })
    setSent(saved ? message : null)
    setNotice(saved ? '' : 'The selected sender is no longer available.')
    if (saved) setValue('body', '')
  }
  const segmentHint = values.body ? segmentCount(values.body) + ' SMS segment(s)' : undefined
  return <Page title="Send an SMS" description="Submit a local message and inspect its delivery record.">
    <section className="panel narrow">
      <div className="panel-head"><h2>Compose message</h2></div>
      <form className="form-layout" onSubmit={send} noValidate>
        {sent && <Notice>Message {sent.status}. <AppLink className="inline-link" to={'/logs/messaging/' + routeId(sent.id)}>View message log</AppLink></Notice>}
        {notice && <Notice error>{notice}</Notice>}
        <Field label="Sender type" options={[[ 'number', 'Phone number' ], ['service', 'Messaging Service']]} value={type} onChange={(event) => setType(event.target.value)} />
        <Field key={type} label={type === 'number' ? 'From phone number' : 'Messaging Service'} {...bind(type)}
          options={[[ '', ids.length ? 'Select sender' : 'No eligible senders' ], ...ids.map((item) => [item.id, type === 'number' ? numberLabel(item) : item.friendlyName || item.id])]} />
        {!ids.length && <p><AppLink className="inline-link" to={type === 'number' ? '/numbers/buy' : '/messaging/services'}>{type === 'number' ? 'Find a number with SMS capability' : 'Assign a sender to a service'}</AppLink></p>}
        <Field label="To phone number" type="tel" placeholder="+12025550178" hint="E.164 format with country code" {...bind('to')} />
        <Field label="Message body" rows={5} hint={segmentHint} {...bind('body')} />
        <div className="actions"><button type="submit" className="button primary">Send SMS</button></div>
      </form>
    </section>
  </Page>
}
