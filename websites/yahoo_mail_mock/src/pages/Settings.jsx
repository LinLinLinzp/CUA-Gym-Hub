import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useStore } from '../store.jsx'
import { accountEmails, array, sections } from '../data/model.js'
import { AppearanceChoices } from '../components/Shell.jsx'
import { inbox, MailLink, NotFound, useInterface } from '../components/ui.jsx'
import Filters from './Filters.jsx'
import { useSenderActions } from '../components/senderActions.jsx'

function Toggle({ label, value, onChange }) {
  return <label className="check-label"><input type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)} />{label}</label>
}

function Choice({ label, value, options, onChange }) {
  return <label className="field">{label}<select value={value || Object.keys(options)[0]} onChange={event => onChange(event.target.value)}>{Object.entries(options).map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select></label>
}

function Writing() {
  const { state, updateSettings } = useStore()
  const { notify } = useInterface()
  const preferences = state.settings?.writing || {}
  const [signature, setSignature] = useState({ enabled: Boolean(preferences.signature?.enabled), text: preferences.signature?.text || '' })
  const emails = accountEmails(state.currentUser)
  return <>
    <Choice label="Default From address" value={preferences.defaultFrom} options={Object.fromEntries(emails.map(email => [email, email]))} onChange={defaultFrom => updateSettings('writing', { defaultFrom })} />
    <div className="two-fields">
      <Choice label="Default font" value={preferences.defaultFont} options={{ 'sans-serif': 'Sans Serif', serif: 'Serif', monospace: 'Monospace' }} onChange={defaultFont => updateSettings('writing', { defaultFont })} />
      <Choice label="Default font size" value={preferences.defaultFontSize} options={{ small: 'Small', medium: 'Medium', large: 'Large' }} onChange={defaultFontSize => updateSettings('writing', { defaultFontSize })} />
    </div>
    <Toggle label="Send with Ctrl or Command + Enter" value={preferences.sendWithCtrlEnter} onChange={sendWithCtrlEnter => updateSettings('writing', { sendWithCtrlEnter })} />
    <form className="field-stack" onSubmit={async event => { event.preventDefault(); if (await updateSettings('writing', { signature })) notify('Signature saved') }}>
      <h2>Signature</h2>
      <Toggle label="Add a signature to outgoing messages" value={signature.enabled} onChange={enabled => setSignature({ ...signature, enabled })} />
      <label className="field">Signature text<textarea rows={5} value={signature.text} onChange={event => setSignature({ ...signature, text: event.target.value })} /></label>
      <div><button className="primary">Save signature</button></div>
    </form>
  </>
}

function Preferences({ section }) {
  const { state, updateSettings } = useStore()
  const prefs = state.settings?.[section] || {}
  if (section === 'appearance') return <>
    <AppearanceChoices />
    <Toggle label="Show message summaries" value={state.settings?.ai?.messageSummaries} onChange={messageSummaries => updateSettings('ai', { messageSummaries })} />
    <Toggle label="Compact navigation" value={state.settings?.sidebar?.compact} onChange={compact => updateSettings('sidebar', { compact })} />
  </>
  if (section === 'writing') return <Writing />
  if (section === 'inbox') return <>
    <Toggle label="Enable inbox categories" value={prefs.categoriesEnabled} onChange={categoriesEnabled => updateSettings('inbox', { categoriesEnabled })} />
    <Toggle label="Show unread count" value={prefs.showUnreadCount} onChange={showUnreadCount => updateSettings('inbox', { showUnreadCount })} />
  </>
  if (section === 'viewing') return <>
    <Toggle label="Group messages by conversation" value={prefs.conversations} onChange={conversations => updateSettings('viewing', { conversations })} />
    <Choice label="Mark as read" value={prefs.markAsRead} options={{ immediately: 'Immediately', never: 'Never' }} onChange={markAsRead => updateSettings('viewing', { markAsRead })} />
    <Choice label="Show images" value={prefs.showImages} options={{ ask: 'Ask before showing', always: 'Always show local images', never: 'Never' }} onChange={showImages => updateSettings('viewing', { showImages })} />
    <Choice label="After moving a message" value={prefs.afterMove} options={{ next: 'Open next message', previous: 'Open previous message', list: 'Return to list' }} onChange={afterMove => updateSettings('viewing', { afterMove })} />
  </>
  if (section === 'privacy') return <Privacy />
  if (section === 'vacation') return <Vacation />
  return null
}

function Privacy() {
  const { state, updateSettings } = useStore()
  const { block, unblock } = useSenderActions()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  return <>
    <Toggle label="Enable keyboard shortcuts" value={state.settings?.keyboardShortcuts} onChange={keyboardShortcuts => updateSettings(null, { keyboardShortcuts })} />
    <h2>Blocked addresses</h2>
    <form className="field-stack" noValidate onSubmit={async event => {
      event.preventDefault()
      const validation = await block(email, 'settings')
      setError(validation)
      if (!validation) setEmail('')
    }}>
      <label className="field">Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div><button className="primary">Block address</button></div>
    </form>
    {array(state.blockedAddresses).length ? <ul className="blocked-list">{array(state.blockedAddresses).map(item => <li key={item.id}><span>{item.email}</span><button className="secondary" aria-label={'Unblock ' + item.email} onClick={() => unblock(item.email)}>Unblock</button></li>)}</ul> : <p className="muted">No blocked addresses.</p>}
  </>
}

function Vacation() {
  const { state, updateSettings } = useStore()
  const { notify } = useInterface()
  const prefs = state.settings?.vacationResponse || {}
  const [form, setForm] = useState({ enabled: false, startDate: '', endDate: '', subject: '', message: '', onlyContacts: false, ...prefs })
  const [error, setError] = useState('')
  function edit(field, value) { setForm(previous => ({ ...previous, [field]: value })) }
  return <form className="field-stack" onSubmit={async event => {
    event.preventDefault()
    if (form.startDate && form.endDate && form.endDate < form.startDate) { setError('The end date must be on or after the start date.'); return }
    setError('')
    if (await updateSettings('vacationResponse', { ...form, updatedAt: new Date().toISOString() })) notify('Vacation response saved')
  }}>
    <Toggle label="Turn on vacation response" value={form.enabled} onChange={value => edit('enabled', value)} />
    <div className="two-fields">
      <label className="field">Start date<input type="date" value={form.startDate} onChange={event => edit('startDate', event.target.value)} /></label>
      <label className="field">End date<input type="date" value={form.endDate} onChange={event => edit('endDate', event.target.value)} /></label>
    </div>
    <label className="field">Subject<input value={form.subject} onChange={event => edit('subject', event.target.value)} /></label>
    <label className="field">Message<textarea rows={5} value={form.message} onChange={event => edit('message', event.target.value)} /></label>
    <Toggle label="Only respond to contacts" value={form.onlyContacts} onChange={value => edit('onlyContacts', value)} />
    {error && <p className="error" role="alert">{error}</p>}
    <div><button className="primary">Save vacation response</button></div>
  </form>
}

export default function Settings() {
  const { section } = useParams()
  if (!Object.hasOwn(sections, section)) return <NotFound title="This settings page is unavailable" />
  return <div className="settings-page">
    <nav className="settings-nav" aria-label="Settings sections">
      <MailLink to={inbox} className="nav-item"><ArrowLeft size={17} /><span>Back to Inbox</span></MailLink>
      <h2>Settings</h2>
      {Object.entries(sections).map(([key, title]) => <MailLink key={key} className={'nav-item' + (section === key ? ' active' : '')} aria-current={section === key ? 'page' : undefined} to={'/n/settings/' + key}><span>{title}</span></MailLink>)}
    </nav>
    {section === 'filters' ? <Filters /> : <section className="settings-content"><h1>{sections[section]}</h1><div className="field-stack" key={section}><Preferences section={section} /></div></section>}
  </div>
}
