import React, { useState } from 'react'
import { saveProjectSettings } from '../data/schedule.js'
import { columnsOf, WEEKDAYS } from '../data/sheets.js'
import { useStore } from '../store.jsx'
import { Button, Dialog, Problem } from './ui.jsx'

const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const datePairs = [['startColumnId', 'Start date column'], ['endColumnId', 'End date column']]

export default function ProjectSettings({ sheet, close }) {
  const { commit } = useStore()
  const columns = columnsOf(sheet)
  const dates = columns.filter(column => column.type === 'date')
  const settings = sheet.projectSettings ?? {}
  const [draft, setDraft] = useState({
    startColumnId: settings.startColumnId ?? dates[0]?.id ?? '',
    endColumnId: settings.endColumnId ?? dates[1]?.id ?? '',
    percentColumnId: settings.percentColumnId ?? '',
    durationColumnId: settings.durationColumnId ?? columns.find(column => column.type === 'duration')?.id ?? '',
    predecessorsColumnId: settings.predecessorsColumnId ?? columns.find(column => column.type === 'predecessor')?.id ?? '',
    dependenciesEnabled: Boolean(settings.dependenciesEnabled), workingWeekdays: settings.workingWeekdays ?? WEEKDAYS,
    holidays: (settings.holidays ?? []).join('\n'),
  })
  const [error, setError] = useState('')
  function patch(values) { setDraft({ ...draft, ...values }); setError('') }
  function field(key, label, type, optional = false) {
    const choices = columns.filter(column => column.type === type)
    return <label key={key} className="field">{label}<select value={draft[key]} onChange={event => patch({ [key]: event.target.value })}>
      <option value="">{optional ? 'None' : 'Choose a column'}</option>
      {choices.map(column => <option key={column.id} value={column.id}>{column.title}</option>)}
      <option value="$new">Create a new column</option>
    </select></label>
  }
  return <Dialog title="Project Settings" onClose={close}>
    <form className="stack" onSubmit={event => {
      event.preventDefault()
      try {
        commit(current => saveProjectSettings(current, sheet, { ...draft, holidays: draft.holidays.split(/[\n,]+/).map(date => date.trim()).filter(Boolean) }))
        close()
      } catch (failure) { setError(failure.message) }
    }}>
      <div className="form-columns">{datePairs.map(([key, label]) => field(key, label, 'date'))}</div>
      {field('percentColumnId', 'Percent complete column', 'percent', true)}
      <label className="check"><input type="checkbox" checked={draft.dependenciesEnabled} onChange={event => patch({ dependenciesEnabled: event.target.checked })} /> Enable dependencies</label>
      {draft.dependenciesEnabled && <>
        <div className="form-columns">{field('durationColumnId', 'Duration column', 'duration')}{field('predecessorsColumnId', 'Predecessor column', 'predecessor')}</div>
        <fieldset className="weekday-fields"><legend>Working days</legend>
          {labels.map((label, index) => <label className="check" key={label}><input type="checkbox" checked={draft.workingWeekdays.includes(index + 1)}
            onChange={event => patch({ workingWeekdays: event.target.checked ? [...draft.workingWeekdays, index + 1] : draft.workingWeekdays.filter(day => day !== index + 1) })} /> {label}</label>)}
        </fieldset>
        <label className="field">Holidays<textarea rows="2" placeholder="YYYY-MM-DD, one per line" value={draft.holidays} onChange={event => patch({ holidays: event.target.value })} /></label>
      </>}
      <Problem message={error} />
      <div className="actions"><Button onClick={close}>Cancel</Button><Button variant="primary" type="submit">Save</Button></div>
    </form>
  </Dialog>
}
