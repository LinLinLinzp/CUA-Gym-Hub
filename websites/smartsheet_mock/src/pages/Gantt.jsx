import React, { useRef, useState } from 'react'
import { CalendarDays, Settings2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import FilterPanel from '../components/FilterPanel.jsx'
import Grid from '../components/Grid.jsx'
import ProjectSettings from '../components/ProjectSettings.jsx'
import Timeline, { zooms } from '../components/Timeline.jsx'
import { Button, Empty, Problem } from '../components/ui.jsx'
import { sortRows, visibleRows } from '../data/filters.js'
import { dateDay, dayDate, shiftDrag, todayDate } from '../data/schedule.js'
import { editCells } from '../data/rows.js'
import { byId, columnsOf, rowsOf } from '../data/sheets.js'
import { useStore } from '../store.jsx'

export default function Gantt() {
  const { sheet, filter, setFilter, filterOpen, setFilterOpen } = useOutletContext()
  const { state, commit } = useStore()
  const [zoom, setZoom] = useState('Weeks')
  const [split, setSplit] = useState(40)
  const [reveal, setReveal] = useState(0)
  const [settingsOpen, setSettings] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(null)
  const gesture = useRef(null)
  const left = useRef(null)
  const right = useRef(null)
  const splitArea = useRef(null)
  const resize = useRef(null)
  const settings = sheet.projectSettings
  const columns = columnsOf(sheet)
  const mapped = settings?.startColumnId !== settings?.endColumnId && byId(columns, settings?.startColumnId)?.type === 'date' && byId(columns, settings?.endColumnId)?.type === 'date'
  const rows = visibleRows(state, sheet, filter)

  function sync(source, target) {
    if (target.current && target.current.scrollTop !== source.current.scrollTop) target.current.scrollTop = source.current.scrollTop
  }

  function onSort(column, direction) {
    try {
      commit(current => sortRows(current, sheet, column, direction))
      setFilter(null)
      setError('')
    } catch (failure) { setError(failure.message) }
  }

  function setDivider(value) { setSplit(Math.min(75, Math.max(25, value))) }

  function startDrag(event, row, span, mode, dayWidth) {
    if (event.button !== 0 || gesture.current) return
    event.stopPropagation()
    const links = row.cells?.[settings.predecessorsColumnId]
    if (settings.dependenciesEnabled && mode !== 'end' && Array.isArray(links) && links.length) {
      setError('Change the predecessors to move this task’s start date.')
      return
    }
    event.preventDefault()
    setError('')
    gesture.current = { row, span, mode, dayWidth, origin: event.clientX, pointerId: event.pointerId }
    splitArea.current.setPointerCapture(event.pointerId)
  }

  function dragPreview(event) {
    const active = gesture.current
    if (!active || event.pointerId !== active.pointerId) return null
    const offset = Math.round((event.clientX - active.origin) / active.dayWidth)
    return { ...shiftDrag(settings, active, offset), rowId: active.row.id, offset }
  }

  function drop(event) {
    const active = gesture.current
    if (!active || active.pointerId !== event.pointerId) return
    try {
      const result = dragPreview(event)
      if (!result?.offset) return
      const { mode, span } = active
      const edits = {}
      if (mode !== 'end' && span.single !== 'end') edits[settings.startColumnId] = dayDate(result.start)
      if (mode === 'end' || mode === 'move' && !settings.dependenciesEnabled && span.single !== 'start') edits[settings.endColumnId] = dayDate(result.end)
      commit(current => editCells(current, sheet.id, active.row.id, edits, { resizeStart: mode === 'start' }))
    } catch (failure) { setError(failure.message) }
    finally { clearDrag() }
  }

  function clearDrag() { gesture.current = null; setDrag(null) }

  return <div className="sheet-workarea gantt-area">
    {filterOpen && <FilterPanel sheet={sheet} filter={filter} setFilter={setFilter} close={() => setFilterOpen(false)} />}
    <div className="gantt-actions">
      <Button onClick={() => setSettings(true)}><Settings2 size={16} /> Project Settings</Button>
      <div className="actions">
        {reveal > 0 && <Button variant="subtle" onClick={() => { setReveal(0); if (right.current) right.current.scrollLeft = 0 }}>Schedule</Button>}
        <Button onClick={() => setReveal(reveal + 1)} disabled={!mapped}><CalendarDays size={15} /> Today</Button>
        <label className="zoom-control">Zoom<select value={zoom} onChange={event => setZoom(event.target.value)}>{Object.keys(zooms).map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
    </div>
    <Problem message={error} />
    <div className="gantt-split panel" ref={splitArea} style={{ '--split': split + '%' }}
      onPointerMove={event => {
        try {
          const result = dragPreview(event)
          if (result) { setError(''); setDrag(result) }
        } catch (failure) { setError(failure.message); setDrag(null) }
      }}
      onPointerUp={drop} onPointerCancel={clearDrag} onLostPointerCapture={event => { if (event.target === splitArea.current) clearDrag() }}>
      <div className="gantt-pane" ref={left} onScroll={() => sync(left, right)}><Grid sheet={sheet} rows={rows} gantt onSort={onSort} /></div>
      <div className="gantt-divider" role="separator" aria-label="Resize Gantt panes" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={75} aria-valuenow={Math.round(split)} tabIndex={0}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setDivider(split + (event.key === 'ArrowLeft' ? -3 : 3)) }
        }}
        onPointerDown={event => { resize.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId) }}
        onLostPointerCapture={() => { resize.current = null }}
        onPointerMove={event => {
          if (resize.current !== event.pointerId) return
          const bounds = splitArea.current.getBoundingClientRect()
          setDivider((event.clientX - bounds.left) / bounds.width * 100)
        }} />
      <div className="gantt-pane" ref={right} onScroll={() => sync(right, left)}>
        {mapped ? <Timeline sheet={sheet} rows={rows} allRows={rowsOf(state, sheet.id)} viewportRef={right} zoom={zoom} today={dateDay(todayDate())} reveal={reveal} onBarPointerDown={startDrag} drag={drag} /> :
          <Empty title="Set up your timeline" icon={CalendarDays}><p>Map the start and end date columns in Project Settings.</p><Button onClick={() => setSettings(true)}>Project Settings</Button></Empty>}
      </div>
    </div>
    {settingsOpen && <ProjectSettings sheet={sheet} close={() => setSettings(false)} />}
  </div>
}
