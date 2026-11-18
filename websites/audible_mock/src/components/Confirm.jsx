import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAccount } from '../state/AccountProvider.jsx'
import { usableCredits } from '../state/selectors.js'

const ConfirmContext = createContext(null)

const copy = {
  buy: ['Use one credit?', 'Confirm purchase'],
  return: ['Return this title?', 'Confirm return'],
  remove_included: ['Remove from Library?', 'Confirm removal'],
}

function ConfirmDialog({ pending, close }) {
  const { state, act } = useAccount()
  const dialog = useRef(null)
  const cancel = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    cancel.current.focus()
    return () => element.close()
  }, [])

  function dismiss() {
    dialog.current.close()
    close()
  }

  const [heading, button] = copy[pending.action.type]
  const remaining = usableCredits(state, new Date()).length - 1
  return (
    <dialog ref={dialog} className="confirm-dialog" aria-labelledby="confirm-heading" aria-describedby="confirm-title confirm-detail"
      onCancel={(event) => { event.preventDefault(); dismiss() }}>
      <h2 id="confirm-heading">{heading}</h2>
      <p id="confirm-title"><strong>{pending.title}</strong></p>
      <p id="confirm-detail">
        {pending.action.type === 'buy' && `Use 1 credit to buy this audiobook. Your balance after purchase will be ${Math.max(0, remaining)}.`}
        {pending.action.type === 'return' && 'Your balance will increase by 1 credit and this audiobook will be removed from your Library.'}
        {pending.action.type === 'remove_included' && 'You can add this included audiobook again from Browse.'}
      </p>
      <div className="dialog-actions">
        <button className="button secondary" ref={cancel} type="button" onClick={dismiss}>Cancel</button>
        <button className={`button ${pending.action.type === 'buy' ? '' : 'danger'}`} type="button" onClick={async () => {
          if (await act(pending.action)) dismiss()
        }}>{button}</button>
      </div>
    </dialog>
  )
}

export function ConfirmProvider({ children }) {
  const [pending, setPending] = useState(null)
  const previousFocus = useRef(null)

  function confirm(title, action) {
    previousFocus.current = document.activeElement
    setPending({ title, action })
  }

  function close() {
    setPending(null)
    requestAnimationFrame(() => {
      const previous = previousFocus.current
      const fallback = document.querySelector('main h1') || document.querySelector('main')
      if (previous?.isConnected && !previous.disabled) previous.focus()
      else fallback?.focus()
    })
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <ConfirmDialog pending={pending} close={close} />}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}
