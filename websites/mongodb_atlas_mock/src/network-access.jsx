import { useState } from 'react'
import { Actions, Badge, Confirm, Feedback, Field, Inventory, Modal, Select, displayDate, expiryOptions, expiryStatus, resolveExpiry, searchText } from './components.jsx'
import { scoped, useWorkspace } from './workspace.jsx'

function parseAddress(value) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(value)
  if (!match) return null
  const bytes = match.slice(1, 5).map(Number)
  const prefix = match[5] === undefined ? 32 : Number(match[5])
  if (bytes.some(byte => byte > 255) || prefix > 32) return null
  const ip = bytes.reduce((acc, byte) => acc * 256 + byte, 0)
  const block = 2 ** (32 - prefix)
  const network = Math.floor(ip / block) * block
  const dotted = [24, 16, 8, 0].map(shift => (network >>> shift) & 255).join('.')
  return { canonical: match[5] === undefined ? dotted : dotted + '/' + prefix, key: dotted + '/' + prefix }
}

function networkStatus(row) {
  const status = expiryStatus(row)
  return status === 'active' && row.expiresAt ? 'temporary' : status
}

const nameFor = row => row.address || row.id

function AddressForm({ original, records, onClose, onSave }) {
  const [address, setAddress] = useState(original?.address ?? '')
  const [comment, setComment] = useState(original?.comment ?? '')
  const [duration, setDuration] = useState(original ? 'keep' : 'permanent')
  const [error, setError] = useState('')

  function submit() {
    const text = address.trim()
    const normalized = parseAddress(text)
    if (!normalized) return setError('Enter a valid IPv4 address or CIDR block, such as 198.51.100.24 or 203.0.113.0/27.')
    if (records.some(row => row.id !== original?.id && parseAddress(row.address)?.key === normalized.key)) {
      return setError('This address or CIDR block is already in this project.')
    }
    onSave(now => ({
      ...(!original && { status: 'active' }),
      address: text === original?.address ? original.address : normalized.canonical,
      ...((!original || comment !== (original.comment ?? '')) && { comment: comment.trim() }),
      expiresAt: resolveExpiry(duration, original?.expiresAt, now),
    }))
  }

  return <Modal sheet title={original ? 'Edit IP access' : 'Add IP address'} onClose={onClose} onSubmit={submit} submitLabel={original ? 'Save changes' : 'Add IP address'}>
    <Field label="IP address or CIDR" error={error} hint="IPv4 address or IPv4 network in CIDR notation.">{props => <input {...props} autoFocus autoComplete="off" value={address} onChange={event => { setAddress(event.target.value); setError('') }} />}</Field>
    <Field label="Comment (optional)">{props => <input {...props} value={comment} maxLength={200} onChange={event => setComment(event.target.value)} />}</Field>
    <Field label="Access duration" hint={original?.expiresAt ? 'Current expiry: ' + displayDate(original.expiresAt) : undefined}>{props => <Select {...props} options={expiryOptions(original)} value={duration} onChange={event => setDuration(event.target.value)} />}</Field>
  </Modal>
}

export function NetworkAccess() {
  const { state, project, mutate } = useWorkspace()
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [message, setMessage] = useState('')
  const records = scoped(state, 'ipAccessList', project.id).filter(row => row.status !== 'deleted')
  return <Inventory title="Network Access" description="Manage the IP access list for connections to your project clusters."
    addLabel="Add IP address" onAdd={() => setForm({})} records={records}
    columns={['IP address / CIDR', 'Comment', 'Status', 'Expiry', 'Actions']}
    searchLabel="Search IP addresses or comments" search={row => searchText(row.address, row.comment)} name={nameFor}
    filters={[{ label: 'Status', placeholder: 'All statuses', options: [['active', 'Active'], ['temporary', 'Temporary'], ['expired', 'Expired']], match: (row, value) => networkStatus(row) === value }]}
    render={row => <>
      <td><strong className="machine">{nameFor(row)}</strong></td><td>{row.comment || '—'}</td>
      <td><Badge status={networkStatus(row)} /></td><td>{displayDate(row.expiresAt, 'Permanent')}</td>
      <td><Actions name={nameFor(row)} options={[
        { label: 'Edit IP access', run: () => setForm({ original: row }) },
        { label: 'Delete IP entry', danger: true, run: () => setDeleting(row) },
      ]} /></td>
    </>}>
    {form && <AddressForm original={form.original} records={records} onClose={() => setForm(null)} onSave={fields => {
      const saved = mutate(project.id, 'ipAccessList', form.original?.id, form.original ? 'ip_access.updated' : 'ip_access.created', fields)
      setForm(null)
      if (saved) setMessage(form.original ? 'IP access updated.' : 'IP address added.')
    }} />}
    {deleting && <Confirm title="Delete IP entry" label="Delete IP entry" text={'Remove ' + nameFor(deleting) + ' from this project’s IP access list?'}
      onClose={() => setDeleting(null)} dangerous onConfirm={() => {
        mutate(project.id, 'ipAccessList', deleting.id, 'ip_access.deleted', now => ({ status: 'deleted', deletedAt: now }))
        setDeleting(null)
        setMessage('IP entry deleted.')
      }} />}
    <Feedback message={message} />
  </Inventory>
}
