import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackLink, Confirm, DateText, Empty, FieldError, Icon, Missing, Modal, PageHeader, Search, Select, Status, Avatar } from '../ui.jsx'
import { SiteLink, alphabetical, byId, eligible, find, hasValue, idFor, label, list, lower, money, recordPath, timestamp, upsert, useFilters, useWorkspace } from '../workspace.jsx'
import { MessageComposer } from './Messages.jsx'

const defaults = { q: '', type: '', tier: '', status: '', from: '', to: '', sort: 'newest' }
const types = [['', 'All types'], ['free', 'Free'], ['paid', 'Paid'], ['former_paid', 'Former paid']]
const statuses = [['', 'All statuses'], ['active', 'Active'], ['canceled', 'Canceled'], ['declined', 'Declined']]
const tierName = (tiers, id) => id ? find(tiers, id)?.name || 'Unavailable' : '—'
const day = value => timestamp(value) ? new Date(value).toISOString().slice(0, 10) : ''

function csvCell(value) {
  const text = String(value ?? '')
  const safe = /^[\t\r\n]|^[\s\uFEFF]*[=+\-@]/.test(text) ? "'" + text : text
  return '"' + safe.replaceAll('"', '""') + '"'
}

function exportMembers(members, tiers) {
  const rows = [
    ['Name', 'Email', 'Type', 'Tier', 'Status', 'Join date', 'Pledge', 'Lifetime paid'],
    ...members.map(member => [
      member.name, member.email, member.type, member.tierId ? tierName(tiers, member.tierId) : '', member.status,
      day(member.joinedAt), member.pledgeAmount, member.lifetimePaid,
    ]),
  ]
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'members.csv'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Members() {
  const { state } = useWorkspace()
  const [filters, update, clear] = useFilters(defaults)
  const [selection, setSelection] = useState([])
  const [composing, setComposing] = useState(false)
  const members = list(state.members)
  const tiers = list(state.tiers)
  const tiersByName = [...tiers].sort((left, right) => alphabetical(left.name, right.name))
  const query = lower(filters.q).trim()
  const visible = members.filter(member => {
    const joined = day(member.joinedAt)
    return (lower(member.name).includes(query) || lower(member.email).includes(query)) &&
      (!filters.type || member.type === filters.type) &&
      (!filters.tier || (filters.tier === 'none' ? !member.tierId : member.tierId === filters.tier)) &&
      (!filters.status || member.status === filters.status) &&
      (!filters.from || (joined && joined >= filters.from)) &&
      (!filters.to || (joined && joined <= filters.to))
  }).sort((left, right) => {
    if (filters.sort === 'name') return alphabetical(left.name, right.name) || byId(left, right)
    if (filters.sort === 'lifetime') {
      const amount = value => hasValue(value) && Number.isFinite(Number(value)) ? Number(value) : -1
      return amount(right.lifetimePaid) - amount(left.lifetimePaid) || byId(left, right)
    }
    return timestamp(right.joinedAt) - timestamp(left.joinedAt) || byId(left, right)
  })
  const eligibleCount = members.filter(member => selection.includes(member.id) && eligible(member)).length
  const selectedCount = visible.filter(member => selection.includes(member.id)).length
  const allSelected = visible.length > 0 && selectedCount === visible.length

  function toggle(ids, checked) {
    setSelection(previous => checked ? [...new Set([...previous, ...ids])] : previous.filter(id => !ids.includes(id)))
  }

  return <>
    <PageHeader title="Members" description="View membership details, track notes and contact paid members.">
      <button type="button" onClick={() => exportMembers(visible, tiers)}><Icon name="download" />Download CSV</button>
    </PageHeader>
    <div className="filters members-filters">
      <Search name="Search members" value={filters.q} onChange={q => update({ q })} placeholder="Search name or email" />
      <Select name="Member type" value={filters.type} onChange={type => update({ type })} options={types} />
      <Select name="Tier" value={filters.tier} onChange={tier => update({ tier })} options={ [['', 'All tiers'], ['none', 'No tier'], ...tiersByName.map(tier => [tier.id, tier.name || 'Unnamed tier'])] } />
      <Select name="Member status" value={filters.status} onChange={status => update({ status })} options={statuses} />
      <Select name="Sort members" value={filters.sort} onChange={sort => update({ sort })} options={ [['newest', 'Newest joined'], ['name', 'Name A–Z'], ['lifetime', 'Lifetime paid']] } />
      <label className="date-filter">Joined from<input type="date" value={filters.from} onChange={event => update({ from: event.target.value })} /></label>
      <label className="date-filter">Joined to<input type="date" value={filters.to} onChange={event => update({ to: event.target.value })} /></label>
      {Object.keys(defaults).some(key => defaults[key] !== filters[key]) && <button type="button" className="text-button" onClick={clear}>Clear filters</button>}
    </div>
    <section className="paper members-panel" aria-label="Member directory">
      <div className="member-toolbar">
        <span>{visible.length} {visible.length === 1 ? 'member' : 'members'}</span>
        <div className="actions">
          <span>{selection.length} selected{selection.length > 0 && ` · ${eligibleCount} eligible`}</span>
          {selection.length > 0 && <button type="button" className="text-button" onClick={() => setSelection([])}>Clear selection</button>}
          {selection.length > 0 && <button type="button" onClick={() => setComposing(true)} disabled={!eligibleCount}><Icon name="message" size={16} />Message selected</button>}
        </div>
      </div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Member results">
        <table>
          <thead><tr>
            <th><input type="checkbox" aria-label="Select all visible members" checked={allSelected}
              ref={element => { if (element) element.indeterminate = selectedCount > 0 && !allSelected }}
              onChange={event => toggle(visible.map(member => member.id), event.target.checked)} disabled={!visible.length} /></th>
            <th scope="col">Member</th><th scope="col">Type</th><th scope="col">Tier</th><th scope="col">Status</th><th scope="col">Joined</th><th scope="col">Pledge</th><th scope="col">Lifetime paid</th>
          </tr></thead>
          <tbody>
            {visible.map(member => <tr key={member.id} className={selection.includes(member.id) ? 'selected-row' : undefined}>
              <td><input type="checkbox" aria-label={`Select ${member.name || member.id}`} checked={selection.includes(member.id)} onChange={event => toggle([member.id], event.target.checked)} /></td>
              <td><SiteLink className="member-link" to={recordPath('members', member.id)}>
                <Avatar name={member.name} /><span><strong>{member.name || 'Unnamed member'}</strong><small>{member.email || 'No email on file'}</small></span>
              </SiteLink></td>
              <td>{label(member.type)}</td><td>{tierName(tiers, member.tierId)}</td><td><Status value={member.status} /></td><td><DateText value={member.joinedAt} timeZone="UTC" /></td><td>{money(member.pledgeAmount)}</td><td>{money(member.lifetimePaid)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!visible.length && <Empty title="No members found">Try changing your search or filters.</Empty>}
    </section>
    {composing && <MessageComposer initialIds={selection} onClose={() => setComposing(false)} />}
  </>
}

export function MemberDetail() {
  const { memberId } = useParams()
  const { state } = useWorkspace()
  const member = find(state.members, memberId)
  if (!member) return <Missing title="Member unavailable" section="members" />
  return <MemberProfile key={memberId} member={member} />
}

function MemberProfile({ member }) {
  const { state, commit, notify } = useWorkspace()
  const [composing, setComposing] = useState(false)
  const [noteEditor, setNoteEditor] = useState(null)
  const [pendingRemoval, setPendingRemoval] = useState(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const notes = list(state.memberNotes).filter(note => note.memberId === member.id && !note.deletedAt)
    .sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt) || byId(left, right))

  function edit(note) {
    setError('')
    setBody(note?.body ?? '')
    setNoteEditor({ id: note?.id })
  }

  function save(event) {
    event.preventDefault()
    const result = commit((latest, { now, actor }) => {
      if (!body.trim()) return { error: 'Enter a note.' }
      if (!find(latest.members, member.id)) return { error: 'This member is unavailable.' }
      const existing = noteEditor.id && find(latest.memberNotes, noteEditor.id)
      if (noteEditor.id && (!existing || existing.deletedAt || existing.memberId !== member.id)) return { error: 'This note is unavailable.' }
      const record = {
        ...existing, id: existing?.id ?? idFor('note'), memberId: member.id, authorId: existing?.authorId ?? actor,
        body: body.trim(), createdAt: existing?.createdAt ?? now, updatedAt: now, updatedBy: actor, deletedAt: null,
      }
      return { state: { ...latest, memberNotes: upsert(latest.memberNotes, record) } }
    })
    if (result.error) return setError(result.error)
    notify(noteEditor.id ? 'Note updated.' : 'Note added.')
    setNoteEditor(null)
  }

  function remove() {
    const result = commit((latest, { now, actor }) => {
      const existing = find(latest.memberNotes, pendingRemoval)
      if (!existing || existing.deletedAt || existing.memberId !== member.id) return { error: 'This note is unavailable.' }
      const record = { ...existing, deletedAt: now, updatedAt: now, updatedBy: actor }
      return { state: { ...latest, memberNotes: upsert(latest.memberNotes, record) } }
    })
    if (result.error) return setError(result.error)
    setPendingRemoval(null)
    notify('Note removed.')
  }

  return <>
    <BackLink section="members">Back to members</BackLink>
    <div className="profile-heading">
      <Avatar name={member.name} />
      <PageHeader title={member.name || 'Unnamed member'} description={member.email || 'No email on file'}>
        {eligible(member) && <button type="button" className="primary" onClick={() => setComposing(true)}><Icon name="message" />Message member</button>}
      </PageHeader>
    </div>
    <div className="member-detail">
      <section className="paper settings-panel">
        <h2>Membership</h2>
        <dl className="facts">
          <div><dt>Type</dt><dd>{label(member.type)}</dd></div>
          <div><dt>Status</dt><dd><Status value={member.status} /></dd></div>
          <div><dt>Tier</dt><dd>{tierName(state.tiers, member.tierId)}</dd></div>
          <div><dt>Joined</dt><dd><DateText value={member.joinedAt} timeZone="UTC" /></dd></div>
          <div><dt>Monthly pledge</dt><dd>{money(member.pledgeAmount)}</dd></div>
          <div><dt>Lifetime paid</dt><dd>{money(member.lifetimePaid)}</dd></div>
          <div><dt>Last paid</dt><dd><DateText value={member.lastPaidAt} /></dd></div>
        </dl>
      </section>
      <section className="paper notes-panel">
        <div className="panel-heading"><h2>Internal notes</h2><button type="button" onClick={() => edit()}><Icon name="plus" size={16} />Add note</button></div>
        {!notes.length && <Empty title="No notes yet">Internal notes are visible to the creator.</Empty>}
        {notes.map(note => <article className="note" key={note.id}>
          <p className="prewrap">{note.body}</p>
          <footer><span><DateText value={note.updatedAt || note.createdAt} withTime />{note.updatedAt && note.updatedAt !== note.createdAt ? ' · Edited' : ''}</span>
            <div className="actions"><button type="button" onClick={() => edit(note)}>Edit</button>
              <button type="button" className="danger-text" onClick={() => { setError(''); setPendingRemoval(note.id) }}>Remove</button></div>
          </footer>
        </article>)}
      </section>
    </div>
    {noteEditor && <Modal title={noteEditor.id ? 'Edit note' : 'Add note'} onClose={() => setNoteEditor(null)}>
      <form onSubmit={save} noValidate>
        <label className="field">Note<textarea aria-label="Note" autoFocus rows={5} value={body} onChange={event => { setBody(event.target.value); setError('') }} aria-invalid={!!error} /><FieldError>{error}</FieldError></label>
        <div className="actions dialog-actions"><button type="button" onClick={() => setNoteEditor(null)}>Cancel</button><button className="primary" type="submit">Save note</button></div>
      </form>
    </Modal>}
    {pendingRemoval && <Confirm title="Remove note?" action="Remove note" danger error={error} onClose={() => setPendingRemoval(null)} onConfirm={remove}>Remove this note from {member.name || 'this member'}’s profile.</Confirm>}
    {composing && <MessageComposer initialIds={[member.id]} onClose={() => setComposing(false)} />}
  </>
}

