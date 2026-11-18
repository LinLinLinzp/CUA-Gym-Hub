import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Bold, Italic, Link2, List, ListOrdered, Pilcrow } from 'lucide-react'
import { FieldError } from './ui.jsx'

const tags = { P: 'p', DIV: 'p', STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', UL: 'ul', OL: 'ol', LI: 'li', BR: 'br', A: 'a' }
const ignored = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT'])

export function safeUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value.trim())) return null
  try {
    const url = new URL(value.trim())
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function cleanHtml(html, readOnly = false) {
  const input = document.createElement('template')
  input.innerHTML = html ?? ''
  const output = document.createElement('div')

  function append(node, parent) {
    if (node.nodeType === 3) {
      parent.append(document.createTextNode(node.textContent))
      return
    }
    if (node.nodeType !== 1 || ignored.has(node.tagName)) return
    const tag = tags[node.tagName]
    const link = tag === 'a' ? safeUrl(node.getAttribute('href') ?? '') : null
    const name = tag === 'a' ? (link ? (readOnly ? 'span' : 'a') : null) : tag
    const target = name ? document.createElement(name) : parent
    if (link && !readOnly) target.setAttribute('href', link)
    for (const child of node.childNodes) append(child, target)
    if (link && readOnly) {
      target.className = 'rich-link'
      if (target.textContent !== link) target.append(document.createTextNode(` (${link})`))
    }
    if (name) parent.append(target)
  }

  for (const node of input.content.childNodes) append(node, output)
  return output.innerHTML
}

export function RichBody({ html }) {
  return <div className="rich-body" dangerouslySetInnerHTML={{ __html: cleanHtml(html, true) }} />
}

const formats = [
  ['Paragraph', Pilcrow, 'formatBlock', 'p'], ['Bold', Bold, 'bold'], ['Italic', Italic, 'italic'],
  ['Bulleted list', List, 'insertUnorderedList'], ['Numbered list', ListOrdered, 'insertOrderedList'],
]

export function RichEditor({ label, editorRef, initial = '', error, compact = false }) {
  const initialContent = useRef(initial)
  const selection = useRef(null)
  const [addingLink, setAddingLink] = useState(false)
  const [url, setUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const id = useId()

  useLayoutEffect(() => {
    editorRef.current.innerHTML = cleanHtml(initialContent.current)
  }, [editorRef])

  function command(name, value) {
    editorRef.current.focus()
    document.execCommand(name, false, value)
  }

  function rememberSelection() {
    const current = window.getSelection()
    selection.current = current?.rangeCount && editorRef.current.contains(current.anchorNode) && editorRef.current.contains(current.focusNode)
      ? current.getRangeAt(0).cloneRange()
      : null
    setUrl('')
    setLinkError('')
    setAddingLink(true)
  }

  function insertLink() {
    const value = safeUrl(url)
    if (!value) {
      setLinkError('Enter an HTTP or HTTPS URL.')
      return
    }
    editorRef.current.focus()
    if (selection.current) {
      const current = window.getSelection()
      current.removeAllRanges()
      current.addRange(selection.current)
    }
    if (selection.current && !selection.current.collapsed) command('createLink', value)
    else {
      const anchor = document.createElement('a')
      anchor.href = value
      anchor.textContent = value
      command('insertHTML', anchor.outerHTML)
    }
    setAddingLink(false)
  }

  return <div className="rich-field">
    <span className="form-label" id={id}>{label}</span>
    <div className="rich-editor">
      <div className="format-bar" role="group" aria-label="Formatting">
        {formats.map(([title, Icon, name, value]) => <button key={name} className="icon-button" type="button"
          title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()}
          onClick={() => command(name, value)}><Icon size={17} /></button>)}
        <button type="button" className="icon-button" aria-label="Add link" title="Add link" aria-expanded={addingLink}
          onMouseDown={(event) => event.preventDefault()} onClick={rememberSelection}><Link2 size={17} /></button>
      </div>
      {addingLink && <div className="link-editor">
        <label><span>Link URL</span><input type="url" autoFocus value={url} onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); insertLink() }
            if (event.key === 'Escape') { setAddingLink(false); editorRef.current.focus() }
          }} /></label>
        <FieldError>{linkError}</FieldError>
        <div className="actions">
          <button type="button" className="button secondary" onClick={insertLink}>Insert link</button>
          <button type="button" className="button secondary" onClick={() => { setAddingLink(false); editorRef.current.focus() }}>Cancel link</button>
        </div>
      </div>}
      <div className={`rich-input${compact ? ' compact' : ''}`} ref={editorRef} contentEditable role="textbox"
        aria-labelledby={id} aria-multiline="true" aria-invalid={Boolean(error)} data-placeholder="Write here…"
        onPaste={(event) => { event.preventDefault(); command('insertText', event.clipboardData.getData('text/plain')) }}
        onDrop={(event) => event.preventDefault()} />
    </div>
    <FieldError>{error}</FieldError>
  </div>
}
