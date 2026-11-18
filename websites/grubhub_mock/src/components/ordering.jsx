import { useState } from 'react'
import { useAccount } from '../store'
import { reorder } from '../data/transactions'
import { Modal, useAccountNavigate } from './ui'

export function ReorderAction({ orderId }) {
  const { commit } = useAccount()
  const navigate = useAccountNavigate()
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')

  function attempt(confirm = false) {
    const result = commit(state => reorder(state, orderId, confirm))
    if (result.error) setError(result.error)
    else if (result.confirm) {
      setError('')
      setConfirmation(result)
    } else navigate('/bag')
  }

  return (
    <>
      <button className="button primary" onClick={() => attempt()}>Reorder</button>
      {error && !confirmation && <p className="error" role="alert">{error}</p>}
      {confirmation && (
        <Modal title={confirmation.replacing ? 'Replace your bag?' : 'Some items are unavailable'} onClose={() => { setConfirmation(null); setError('') }}>
          <div className="stack">
            {confirmation.replacing && <p>Your bag contains items from another restaurant.</p>}
            {confirmation.unavailable.length > 0 && <div><p>These items are unavailable</p><ul>{confirmation.unavailable.map((name, index) => <li key={index}>{name}</li>)}</ul></div>}
            {error && <p className="error" role="alert">{error}</p>}
            <div className="actions">
              <button className="button" onClick={() => { setConfirmation(null); setError('') }}>Keep current bag</button>
              <button className="button primary" onClick={() => attempt(true)}>{confirmation.replacing ? 'Replace bag' : 'Continue with available items'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
