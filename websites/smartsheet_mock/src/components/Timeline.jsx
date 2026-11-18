import React, { useEffect, useMemo, useRef } from 'react'
import { dateDay, dayDate, scheduleSpan, weekday } from '../data/schedule.js'
import { primaryOf } from '../data/sheets.js'

export const zooms = { Days: 40, Weeks: 22, Months: 9, Quarters: 4 }
const rowHeight = 32
const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const asDate = day => new Date(day * 86400000)

function categories(zoom, day) {
  const date = asDate(day)
  const month = date.getUTCMonth()
  const year = date.getUTCFullYear()
  if (zoom === 'Days') return [monthLabel.format(date), dateLabel.format(date)]
  if (zoom === 'Weeks') return [monthLabel.format(date), 'Week of ' + dateLabel.format(asDate(day - weekday(day) + 1))]
  if (zoom === 'Months') return [String(year), monthLabel.format(date)]
  return [String(year), 'Q' + (Math.floor(month / 3) + 1)]
}

function headers(from, to, zoom) {
  const strips = [[], []]
  for (let day = from; day <= to; day++) {
    categories(zoom, day).forEach((label, index) => {
      const last = strips[index].at(-1)
      if (last?.label === label) last.days++
      else strips[index].push({ label, days: 1, day })
    })
  }
  return strips
}

export default function Timeline({ sheet, rows, allRows, viewportRef, zoom, today, reveal, onBarPointerDown, drag }) {
  const settings = sheet.projectSettings
  const dayWidth = zooms[zoom]
  const primaryId = primaryOf(sheet)?.id
  const scheduled = useMemo(() => allRows.map(row => scheduleSpan(settings, row.cells)).filter(Boolean), [allRows, settings])
  const padding = Math.ceil(680 / dayWidth)
  const focus = reveal ? today : null
  const earliest = scheduled.length ? Math.min(...scheduled.map(span => span.start)) : today
  const latest = scheduled.length ? Math.max(...scheduled.map(span => span.end)) : today
  const wide = latest - earliest > 3800
  const from = focus != null && (wide || focus < earliest - 200 || focus > latest + 200) ? focus - padding : Math.min(earliest, focus ?? earliest) - 3
  const to = Math.max(from + padding * 2, Math.min(Math.max(latest, focus ?? latest) + padding, from + 4000))
  const width = (to - from + 1) * dayWidth
  const strips = useMemo(() => headers(from, to, zoom), [from, to, zoom])
  const x = day => (day - from) * dayWidth
  const weekends = []
  if (zoom === 'Days' || zoom === 'Weeks') {
    for (let day = from; day <= to; day++) if (weekday(day) >= 6) weekends.push(day)
  }
  const spans = rows.map(row => scheduleSpan(settings, row.cells))
  const indexById = new Map(rows.map((row, index) => [row.id, index]))
  useEffect(() => {
    const viewport = viewportRef.current
    if (viewport && reveal) viewport.scrollLeft = Math.max(0, (today - from) * dayWidth - viewport.clientWidth / 2)
  }, [reveal, today, from, dayWidth, viewportRef])
  return <div className="timeline" style={{ width }} aria-label="Task timeline">
    <div className="timeline-header">
      {strips.map((strip, index) => <div className="time-strip" key={index}>
        {strip.map(period => <span key={period.day} style={{ width: period.days * dayWidth }} title={period.label}>{period.label}</span>)}
      </div>)}
    </div>
    <div className="timeline-body" style={{ height: rows.length * rowHeight + 44 }}>
      {weekends.map(day => <span className="weekend" key={day} style={{ left: x(day), width: dayWidth }} />)}
      {today >= from && today <= to && <span className="today-marker" style={{ left: x(today) + dayWidth / 2 }}><b>Today</b></span>}
      {settings?.dependenciesEnabled && <svg aria-label="Predecessor links" className="connectors" width={width} height={rows.length * rowHeight}>
        <defs><marker id="dependency-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path fill="var(--gantt-line)" d="M 0 0 L 8 4 L 0 8 z" /></marker></defs>
        {rows.flatMap((row, index) => {
          const links = row.cells?.[settings.predecessorsColumnId]
          if (!Array.isArray(links) || !spans[index]) return []
          return links.map((link, linkIndex) => {
            const source = indexById.get(link?.rowId)
            if (source == null || !spans[source] || source === index) return null
            const start = x(spans[source].end + 1) - 2
            const end = x(spans[index].start) + 2
            const y1 = source * rowHeight + rowHeight / 2
            const y2 = index * rowHeight + rowHeight / 2
            const bend = start + Math.max(5, (end - start) / 2)
            if (Math.max(start, end) < 0 || Math.min(start, end) > width) return null
            return <path key={row.id + '-' + linkIndex} d={'M ' + start + ' ' + y1 + ' H ' + bend + ' V ' + y2 + ' H ' + end} markerEnd="url(#dependency-arrow)" />
          })
        })}
      </svg>}
      {rows.map((row, index) => {
        const current = spans[index]
        if (!current) return null
        const span = drag?.rowId === row.id ? { ...current, start: drag.start, end: drag.end } : current
        if (drag?.rowId !== row.id && (span.end < from || span.start > to)) return null
        const name = row.cells?.[primaryId] || 'Untitled task'
        const title = name + ' · ' + dayDate(span.start) + ' to ' + dayDate(span.end) + ' · ' + span.percent + '% complete'
        const left = x(Math.max(from, span.start))
        const length = (Math.min(to, span.end) - Math.max(from, span.start) + 1) * dayWidth
        return <div className="timeline-task" key={row.id} style={{ top: index * rowHeight, left }} title={title}>
          {span.milestone ? <div className="milestone-wrap" style={{ width: dayWidth }}>
            <span className="milestone" role="img" aria-label={title} onPointerDown={event => onBarPointerDown?.(event, row, current, 'move', dayWidth)} />
          </div> : <div className="task-bar" style={{ width: Math.max(5, length - 4) }} onPointerDown={event => onBarPointerDown?.(event, row, current, 'move', dayWidth)}>
            <span className="task-progress" style={{ width: span.percent + '%' }} />
            {onBarPointerDown && <>
              <span className="resize-task resize-start" title="Resize start" onPointerDown={event => onBarPointerDown(event, row, current, 'start', dayWidth)} />
              <span className="resize-task resize-end" title="Resize end" onPointerDown={event => onBarPointerDown(event, row, current, 'end', dayWidth)} />
            </>}
          </div>}
          <span className="task-label">{name}</span>
          {drag?.rowId === row.id && <span className="drag-dates">{dayDate(span.start)} – {dayDate(span.end)}</span>}
        </div>
      })}
    </div>
  </div>
}
