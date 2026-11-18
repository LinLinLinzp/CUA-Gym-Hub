import { isDate } from './cells.js'
import { byId, changedBy, columnsOf, idFor, rowsOf, WEEKDAYS } from './sheets.js'

const DAY_MS = 86400000
export const dateDay = value => isDate(value) ? Date.parse(value + 'T00:00:00Z') / DAY_MS : null
export const dayDate = day => new Date(day * DAY_MS).toISOString().slice(0, 10)
export const weekday = day => ((day + 3) % 7 + 7) % 7 + 1
export const todayDate = () => {
  const now = new Date()
  return [String(now.getFullYear()).padStart(4, '0'), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

export function scheduleSpan(settings, cells) {
  if (!settings) return null
  const start = dateDay(cells?.[settings.startColumnId])
  const end = dateDay(cells?.[settings.endColumnId])
  if (start == null && end == null || start != null && end != null && end < start) return null
  if (settings.dependenciesEnabled && (start == null || end == null)) return null
  return {
    start: start ?? end, end: end ?? start,
    milestone: settings.dependenciesEnabled ? cells?.[settings.durationColumnId] === 0 : start == null || end == null,
    percent: Math.min(100, Math.max(0, Number(cells?.[settings.percentColumnId]) || 0)),
    single: start == null ? 'end' : end == null ? 'start' : null,
  }
}

const firstDay = dateDay('0001-01-01')
const lastDay = dateDay('9999-12-31')

function calendar(settings) {
  const week = new Set(settings.workingWeekdays ?? WEEKDAYS)
  const holidays = new Set((settings.holidays ?? []).map(dateDay))
  if (![1, 2, 3, 4, 5, 6, 7].some(day => week.has(day))) throw new Error('Select at least one working day.')
  function working(day) { return week.has(weekday(day)) && !holidays.has(day) }
  function valid(day) {
    if (day < firstDay || day > lastDay) throw new Error('The calculated date is outside the supported range.')
    return day
  }
  function advance(day, count) {
    if (Math.abs(count) > lastDay - firstDay) throw new Error('The calculated date is outside the supported range.')
    const step = Math.sign(count)
    let remaining = Math.abs(count)
    while (remaining) {
      day = valid(day + step)
      if (working(day)) remaining--
    }
    return day
  }
  function inclusive(start, end) {
    if (end < start) throw new Error('End date must be on or after the start date.')
    let count = 0
    for (let day = start; day <= end; day++) if (working(day)) count++
    return count
  }
  return {
    advance, inclusive, working,
    snap: day => working(day) ? valid(day) : advance(day, 1),
  }
}

function predecessorList(row, settings) {
  const value = row.cells?.[settings.predecessorsColumnId]
  return Array.isArray(value) ? value : []
}

function targetRows(rows, settings, rowId) {
  if (!rowId) return new Set(rows.map(row => row.id))
  const successors = new Map()
  for (const row of rows) {
    for (const link of predecessorList(row, settings)) {
      if (link?.rowId) {
        if (!successors.has(link.rowId)) successors.set(link.rowId, [])
        successors.get(link.rowId).push(row.id)
      }
    }
  }
  const targets = new Set([rowId])
  for (const id of targets) for (const successor of successors.get(id) ?? []) targets.add(successor)
  return targets
}

export function recalculateSchedule(settings, rows, options = {}) {
  const { rowId, directIds = [], inferDuration = false, resizeStart = false } = options
  const startId = settings.startColumnId
  const endId = settings.endColumnId
  const durationId = settings.durationColumnId
  const predId = settings.predecessorsColumnId
  if (!settings.dependenciesEnabled) {
    for (const row of rows) {
      if (rowId && row.id !== rowId) continue
      const start = dateDay(row.cells?.[startId])
      const end = dateDay(row.cells?.[endId])
      if (start != null && end != null && end < start) throw new Error('End date must be on or after the start date.')
    }
    return rows
  }
  if (!startId || !endId || !durationId || !predId) throw new Error('Complete the project column mappings before editing dependencies.')

  const work = calendar(settings)
  const existing = new Map(rows.map(row => [row.id, row]))
  const targets = targetRows(rows, settings, rowId)
  const calculated = new Map()
  const visiting = new Set()

  function calculate(row) {
    if (!targets.has(row.id)) return row
    if (calculated.has(row.id)) return calculated.get(row.id)
    if (visiting.has(row.id)) throw new Error('These predecessors create a circular dependency.')
    visiting.add(row.id)

    const cells = { ...row.cells }
    const oldStart = dateDay(cells[startId])
    const oldEnd = dateDay(cells[endId])
    let start = oldStart
    let end = oldEnd
    let duration = Number.isSafeInteger(cells[durationId]) && cells[durationId] >= 0 ? cells[durationId] : null
    const links = predecessorList(row, settings)
    const direct = row.id === rowId
    if (links.length) {
      if (direct && directIds.includes(startId)) throw new Error('Change the predecessors to move this task’s start date.')
      start = Math.max(...links.map(link => {
        if (!link || link.rowId === row.id) throw new Error('A task cannot depend on itself.')
        const previous = existing.get(link.rowId)
        if (!previous || link.type !== 'FS' || !Number.isSafeInteger(link.lagDays)) throw new Error('Each predecessor must reference an active task in this sheet.')
        const finish = dateDay(calculate(previous).cells?.[endId])
        if (finish == null) throw new Error('Each predecessor must have a scheduled finish date.')
        return work.advance(work.advance(finish, 1), link.lagDays)
      }))
    }
    if (duration == null && oldStart != null && oldEnd != null && (inferDuration || !direct || !directIds.includes(durationId))) {
      duration = Math.max(1, work.inclusive(oldStart, oldEnd))
    }
    if (start != null) start = work.snap(start)
    if (direct && (directIds.includes(endId) || resizeStart)) {
      if (start != null && end != null) {
        if (end < start) throw new Error('End date must be on or after the start date.')
        if (!work.working(end)) throw new Error('Choose a working day for the end date.')
        duration = duration === 0 && end === start ? 0 : work.inclusive(start, end)
      } else if (end == null) duration = null
    }
    if (start != null && duration != null) end = duration === 0 ? start : work.advance(start, duration - 1)
    else if (direct && (directIds.includes(startId) && start == null || directIds.includes(durationId) && duration == null)) end = null

    function set(column, value) { if (value != null || cells[column] != null) cells[column] = value }
    set(startId, start == null ? null : dayDate(start))
    set(endId, end == null ? null : dayDate(end))
    set(durationId, duration)
    const result = JSON.stringify(row.cells ?? {}) === JSON.stringify(cells) ? row : { ...row, cells }
    calculated.set(row.id, result)
    visiting.delete(row.id)
    return result
  }
  return rows.map(calculate)
}

const mappings = [
  ['startColumnId', 'date', 'Start Date'],
  ['endColumnId', 'date', 'End Date'],
  ['percentColumnId', 'percent', '% Complete'],
  ['durationColumnId', 'duration', 'Duration'],
  ['predecessorsColumnId', 'predecessor', 'Predecessors'],
]

export function saveProjectSettings(state, sheet, draft) {
  const current = byId(state.sheets, sheet.id)
  if (!current || current.status === 'deleted') throw new Error('This sheet is unavailable.')
  const columns = [...columnsOf(current)]
  const settings = { dependenciesEnabled: Boolean(draft.dependenciesEnabled), workingWeekdays: [...new Set(draft.workingWeekdays)].sort(), holidays: [...new Set(draft.holidays)].sort() }
  if (settings.holidays.some(date => !isDate(date))) throw new Error('Enter valid holidays in YYYY-MM-DD format.')
  if (settings.workingWeekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7) || settings.dependenciesEnabled && !settings.workingWeekdays.length) throw new Error('Select at least one working day.')
  for (const [key, type, title] of mappings) {
    const required = type === 'date' || settings.dependenciesEnabled && ['duration', 'predecessor'].includes(type)
    const value = draft[key]
    if (value === '$new') {
      let name = title
      let suffix = 2
      while (columns.some(column => column.title?.toLowerCase() === name.toLowerCase())) name = title + ' ' + suffix++
      const id = idFor('col')
      columns.push({ id, title: name, type })
      settings[key] = id
    } else if (byId(columns, value)?.type === type) settings[key] = value
    else if (required) throw new Error('Map or create a ' + title + ' column.')
  }
  if (settings.startColumnId === settings.endColumnId) throw new Error('Choose two different columns for start and end dates.')
  const update = changedBy(state)
  const previous = rowsOf(state, sheet.id)
  const next = recalculateSchedule(settings, previous, { inferDuration: true })
  const updated = new Map()
  next.forEach((row, index) => { if (row !== previous[index]) updated.set(row.id, { ...row, ...update }) })
  return {
    ...state,
    sheets: (state.sheets ?? []).map(item => item.id === current.id ? { ...current, columns, projectSettings: settings, ...update } : item),
    ...(updated.size ? { rows: (state.rows ?? []).map(row => updated.get(row.id) ?? row) } : {}),
  }
}

export function shiftDrag(settings, { row, span, mode }, offset) {
  if (!offset) return { start: span.start, end: span.end }
  let start = span.start
  let end = span.end
  if (mode === 'move') { start += offset; end += offset }
  if (mode === 'start') start = Math.min(end, start + offset)
  if (mode === 'end') end = Math.max(start, end + offset)
  if (start < firstDay || end > lastDay) throw new Error('The calculated date is outside the supported range.')
  if (settings.dependenciesEnabled) {
    const work = calendar(settings)
    if (mode === 'move') {
      const duration = row.cells?.[settings.durationColumnId] ?? work.inclusive(span.start, span.end)
      start = work.snap(start)
      end = duration === 0 ? start : work.advance(start, Math.max(duration - 1, 0))
    }
    if (mode === 'start') {
      start = work.snap(start)
      if (start > end) throw new Error('Start date must be on or before the end date.')
    }
    if (mode === 'end' && !work.working(end)) throw new Error('Choose a working day for the end date.')
  }
  return { start, end }
}
