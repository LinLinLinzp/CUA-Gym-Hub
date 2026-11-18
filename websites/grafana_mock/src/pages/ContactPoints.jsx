import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useWorkspace, SiteLink, rows, find, text, fold, uid, upsert,
  without, deletion, revisions, rulePath,
} from '../workspace.jsx'
import { Confirm, Dialog, Empty, Field, Menu, PageHead, SaveBar, Section } from '../ui.jsx'

const types = { email: 'Email', slack: 'Slack', webhook: 'Webhook' }
const integrationLabel = (type) => Object.hasOwn(types, type) ? types[type] : 'Unknown integration'
const usesPoint = (rules, pointId) => rows(rules).filter((rule) => rule.contactPointId === pointId)

function destination(integration) {
  const { type, settings } = integration
  if (type === 'email') return rows(settings?.addresses).join(', ') || 'No addresses configured'
  if (type === 'slack') return settings?.channel || 'No channel configured'
  if (type === 'webhook') return [settings?.method, settings?.url].filter(Boolean).join(' ') || 'No URL configured'
  return 'Destination unavailable'
}

export function ContactPoints() {
  const { state, mutate, notify } = useWorkspace()
  const [params] = useSearchParams()
  const selected = params.get('point')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [testing, setTesting] = useState(null)
  const points = rows(state.contactPoints).filter((point) => {
    const integrations = rows(point.integrations)
    return (!selected || point.id === selected) && (!type || integrations.some((item) => item.type === type))
      && fold([point.name, ...integrations.map((item) => integrationLabel(item.type) + ' ' + destination(item))].join(' ')).includes(fold(search))
  }).sort((a, b) => text(a.name).localeCompare(text(b.name)))
  const dependents = deleting ? usesPoint(state.alertRules, deleting.id) : []
  const filtered = Boolean(search || type || selected)

  function remove() {
    const saved = mutate((latest, stamp) => {
      const point = find(latest.contactPoints, deleting.id)
      if (!point || usesPoint(latest.alertRules, point.id).length) return latest
      return { ...latest, contactPoints: without(latest.contactPoints, point.id), activity: deletion(latest, 'contact_point', point, stamp) }
    }, 'Contact point deleted.')
    if (saved) setDeleting(null)
    else notify('The contact point could not be deleted.', true)
  }
  if (editor) return <ContactEditor before={editor.point} close={() => setEditor(null)} saved={() => {
    setEditor(null)
    setSearch('')
    setType('')
  }} />
  return <>
    <PageHead title="Contact points" subtitle="Manage destinations for alert notifications and inspect which rules use them."
      actions={<button className="primary" onClick={() => setEditor({})}>+ New contact point</button>} />
    {selected && <div className="breadcrumb">Selected contact point <SiteLink to="/alerting/notifications">Show all contact points</SiteLink></div>}
    <div className="toolbar">
      <div className="search"><Field label="Search contact points"><input type="search" placeholder="Search by name or destination" value={search} onChange={(event) => setSearch(event.target.value)} /></Field></div>
      <Field label="Integration type"><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All integrations</option>
        {Object.entries(types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></Field>
      {(search || type) && <button onClick={() => { setSearch(''); setType('') }}>Clear filters</button>}
    </div>
    <div className="list-heading"><h2>Destinations</h2><span className="count">{points.length}</span></div>
    {points.length ? <div className="contact-list">
      {points.map((point) => {
        const usage = usesPoint(state.alertRules, point.id).length
        const integrations = rows(point.integrations)
        return <article className="surface contact-row" key={point.id}>
          <h3>{point.name || 'Untitled contact point'}</h3>
          {integrations.length ? <ul>{integrations.map((item) => <li key={item.id}><strong>{integrationLabel(item.type)}</strong> <span className="muted">{destination(item)}</span></li>)}</ul>
            : <p>No integrations configured</p>}
          <SiteLink to={'/alerting/list?contactPoint=' + encodeURIComponent(point.id)}>{usage} {usage === 1 ? 'rule' : 'rules'}</SiteLink>
          <Menu label={'Actions for ' + (point.name || 'contact point')}>
            <button onClick={() => setEditor({ point })}>Edit contact point</button>
            <button disabled={!integrations.some((item) => Object.hasOwn(types, item.type))} onClick={() => setTesting(point)}>Send test notification</button>
            <button onClick={() => setDeleting(point)}>Delete contact point</button>
          </Menu>
        </article>
      })}
    </div> : <Empty title={filtered ? 'No matching contact points' : 'No contact points yet'}
      detail={filtered ? 'Try changing the filters.' : 'Add a destination for alert notifications.'}
      action={filtered ? undefined : <button onClick={() => setEditor({})}>Create a contact point</button>} />}
    {deleting && (dependents.length ? <Dialog title="Contact point is in use" close={() => setDeleting(null)}>
      <p>Change the notification destination in the following rules before deleting this contact point.</p>
      <ul>{dependents.map((rule) => <li key={rule.id}><SiteLink to={rulePath(rule.id)}>{rule.name || rule.id}</SiteLink></li>)}</ul>
      <div className="actions end"><button onClick={() => setDeleting(null)} autoFocus>Close</button></div>
    </Dialog> : <Confirm title="Delete contact point?" label="Delete contact point" close={() => setDeleting(null)} confirm={remove}>
      <p>{deleting.name || 'This contact point'} will be removed from the workspace.</p>
    </Confirm>)}
    {testing && <TestNotification point={testing} close={() => setTesting(null)} />}
  </>
}

function integrationDraft(item) {
  return {
    id: item?.id ?? uid('int'), type: item?.type || 'email', disableResolveMessage: Boolean(item?.disableResolveMessage),
    addresses: rows(item?.settings?.addresses).join(', '), channel: text(item?.settings?.channel), url: text(item?.settings?.url),
    method: item?.settings?.method || 'POST',
  }
}
const addressesOf = (value) => [...new Set(value.split(/[\s,;]+/).filter(Boolean))]
function validUrl(value) {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname)
  } catch { return false }
}

function integrationErrors(item) {
  const error = {}
  if (!Object.hasOwn(types, item.type)) error.type = 'Select an integration type.'
  if (item.type === 'email') {
    const addresses = addressesOf(item.addresses)
    if (!addresses.length || addresses.some((value) => !/^[^\s@]+@[^\s@.][^\s@]*\.[^\s@.]+$/.test(value))) {
      error.addresses = 'Enter valid email addresses, separated by commas or spaces.'
    }
  }
  if (item.type === 'slack' && !/^#?[\w-]+$/.test(item.channel.trim())) error.channel = 'Enter a channel name, such as #on-call.'
  if (item.type === 'webhook' || item.type === 'slack') {
    if (!validUrl(item.url.trim())) error.url = 'Enter a valid HTTP or HTTPS URL.'
  }
  if (item.type === 'webhook' && !['POST', 'PUT'].includes(item.method)) error.method = 'Select POST or PUT.'
  return error
}

function saveIntegration(item, previous) {
  const settings = { ...previous?.settings }
  if (previous && previous.type !== item.type) {
    for (const key of ['addresses', 'channel', 'url', 'method']) delete settings[key]
  }
  if (item.type === 'email') settings.addresses = addressesOf(item.addresses)
  if (item.type === 'slack') settings.channel = item.channel.trim()
  if (item.type !== 'email') settings.url = item.url.trim()
  if (item.type === 'webhook') settings.method = item.method
  return { ...previous, id: item.id, type: item.type, disableResolveMessage: item.disableResolveMessage, settings }
}

function ContactEditor({ before, close, saved }) {
  const { state, mutate } = useWorkspace()
  const [name, setName] = useState(text(before?.name))
  const [integrations, setIntegrations] = useState(() => before ? rows(before.integrations).map(integrationDraft) : [integrationDraft()])
  const [errors, setErrors] = useState({})
  function edit(id, key, value) {
    setIntegrations((previous) => previous.map((item) => item.id === id ? { ...item, [key]: value } : item))
    setErrors((previous) => ({ ...previous, [id]: key === 'type' ? {} : { ...previous[id], [key]: undefined } }))
  }
  function save(event) {
    event.preventDefault()
    const normalizedName = name.trim()
    const next = {}
    if (!normalizedName) next.name = 'Enter a contact point name.'
    else if (rows(state.contactPoints).some((point) => point.id !== before?.id && fold(point.name) === fold(name))) next.name = 'This contact point name is already in use.'
    if (!integrations.length) next.integrations = 'Add at least one integration.'
    integrations.forEach((item) => {
      const errors = integrationErrors(item)
      if (Object.keys(errors).length) next[item.id] = errors
    })
    if (Object.keys(next).length) return setErrors(next)
    const done = mutate((latest, stamp) => {
      const previous = find(latest.contactPoints, before?.id)
      if (before && !previous) return latest
      const point = {
        ...previous, id: previous?.id ?? uid('cp'), name: normalizedName,
        integrations: integrations.map((item) => saveIntegration(item, find(previous?.integrations, item.id))),
        ...revisions(previous, stamp),
      }
      return { ...latest, contactPoints: upsert(latest.contactPoints, point) }
    }, before ? 'Contact point updated.' : 'Contact point created.')
    if (done) saved()
    else setErrors({ form: 'The contact point could not be saved.' })
  }
  return <>
    <nav className="breadcrumb" aria-label="Breadcrumb"><button type="button" className="text-button" onClick={close}>Contact points</button></nav>
    <PageHead title={before ? 'Edit contact point' : 'New contact point'} />
    <form className="editor" onSubmit={save} noValidate>
      <Section title="Contact point details"><Field label="Name" error={errors.name}>
        <input value={name} autoFocus onChange={(event) => { setName(event.target.value); setErrors((previous) => ({ ...previous, name: undefined })) }} />
      </Field></Section>
      <Section title="Integrations"><div className="fields">
        {integrations.map((item, index) => {
          const error = errors[item.id] || {}
          const change = (key) => (event) => edit(item.id, key, event.target.value)
          return <div className="fields integration" key={item.id} role="group" aria-label={'Integration ' + (index + 1)}>
            <div className="integration-head"><h3>Integration {index + 1}</h3>
              <button type="button" onClick={() => setIntegrations((previous) => without(previous, item.id))}>Remove integration</button></div>
            <Field label="Integration type" error={error.type}><select value={item.type} onChange={change('type')}>
              {!Object.hasOwn(types, item.type) && <option value={item.type}>Unavailable integration type</option>}
              {Object.entries(types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></Field>
            {item.type === 'email' && <Field label="Email addresses" error={error.addresses}>
              <input value={item.addresses} placeholder="on-call@example.test" onChange={change('addresses')} />
            </Field>}
            {item.type === 'slack' && <Field label="Channel" error={error.channel}>
              <input value={item.channel} placeholder="#on-call" onChange={change('channel')} />
            </Field>}
            {['slack', 'webhook'].includes(item.type) && <Field label="Webhook URL" error={error.url}>
              <input type="url" value={item.url} placeholder="https://hooks.example.test/alerts" onChange={change('url')} />
            </Field>}
            {item.type === 'webhook' && <Field label="HTTP method" error={error.method}><select value={item.method} onChange={change('method')}>
              {!['POST', 'PUT'].includes(item.method) && <option value={item.method}>Unavailable method</option>}
              <option>POST</option><option>PUT</option>
            </select></Field>}
            <label className="check"><input type="checkbox" role="switch" checked={item.disableResolveMessage}
              onChange={(event) => edit(item.id, 'disableResolveMessage', event.target.checked)} /> Disable resolved message</label>
          </div>
        })}
        {errors.integrations && <p role="alert" className="field-error">{errors.integrations}</p>}
        <div className="actions"><button type="button" onClick={() => {
          setIntegrations((previous) => [...previous, integrationDraft()])
          setErrors((previous) => ({ ...previous, integrations: undefined }))
        }}>+ Add integration</button></div>
      </div></Section>
      {errors.form && <p role="alert" className="field-error">{errors.form}</p>}
      <SaveBar label="Save contact point" cancel={<button type="button" onClick={close}>Cancel</button>} />
    </form>
  </>
}

function TestNotification({ point, close }) {
  const { mutate } = useWorkspace()
  const integrations = rows(point.integrations).filter((item) => Object.hasOwn(types, item.type))
  const [integrationId, setIntegrationId] = useState(integrations[0]?.id || '')
  const [custom, setCustom] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  function send(event) {
    event.preventDefault()
    if (custom && !message.trim()) return setError('Enter a test message.')
    const saved = mutate((latest, { createdBy, createdAt }) => {
      const current = find(latest.contactPoints, point.id)
      const item = find(current?.integrations, integrationId)
      if (!item || !Object.hasOwn(types, item.type)) return latest
      return {
        ...latest, notificationTests: [...rows(latest.notificationTests), {
          id: uid('nt'), contactPointId: point.id, integrationId, integrationType: item.type,
          message: custom ? message.trim() : 'Grafana test notification',
          status: 'simulated_success', createdBy, createdAt,
        }],
      }
    }, 'Test notification simulated successfully.')
    if (saved) close()
    else setError('Select an available saved integration.')
  }
  return <Dialog title="Send test notification" close={close}>
    <form className="fields" onSubmit={send} noValidate>
      <p>Preview delivery for {point.name || 'this contact point'} in this workspace.</p>
      <Field label="Integration"><select value={integrationId} onChange={(event) => setIntegrationId(event.target.value)}>
        {integrations.map((item) => <option key={item.id} value={item.id}>{integrationLabel(item.type)} · {destination(item)}</option>)}
      </select></Field>
      <Field label="Message type"><select value={custom ? 'custom' : 'default'} onChange={(event) => { setCustom(event.target.value === 'custom'); setError('') }}>
        <option value="default">Default message</option><option value="custom">Custom message</option>
      </select></Field>
      {custom ? <Field label="Test message" error={error}><textarea rows="3" value={message} onChange={(event) => { setMessage(event.target.value); setError('') }} /></Field>
        : error ? <p className="field-error" role="alert">{error}</p> : <p>Grafana test notification</p>}
      <SaveBar label="Send test notification" cancel={<button type="button" onClick={close}>Cancel</button>} />
    </form>
  </Dialog>
}
