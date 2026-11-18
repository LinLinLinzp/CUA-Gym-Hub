import React from 'react'

const paths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  iam: 'M12 22s7-3 7-9V5l-7-3-7 3v8c0 6 7 9 7 9z M9 12l2 2 4-4',
  compute: 'M6 6h12v12H6z M9 9h6v6H9z M9 3v3 M15 3v3 M9 18v3 M15 18v3 M3 9h3 M3 15h3 M18 9h3 M18 15h3',
  storage: 'M4 6c0-2 3.6-3 8-3s8 1 8 3-3.6 3-8 3-8-1-8-3z M4 6v6c0 2 3.6 3 8 3s8-1 8-3V6 M4 12v6c0 2 3.6 3 8 3s8-1 8-3v-6',
  billing: 'M3 5h18v14H3z M3 10h18 M7 15h4',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
}
export function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}
