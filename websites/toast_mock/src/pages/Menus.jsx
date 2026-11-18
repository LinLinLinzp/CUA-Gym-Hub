import { useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { amount, audit, catalogTypes, draftRecords, liveSnapshot, newId, parseMoney, replace, snapshot, updateAudit, within } from '../data/model.js'
import { Badge, Button, Dialog, Field, Header, Ledger, SearchBox, Select } from '../ui.jsx'

const recordOptions = rows => rows.map(row => [row.id, row.name ?? row.id])
const availabilityOptions = [['available', 'Available'], ['unavailable', 'Unavailable']]

export function Menus({ state, commit }) {
  const [tab, setTab] = useState('menuItems')
  const [query, setQuery] = useState('')
  const [menuId, setMenuId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [availability, setAvailability] = useState('')
  const [editor, setEditor] = useState(null)
  const [publish, setPublish] = useState(false)
  const menus = new Map(state.menus.map(row => [row.id, row.name]))
  const groups = new Map(state.menuGroups.map(row => [row.id, row]))
  const drafts = draftRecords(state)
  const groupsForMenu = state.menuGroups.filter(row => !menuId || row.menuId === menuId)
  const { singular } = catalogTypes[tab]
  const rows = state[tab].filter(row => {
    const group = groups.get(row.menuGroupId)
    const parentMenu = row.menuId || group?.menuId
    return within(query, row.name, row.description, group?.name, menus.get(parentMenu)) &&
      (tab === 'menus' || !menuId || parentMenu === menuId) &&
      (tab !== 'menuItems' || ((!groupId || row.menuGroupId === groupId) && (!availability || row.availability === availability)))
  })
  const columns = [
    ['Name', row => <button type="button" className="text-button" onClick={() => setEditor({ row })}>{row.name ?? 'Unnamed ' + singular}</button>],
    ...(tab === 'menus' ? [] : [['Menu', row => menus.get(row.menuId ?? groups.get(row.menuGroupId)?.menuId) ?? '—']]),
    ...(tab === 'menuItems' ? [
      ['Group', row => groups.get(row.menuGroupId)?.name ?? '—'],
      ['Price', row => amount(row.priceCents)], ['Availability', row => <Badge value={row.availability} />],
    ] : []),
    ['Publication', row => <Badge value={row.publicationStatus} />],
    ['', row => <button className="text-button" type="button" aria-label={'Edit ' + (row.name ?? singular)} onClick={() => setEditor({ row })}>Edit</button>],
  ]
  return <>
    <Header title="Menus" subtitle={drafts.length + (drafts.length === 1 ? ' saved change' : ' saved changes') + ' ready to publish'} actions={<>
      <Button disabled={!drafts.length} onClick={() => setPublish(true)}><Upload size={16} />Publish changes</Button>
      <Button variant="primary" onClick={() => setEditor({})}><Plus size={17} />Add {singular}</Button>
    </>} />
    <div className="tabs" aria-label="Catalog levels">{['menuItems', 'menuGroups', 'menus'].map(key =>
      <button key={key} type="button" aria-pressed={key === tab} onClick={() => { setTab(key); setQuery('') }}>{catalogTypes[key].label}</button>)}</div>
    <div className="filters">
      <SearchBox label={'Search ' + catalogTypes[tab].label.toLowerCase()} value={query} onChange={setQuery} />
      {tab !== 'menus' && <Select label="Menu" blank="All menus" options={recordOptions(state.menus)} value={menuId} onChange={value => { setMenuId(value); setGroupId('') }} />}
      {tab === 'menuItems' && <>
        <Select label="Group" blank="All groups" options={recordOptions(groupsForMenu)} value={groupId} onChange={setGroupId} />
        <Select label="Availability" blank="All availability" options={availabilityOptions} value={availability} onChange={setAvailability} />
      </>}
    </div>
    <Ledger label={catalogTypes[tab].label} columns={columns} rows={rows} queryKey={[tab, query, menuId, groupId, availability].join('|')} />
    {editor && <CatalogEditor key={editor.row?.id ?? tab} {...{ state, commit, tab, menuId, groupId }} row={editor.row} close={() => setEditor(null)} />}
    {publish && <PublishDialog {...{ state, commit, drafts }} close={() => setPublish(false)} />}
  </>
}

function CatalogEditor({ state, commit, tab, menuId, groupId, row, close }) {
  const { singular } = catalogTypes[tab]
  const [name, setName] = useState(row?.name ?? '')
  const [parent, setParent] = useState(tab === 'menuGroups' ? row?.menuId ?? menuId : row?.menuGroupId ?? groupId)
  const [description, setDescription] = useState(row?.description ?? '')
  const [price, setPrice] = useState(row?.priceCents == null ? '' : (row.priceCents / 100).toFixed(2))
  const [availability, setAvailability] = useState(row?.availability ?? 'available')
  const [error, setError] = useState('')
  const parentOptions = tab === 'menuGroups' ? state.menus : state.menuGroups
  function submit() {
    if (!name.trim()) return setError('Enter a name.')
    if (tab !== 'menus' && !parentOptions.some(record => record.id === parent)) return setError('Choose an existing parent.')
    const priceCents = parseMoney(price)
    if (tab === 'menuItems' && priceCents === null) return setError('Enter a nonnegative price with up to two decimal places.')
    const fields = { name: name.trim() }
    if (tab === 'menuGroups') fields.menuId = parent
    if (tab === 'menuItems') Object.assign(fields, { menuGroupId: parent, description: description.trim(), priceCents, availability })
    commit(current => {
      const record = row ? {
        ...row, published: liveSnapshot(row, tab), ...fields, publicationStatus: 'draft', ...updateAudit(current),
      } : { id: newId(singular), ...fields, publicationStatus: 'draft', ...audit(current) }
      return { ...current, [tab]: row ? replace(current[tab], record) : [record, ...current[tab]] }
    }, (row ? 'Changes saved' : 'New ' + singular + ' saved') + ' as draft.')
    close()
  }
  return <Dialog title={(row ? 'Edit ' : 'Add ') + singular} submit="Save draft" onClose={close} onSubmit={submit} error={error}>
    <div className="form-grid">
      <Field label="Name" wide><input value={name} onChange={event => setName(event.target.value)} required maxLength={120} /></Field>
      {tab !== 'menus' && <Select label={tab === 'menuGroups' ? 'Parent menu' : 'Parent group'} blank="Choose a parent" options={recordOptions(parentOptions)} value={parent} onChange={setParent} required />}
      {tab === 'menuItems' && <>
        <Field label="Price"><input inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} required /></Field>
        <Select label="Availability" options={availabilityOptions} value={availability} onChange={setAvailability} />
        <Field label="Description" wide><textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} /></Field>
      </>}
    </div>
  </Dialog>
}

function PublishDialog({ state, commit, drafts, close }) {
  const [error, setError] = useState('')
  function submit() {
    const keys = Object.keys(catalogTypes)
    const pending = (key, record) => record.publicationStatus === 'draft' ? snapshot(record, key) : liveSnapshot(record, key)
    const menus = new Map(state.menus.map(record => [record.id, pending('menus', record)]))
    const groups = new Map(state.menuGroups.map(record => [record.id, pending('menuGroups', record)]))
    const invalid = drafts.some(({ key, record }) => {
      if (key === 'menuGroups') return !menus.get(record.menuId)
      if (key !== 'menuItems') return false
      const group = groups.get(record.menuGroupId)
      return !group || !menus.get(group.menuId)
    }) || state.menuItems.some(record => {
      if (record.publicationStatus === 'draft') return false
      const live = liveSnapshot(record, 'menuItems')
      if (!live) return false
      const group = groups.get(live.menuGroupId)
      return !!group && drafts.some(draft => draft.key === 'menuGroups' && draft.record.id === live.menuGroupId) && !menus.get(group.menuId)
    })
    if (invalid) return setError('A group or item is missing a published parent. Update the parent before publishing.')
    if (!drafts.length) return close()
    commit(current => {
      const publication = { id: newId('pub'), status: 'published', ...audit(current) }
      const { createdAt: publishedAt, createdBy: publishedBy } = publication
      const next = { ...current, menuPublications: [publication, ...current.menuPublications] }
      for (const key of keys) {
        const ids = []
        next[key] = current[key].map(record => {
          if (record.publicationStatus !== 'draft') return record
          ids.push(record.id)
          return { ...record, publicationStatus: 'published', published: snapshot(record, key), publishedAt, publishedBy, updatedAt: publishedAt, updatedBy: publishedBy }
        })
        publication[{ menus: 'menuIds', menuGroups: 'menuGroupIds', menuItems: 'menuItemIds' }[key]] = ids
      }
      return next
    }, 'Menu changes published.')
    close()
  }
  return <Dialog title="Publish menu changes" submit="Publish" {...{ error }} onSubmit={submit} onClose={close}>
    <p>{drafts.length} {drafts.length === 1 ? 'change is' : 'changes are'} ready to publish.</p>
    <dl className="pairs">{drafts.map(({ key, record }) => <div key={key + record.id}><dt>{record.name ?? record.id}</dt><dd className="muted">{catalogTypes[key].singular}</dd></div>)}</dl>
  </Dialog>
}

