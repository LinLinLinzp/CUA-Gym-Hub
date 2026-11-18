import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'

export function Dialog({ title, onClose, pending, children }) {
  const id = useId()
  const dialog = useRef(null)
  const heading = useRef(null)

  useEffect(() => {
    const node = dialog.current
    const trigger = document.activeElement
    node.showModal()
    return () => {
      node.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  useEffect(() => { heading.current.focus() }, [title])

  function containFocus(event) {
    if (event.key !== 'Tab') return
    const controls = Array.from(event.currentTarget.querySelectorAll('button:enabled, input:enabled, select:enabled, textarea:enabled, a[href]'))
      .filter((control) => control.tabIndex >= 0 && control.getClientRects().length)
    const first = controls[0]
    const last = controls.at(-1)
    const active = document.activeElement
    const shouldWrap = event.shiftKey ? active === first || active === heading.current : active === last
    if (shouldWrap || !first) {
      event.preventDefault()
      const target = (event.shiftKey ? last : first) || heading.current
      target.focus()
    }
  }

  return <dialog ref={dialog} aria-labelledby={id} onKeyDown={containFocus} onCancel={(event) => {
    event.preventDefault()
    if (!pending) onClose()
  }}>
    <header className="dialog-title">
      <h2 id={id} ref={heading} tabIndex={-1}>{title}</h2>
      <button type="button" className="icon-button" title="Close" aria-label="Close dialog" disabled={pending} onClick={onClose}><X size={20} /></button>
    </header>
    {children}
  </dialog>
}

export function useConfirmation(action, onSuccess) {
  const submitting = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function confirm(event) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setError('')
    try {
      const record = await action()
      onSuccess(record)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We couldn’t save this change. Try again.')
      submitting.current = false
      setPending(false)
    }
  }
  return { confirm, pending, error, clearError: () => setError('') }
}

export function DialogButtons({ onBack, backLabel = 'Back', submitLabel, pending, disabled, danger }) {
  return <div className="dialog-buttons">
    <button className="button" type="button" disabled={pending} onClick={onBack}>{backLabel}</button>
    {submitLabel && <button className={'button ' + (danger ? 'danger' : 'primary')} type="submit" disabled={pending || disabled}>
      {pending ? 'Saving…' : submitLabel}
    </button>}
  </div>
}

export function ConfirmDialog({ title, description, submitLabel, backLabel, onClose, action, onSuccess }) {
  const { confirm, pending, error } = useConfirmation(action, onSuccess)
  return <Dialog title={title} onClose={onClose} pending={pending}>
    <form onSubmit={confirm} className="dialog-body">
      <p>{description}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <DialogButtons onBack={onClose} backLabel={backLabel} submitLabel={submitLabel} danger pending={pending} />
    </form>
  </Dialog>
}
