import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Contact, Mail, MoreHorizontal, Pencil, Plus, Search, Star, Trash2, Users } from 'lucide-react'
import { activity, record, useStore } from '../store.jsx'
import { array, contactName, emailValid, id, listRecipients, lower, memberCountLabel, primaryEmail, uniqueAddresses } from '../data/model.js'
import { Avatar, contactPath, draftPath, Empty, IconButton, MailLink, Menu, MenuItem, Modal, NotFound, useInterface, useMailNavigation } from '../components/ui.jsx'
import { useDraftActions } from '../components/draftActions.jsx'

const contactFields = { firstName: 'First name', lastName: 'Last name', nickname: 'Nickname', company: 'Company', jobTitle: 'Job title', website: 'Website', birthday: 'Birthday', notes: 'Notes' }
const postalFields = { street: 'Street address', city: 'City', state: 'State', zip: 'ZIP / postal code', country: 'Country' }
const addressTypes = { emails: ['personal', 'work', 'other'], phones: ['mobile', 'home', 'work', 'other'] }

function ContactForm({ initial, close, onSave, source, messageId }) {
  const { dispatch } = useStore()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    ...Object.fromEntries(Object.keys(contactFields).map(key => [key, initial?.[key] || ''])),
    emails: array(initial?.emails).length ? initial.emails : [{ type: 'personal', address: '' }],
    phones: array(initial?.phones).length ? initial.phones : [{ type: 'mobile', number: '' }],
    addresses: array(initial?.addresses),
  })
  function setField(key, value) { setForm(previous => ({ ...previous, [key]: value })) }
  function updateItem(key, index, field, value) {
    setForm(previous => ({ ...previous, [key]: previous[key].map((item, position) => position === index ? { ...item, [field]: value } : item) }))
  }
  async function save(event) {
    event.preventDefault()
    const fields = Object.fromEntries(Object.keys(contactFields).map(key => [key, form[key].trim()]))
    const emails = form.emails.filter(item => item.address?.trim()).map(item => ({ ...item, address: item.address.trim() }))
    const phones = form.phones.filter(item => item.number?.trim()).map(item => ({ ...item, number: item.number.trim() }))
    const addresses = form.addresses.filter(item => Object.keys(postalFields).some(key => item[key]?.trim()))
    if (!fields.firstName && !fields.lastName && !fields.nickname && !emails.length) { setError('Enter a name or email address.'); return }
    if (emails.some(item => !emailValid(item.address))) { setError('Enter valid email addresses.'); return }
    const addressesToSave = new Set(emails.map(email => lower(email.address)))
    let validation
    let saved
    const done = await dispatch(current => {
      const contacts = array(current.contacts)
      const before = initial?.id ? contacts.find(contact => contact.id === initial.id) : null
      const duplicate = contacts.find(contact => contact !== before && array(contact.emails).some(item => addressesToSave.has(lower(item.address?.trim()))))
      if (initial?.id && !before) validation = 'This contact was deleted. Close the editor and add a new contact.'
      else if (duplicate) validation = 'That email address already belongs to ' + contactName(duplicate) + '.'
      if (validation) return current
      const now = new Date().toISOString()
      saved = { ...before, ...fields, emails, phones, addresses, id: before?.id || id('ct'), source: before?.source || source || 'manual', isFavorite: Boolean(before?.isFavorite), createdAt: before?.createdAt || now, updatedAt: now }
      return record(current, { contacts: before ? contacts.map(contact => contact.id === before.id ? saved : contact) : [...contacts, saved] },
        activity(current, before ? 'contact.update' : 'contact.create', { before: before || null, after: saved }, { contactIds: [saved.id], ...(messageId && { messageIds: [messageId] }) }))
    })
    if (done) onSave(saved)
    else if (validation) setError(validation)
  }

  return <Modal title={initial?.id ? 'Edit contact' : 'Add a new contact'} close={close} className="contact-modal">
    <form className="field-stack" noValidate onSubmit={save}>
      <div className="two-fields">
        {Object.entries(contactFields).filter(([key]) => key !== 'notes').map(([key, label]) => <label className="field" key={key}>{label}<input value={form[key]} type={key === 'birthday' ? 'date' : 'text'} onChange={event => setField(key, event.target.value)} /></label>)}
      </div>
      {['emails', 'phones'].map(key => {
        const email = key === 'emails'
        const label = email ? 'Email' : 'Phone'
        const field = email ? 'address' : 'number'
        return <fieldset key={key} className="contact-rows"><legend>{label}</legend>
          {form[key].map((item, index) => <div className="contact-form-row" key={index}>
            <label className="field"><span className="visually-hidden">{label} type {index + 1}</span><select value={item.type} onChange={event => updateItem(key, index, 'type', event.target.value)}>{addressTypes[key].map(type => <option key={type}>{type}</option>)}</select></label>
            <label className="field"><span className="visually-hidden">{index ? label + ' ' + (index + 1) : email ? 'Email address' : 'Phone number'}</span><input value={item[field] || ''} type={email ? 'email' : 'tel'} onChange={event => updateItem(key, index, field, event.target.value)} /></label>
            <IconButton icon={Trash2} label={'Remove ' + label.toLowerCase() + ' ' + (index + 1)} onClick={() => setField(key, form[key].filter((_, position) => position !== index))} />
          </div>)}
          <button className="link-button" type="button" onClick={() => setField(key, [...form[key], { type: addressTypes[key][0], [field]: '' }])}><Plus size={16} />Add {label.toLowerCase()}</button>
        </fieldset>
      })}
      <fieldset className="contact-rows"><legend>Address</legend>
        {form.addresses.map((address, index) => <div key={index} className="postal-row">
          <div className="two-fields">{Object.entries(postalFields).map(([key, title]) => <label className="field" key={key}>{title}<input value={address[key] || ''} onChange={event => updateItem('addresses', index, key, event.target.value)} /></label>)}</div>
          <button type="button" className="tool-button" onClick={() => setField('addresses', form.addresses.filter((_, position) => position !== index))}>Remove address</button>
        </div>)}
        <button className="link-button" type="button" onClick={() => setField('addresses', [...form.addresses, { type: 'work', ...Object.fromEntries(Object.keys(postalFields).map(key => [key, ''])) }])}><Plus size={16} />Add address</button>
      </fieldset>
      <label className="field">Notes<textarea rows={3} value={form.notes} onChange={event => setField('notes', event.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions"><button className="secondary" type="button" onClick={close}>Cancel</button><button className="primary">Save contact</button></div>
    </form>
  </Modal>
}

function ListForm({ initial, close, onSave }) {
  const { state, dispatch } = useStore()
  const [name, setName] = useState(initial?.name || '')
  const [members, setMembers] = useState(array(initial?.contactIds))
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const contacts = array(state.contacts).filter(contact => lower(contactName(contact) + ' ' + primaryEmail(contact)).includes(lower(query)))
  async function save(event) {
    event.preventDefault()
    const title = name.trim()
    if (!title) { setError('Enter a list name.'); return }
    let validation
    let saved
    const done = await dispatch(current => {
      const lists = array(current.contactLists)
      const before = lists.find(list => list.id === initial?.id) || null
      if (initial?.id && !before) validation = 'This list was deleted. Close the editor and create a new list.'
      else if (lists.some(list => list !== before && lower(list.name?.trim()) === lower(title))) validation = 'A list already uses that name.'
      if (validation) return current
      const now = new Date().toISOString()
      const contactIds = [...new Set(members)].filter(member => array(current.contacts).some(contact => contact.id === member))
      saved = { ...before, id: before?.id || id('cl'), name: title, contactIds, createdAt: before?.createdAt || now, updatedAt: now }
      return record(current, { contactLists: before ? lists.map(list => list.id === before.id ? saved : list) : [...lists, saved] },
        activity(current, before ? 'list.update' : 'list.create', { before, after: saved }, { listIds: [saved.id], contactIds }))
    })
    if (done) onSave(saved)
    else if (validation) setError(validation)
  }
  return <Modal title={initial?.id ? 'Edit list' : 'Create a contact list'} close={close}>
    <form className="field-stack" onSubmit={save}>
      <label className="field">List name<input value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="field">Find contacts<input value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="list-members" aria-label="Choose contacts">{contacts.map(contact => <label className="check-label" key={contact.id}>
        <input type="checkbox" checked={members.includes(contact.id)} onChange={event => setMembers(event.target.checked ? [...members, contact.id] : members.filter(member => member !== contact.id))} />
        {contactName(contact)}
      </label>)}{!contacts.length && <p className="muted">No matching contacts</p>}</div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions"><button className="secondary" type="button" onClick={close}>Cancel</button><button className="primary">Save list</button></div>
    </form>
  </Modal>
}

export function SenderContactActions({ message, close }) {
  const { state } = useStore()
  const { go } = useMailNavigation()
  const address = message.from?.email
  const existing = address && array(state.contacts).find(contact => array(contact.emails).some(email => lower(email.address) === lower(address)))
  if (!emailValid(address)) return null
  return <MenuItem icon={existing ? Contact : Plus} onClick={() => {
    close()
    if (existing) go(contactPath(existing.id))
    else go(contactPath(), { state: { sender: { name: message.from?.name || '', email: address }, messageId: message.id } })
  }}>{existing ? 'Open existing contact' : 'Add to contacts'}</MenuItem>
}

export default function Contacts({ panel = false }) {
  const { contactId } = useParams()
  const { state, dispatch } = useStore()
  const { location, go } = useMailNavigation()
  const { notify, confirm } = useInterface()
  const { save } = useDraftActions()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState(null)
  const [editor, setEditor] = useState(null)
  const [senderDismissed, setSenderDismissed] = useState(null)
  const contacts = array(state.contacts)
  const lists = array(state.contactLists)
  const targetId = panel ? detail : contactId
  const contact = contacts.find(item => item.id === targetId)
  const list = lists.find(item => item.id === targetId)
  const isList = tab === 'lists'
  const visible = (isList ? lists : contacts.filter(item => tab !== 'favorites' || item.isFavorite)).filter(item => lower(isList ? item.name : contactName(item) + ' ' + primaryEmail(item)).includes(lower(query))).sort((a, b) => (isList ? a.name || '' : contactName(a)).localeCompare(isList ? b.name || '' : contactName(b)))
  const sender = !panel && senderDismissed !== location.key && location.state?.sender

  function select(value) {
    if (panel) setDetail(value)
    else go(contactPath(value))
  }
  function favorite(item) {
    dispatch(current => {
      const before = array(current.contacts).find(contact => contact.id === item.id)
      if (!before) return current
      const after = { ...before, isFavorite: !before.isFavorite, updatedAt: new Date().toISOString() }
      return record(current, { contacts: array(current.contacts).map(contact => contact.id === item.id ? after : contact) },
        activity(current, 'contact.favorite', { before, after }, { contactIds: [item.id] }))
    })
  }
  async function email(item, group) {
    const recipients = group ? listRecipients(item, contacts) : [{ name: contactName(item), email: primaryEmail(item) }]
    const to = uniqueAddresses(recipients.filter(recipient => emailValid(recipient.email)))
    if (!to.length) { notify(group ? 'This list has no members with an email address.' : 'This contact has no email address.'); return }
    const draft = await save(null, { to })
    if (!draft) return
    if (group && recipients.length < array(item.contactIds).length) notify('Members without an email address were skipped.')
    go(draftPath(draft.id), { state: { back: location.pathname + location.search } })
  }
  function remove(item, group) {
    const title = group ? 'Delete list' : 'Delete contact'
    confirm({ title, text: 'Delete “' + (group ? item.name : contactName(item)) + '”?', action: title, danger: true, onConfirm: async () => {
      const done = await dispatch(current => {
        const key = group ? 'contactLists' : 'contacts'
        const before = array(current[key]).find(value => value.id === item.id)
        if (!before) return current
        const patch = { [key]: array(current[key]).filter(value => value.id !== item.id) }
        if (group) return record(current, patch, activity(current, 'list.delete', { before, after: null }, { listIds: [item.id], contactIds: array(before.contactIds) }))
        const changes = []
        patch.contactLists = array(current.contactLists).map(value => {
          if (!array(value.contactIds).includes(item.id)) return value
          const after = { ...value, contactIds: value.contactIds.filter(contactId => contactId !== item.id), updatedAt: new Date().toISOString() }
          changes.push({ listId: value.id, before: value, after })
          return after
        })
        return record(current, patch, activity(current, 'contact.delete', { before, after: null, changes }, { contactIds: [item.id], listIds: changes.map(change => change.listId) }))
      })
      if (done) { select(null); notify(group ? 'List deleted' : 'Contact deleted') }
    } })
  }
  const item = list || contact
  const closeForm = () => { setEditor(null); setSenderDismissed(location.key) }
  const onSave = saved => { closeForm(); select(saved.id); notify('Saved') }

  return <section className={'contacts-page' + (panel ? ' contacts-panel' : '')}>
    {(!panel || !targetId) && <div className="contact-list">
      {panel && <div className="contact-panel-link"><MailLink to={contactPath()} className="link-button">Open Contacts</MailLink></div>}
      {!panel && <header className="contact-title"><h1>Contacts</h1></header>}
      <div className="contact-tools">
        <div className="contact-tabs" role="tablist" aria-label="Contact categories">{[['all', 'All'], ['favorites', 'Favorites'], ['lists', 'Lists']].map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
        <Menu icon={MoreHorizontal} label="Contact actions">{close => <>
          <MenuItem icon={Plus} onClick={() => { close(); setEditor({ kind: 'contact' }) }}>Add a new contact</MenuItem>
          <MenuItem icon={Users} onClick={() => { close(); setTab('lists'); setEditor({ kind: 'list' }) }}>New list</MenuItem>
        </>}</Menu>
      </div>
      <label className="folder-search"><Search size={15} /><input aria-label={isList ? 'Search lists' : 'Search contacts'} placeholder={isList ? 'Search lists' : 'Search contacts'} value={query} onChange={event => setQuery(event.target.value)} /></label>
      <button type="button" className="link-button contact-create" onClick={() => setEditor({ kind: isList ? 'list' : 'contact' })}><Plus size={16} />{isList ? 'New list' : 'Add a new contact'}</button>
      <div className="contact-list-items">
        {visible.map(value => <button type="button" key={value.id} className="contact-item" aria-pressed={targetId === value.id} onClick={() => select(value.id)}>
          {isList ? <span className="list-avatar"><Users size={16} /></span> : <Avatar name={contactName(value)} email={primaryEmail(value)} color={value.avatarColor} />}
          <span><strong>{isList ? value.name || 'Unnamed list' : contactName(value)}</strong><small>{isList ? memberCountLabel(array(value.contactIds).filter(member => contacts.some(contact => contact.id === member)).length) : primaryEmail(value)}</small></span>
          {!isList && value.isFavorite && <Star size={14} className="filled-star" />}
        </button>)}
        {!visible.length && <p className="muted padded">{query ? 'No results' : isList ? 'No lists yet' : 'No contacts here yet'}</p>}
      </div>
    </div>}
    {!!targetId && !item && <NotFound title="This contact or list is unavailable" />}
    {!panel && !targetId && <Empty icon={Contact} title={contacts.length ? 'Select a contact' : 'Your address book is empty'}><p className="muted">Find people and lists for your next message.</p></Empty>}
    {item && <section className="contact-detail">
      {panel && <button className="tool-button" onClick={() => select(null)}><ArrowLeft size={16} /> Back to Contacts</button>}
      <header className="contact-detail-head">
        {list ? <span className="list-avatar large"><Users size={28} /></span> : <Avatar name={contactName(contact)} email={primaryEmail(contact)} color={contact.avatarColor} size={64} />}
        <h2>{list ? list.name || 'Unnamed list' : contactName(contact)}</h2>
        <div className="toolbar-spacer" />
        {contact && <IconButton icon={Star} className={contact.isFavorite ? 'filled-star' : ''} label={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={Boolean(contact.isFavorite)} onClick={() => favorite(contact)} />}
        <Menu icon={MoreHorizontal} label={list ? 'List options' : 'Contact options'}>{close => <>
          <MenuItem icon={Pencil} onClick={() => { close(); setEditor({ kind: list ? 'list' : 'contact', item }) }}>{list ? 'Edit list' : 'Edit contact'}</MenuItem>
          <MenuItem icon={Trash2} onClick={() => { close(); remove(item, Boolean(list)) }}>{list ? 'Delete list' : 'Delete contact'}</MenuItem>
        </>}</Menu>
      </header>
      <button className="secondary" onClick={() => email(item, Boolean(list))}><Mail size={17} />{list ? 'Email this list' : 'Email contact'}</button>
      {list ? <><h3 className="contact-section-title">Members</h3>
        {array(list.contactIds).map(member => contacts.find(contact => contact.id === member)).filter(Boolean).map(contact => <button className="contact-item" key={contact.id} onClick={() => select(contact.id)}><Avatar name={contactName(contact)} email={primaryEmail(contact)} /><span>{contactName(contact)}</span></button>)}
        <button className="link-button" onClick={() => setEditor({ kind: 'list', item: list })}><Plus size={15} /> Manage members</button></> :
        <dl className="contact-data">
          {[['Nickname', contact.nickname], ['Company', contact.company], ['Job title', contact.jobTitle], ['Website', contact.website], ['Birthday', contact.birthday], ['Notes', contact.notes]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          {array(contact.emails).map((item, index) => <div key={'email' + index}><dt>Email · {item.type}</dt><dd><button className="link-button" onClick={async () => { const draft = await save(null, { to: [{ name: contactName(contact), email: item.address }] }); if (draft) go(draftPath(draft.id), { state: { back: location.pathname + location.search } }) }}>{item.address}</button></dd></div>)}
          {array(contact.phones).map((item, index) => <div key={'phone' + index}><dt>Phone · {item.type}</dt><dd>{item.number}</dd></div>)}
          {array(contact.addresses).map((item, index) => <div key={'address' + index}><dt>Address · {item.type}</dt><dd>{[item.street, item.city, item.state, item.zip, item.country].filter(Boolean).join(', ')}</dd></div>)}
        </dl>}
    </section>}
    {(editor?.kind === 'contact' || sender) && <ContactForm initial={editor?.item || (sender && { firstName: sender.name.split(' ')[0], lastName: sender.name.split(' ').slice(1).join(' '), emails: [{ type: 'personal', address: sender.email }] })} source={sender && 'added_from_message'} messageId={sender && location.state.messageId} close={closeForm} onSave={onSave} />}
    {editor?.kind === 'list' && <ListForm initial={editor.item} close={closeForm} onSave={onSave} />}
  </section>
}
