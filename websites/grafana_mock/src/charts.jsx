import React from 'react'
import { text } from './workspace.jsx'

export const timeRanges = [
  ['now-1h', 'Last 1 hour', 60],
  ['now-6h', 'Last 6 hours', 360],
  ['now-12h', 'Last 12 hours', 720],
  ['now-24h', 'Last 24 hours', 1440],
  ['now-7d', 'Last 7 days', 10080],
  ['now-30d', 'Last 30 days', 43200],
]

export function samples(key) {
  let seed = 2166136261
  for (const char of text(key)) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0
  const offset = (seed % 730) / 100
  return Array.from({ length: 24 }, (_, index) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return Number((offset + 3 + Math.sin(index / 3) * 2 + (seed % 300) / 120).toFixed(2))
  })
}

export function PanelChart({ panel, range }) {
  const values = samples([panel.query, panel.dataSourceId, range.from, range.to].join('|'))
  const unit = text(panel.unit)
  const peak = Math.ceil(Math.max(...values))
  const ticks = [peak, peak / 2, 0]
  const formatTime = new Intl.DateTimeFormat('en', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const formatDay = new Intl.DateTimeFormat('en', { timeZone: 'UTC', month: 'short', day: 'numeric' })
  const from = timeRanges.find((item) => item[0] === range.from)
  const end = range.to === 'now' ? new Date() : new Date(range.to)
  const endTime = Number.isNaN(end.getTime()) ? new Date().getTime() : end.getTime()
  const start = from ? endTime - from[2] * 60000 : new Date(range.from).getTime()
  const duration = Number.isNaN(start) ? 21600000 : Math.max(0, endTime - start)
  const formatter = duration >= 86400000 ? formatDay : formatTime
  const timeLabels = [1, .5, 0].map((fraction) => formatter.format(new Date(endTime - duration * fraction)))
  if (panel.type === 'stat') return <><p className="metric">{values.at(-1)} {unit}</p><p>Latest sample</p></>
  if (panel.type === 'table') return <table aria-label={panel.title || 'Panel values'}>
    <thead><tr><th scope="col">Region</th><th scope="col">Value {unit && '(' + unit + ')'}</th></tr></thead>
    <tbody>{['US East', 'EU West', 'Asia Pacific'].map((region, index) => <tr key={region}><td>{region}</td><td className="metric-cell">{values[index]}</td></tr>)}</tbody>
  </table>
  const path = values.map((value, index) => (index ? 'L' : 'M') + (55 + index * 365 / (values.length - 1)) + ',' + (127 - value * 104 / peak)).join(' ')
  return <>
    <svg viewBox="0 0 440 162" role="img" aria-label={text(panel.title || 'Time series') + (unit ? ', ' + unit : '') + ', UTC'}>
      <text x="6" y="12" fill="#655563" fontSize="10">{unit}</text>
      {ticks.map((tick, index) => <g key={tick}>
        <line x1="54" x2="420" y1={23 + index * 52} y2={23 + index * 52} stroke="#dccfd6" />
        <text x="47" y={27 + index * 52} textAnchor="end" fill="#655563" fontSize="10">{tick}</text>
      </g>)}
      <path d={path + ' L420,127 L55,127 Z'} fill="#dff0e7" opacity=".75" />
      <path d={path} fill="none" stroke="#297968" strokeWidth="2.5" strokeLinejoin="round" />
      {timeLabels.map((label, index) => <text key={index} x={55 + index * 182.5} y="144" textAnchor={['start', 'middle', 'end'][index]} fill="#655563" fontSize="10">{label}</text>)}
      <text x="237" y="159" textAnchor="middle" fill="#655563" fontSize="9">Time (UTC)</text>
    </svg>
    <span className="legend">{panel.title || 'Sample series'}</span>
  </>
}
