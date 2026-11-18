import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { useStore } from '../store.jsx'
import { selectStore } from '../domain/cart.js'
import { addressText, list } from '../utils/read.js'
import { Status, useFeedback } from './ui.jsx'

function StoreChoices({ lineMode, currentStoreId, onSelect, isAvailable }) {
  const { state, transact } = useStore()
  const { close, notify } = useFeedback()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const selectedId = lineMode ? currentStoreId : state.guest?.preferredStoreId
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const choices = list(state.stores).filter((store) => {
    if (!store.id) return false
    const searchable = `Target ${store.name || ''} ${addressText(store.address)}`.toLowerCase()
    return terms.every((term) => searchable.includes(term))
  })

  function choose(store) {
    const result = lineMode ? onSelect(store.id) : transact((world) => selectStore(world, store.id))
    if (result?.error) { setError(result.error); return }
    close()
    if (!lineMode && result.state) notify(`Your store is now Target ${store.name || 'store'}.`)
  }

  return <div className="stack">
    <label className="field">Find a store<input type="search" placeholder="City, ZIP code or store name" value={query} onChange={(event) => { setQuery(event.target.value); setError('') }} /></label>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="store-list">
      {choices.map((store) => {
        const current = selectedId === store.id
        const blocked = lineMode && (!store.pickupEnabled || (isAvailable && !isAvailable(state, store.id)))
        return <article className="store-choice" key={store.id}>
          <div className="stack"><h3><MapPin size={17} /> Target {store.name || 'store'}</h3>
            {store.address && <p className="small muted">{addressText(store.address)}</p>}
            {store.hoursText && <p className="small">{store.hoursText}</p>}
            {store.pickupEnabled && store.pickupInstructions && <p className="small muted">{store.pickupInstructions}</p>}
            <div className="cluster">
              {current && <Status>{lineMode ? 'Current pickup store' : 'My store'}</Status>}
              <Status tone={store.pickupEnabled && !blocked ? 'success' : 'warning'}>{!store.pickupEnabled ? 'Pickup unavailable' : blocked ? 'Requested quantity unavailable' : 'Order Pickup available'}</Status>
            </div>
          </div>
          <button className="button secondary" onClick={() => choose(store)} disabled={blocked || current}>{current ? 'Selected' : 'Select store'}</button>
        </article>
      })}
      {!choices.length && <p className="muted">No stores found.</p>}
    </div>
  </div>
}

export function useStorePicker() {
  const { open } = useFeedback()
  return (settings = {}) => open({
    title: settings.onSelect ? 'Choose a pickup store' : 'My store',
    wide: true,
    content: <StoreChoices lineMode={Boolean(settings.onSelect)} {...settings} />,
  })
}
