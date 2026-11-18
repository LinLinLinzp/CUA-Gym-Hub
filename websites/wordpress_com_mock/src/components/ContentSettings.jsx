import React from 'react'
import { contentStatuses, pageParentOptions, typeLabel } from '../data/content.js'
import { formatStatus, rows, titleOf } from '../utils/display.js'
import { Field } from './Controls.jsx'

export function AuthorOptions({ users, selected }) {
  return <>
    {selected && !rows(users).some((user) => user.id === selected) && <option value={selected}>Unavailable author</option>}
    {rows(users).map((user) => <option key={user.id} value={user.id}>{user.name || user.username || 'Unnamed user'}</option>)}
  </>
}

export function ParentOptions({ pages, excludeIds, selected }) {
  const options = pageParentOptions(rows(pages), excludeIds)
  return <>
    <option value="">Top level</option>
    {selected && !options.some((page) => page.id === selected) && <option value={selected}>Current parent unavailable</option>}
    {options.map((page) => <option key={page.id} value={page.id}>{titleOf(page)}</option>)}
  </>
}

export function StatusOptions() {
  return contentStatuses.map((status) => <option key={status} value={status}>{status === 'pending' ? 'Pending Review' : formatStatus(status)}</option>)
}

export function TermChecks({ label, items, values, onChange }) {
  const selected = rows(values)
  return <fieldset className="term-checks"><legend>{label}</legend>
    {items.length ? <div>
      {items.map((item) => <label className="check-row" key={item.id}>
        <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />
        {item.name || item.slug || 'Unnamed term'}
      </label>)}
    </div> : <span className="meta">No {label.toLowerCase()} yet.</span>}
  </fieldset>
}

export function ContentSettings({ state, type, values, set, excludeIds, error, date, setDate, bulk = false }) {
  const showError = (key) => error?.field === key ? error.error : undefined
  return <>
    <Field label="Author"><select value={values.authorId ?? ''} onChange={(event) => set('authorId', event.target.value || (bulk ? undefined : null))}>
      <option value="">{bulk ? '— No change —' : '— Select author —'}</option>
      <AuthorOptions users={state.users} selected={values.authorId} />
    </select></Field>
    <Field label="Status" error={showError('status')}><select value={values.status ?? ''} onChange={(event) => set('status', event.target.value || undefined)}>
      {bulk && <option value="">— No change —</option>}<StatusOptions />
    </select></Field>
    {values.status === 'scheduled' && <Field label="Publish date and time (UTC)" error={showError('date')}><input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} /></Field>}
    <Field label="Comments"><select value={values.commentsOpen === undefined ? '' : String(values.commentsOpen)} onChange={(event) => set('commentsOpen', event.target.value ? event.target.value === 'true' : undefined)}>
      {bulk && <option value="">— No change —</option>}<option value="true">Allow comments</option><option value="false">Closed</option>
    </select></Field>
    {type === 'page' ? <>
      <Field label={typeLabel(type) + ' parent'} error={showError('parentId')}><select value={bulk && values.parentId === undefined ? 'no-change' : values.parentId ?? ''} onChange={(event) => set('parentId', event.target.value === 'no-change' ? undefined : event.target.value || null)}>
        {bulk && <option value="no-change">— No change —</option>}
        <ParentOptions pages={state.pages} excludeIds={excludeIds} selected={values.parentId} />
      </select></Field>
      {!bulk && <Field label="Order" error={showError('menuOrder')}><input type="number" step="1" value={values.menuOrder ?? ''} onChange={(event) => set('menuOrder', event.target.value)} /></Field>}
    </> : [['Categories', 'categories', 'categoryIds'], ['Tags', 'tags', 'tagIds']].map(([label, key, field]) => <div className="taxonomy-field" key={key}>
      {bulk && <label className="check-row"><input type="checkbox" checked={values[field] !== undefined} onChange={(event) => set(field, event.target.checked ? [] : undefined)} /> Replace {label.toLowerCase()}</label>}
      {(!bulk || values[field] !== undefined) && <TermChecks label={label} items={rows(state[key])} values={values[field]} onChange={(value) => set(field, value)} />}
    </div>)}
  </>
}
