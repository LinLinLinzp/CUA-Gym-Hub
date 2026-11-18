import { useEffect, useId, useRef, useState } from 'react'
import { Code2, Globe2, KeyRound, Link2, LockKeyhole, Search, X } from 'lucide-react'
import { savePrivacy } from './changes.js'
import { useWorkspace } from './store.jsx'

const modes = {
  public: ['Public', 'Anyone can view this.', Globe2],
  unlisted: ['Unlisted', 'Anyone with the link can view this.', Link2],
  password: ['Password', 'Viewers need the viewing password.', KeyRound],
  embed_only: ['Embed only', 'Viewers can watch where the content is embedded.', Code2],
  private: ['Private', 'Only people with access to this account can view this.', LockKeyhole],
}
const fallback = '/media/film-slate.webp'

export const modeOf = (record, kind = 'video') => record.privacy?.mode ?? (kind === 'video' ? 'unlisted' : 'private')
export const titleOf = (record, kind = 'video') => record.title?.trim() || `Untitled ${kind}`
export const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`
export const videoPath = (id) => `/videos/${encodeURIComponent(id)}`
export const showcasePath = (id) => `/showcases/${encodeURIComponent(id)}`

export function imagePath(key) {
  return typeof key === 'string' && /^[\w-]+$/.test(key) ? `/media/${key}.webp` : fallback
}

export function ImageFrame({ record, className = '', duration = false }) {
  return <div className={`frame ${className}`}>
    <img src={imagePath(record?.thumbnailKey)} alt="" loading="lazy" decoding="async" onError={(event) => {
      if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback
    }} />
    {duration && Number.isFinite(record?.durationSeconds) && <span className="duration">{timecode(record.durationSeconds)}</span>}
  </div>
}

export function timecode(value) {
  const seconds = Math.max(0, Math.floor(value || 0))
  const part = (value) => String(value).padStart(2, '0')
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  return `${hours ? `${hours}:${part(minutes)}` : minutes}:${part(seconds % 60)}`
}

export function shortDate(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.valueOf())) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export function PrivacyBadge({ mode }) {
  const [label, , Icon] = modes[mode] ?? ['Unknown', '', LockKeyhole]
  return <span className={`privacy-pill ${mode === 'password' ? 'protected' : ''}`}><Icon size={13} />{label}</span>
}

export function ModeOptions({ kind }) {
  return Object.entries(modes).filter(([value]) => kind === 'video' || value !== 'unlisted')
    .map(([value, [label]]) => <option key={value} value={value}>{label}</option>)
}

export function PrivacyFields({ kind, draft, setDraft, downloads = false }) {
  const mode = draft.mode
  return <>
    <label className="field">Privacy
      <select aria-label="Privacy" value={mode} onChange={(event) => {
        const mode = event.target.value
        setDraft({ ...draft, mode, password: mode === 'password' ? draft.password : '' })
      }}><ModeOptions kind={kind} /></select>
    </label>
    <p className="hint privacy-note">{modes[mode]?.[1]}</p>
    {mode === 'password' && <label className="field">Viewing password
      <input type="text" autoComplete="off" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} required />
    </label>}
    {downloads && <label className="check"><input type="checkbox" checked={draft.allowDownloads}
      onChange={(event) => setDraft({ ...draft, allowDownloads: event.target.checked })} /> Allow downloads</label>}
  </>
}

export function privacySettings(draft, kind) {
  return {
    mode: draft.mode, password: draft.mode === 'password' ? draft.password.trim() : null,
    ...(kind === 'video' ? { allowDownloads: Boolean(draft.allowDownloads) } : {}),
  }
}

export function Modal({ title, children, onClose, wide = false, busy = false }) {
  const { saving, saveError } = useWorkspace()
  const locked = busy || saving
  const id = useId()
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element.showModal()
    return () => {
      element.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <dialog ref={dialog} aria-labelledby={id} className={wide ? 'wide' : undefined} onCancel={(event) => {
    event.preventDefault()
    if (!locked) onClose()
  }}>
    <div className="dialog-inner">
      <div className="dialog-heading"><h2 id={id}>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog" disabled={locked}><X size={19} /></button></div>
      {children}
      {saving && <p role="status" className="hint">Saving changes…</p>}
      {saveError && <p role="alert" className="error">{saveError}</p>}
    </div>
  </dialog>
}

export function ModalActions({ onClose, action, disabled = false, busy = false, danger = false }) {
  return <div className="modal-actions">
    <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
    <button type="submit" className={danger ? 'danger-button' : 'primary'} disabled={disabled || busy}>{action}</button>
  </div>
}

export function PrivacyDialog({ record, kind, onClose }) {
  const { commit, saving } = useWorkspace()
  const [draft, setDraft] = useState({
    mode: modeOf(record, kind), password: record.privacy?.password ?? '',
    allowDownloads: record.privacy?.allowDownloads ?? false,
  })
  const [error, setError] = useState('')
  return <Modal title={`Share ${kind}`} onClose={onClose}>
    <p className="dialog-subtitle">{titleOf(record, kind)}</p>
    <form onSubmit={async (event) => {
      event.preventDefault()
      const settings = privacySettings(draft, kind)
      if (settings.mode === 'password' && !settings.password) return setError('Enter a viewing password.')
      if (await commit(savePrivacy(kind, record.id, settings), 'Privacy saved.') !== false) onClose()
    }}>
      <fieldset disabled={saving}>
        <PrivacyFields kind={kind} draft={draft} setDraft={(value) => { setDraft(value); setError('') }} downloads={kind === 'video'} />
      </fieldset>
      {error && <p className="error" role="alert">{error}</p>}
      <ModalActions onClose={onClose} action="Save privacy" busy={saving} />
    </form>
  </Modal>
}

export function SearchField({ value, onChange, label }) {
  return <label className="search-field">
    <Search size={18} aria-hidden="true" />
    <input type="search" aria-label={label} placeholder={label} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
}

export function Empty({ icon: Icon, title, children }) {
  return <div className="empty">
    {Icon && <Icon size={26} aria-hidden="true" />}
    <h2>{title}</h2>
    {children}
  </div>
}

export function matched(record, query, includesMetadata = false) {
  const words = query.trim().toLowerCase()
  const values = includesMetadata ? [record.title, record.description, ...(record.tags ?? [])] : [record.title]
  return !words || values.join(' ').toLowerCase().includes(words)
}
