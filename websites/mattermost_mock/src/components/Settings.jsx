import { useEffect, useState } from 'react'
import { preferenceDefaults } from '../data/records.js'
import { savePreferences } from '../data/postActions.js'
import { byId, ownPrefs } from '../data/selectors.js'
import { useFeedback } from './Feedback.jsx'
import { Actions, Dialog } from './UI.jsx'

const fields = {
  Display: [
    ['theme', 'Theme', [['denim', 'Denim'], ['dark', 'Dark']]],
    ['messageDisplay', 'Message display', [['comfortable', 'Comfortable'], ['compact', 'Compact']]],
    ['clockFormat', 'Time format', [['12h', '12-hour'], ['24h', '24-hour']]],
  ],
  Notifications: [
    ['desktopNotifications', 'Desktop notifications', [['all', 'All activity'], ['mentions', 'Mentions only'], ['none', 'None']]],
  ],
  Status: [
    ['presence', 'Availability', [['online', 'Online'], ['away', 'Away'], ['dnd', 'Do not disturb'], ['offline', 'Offline']]],
    ['customStatus', 'Custom status'],
  ],
}

export function SettingsDialog({ state, initialTab, close, change }) {
  const { setPreview, notify } = useFeedback()
  const [tab, setTab] = useState(initialTab ?? 'Display')
  const [values, setValues] = useState(() => {
    const preference = ownPrefs(state)
    return Object.fromEntries(Object.entries(preferenceDefaults).map(([key, fallback]) => [
      key, preference?.[key] ?? (key === 'presence' ? byId(state.users, state.currentUserId)?.presence ?? fallback : fallback),
    ]))
  })
  const [error, setError] = useState('')
  useEffect(() => { setPreview(values) }, [values, setPreview])
  useEffect(() => () => setPreview(null), [setPreview])
  return <Dialog title="Settings" close={close} wide>
    <form onSubmit={event => {
      event.preventDefault()
      try {
        if (change(savePreferences, values)) notify('Settings saved')
        close()
      } catch (failure) { setError(failure.message) }
    }}>
      <div className="settings-grid">
        <nav aria-label="Settings sections">{Object.keys(fields).map(section => <button key={section} type="button" aria-pressed={section === tab}
          onClick={() => setTab(section)}>{section}</button>)}</nav>
        <div className="content"><h3>{tab}</h3>
          {fields[tab].map(([key, label, options]) => <label className="field" key={key}>
            <span>{label}</span>{options ? <select value={values[key]}
              onChange={event => setValues({ ...values, [key]: event.target.value })}>{options.map(([value, text]) =>
                <option key={value} value={value}>{text}</option>)}</select> :
              <input maxLength={120} value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} />}
          </label>)}
          {tab === 'Notifications' && <p className="muted-text">This preference applies to your workspace.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </div>
      <Actions close={close} />
    </form>
  </Dialog>
}

export function ShortcutsDialog({ close }) {
  return <Dialog title="Keyboard shortcuts" close={close}><div className="content">
    <dl className="shortcuts">{[
      ['Find channels', 'Ctrl/⌘ + K'], ['Start a direct message', 'Ctrl/⌘ + Shift + K'],
      ['Keyboard shortcuts', 'Ctrl/⌘ + /'], ['Send message', 'Enter'],
      ['Insert new line', 'Shift + Enter'], ['Close menu, dialog, or pane', 'Escape'],
    ].map(([label, key]) => <div key={label}><dt>{label}</dt><dd><kbd>{key}</kbd></dd></div>)}</dl>
  </div></Dialog>
}
