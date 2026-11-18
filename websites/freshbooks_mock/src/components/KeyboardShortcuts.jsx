import { useEffect } from 'react'
import { useGo } from './ui.jsx'

const destinations = { i: '/invoices', x: '/expenses', t: '/time-tracking' }
const creation = { i: '/invoices/new', x: '/expenses/new' }

export function KeyboardShortcuts() {
  const go = useGo()
  useEffect(() => {
    let create = false
    function handle(event) {
      if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.repeat ||
        event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ||
        document.querySelector('dialog[open]')) return
      if (event.code === 'Space') {
        if (event.target.closest?.('button, a')) return
        event.preventDefault()
        create = true
        return
      }
      const path = (create ? creation : destinations)[event.key.toLowerCase()]
      if (path) {
        event.preventDefault()
        create = false
        go(path)
      }
    }
    function release(event) { if (event.key === 'Shift') create = false }
    function reset() { create = false }
    window.addEventListener('keydown', handle)
    window.addEventListener('keyup', release)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', handle)
      window.removeEventListener('keyup', release)
      window.removeEventListener('blur', reset)
    }
  }, [go])
  return null
}
