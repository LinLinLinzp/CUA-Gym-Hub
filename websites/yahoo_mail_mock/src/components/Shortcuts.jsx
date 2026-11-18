import { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import { draftPath, inbox, Modal, useMailNavigation } from './ui.jsx'

const shortcuts = {
  N: 'Compose', '/': 'Search', R: 'Reply', A: 'Reply all', F: 'Forward', K: 'Mark as read',
  'Shift + K': 'Mark as unread', L: 'Star', 'Shift + L': 'Remove star', E: 'Archive',
  'Shift + E': 'Move archived message to Inbox', D: 'Move', Delete: 'Delete',
  M: 'Inbox', 'Ctrl / ⌘ + Enter': 'Send',
}

export default function Shortcuts() {
  const { state } = useStore()
  const { go, location, back } = useMailNavigation()
  const [guide, setGuide] = useState(false)
  useEffect(() => {
    function show() { setGuide(true) }
    window.addEventListener('mail-shortcut-guide', show)
    return () => window.removeEventListener('mail-shortcut-guide', show)
  }, [])
  useEffect(() => {
    function keyDown(event) {
      if (state.settings?.keyboardShortcuts === false || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
        event.target instanceof HTMLElement && event.target.closest('input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable]') ||
        document.querySelector('[aria-modal="true"]')) return
      const key = ['K', 'L', 'E', 'Delete'].includes(event.key) ? event.key : event.key.toLowerCase()
      if (key === 'n') go(draftPath(), { state: { back: location.pathname.startsWith('/n/compose') ? back : location.pathname + location.search } })
      else if (key === 'm') go(inbox)
      else if (key === '/') document.getElementById('mail-search')?.focus()
      else if (['r', 'a', 'f', 'k', 'K', 'l', 'L', 'e', 'E', 'd', 'Delete'].includes(key) && /^\/n\/(message|inbox|folders|unread|starred|search)(?:\/|$)/.test(location.pathname)) {
        window.dispatchEvent(new CustomEvent('mail-action-shortcut', { detail: { key } }))
      } else return
      event.preventDefault()
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  })
  return guide && <Modal title="Keyboard shortcuts" close={() => setGuide(false)}>
    <dl className="shortcut-list">{Object.entries(shortcuts).map(([keys, label]) => <div key={keys}><dt>{label}</dt><dd><kbd>{keys}</kbd></dd></div>)}</dl>
  </Modal>
}
