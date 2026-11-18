import React, { useState } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import { changeContentLifecycle, collectionFor, contentFields, saveContent, typeLabel, utcInput } from '../data/content.js'
import { difference } from '../data/records.js'
import { contentDate, displayDate, named, rows, titleOf } from '../utils/display.js'
import { commentTargetPath, editorPath, newPath, previewPath, SiteLink, useSessionRouting } from '../utils/navigation.jsx'
import { BulkActions, Confirm, Field, MonthFilter, monthOf, Pagination, RowMenu, SearchBox, StatusPill, TabBar, useSelection } from '../components/Controls.jsx'
import { ContentSettings } from '../components/ContentSettings.jsx'

const PAGE_SIZE = 15
const tabs = [['all', 'All'], ['published', 'Published'], ['draft', 'Drafts'], ['pending', 'Pending'], ['scheduled', 'Scheduled'], ['private', 'Private'], ['trash', 'Trash']]
const canShow = (row, tab) => tab === 'all' ? row.status !== 'trash' : (row.status ?? 'draft') === tab
const activeActions = [['edit', 'Edit'], ['trash', 'Move to Trash']]
const trashActions = [['restore', 'Restore'], ['delete', 'Delete permanently']]

function QuickForm({ type, state, records, bulk, close }) {
  const { commit } = useStore()
  const record = records[0]
  const [initial] = useState(() => bulk ? {} : contentFields(record, type, state))
  const [values, setValues] = useState(initial)
  const [date, setDate] = useState(bulk ? '' : utcInput(record.scheduledAt))
  const [error, setError] = useState(null)
  const set = (name, value) => { setValues((previous) => ({ ...previous, [name]: value })); setError(null) }
  const ids = records.map((item) => item.id)
  const save = (event) => {
    event.preventDefault()
    const changes = Object.fromEntries(Object.entries(difference(initial, values)).filter(([, value]) => value !== undefined))
    const dateChanged = date !== (bulk ? '' : utcInput(record.scheduledAt))
    if (dateChanged && values.status === 'scheduled') changes.status = 'scheduled'
    const result = commit((current, stamp) => saveContent(current, stamp, type, ids, changes, { date: dateChanged || changes.status === 'scheduled' ? date : undefined }))
    if (result.error) setError(result)
    else close()
  }
  return <form className="quick-form" onSubmit={save}>
    <h2>{bulk ? 'Bulk Edit' : 'Quick Edit'}</h2>
    {bulk && <p className="muted">{records.map(titleOf).join(', ')}</p>}
    <div className="settings-grid">
      {!bulk && <>
        <Field label="Title" error={error?.field === 'title' ? error.error : undefined}><input value={values.title} onChange={(event) => set('title', event.target.value)} autoFocus /></Field>
        <Field label="Slug" error={error?.field === 'slug' ? error.error : undefined}><input value={values.slug} onChange={(event) => set('slug', event.target.value)} /></Field>
      </>}
      <ContentSettings state={state} type={type} values={values} set={set} excludeIds={ids} error={error} date={date} setDate={setDate} bulk={bulk} />
    </div>
    {error && <p role="alert" className="text-danger">{error.error}</p>}
    <div className="inline-controls"><button className="button primary">Update</button><button className="button" type="button" onClick={close}>Cancel</button></div>
  </form>
}

function ContentSearch({ label, query, submit }) {
  const [value, setValue] = useState(query)
  return <SearchBox label={label} value={value} onChange={setValue} onSearch={(text) => submit(text.trim())} />
}

export default function ContentList({ type }) {
  const { state, commit, notify } = useStore()
  const [params] = useSearchParams()
  const { go } = useSessionRouting()
  const [quick, setQuick] = useState(null)
  const [bulkEdit, setBulkEdit] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const noun = typeLabel(type)
  const label = noun + 's'
  const key = collectionFor(type)
  const records = rows(state[key])
  const categories = rows(state.categories)
  const tags = rows(state.tags)
  const tab = tabs.some(([id]) => id === params.get('post_status')) ? params.get('post_status') : 'all'
  const search = params.get('s') || ''
  const month = params.get('m') || ''
  const category = params.get('cat') || ''
  const sort = params.get('orderby') || 'date'
  const direction = params.get('order') || 'desc'
  const url = (patch) => {
    const next = new URLSearchParams(params)
    next.delete('paged')
    for (const [field, value] of Object.entries(patch)) value ? next.set(field, value) : next.delete(field)
    return '/wp-admin/edit.php' + (next.size ? '?' + next : '')
  }
  const change = (patch) => { setQuick(null); setBulkEdit(false); go(url(patch)) }
  const termsFor = (terms, ids) => rows(ids).map((id) => terms.find((term) => term.id === id)?.name).filter(Boolean).join(', ') || '—'
  const sortValue = (row) => sort === 'title' ? titleOf(row).toLowerCase() : (contentDate(row) || '')
  const filtered = records.filter((row) => canShow(row, tab) &&
    (!search || [row.title, row.slug, row.excerpt].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))) &&
    (!month || monthOf(contentDate(row)) === month) &&
    (type !== 'post' || !category || rows(row.categoryIds).includes(category))
  ).sort((a, b) => {
    const comparison = sort === 'menu_order' ? (Number(a.menuOrder) || 0) - (Number(b.menuOrder) || 0) : sortValue(a).localeCompare(sortValue(b))
    return (direction === 'asc' ? comparison : -comparison) || titleOf(a).localeCompare(titleOf(b))
  })
  const page = Math.min(Math.max(1, Number.parseInt(params.get('paged'), 10) || 1), Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selection = useSelection(JSON.stringify([tab, search, month, category, sort, direction, page, filtered.map((item) => item.id)]))
  const selectedRows = shown.filter((item) => selection.ids.includes(item.id))
  const commentCounts = new Map()
  for (const comment of rows(state.comments)) {
    if (comment.contentType === type && ['approved', 'pending'].includes(comment.status)) {
      commentCounts.set(comment.contentId, (commentCounts.get(comment.contentId) || 0) + 1)
    }
  }
  const lifecycle = (action, targets) => {
    if (action === 'delete') return setDeleting(targets)
    const result = commit((current, stamp) => changeContentLifecycle(current, stamp, type, targets.map((row) => row.id), action))
    if (result.error) notify(result.error)
    setQuick(null)
    setBulkEdit(false)
    selection.clear()
  }
  const toggleSort = (field) => change({ orderby: field, order: sort === field && direction === 'asc' ? 'desc' : 'asc' })
  const sortHeader = (field, name) => <th scope="col" aria-sort={sort === field ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}><button type="button" className="table-sort" onClick={() => toggleSort(field)}>{name}{sort === field && <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>}</button></th>
  const columns = type === 'post' ? 9 : 7
  return <section className="list-screen">
    <header className="screen-header"><h1>{label}</h1><SiteLink className="button primary" to={newPath(type)}><Plus size={16} /> Add New {noun}</SiteLink></header>
    <TabBar label={label + ' status'} items={tabs.map(([id, name]) => [id, name, records.filter((row) => canShow(row, id)).length])} current={tab} path={(status) => url({ post_status: status === 'all' ? '' : status })} />
    <div className="list-toolbar">
      <div className="inline-controls toolbar-filters">
        <BulkActions actions={tab === 'trash' ? trashActions : activeActions} count={selectedRows.length} submit={(action) => { setQuick(null); if (action === 'edit') setBulkEdit(true); else lifecycle(action, selectedRows) }} />
        <MonthFilter dates={records.map(contentDate)} value={month} change={(value) => change({ m: value })} />
        {type === 'post' && <select aria-label="Filter by category" value={category} onChange={(event) => change({ cat: event.target.value })}><option value="">All categories</option>{categories.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</select>}
      </div>
      <ContentSearch key={search} label={'Search ' + label} query={search} submit={(value) => change({ s: value })} />
    </div>
    {bulkEdit && selectedRows.length > 0 && <QuickForm key={selection.ids.join(',')} type={type} records={selectedRows} state={state} bulk close={() => { setBulkEdit(false); selection.clear() }} />}
    <div className="table-wrap" tabIndex={0} role="region" aria-label={label + ' table'}>
      <table><thead><tr>
        <th className="check-cell"><input type="checkbox" aria-label={'Select all ' + label.toLowerCase() + ' on this page'} checked={shown.length > 0 && selection.ids.length === shown.length} disabled={!shown.length} onChange={() => selection.toggleAll(shown.map((row) => row.id))} /></th>
        {sortHeader('title', 'Title')}<th>Status</th><th>Author</th>
        {type === 'post' ? <><th>Categories</th><th>Tags</th><th>Comments</th></> : sortHeader('menu_order', 'Order')}
        {sortHeader('date', 'Date')}<th className="action-cell"><span className="visually-hidden">Actions</span></th>
      </tr></thead>
      <tbody>{shown.map((record) => {
        const title = titleOf(record)
        const parent = type === 'page' && rows(state.pages).find((page) => page.id === record.parentId && page.id !== record.id)
        const actions = record.status === 'trash' ? [
          { label: 'Restore', run: () => lifecycle('restore', [record]) },
          { label: 'Delete permanently', danger: true, run: () => setDeleting([record]) },
        ] : [
          { label: 'Edit', to: editorPath(record.id) },
          { label: 'Quick Edit', run: () => { setBulkEdit(false); setQuick(record.id) } },
          { label: 'View', to: previewPath(type, record.id) },
          { label: 'Move to Trash', danger: true, run: () => lifecycle('trash', [record]) },
        ]
        return <React.Fragment key={record.id}><tr className={selection.ids.includes(record.id) ? 'selected-row' : undefined}>
          <td className="check-cell"><input type="checkbox" aria-label={'Select ' + title} checked={selection.ids.includes(record.id)} onChange={() => selection.toggle(record.id)} /></td>
          <td className="title-cell"><SiteLink to={editorPath(record.id)} className="record-title">{title}</SiteLink>{parent && <div className="meta">Parent {titleOf(parent)}</div>}</td>
          <td><StatusPill status={record.status} /></td><td>{named(state.users, record.authorId)}</td>
          {type === 'post' ? <>
            <td>{termsFor(categories, record.categoryIds)}</td><td>{termsFor(tags, record.tagIds)}</td>
            <td><SiteLink className="table-comments" aria-label={'Comments on ' + title} to={commentTargetPath(record.id)}><MessageSquare size={14} /> {commentCounts.get(record.id) || 0}</SiteLink></td>
          </> : <td>{record.menuOrder ?? 0}</td>}
          <td className="meta nowrap">{displayDate(contentDate(record))}</td>
          <td className="action-cell"><RowMenu label={'Actions for ' + title} actions={actions} /></td>
        </tr>
        {quick === record.id && <tr><td colSpan={columns} className="quick-cell"><QuickForm type={type} records={[record]} state={state} close={() => setQuick(null)} /></td></tr>}
        </React.Fragment>
      })}</tbody></table>
      {!shown.length && <div className="empty table-empty"><h2>No {label.toLowerCase()} found</h2>{!records.length && <SiteLink className="button" to={newPath(type)}>Add New {noun}</SiteLink>}</div>}
    </div>
    <Pagination count={filtered.length} page={page} size={PAGE_SIZE} change={(number) => change({ paged: number === 1 ? '' : String(number) })} />
    {deleting && <Confirm destructive title={'Delete ' + (deleting.length === 1 ? noun.toLowerCase() : label.toLowerCase()) + ' permanently?'} action="Delete permanently" close={() => setDeleting(null)} confirm={() => {
      const result = commit((current, stamp) => changeContentLifecycle(current, stamp, type, deleting.map((row) => row.id), 'delete'))
      if (result.error) notify(result.error)
      setDeleting(null); selection.clear()
    }}><p>This permanently removes the selected {deleting.length === 1 ? noun.toLowerCase() : label.toLowerCase()} and associated comments.</p><ul>{deleting.map((row) => <li key={row.id}>{titleOf(row)}</li>)}</ul></Confirm>}
  </section>
}
