import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bold, Italic, Link2, List, ListOrdered, Paperclip, Send, Trash2, Underline, X } from 'lucide-react'
import { useStore } from '../store.jsx'
import { accountEmails, array, contactName, emailValid, id, isDraft, listRecipients, lower, memberCountLabel, snippetOf, uniqueAddresses } from '../data/model.js'
import { escapeHtml, htmlPlain, plainHtml, safeLink, sanitizeHtml } from '../data/body.js'
import { hasPendingRecipients, quoteText } from '../data/drafts.js'
import { draftPath, IconButton, Menu, MenuItem, Modal, NotFound, useInterface, useMailNavigation } from '../components/ui.jsx'
import { eligibleAttachments, fileDetails, RecentFiles, uploadFiles } from '../components/attachments.jsx'
import { attachmentBytes, attachmentLimit, fileSize, localFilePath } from '../data/filesAccess.js'
import { useDraftActions } from '../components/draftActions.jsx'
import { useMailActions } from '../components/mailActions.jsx'

export default function Compose() {
  const { draftId } = useParams()
  const { state } = useStore()
  const { go, back, location } = useMailNavigation()
  const draft = array(state.messages).find(message => message.id === draftId && isDraft(message))
  const editorKey = location.state?.composeKey || location.key
  if (draftId && !draft) return <NotFound title="This draft is unavailable" />
  return <ComposeEditor key={editorKey} draft={draft} onClose={() => go(back)} onDraftCreated={value => go(draftPath(value), { replace: true, state: { back, composeKey: editorKey } })} />
}

function RecipientField({ label, initialAddresses, initialInput, onEdit }) {
  const { state } = useStore()
  const { notify } = useInterface()
  const [addresses, setAddresses] = useState(initialAddresses)
  const [pending, setPending] = useState(initialInput || '')
  const [focused, setFocused] = useState(false)
  const [choice, setChoice] = useState(0)
  const input = useRef(null)
  const chip = pending && typeof pending === 'object' ? pending : null
  const editing = !chip ? -1 : addresses[chip.chipIndex]?.email === chip.chipEmail
    ? chip.chipIndex : addresses.findIndex(address => address.email === chip.chipEmail)
  const text = chip ? chip.text || '' : pending
  const normalized = lower(text.trim())
  const contacts = array(state.contacts)
  const matches = !normalized ? [] : [
    ...contacts.flatMap(contact => array(contact.emails).filter(email => emailValid(email?.address) && lower(contactName(contact) + ' ' + email.address).includes(normalized))
      .map(email => ({ name: contactName(contact), email: email.address, key: contact.id + email.address }))),
    ...array(state.contactLists).filter(list => lower(list.name).includes(normalized)).map(list => ({ list, key: list.id, name: list.name })),
  ].slice(0, 8)

  function persist(value, nextAddresses) {
    setPending(value)
    if (nextAddresses) setAddresses(nextAddresses)
    onEdit(value, nextAddresses)
  }
  function add(items) {
    const next = [...addresses]
    if (editing === -1) next.push(...items)
    else next.splice(editing, 1, ...items)
    persist('', uniqueAddresses(next))
    setChoice(0)
  }
  function commit() {
    const values = text.split(/[,;]+/).map(value => value.trim()).filter(Boolean)
    if (values.length) add(values.map(value => {
      const formatted = /^(.*?)\s*<([^<>]+)>$/.exec(value)
      return formatted ? { name: formatted[1], email: formatted[2].trim() } : { email: value }
    }))
    else if (pending) persist('')
  }
  function choose(option) {
    if (option.list) {
      const members = listRecipients(option.list, contacts)
      if (members.length < array(option.list.contactIds).length) notify(members.length ? 'Members without an email address were skipped.' : 'This list has no members with an email address.')
      if (members.length) add(members)
      else persist('')
    } else add([{ name: option.name, email: option.email }])
    input.current?.focus()
  }

  return <div className="recipient-field" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { commit(); setFocused(false) }
  }}>
    <label htmlFor={label + '-recipient'}>{label}</label>
    <div className="recipient-values">
      {addresses.map((address, index) => editing !== index && <span className={'recipient-chip' + (emailValid(address.email) ? '' : ' invalid')} key={index}>
        <button type="button" title={address.email} onClick={() => {
          if (pending) commit()
          persist({ chipIndex: index, chipEmail: address.email || '', text: address.email || '' })
          input.current?.focus()
        }}>{address.name || address.email || 'Invalid address'}</button>
        <IconButton icon={X} label={'Remove ' + (address.email || 'recipient')} onClick={() => persist(pending, addresses.filter((_, position) => position !== index))} />
      </span>)}
      <input id={label + '-recipient'} ref={input} aria-label={label} type="text" autoComplete="off" value={text} onFocus={() => setFocused(true)} onChange={event => {
        const next = event.target.value
        setChoice(0)
        if (/[;,]$/.test(next) && next.slice(0, -1).trim()) add(next.split(/[,;]/).map(email => ({ email: email.trim() })).filter(address => address.email))
        else persist(chip ? { ...chip, text: next } : next)
      }} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (matches.length) { event.preventDefault(); setChoice(value => (value + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length) }
        } else if (!event.metaKey && !event.ctrlKey && (event.key === 'Enter' || event.key === ',' || event.key === ';')) {
          event.preventDefault()
          if (matches.length && event.key === 'Enter' && !emailValid(text.trim())) choose(matches[choice] || matches[0])
          else commit()
        } else if (event.key === 'Escape') {
          if (chip) persist('')
          setFocused(false)
        }
      }} />
      {addresses.some(address => !emailValid(address.email)) && <p className="error" role="alert">Check the highlighted email address.</p>}
      {focused && matches.length > 0 && <div className="suggestions menu" aria-label="Recipient suggestions">
        {matches.map((option, index) => <button key={option.key} type="button" className={'menu-item' + (choice === index ? ' highlighted' : '')} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
          <strong>{option.name}</strong><small>{option.email || memberCountLabel(array(option.list.contactIds).length)}</small>
        </button>)}
      </div>}
    </div>
  </div>
}

const formatting = [
  ['bold', 'Bold', Bold], ['italic', 'Italic', Italic], ['underline', 'Underline', Underline],
  ['insertUnorderedList', 'Bulleted list', List], ['insertOrderedList', 'Numbered list', ListOrdered],
]
const attachmentLimitError = 'Attachments can total up to 25 MB.'

export function ComposeEditor({ draft, inline, onClose, onDraftCreated }) {
  const { state, getState } = useStore()
  const { confirm, notify } = useInterface()
  const { save, send } = useDraftActions()
  const { discardDrafts } = useMailActions()
  const [showCc, setShowCc] = useState(array(draft?.cc).length > 0)
  const [showBcc, setShowBcc] = useState(array(draft?.bcc).length > 0)
  const [subject, setSubject] = useState(draft?.subject || '')
  const [error, setError] = useState('')
  const [link, setLink] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [recent, setRecent] = useState(false)
  const [pending, setPending] = useState(false)
  const [sending, setSending] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const sendingRef = useRef(false)
  const uploading = useRef(false)
  const picker = useRef(null)
  const body = useRef(null)
  const previousEditor = useRef(null)
  const selection = useRef(null)
  const draftRef = useRef(draft?.id)
  const edits = useRef(Promise.resolve())
  const alive = useRef(true)
  const current = draft || array(state.messages).find(message => message.id === draftRef.current && isDraft(message))
  const overLimit = attachmentBytes(current?.attachments) > attachmentLimit
  const writing = state.settings?.writing || {}
  const signature = writing.signature?.enabled && writing.signature.text ? '\n\n' + writing.signature.text : ''
  const from = current?.from?.email || writing.defaultFrom || state.currentUser?.email || ''
  const fromAddresses = accountEmails(state.currentUser)
  const source = array(state.messages).find(message => message.id === (current?.inReplyToId || current?.forwardedFromId))
  useEffect(() => {
    if (draft?.id) draftRef.current = draft.id
    if (body.current && previousEditor.current !== draftRef.current) {
      body.current.innerHTML = draft?.bodyHtml ? sanitizeHtml(draft.bodyHtml) : plainHtml(draft?.body ?? signature)
      previousEditor.current = draftRef.current
    }
  }, [draft, signature])
  useLayoutEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  function edit(patch, events) {
    edits.current = edits.current.then(async () => {
      const saved = await save(draftRef.current, patch, events)
      if (saved && !draftRef.current) {
        draftRef.current = saved.id
        previousEditor.current = saved.id
        if (alive.current) onDraftCreated?.(saved.id)
      }
      if (saved && alive.current) setError('')
      return saved
    })
    return edits.current
  }
  function editBody() {
    const bodyHtml = sanitizeHtml(body.current.innerHTML)
    const plain = htmlPlain(bodyHtml)
    edit({ bodyHtml, body: plain, snippet: snippetOf(plain) })
  }
  function format(command, value) {
    body.current.focus()
    document.execCommand('styleWithCSS', false, false)
    document.execCommand(command, false, value)
    editBody()
  }
  function recipients(field, label) {
    return <RecipientField label={label} initialAddresses={array(current?.[field])} initialInput={current?.recipientInput?.[field]}
      onEdit={(value, addresses) => edit(before => {
        const initial = before?.recipientInput || {}
        return {
          ...(addresses && { [field]: addresses }),
          ...((initial[field] || value) && { recipientInput: { ...initial, [field]: value } }),
        }
      })} />
  }
  function getDraft() {
    return array(getState().messages).find(message => message.id === draftRef.current && isDraft(message))
  }
  function updateAttachments(files, type, remove = false) {
    return edit(before => {
      const previous = array(before?.attachments)
      const next = remove ? previous.filter(file => file.id !== files[0].id) : [...previous, ...files]
      if (!remove && attachmentBytes(next) > attachmentLimit) {
        if (alive.current) setError(attachmentLimitError)
        return null
      }
      return { attachments: next }
    }, files.map(file => ({ type: 'attachment.' + type, details: {
      ...fileDetails(file), ...(remove && { before: file }),
      ...(type === 'reuse' && { reusedFromMessageId: file.reusedFromMessageId, reusedFromAttachmentId: file.reusedFromAttachmentId }),
    } })))
  }
  async function upload(files) {
    if (!files.length || uploading.current) return
    uploading.current = true
    setPending(true)
    setError('')
    try {
      await edits.current
      if (!alive.current) return
      if (attachmentBytes(getDraft()?.attachments) + attachmentBytes(files) > attachmentLimit) {
        setError(attachmentLimitError)
        return
      }
      const saved = await uploadFiles(files)
      if (alive.current) await updateAttachments(saved.map(file => ({ ...file, id: id('att') })), 'upload')
    } catch {
      if (alive.current) setError('Upload failed. Try attaching the files again.')
    } finally {
      uploading.current = false
      if (alive.current) setPending(false)
    }
  }
  function reuse(message, file) {
    if (!localFilePath(file.url)) { setError('This file is unavailable.'); setRecent(false); return }
    updateAttachments([{ ...file, id: id('att'), source: 'recent', reusedFromMessageId: message.id, reusedFromAttachmentId: file.id }], 'reuse')
    setRecent(false)
  }
  async function submit() {
    if (uploading.current || sendingRef.current) return
    await edits.current
    if (!alive.current) return
    const latest = getDraft()
    if (attachmentBytes(latest?.attachments) > attachmentLimit) {
      setError(attachmentLimitError)
      return
    }
    const recipients = [...array(latest?.to), ...array(latest?.cc), ...array(latest?.bcc)]
    if (!recipients.length || !recipients.every(address => emailValid(address?.email)) || hasPendingRecipients(latest)) {
      setError('Enter at least one valid recipient and correct any highlighted addresses.')
      return
    }
    const emptySubject = !latest.subject?.trim()
    async function complete() {
      if (sendingRef.current) return
      sendingRef.current = true
      setSending(true)
      const pageKey = window.history.state?.key
      try {
        const done = await send(latest, emptySubject)
        if (done) {
          notify('Message sent')
          if (window.history.state?.key === pageKey) onClose()
        } else if (done === false && alive.current) {
          setError('The draft changed. Review it and try sending again.')
        }
      } finally {
        sendingRef.current = false
        if (alive.current) setSending(false)
      }
    }
    if (emptySubject) confirm({ title: 'Send without a subject?', text: 'This message has an empty subject.', action: 'Send anyway', onConfirm: complete })
    else complete()
  }
  async function deleteDraft() {
    await edits.current
    if (!alive.current) return
    const value = draftRef.current
    if (!value) { onClose(); return }
    const pageKey = window.history.state?.key
    discardDrafts([value], () => { if (window.history.state?.key === pageKey) onClose() })
  }

  return <section className={'compose-editor' + (inline ? ' inline-compose' : '') + (dragOver ? ' drag-files' : '')}
    onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragOver(true) } }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false) }}
    onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); setDragOver(false); upload([...event.dataTransfer.files]) } }}
    onKeyDown={event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && writing.sendWithCtrlEnter !== false && state.settings?.keyboardShortcuts !== false) {
      event.preventDefault()
      event.stopPropagation()
      if (document.activeElement instanceof HTMLElement && document.activeElement !== body.current) document.activeElement.blur()
      submit()
    }
  }}>
    <header className="compose-header"><h1>{current?.replyType === 'forward' ? 'Forward' : current?.replyType === 'replyAll' ? 'Reply all' : current?.replyType ? 'Reply' : 'New message'}</h1><IconButton icon={X} label="Close compose" onClick={onClose} /></header>
    <label className="compose-line"><span>From</span><select aria-label="From" value={from} onChange={event => edit({ from: { name: state.currentUser?.name || '', email: event.target.value } })}>
      {[...new Set([from, ...fromAddresses])].map(email => <option value={email} key={email}>{email || 'No account address'}</option>)}
    </select></label>
    <div className="to-row">{recipients('to', 'To')}
      <div>{!showCc && !array(current?.cc).length && <button className="tool-button" onClick={() => setShowCc(true)}>Cc</button>}{!showBcc && !array(current?.bcc).length && <button className="tool-button" onClick={() => setShowBcc(true)}>Bcc</button>}</div>
    </div>
    {(showCc || array(current?.cc).length > 0 || current?.recipientInput?.cc) && recipients('cc', 'Cc')}
    {(showBcc || array(current?.bcc).length > 0 || current?.recipientInput?.bcc) && recipients('bcc', 'Bcc')}
    <label className="compose-line"><span>Subject</span><input aria-label="Subject" value={subject} onChange={event => { const value = event.target.value; setSubject(value); edit({ subject: value }) }} /></label>
    <div className="compose-body" ref={body} contentEditable role="textbox" aria-multiline="true" aria-label="Message body" suppressContentEditableWarning
      style={{ fontFamily: writing.defaultFont, fontSize: { small: 13, medium: 15, large: 18 }[writing.defaultFontSize] || 15 }}
      onInput={editBody} onPaste={event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); editBody() }} />
    {(source || current?.quotedText) && <details className="message-quote" open={current.replyType === 'forward'}><summary>{current.replyType === 'forward' ? 'Forwarded message' : 'Show quoted message'}</summary><pre>{current.quotedText || quoteText(source, current.replyType)}</pre></details>}
    {!!array(current?.attachments).length && <div className="compose-attachments">{array(current.attachments).map(file => <span className="compose-attachment" key={file.id}><Paperclip size={15} /><span><strong>{file.name}</strong><small>{fileSize(file.size)}</small></span><IconButton icon={X} label={'Remove ' + file.name} onClick={() => updateAttachments([file], 'remove', true)} /></span>)}</div>}
    {pending && <p className="muted compose-error" role="status">Uploading attachments…</p>}
    {(overLimit || error) && <p className="error compose-error" role="alert">{overLimit ? attachmentLimitError : error}</p>}
    <div className="compose-tools">
      <button className="primary" onClick={submit} disabled={pending || sending}><Send size={16} /> {sending ? 'Sending…' : 'Send'}</button>
      {formatting.map(([command, label, Icon]) => <IconButton key={command} icon={Icon} label={label} onMouseDown={event => event.preventDefault()} onClick={() => format(command)} />)}
      <IconButton icon={Link2} label="Insert link" onMouseDown={event => event.preventDefault()} onClick={() => {
        selection.current = window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0).cloneRange() : null
        setLinkError('')
        setLink(true)
      }} />
      <input type="file" multiple hidden ref={picker} aria-label="Attach files from computer" onChange={event => { upload([...event.target.files]); event.target.value = '' }} />
      <Menu icon={Paperclip} label="Attach files" align="left">{close => <>
        <MenuItem icon={Paperclip} disabled={pending} onClick={() => { close(); picker.current.click() }}>Attach files from computer</MenuItem>
        <MenuItem icon={Paperclip} disabled={pending} onClick={() => { close(); setRecent(true) }}>Attach files from recent emails</MenuItem>
      </>}</Menu>
      <div className="toolbar-spacer" />
      <IconButton icon={Trash2} label="Discard draft" onClick={deleteDraft} />
    </div>
    {recent && <RecentFiles items={eligibleAttachments(state.messages)} close={() => setRecent(false)} choose={reuse} />}
    {link && <Modal title="Insert link" close={() => setLink(false)}>
      <form onSubmit={event => {
        event.preventDefault()
        const address = new FormData(event.currentTarget).get('address').trim()
        if (!safeLink(address)) { setLinkError('Enter an https://, http:// or mailto: address.'); return }
        setLink(false)
        body.current.focus()
        if (selection.current && body.current.contains(selection.current.commonAncestorContainer)) {
          const active = window.getSelection()
          active.removeAllRanges()
          active.addRange(selection.current)
        }
        if (window.getSelection()?.isCollapsed) {
          const safe = escapeHtml(address)
          document.execCommand('insertHTML', false, '<a href="' + safe + '">' + safe + '</a>')
          editBody()
        } else format('createLink', address)
      }}><label className="field">Web address<input name="address" required /></label>{linkError && <p className="error" role="alert">{linkError}</p>}
        <footer className="dialog-actions"><button type="button" className="secondary" onClick={() => setLink(false)}>Cancel</button><button className="primary">Insert link</button></footer>
      </form>
    </Modal>}
  </section>
}
