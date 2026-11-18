import React, { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ClipboardList, ExternalLink, Eye, Link2, Plus, Trash2 } from 'lucide-react'
import { useOutletContext, useParams } from 'react-router-dom'
import CellInput from '../components/CellInput.jsx'
import FormResponse from '../components/FormResponse.jsx'
import { Unavailable } from '../components/Resource.jsx'
import { AppLink, Button, Dialog, Empty, IconButton, Problem, Status, formatUpdate, useAppNavigate } from '../components/ui.jsx'
import { changeFormStatus, formColumns, newField, newForm, saveForm, submitForm } from '../data/forms.js'
import { byId, idFor, isActive, sheetPath } from '../data/sheets.js'
import { useStore } from '../store.jsx'
import { withSid } from '../utils/dataManager.js'

const publicPath = id => '/forms/' + encodeURIComponent(id)

export function FormsList() {
  const { sheet } = useOutletContext()
  const { state, commit } = useStore()
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const forms = (state.forms ?? []).filter(form => form.sheetId === sheet.id)
  const base = sheetPath(sheet) + '/forms'
  async function copy(form) {
    const url = new URL(withSid(publicPath(form.id)), window.location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      setFeedback('Link copied for ' + form.title + '.')
    } catch { setLink(url) }
  }
  return <section className="page sheet-subpage">
    <div className="section-heading"><div><h2>Forms</h2><p className="muted">Collect responses directly in this sheet.</p></div><AppLink className="button primary" to={base + '/new'}><Plus size={16} /> Create form</AppLink></div>
    <p role="status">{feedback}</p><Problem message={error} />
    <div className="panel">
      {forms.length ? <div className="table-scroll"><table className="records-table">
        <thead><tr><th>Form</th><th>Status</th><th>Last updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{forms.map(form => <tr key={form.id}>
          <td><AppLink className="item-link" to={base + '/' + encodeURIComponent(form.id) + '/edit'}><span className="item-icon"><ClipboardList size={16} /></span>{form.title || 'Untitled form'}</AppLink></td>
          <td><Status value={form.status || 'active'} /></td><td className="muted">{formatUpdate(form.updatedAt)}</td>
          <td><div className="actions">
            {form.status !== 'inactive' && <>
              <a className="button subtle" href={withSid(publicPath(form.id))} target="_blank" rel="noopener"><ExternalLink size={15} /> Open form</a>
              <Button variant="subtle" onClick={() => copy(form)}><Link2 size={15} /> Copy link</Button>
            </>}
            <Button onClick={() => { try { commit(current => changeFormStatus(current, sheet.id, form.id)); setError(''); setFeedback('') } catch (failure) { setError(failure.message) } }}>{form.status === 'inactive' ? 'Reactivate' : 'Deactivate'}</Button>
          </div></td>
        </tr>)}</tbody>
      </table></div> : <Empty title="No forms yet" icon={ClipboardList} />}
    </div>
    {link && <Dialog title="Copy form link" onClose={() => setLink('')}><label className="field">Public URL<input autoFocus readOnly value={link} onFocus={event => event.target.select()} /></label></Dialog>}
  </section>
}

export function FormBuilder() {
  const { sheet } = useOutletContext()
  const { state } = useStore()
  const { formId } = useParams()
  const form = byId(state.forms, formId)
  if (formId && form?.sheetId !== sheet.id) return <Unavailable title="Form unavailable" to={sheetPath(sheet) + '/forms'} link="Back to forms" />
  return <Editor key={formId || 'new'} sheet={sheet} form={form} />
}

function moveField(fields, index, offset) {
  const ordered = [...fields]
  const [field] = ordered.splice(index, 1)
  ordered.splice(index + offset, 0, field)
  return ordered
}

function Editor({ sheet, form }) {
  const { state, commit } = useStore()
  const navigate = useAppNavigate()
  const base = sheetPath(sheet) + '/forms'
  const [draft, setDraft] = useState(() => form ? { ...form, fields: form.fields ?? [] } : newForm(state, sheet))
  const [selected, setSelected] = useState(draft.fields[0]?.id)
  const [picker, showPicker] = useState(false)
  const [preview, showPreview] = useState(false)
  const [error, setError] = useState('')
  const allowed = formColumns(state, sheet)
  const available = allowed.filter(column => !draft.fields.some(field => field.columnId === column.id))
  const current = byId(draft.fields, selected)
  const column = byId(allowed, current?.columnId)
  const earlierFields = draft.fields.slice(0, draft.fields.findIndex(field => field.id === selected))
    .filter(field => !field.hidden && byId(allowed, field.columnId))
  const conditionField = byId(earlierFields, current?.visibleWhen?.fieldId)
  const conditionColumn = byId(allowed, conditionField?.columnId)
  function patch(values) { setDraft(previous => ({ ...previous, ...values })); setError('') }
  function patchField(values) { patch({ fields: draft.fields.map(field => field.id === selected ? { ...field, ...values } : field) }) }
  function save() {
    try {
      commit(state => saveForm(state, sheet.id, form?.id ?? idFor('frm'), draft))
      navigate(base)
    } catch (failure) { setError(failure.message) }
  }
  return <section className="page sheet-subpage form-editor">
    <div className="section-heading">
      <div><AppLink className="back-link" to={base}><ArrowLeft size={14} /> Forms</AppLink><h2>{form ? 'Edit form' : 'Create form'}</h2></div>
      <div className="actions"><Button onClick={() => showPreview(!preview)}><Eye size={16} /> {preview ? 'Back to builder' : 'Preview'}</Button><Button variant="primary" onClick={save}>Save form</Button></div>
    </div>
    <Problem message={error} />
    {preview ? <FormResponse sheet={sheet} form={draft} preview /> : <div className="form-builder-layout">
      <section className="panel field-canvas stack">
        <label className="field">Form title<input required value={draft.title ?? ''} onChange={event => patch({ title: event.target.value })} /></label>
        <label className="field">Description<textarea rows="2" value={draft.description ?? ''} onChange={event => patch({ description: event.target.value })} /></label>
        <div className="section-heading compact"><h3>Fields</h3><Button onClick={() => showPicker(true)} disabled={!available.length}><Plus size={15} /> Add field</Button></div>
        {!draft.fields.length && <Empty title="Add fields from this sheet" icon={ClipboardList} />}
        {draft.fields.map((field, index) => {
          const source = byId(allowed, field.columnId)
          return <div className={'builder-field ' + (selected === field.id ? 'current' : '')} key={field.id}>
            <button className="field-select" aria-pressed={selected === field.id} onClick={() => setSelected(field.id)}><strong>{field.label || source?.title || 'Unavailable column'}{field.required && ' *'}</strong><small>{field.hidden ? 'Hidden' : field.helpText || source?.title || 'Field unavailable'}</small></button>
            <IconButton label={'Move ' + field.label + ' up'} disabled={index === 0} onClick={() => patch({ fields: moveField(draft.fields, index, -1) })}><ArrowUp size={16} /></IconButton>
            <IconButton label={'Move ' + field.label + ' down'} disabled={index === draft.fields.length - 1} onClick={() => patch({ fields: moveField(draft.fields, index, 1) })}><ArrowDown size={16} /></IconButton>
            <IconButton label={'Remove ' + field.label} onClick={() => {
              const next = draft.fields.filter(item => item.id !== field.id)
              patch({ fields: next })
              if (selected === field.id) setSelected(next[Math.min(index, next.length - 1)]?.id)
            }}><Trash2 size={15} /></IconButton>
          </div>
        })}
      </section>
      <aside className="builder-properties stack">
        {current && column && <section className="panel stack properties">
          <h3>Field properties</h3>
          <label className="field">Label<input value={current.label ?? ''} onChange={event => patchField({ label: event.target.value })} /></label>
          <label className="field">Help text<textarea rows="2" value={current.helpText ?? ''} onChange={event => patchField({ helpText: event.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={Boolean(current.required)} onChange={event => patchField({ required: event.target.checked })} /> Required</label>
          <label className="check"><input type="checkbox" checked={Boolean(current.hidden)} onChange={event => patchField({ hidden: event.target.checked })} /> Hidden</label>
          <label className="field">Default value<CellInput column={column} value={current.defaultValue} onChange={defaultValue => patchField({ defaultValue })} users={state.users} booleanSelect /></label>
          <label className="field">Show when<select value={current.visibleWhen?.fieldId ?? ''} onChange={event => patchField({ visibleWhen: event.target.value ? { fieldId: event.target.value, equals: null } : undefined })}>
            <option value="">Always</option>
            {current.visibleWhen && !conditionField && <option value={current.visibleWhen.fieldId} disabled>Earlier field unavailable</option>}
            {earlierFields.map(field => <option value={field.id} key={field.id}>{field.label || byId(allowed, field.columnId)?.title}</option>)}
          </select></label>
          {conditionColumn && <label className="field">Matches value<CellInput column={conditionColumn} value={current.visibleWhen.equals} users={state.users} booleanSelect
            onChange={equals => patchField({ visibleWhen: { ...current.visibleWhen, equals } })} /></label>}
        </section>}
        <section className="panel stack properties">
          <h3>Submission settings</h3>
          <label className="field">Confirmation message<textarea rows="2" value={draft.confirmationMessage ?? ''} onChange={event => patch({ confirmationMessage: event.target.value })} /></label>
          <label className="field">New row placement<select value={draft.rowPlacement ?? 'bottom'} onChange={event => patch({ rowPlacement: event.target.value })}><option value="bottom">Bottom of sheet</option><option value="top">Top of sheet</option></select></label>
        </section>
      </aside>
    </div>}
    {picker && <Dialog title="Add field" onClose={() => showPicker(false)}><div className="stack">
      {available.map(option => <Button key={option.id} onClick={() => {
        const field = newField(option)
        patch({ fields: [...draft.fields, field] })
        setSelected(field.id)
        showPicker(false)
      }}><Plus size={15} /> {option.title}</Button>)}
    </div></Dialog>}
  </section>
}

export function PublicForm() {
  const { state, commit } = useStore()
  const { formId } = useParams()
  const form = byId(state.forms, formId)
  const sheet = byId(state.sheets, form?.sheetId)
  if (!form || !isActive(sheet)) return <Unavailable title="Form unavailable" />
  if (form.status === 'inactive') return <Unavailable title="This form is no longer accepting responses" />
  return <main className="public-form page">
    <FormResponse key={form.id} sheet={sheet} form={form} onSubmit={answers => commit(current => submitForm(current, form.id, answers))} />
  </main>
}
