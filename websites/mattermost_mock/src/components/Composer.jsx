import { useRef, useState } from 'react'
import { Bold, Code, FileText, Italic, List, Paperclip, Quote, Send, Smile, X } from 'lucide-react'
import { active, availableUsers, byId, channelName, member, ownDraft, userName } from '../data/selectors.js'
import { cancelFile, sendPost, stageFile, writeDraft } from '../data/postActions.js'
import { makeId } from '../data/records.js'
import { withSid } from '../utils/dataManager.js'
import { MessageMarkdown } from './Markdown.jsx'
import { IconButton } from './UI.jsx'
import { useUploadQueue } from './UploadQueue.jsx'

const MAX_SIZE = 100 * 1024 * 1024
const formats = [
  [Bold, 'Bold', '**', '**'], [Italic, 'Italic', '_', '_'], [List, 'List', '- ', ''],
  [Quote, 'Quote', '> ', ''], [Code, 'Code block', '```\n', '\n```'],
]

export function fileSize(size) {
  if (!Number.isFinite(size)) return 'Unknown size'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1).replace(/\.0$/, '') + ' KB'
  return (size / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB'
}

export function Composer({ state, channel, rootId = null, change, openDialog, inChannel = false }) {
  const draft = ownDraft(state, channel.id, rootId)
  const message = draft?.message ?? ''
  const staged = (draft?.fileIds ?? []).map(id => byId(state.files, id)).filter(file => file?.status === 'staged')
  const text = useRef(null)
  const input = useRef(null)
  const submitLock = useRef(false)
  const { pending, setPending, readPending, enqueue } = useUploadQueue(state.currentUserId, channel.id, rootId)
  const [error, setError] = useState('')
  const [format, setFormat] = useState(false)
  const [preview, setPreview] = useState(false)
  const [mention, setMention] = useState(null)
  const suggestionList = mention ? availableUsers(state, channel.teamId).filter(user => active(user) && user.id !== state.currentUserId &&
    (channel.type === 'O' || member(state, channel.id, user.id)) &&
    (userName(user) + ' ' + (user.username ?? '')).toLowerCase().includes(mention.value.toLowerCase())).slice(0, 6) : []

  function update(value, cursor) {
    change(writeDraft, channel.id, rootId, value)
    const last = /(?:^|\s)@([\w.-]*)$/.exec(value.slice(0, cursor))
    setMention(last ? { value: last[1], start: cursor - last[1].length - 1, end: cursor } : null)
  }

  function replaceRange(start, end, value, cursor = start + value.length) {
    const current = text.current?.value ?? message
    update(current.slice(0, start) + value + current.slice(end), cursor)
    requestAnimationFrame(() => {
      text.current?.focus()
      text.current?.setSelectionRange(cursor, cursor)
    })
  }

  function chooseMention(user) {
    replaceRange(mention.start, mention.end, '@' + user.username + ' ')
    setMention(null)
  }

  async function upload(item) {
    try {
      const signal = item.controller.signal
      signal.throwIfAborted()
      // Harbor's request interception can forward inline bytes but omits disk-backed file parts.
      const bytes = await item.file.arrayBuffer()
      signal.throwIfAborted()
      const data = new FormData()
      data.append('files', new Blob([bytes], { type: item.file.type }), item.file.name)
      const response = await fetch(withSid('/upload'), { method: 'POST', body: data, signal })
      const result = await response.json()
      const row = result.files?.[0]
      if (!response.ok || !result.success || !row || typeof row.stored_name !== 'string' ||
        !Number.isFinite(row.size)) throw new Error('Upload failed.')
      if (row.size !== item.file.size) throw new Error('Upload incomplete. Retry or remove the attachment.')
      if (!readPending().some(({ id }) => id === item.id)) return
      if (!change(stageFile, channel.id, rootId, { ...row, name: item.file.name })) {
        throw new Error('This attachment could not be added to the draft.')
      }
      setPending(readPending().filter(({ id }) => id !== item.id))
    } catch (failure) {
      if (failure.name !== 'AbortError') {
        setPending(readPending().map(row => row.id === item.id ? { ...row, error: failure.message || 'Upload failed.' } : row))
      }
    }
  }

  function addFiles(files) {
    if (!files.length) return
    setError('')
    let persistedCount = staged.length
    const accepted = []
    const errors = []
    for (const file of files) {
      if (file.size > MAX_SIZE) errors.push(file.name + ' exceeds 100 MB.')
      else if (persistedCount + readPending().length >= 10) errors.push('A message can contain up to 10 attachments.')
      else {
        accepted.push({ id: makeId('upload'), file, controller: new AbortController(), error: null })
        persistedCount++
      }
    }
    if (errors.length) setError([...new Set(errors)].join(' '))
    setPending([...readPending(), ...accepted])
    for (const item of accepted) enqueue(() => upload(item))
  }

  function send() {
    if (submitLock.current || readPending().length || (!message.trim() && !staged.length)) return
    submitLock.current = true
    try {
      if (change(sendPost, channel.id, rootId, { inChannel })) {
        setMention(null)
        setError('')
        setPreview(false)
        text.current?.focus()
      } else setError('The message could not be sent in this channel.')
    } catch (failure) { setError(failure.message) }
    finally { queueMicrotask(() => { submitLock.current = false }) }
  }

  const placeholder = rootId ? 'Reply to this thread...' : 'Write to ' + channelName(state, channel)
  return <div className="composer" onDragOver={event => {
    if (event.dataTransfer.types.includes('Files')) event.preventDefault()
  }} onDrop={event => {
    if (!event.dataTransfer.files.length) return
    event.preventDefault()
    addFiles([...event.dataTransfer.files])
  }}>
    {format && <div className="format-tools">
      {formats.map(([icon, label, before, after]) => <IconButton key={label} icon={icon} label={label} disabled={preview} onClick={() => {
        const start = text.current.selectionStart
        const end = text.current.selectionEnd
        const selected = message.slice(start, end)
        replaceRange(start, end, before + selected + after, selected ? start + before.length + selected.length + after.length : start + before.length)
      }} />)}
      <button type="button" className="text-button" aria-pressed={preview} onClick={() => setPreview(value => !value)}>{preview ? 'Edit' : 'Preview'}</button>
    </div>}
    {preview ? <div className="compose-preview"><MessageMarkdown message={message || 'Nothing to preview.'} /></div> :
      <textarea ref={text} aria-label={placeholder} placeholder={placeholder} value={message}
        onChange={event => update(event.target.value, event.target.selectionStart)}
        onPaste={event => {
          const files = [...event.clipboardData.files].filter(file => file.type.startsWith('image/'))
          if (files.length) { event.preventDefault(); addFiles(files) }
        }}
        onKeyDown={event => {
          if (event.key === 'Escape' && suggestionList.length) { event.preventDefault(); setMention(null) }
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            if (suggestionList.length) chooseMention(suggestionList[0])
            else send()
          }
        }} />}
    {suggestionList.length > 0 && <div className="mention-menu" aria-label="Mention suggestions">
      {suggestionList.map(user => <button type="button" key={user.id} onClick={() => chooseMention(user)}>
        <strong>{userName(user)}</strong> <small>@{user.username}</small>
      </button>)}
    </div>}
    {(staged.length > 0 || pending.length > 0) && <div className="attachment-chips">
      {staged.map(file => <div className="attachment-chip" key={file.id}><FileText size={20} />
        <span><strong>{file.name}</strong><small>{(file.extension || 'File').toUpperCase()} · {fileSize(file.size)}</small></span>
        <IconButton icon={X} label={'Remove ' + file.name} onClick={() => change(cancelFile, channel.id, rootId, file.id)} />
      </div>)}
      {pending.map(item => <div className="attachment-chip" key={item.id}><FileText size={20} />
        <span><strong>{item.file.name}</strong><small role="status">{item.error || 'Uploading…'}</small></span>
        {item.error && <button type="button" className="text-button" onClick={() => {
          const retry = { ...item, controller: new AbortController(), error: null }
          setPending(readPending().map(row => row.id === item.id ? retry : row))
          enqueue(() => upload(retry))
        }}>Retry</button>}
        <IconButton icon={X} label={'Remove ' + item.file.name} onClick={() => {
          item.controller.abort()
          setPending(readPending().filter(row => row.id !== item.id))
        }} />
      </div>)}
    </div>}
    {error && <p className="form-error composer-error" role="alert">{error}</p>}
    <div className="composer-tools">
      <button className="icon-button" type="button" title="Formatting" aria-label="Formatting" aria-pressed={format}
        onClick={() => { if (format) setPreview(false); setFormat(value => !value) }}>Aa</button>
      <IconButton icon={Paperclip} label="Attach files" onClick={() => input.current.click()} />
      <input ref={input} aria-label="Choose files" type="file" multiple hidden onChange={event => {
        const files = [...event.target.files]
        event.target.value = ''
        addFiles(files)
      }} />
      <IconButton icon={Smile} label="Insert emoji" onClick={() => {
        const start = text.current?.selectionStart ?? message.length
        const end = text.current?.selectionEnd ?? start
        openDialog({ kind: 'emoji', select: (_name, glyph) => { setPreview(false); replaceRange(start, end, glyph) } })
      }} />
      <IconButton icon={Send} label={rootId ? 'Send reply' : 'Send message'} className="send"
        disabled={Boolean(pending.length) || (!message.trim() && !staged.length)} onClick={send} />
    </div>
  </div>
}
