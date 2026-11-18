import { createContext, useContext, useEffect, useState } from 'react'

const themeKey = 'substack:appearance'
const themes = { system: 'System', light: 'Light', dark: 'Dark' }
const Theme = createContext(null)

export function Appearance({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(themeKey)
    return Object.hasOwn(themes, saved) ? saved : 'system'
  })
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  function select(next) {
    localStorage.setItem(themeKey, next)
    setTheme(next)
  }
  return <Theme.Provider value={{ theme, select }}>{children}</Theme.Provider>
}

export function AppearanceSettings() {
  const { theme, select } = useContext(Theme)
  return <section className="panel settings-panel" aria-labelledby="appearance-heading">
    <div className="section-heading"><h2 id="appearance-heading">Appearance</h2></div>
    <label className="settings-row"><strong>Workspace theme</strong>
      <select value={theme} onChange={event => select(event.target.value)}>
        {Object.entries(themes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  </section>
}
