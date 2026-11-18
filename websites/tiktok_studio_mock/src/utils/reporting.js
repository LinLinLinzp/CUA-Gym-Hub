import { number } from './view.js'

const dayMs = 86400000
export const isoDay = (date) => date.toISOString().slice(0, 10)

export function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) && isoDay(parsed) === value
}

export function dateRange(endDate, days) {
  return { startDate: isoDay(new Date(Date.parse(endDate) - (days - 1) * dayMs)), endDate }
}

export function inRange(sample, { startDate, endDate }) {
  return sample.date >= startDate && sample.date <= endDate
}

export function totalsFor(rows, keys) {
  const totals = Object.fromEntries(keys.map((key) => [key, 0]))
  for (const row of rows) {
    for (const key of keys) totals[key] += number(row[key])
  }
  return totals
}

export function downloadCsv(rows, metrics, fileName) {
  const columns = Object.keys(metrics)
  const lines = [
    ['Date', ...Object.values(metrics)].join(','),
    ...rows.map((row) => [row.date, ...columns.map((key) => number(row[key]))].join(',')),
  ]
  const url = URL.createObjectURL(new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
