import { prettyDate, prettyTime } from '../data/dates'
import { start } from '../data/model'

const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/[,;]/g, '\\$&')
const timestamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function downloadCalendar(state, booking, restaurant) {
  const startsAt = start(state, booking)
  if (!Number.isFinite(startsAt)) return
  const name = restaurant?.name || 'Restaurant reservation'
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OpenTable//Dining Calendar//EN',
    'BEGIN:VEVENT', 'UID:' + escape(booking.id) + '@opentable.example',
    'DTSTAMP:' + timestamp(new Date()), 'DTSTART:' + timestamp(new Date(startsAt)),
    'SUMMARY:' + escape(name),
    'DESCRIPTION:' + escape(prettyDate(booking.date) + ' at ' + prettyTime(booking.time) + ' local time' + (booking.confirmationCode ? '\nConfirmation ' + booking.confirmationCode : '')),
    'LOCATION:' + escape([restaurant?.address, restaurant?.city].filter(Boolean).join(', ')),
    'END:VEVENT', 'END:VCALENDAR',
  ]
  const file = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = 'opentable-reservation.ics'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
