function icon(path) {
  return function Icon({ size = 24, strokeWidth = 1.75, ...props }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={path} />
    </svg>
  }
}

export const ArrowDown = icon('M12 4v15m-5-5 5 5 5-5')
export const ArrowLeft = icon('M20 12H4m6 6-6-6 6-6')
export const ArrowRight = icon('M4 12h16m-6-6 6 6-6 6')
export const ArrowUp = icon('M12 20V5m-5 5 5-5 5 5')
export const ArrowUpRight = icon('M6 18 18 6M8 6h10v10')
export const CalendarDays = icon('M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2-2v4m10-4v4M3 10h18M7.5 14h1m3 0h1m3 0h1m-9 3.5h1m3 0h1m3 0h1')
export const ChevronLeft = icon('m14.5 6-6 6 6 6')
export const ChevronRight = icon('m9.5 6 6 6-6 6')
export const CircleDollarSign = icon('M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0ZM12 6v12m3-9H11a1.5 1.5 0 1 0 0 3h2a1.5 1.5 0 1 1 0 3H9')
export const ClipboardList = icon('M9 5H6a1 1 0 0 0-1 1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a1 1 0 0 0-1-1h-3m-6-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3H9V4Zm0 7h6m-6 4h6')
export const House = icon('m3 10 9-7 9 7m-2-1v11H5V9m5 11v-6h4v6')
export const Laptop = icon('M5 6h14v10H5V6Zm0 10-2 3h18l-2-3')
export const Plus = icon('M12 5v14M5 12h14')
export const Search = icon('M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 1 1 13 0Zm-1.8 4.7L20 20')
export const Trash2 = icon('M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5')
export const Users = icon('M14 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 1 1 7 0ZM3.5 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2m-.2-15a3 3 0 0 1 0 6m3.7 9v-2a4 4 0 0 0-2-3.5')
export const X = icon('m6 6 12 12m0-12L6 18')
