import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Clock3, Pause, Play } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { changeTimer, elapsedSeconds, timeForm } from '../data/time.js'
import { Confirm } from './InvoiceActions.jsx'
import { ErrorNote } from './ui.jsx'
import { TimeFields } from './TimeFields.jsx'

export function Timer() {
  const { state } = useApp()
  return state.activeTimer ? <TimerPanel key={state.activeTimer.id} timer={state.activeTimer} /> : null
}

function TimerPanel({ timer }) {
  const { state, commit } = useApp()
  const [form, setForm] = useState(() => timeForm(state, timer))
  const [expanded, setExpanded] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [error, setError] = useState('')
  const [display, setDisplay] = useState(() => new Date())
  useEffect(() => {
    setDisplay(new Date())
    if (timer.status !== 'running') return
    const interval = setInterval(() => setDisplay(new Date()), 1000)
    return () => clearInterval(interval)
  }, [timer.status, timer.startedAt])
  const seconds = elapsedSeconds(timer, display)
  const clock = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':')
  function act(intent) {
    const messages = { paused: 'Timer paused', resumed: 'Timer resumed', logged: 'Time logged', discarded: 'Timer discarded' }
    setError('')
    commit(current => {
      if (current.activeTimer?.id !== timer.id) throw new Error('The active timer has changed.')
      return changeTimer(current, intent, form)
    }, messages[intent])
  }
  function run(intent) {
    try { act(intent) } catch (failure) { setError(failure.message); if (intent === 'logged') setExpanded(true) }
  }
  return <aside className="timer-panel" aria-label="Time Tracking Timer">
    <div className="timer-heading">
      <div className="actions"><Clock3 size={17} /><strong>Timer</strong><small>{timer.status === 'running' ? 'Running' : 'Paused'}</small></div>
      <button className="icon-button" type="button" aria-label={expanded ? 'Minimize timer' : 'Expand timer'} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronDown size={19} /> : <ChevronUp size={19} />}</button>
    </div>
    <output className="timer-clock" aria-label="Elapsed time" aria-live="off">{clock}</output>
    <form className="timer-body form-stack" noValidate onSubmit={e => { e.preventDefault(); run('logged') }}>
      {expanded && <TimeFields state={state} form={form} patch={patch => setForm(old => ({ ...old, ...patch }))} durationHint="Leave blank to log the elapsed time." />}
      {!expanded && <button className="text-button" type="button" onClick={() => setExpanded(true)}>Edit timer details</button>}
      <ErrorNote>{error}</ErrorNote>
      <div className="timer-actions">
        <button type="button" className="button" onClick={() => run(timer.status === 'running' ? 'paused' : 'resumed')}>{timer.status === 'running' ? <><Pause size={14} />Pause</> : <><Play size={14} />Resume</>}</button>
        <button type="button" className="button danger" onClick={() => setDiscard(true)}>Discard</button>
        <button className="button positive" type="submit">Log Time</button>
      </div>
    </form>
    {discard && <Confirm title="Discard Timer" detail="Discard this timer and its elapsed time?" label="Discard" danger onClose={() => setDiscard(false)} onConfirm={() => act('discarded')} />}
  </aside>
}
