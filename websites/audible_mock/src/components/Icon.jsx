const paths = {
  library: 'M3 5h4v14H3z M10 5h4v14h-4z M17 6l3-1 3 13-3 1z',
  browse: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  bookmark: 'M6 4h12v17l-6-4-6 4z',
  credit: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  receipt: 'M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2z M9 9h6 M9 13h6',
  search: 'M15 15l5 5 M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z',
  close: 'M6 6l12 12 M18 6 6 18',
  arrow: 'M19 12H5 M11 6l-6 6 6 6',
  book: 'M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1z M12 6v13',
}

export function Icon({ name }) {
  return (
    <svg className="icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  )
}
