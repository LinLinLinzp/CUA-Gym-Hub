import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bold, Eye, Heading2, Italic, Link2, List, ListOrdered, LockKeyhole, Monitor, Quote, Settings2, Smartphone, Undo2, Redo2 } from 'lucide-react'
import { useLocation, useParams } from 'react-router-dom'
import { AppLink, Mark, useAppNavigate } from '../components/Shell.jsx'
import { Badge, Field, Missing, Modal, Tabs } from '../components/UI.jsx'
import { useStore, nameOf } from '../state/Store.jsx'
import { articleContentIssue, policiesFor, policyLabels, postSettings, releasePost, reviewIssue, savePost, withAudience } from '../state/posts.js'
import { localInput } from '../utils/dates.js'
import { cleanHtml, safeHref } from '../utils/articleHtml.js'
import { articlePath, audienceLabels, postPath } from '../utils/format.js'

const postsUrl = '/publish/posts'
const tools = [
  ['undo', 'Undo', Undo2], ['redo', 'Redo', Redo2], ['heading', 'Heading', Heading2],
  ['bold', 'Bold', Bold], ['italic', 'Italic', Italic], ['link', 'Link', Link2],
  ['quote', 'Quote', Quote], ['insertUnorderedList', 'Bulleted list', List], ['insertOrderedList', 'Numbered list', ListOrdered],
]
const labelForStatus = { draft: 'Draft', scheduled: 'Scheduled', published: 'Published' }

function editorRange(body) {
  const current = window.getSelection()
  if (!current?.rangeCount) return null
  const range = current.getRangeAt(0)
  return body?.contains(range.commonAncestorContainer) ? range : null
}

export function EditorRoute() {
  const { id } = useParams()
  const { state } = useStore()
  const post = state.posts.find(item => item.id === id && item.status !== 'deleted')
  if (id && !post) return <Missing title="Post not found" to={postsUrl} action="Back to Posts" />
  return <Editor key={id || 'new'} post={post} />
}

function Editor({ post }) {
  const { state, commit, setNotice } = useStore()
  const navigate = useAppNavigate()
  const { state: locationState } = useLocation()
  const published = post?.status === 'published'
  const scheduled = post?.status === 'scheduled'
  const [title, setTitle] = useState(post?.title || '')
  const [subtitle, setSubtitle] = useState(post?.subtitle || '')
  const [bodyHtml, setBodyHtml] = useState(() => cleanHtml(post?.bodyHtml || ''))
  const [settings, setSettings] = useState(() => postSettings(post))
  const [show, setShow] = useState(locationState?.review ? 'review' : '')
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [formats, setFormats] = useState([])
  const body = useRef(null)
  const selection = useRef(null)
  const linkSelection = useRef(null)
  const initialBody = useRef(bodyHtml)
  const heading = post?.status === 'scheduled' ? 'Scheduled' : published ? 'Published' : 'Draft'
  const author = nameOf(state, post?.authorId || state.currentUserId)
  const fields = { title: title.trim(), subtitle: subtitle.trim(), bodyHtml, ...settings }
  const back = post?.status === 'scheduled' ? '?tab=scheduled' : published ? '' : '?tab=drafts'

  useEffect(() => {
    body.current.innerHTML = initialBody.current
  }, [])

  const readFormats = useCallback(() => {
    const range = editorRange(body.current)
    if (!range) return
    selection.current = range.cloneRange()
    const block = String(document.queryCommandValue('formatBlock')).toLowerCase()
    setFormats([block === 'h2' ? 'heading' : '', block === 'blockquote' ? 'quote' : '',
      ...['bold', 'italic', 'insertUnorderedList', 'insertOrderedList'].filter(command => document.queryCommandState(command))])
  }, [])
  useEffect(() => {
    document.addEventListener('selectionchange', readFormats)
    return () => document.removeEventListener('selectionchange', readFormats)
  }, [readFormats])

  function syncBody() {
    setBodyHtml(cleanHtml(body.current.innerHTML))
    setSaveError('')
    readFormats()
  }
  function focusBody(range = selection.current) {
    body.current.focus()
    const current = window.getSelection()
    if (range && body.current.contains(range.commonAncestorContainer)) {
      current.removeAllRanges()
      current.addRange(range)
    }
  }
  function format(command) {
    if (command === 'link') {
      linkSelection.current = (editorRange(body.current) ?? selection.current)?.cloneRange() ?? null
      setLink('')
      setLinkError('')
      setShow('link')
      return
    }
    focusBody()
    if (command === 'heading' || command === 'quote') {
      document.execCommand('formatBlock', false, formats.includes(command) ? 'p' : command === 'heading' ? 'h2' : 'blockquote')
    } else {
      document.execCommand(command, false)
    }
    syncBody()
  }
  function insertLink(event) {
    event.preventDefault()
    const href = safeHref(link)
    if (!href) { setLinkError('Enter a valid URL, such as https://example.com.'); return }
    const range = linkSelection.current
    setShow('')
    requestAnimationFrame(() => {
      if (!body.current) return
      focusBody(range)
      if (window.getSelection().isCollapsed) {
        const anchor = document.createElement('a')
        anchor.setAttribute('href', href)
        anchor.textContent = href
        document.execCommand('insertHTML', false, anchor.outerHTML)
      } else document.execCommand('createLink', false, href)
      syncBody()
    })
  }
  function save(review = false) {
    const issue = scheduled ? articleContentIssue(fields) : ''
    setSaveError(issue)
    if (issue) return
    if (scheduled && review) { setShow('review'); return }
    const saved = commit(previous => savePost(previous, post?.id, fields), review ? undefined : published ? 'Changes saved' : 'Draft saved')
    if (!post && saved) {
      navigate(postPath(saved.posts.at(-1)), { replace: true, state: review ? { review: true } : null })
    } else if (review) {
      setShow('review')
    } else if (!saved) {
      setNotice('Changes are already saved')
    }
  }

  return <div className="editor">
    <header className="editor-header">
      <div className="editor-header-left"><AppLink className="icon-button" aria-label="Back to Posts" to={postsUrl + back}><ArrowLeft size={17} /></AppLink><Mark brand />
        <Badge tone={post?.status}>{heading}</Badge>
      </div>
      <div className="toolbar">
        <button className="icon-button" title="Post settings" aria-label="Post settings" onClick={() => setShow('settings')}><Settings2 size={17} /></button>
        <button className="button" onClick={() => setShow('preview')}><Eye size={16} /> Preview</button>
        <button className={`button ${published ? 'primary' : ''}`} onClick={() => save()}>{published ? 'Save changes' : 'Save draft'}</button>
        {!published && <button className="button primary" onClick={() => save(true)}>Continue</button>}
      </div>
    </header>
    <div className="format-toolbar" aria-label="Article formatting" role="toolbar">
      {tools.map(([command, label, Icon]) => <button key={command} className="icon-button" type="button" aria-label={label} title={label}
        aria-pressed={['undo', 'redo', 'link'].includes(command) ? undefined : formats.includes(command)}
        onMouseDown={event => event.preventDefault()} onClick={() => format(command)}><Icon size={16} /></button>)}
    </div>
    <main className="writing-column">
      {saveError && <p id="article-save-error" role="alert" className="field-error">{saveError}</p>}
      <label className="visually-hidden" htmlFor="article-title">Title</label>
      <textarea id="article-title" className="editor-title" value={title} placeholder="Title" rows={1}
        aria-describedby={saveError ? 'article-save-error' : undefined} onChange={event => { setTitle(event.target.value); setSaveError('') }} />
      <label className="visually-hidden" htmlFor="article-subtitle">Subtitle</label>
      <textarea id="article-subtitle" className="editor-subtitle" value={subtitle} placeholder="Add a subtitle…" rows={1} onChange={event => setSubtitle(event.target.value)} />
      <div className="editor-byline">{author}</div>
      <div ref={body} className="article-body editable" role="textbox" aria-label="Article body" aria-multiline="true" contentEditable suppressContentEditableWarning
        aria-describedby={saveError ? 'article-save-error' : undefined} data-placeholder="Start writing…" onInput={syncBody}
        onPaste={event => {
          event.preventDefault()
          const html = event.clipboardData.getData('text/html')
          if (html) document.execCommand('insertHTML', false, cleanHtml(html))
          else document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
          syncBody()
        }}
        onDrop={event => event.preventDefault()}
        onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); format('link') } }} />
    </main>
    {show === 'preview' && <Modal title="Preview" wide onClose={() => setShow('')}><PostPreview post={fields} author={author} /></Modal>}
    {show === 'link' && <Modal title="Insert link" onClose={() => setShow('')} footer={<>
      <button className="button" onClick={() => setShow('')}>Cancel</button><button className="button primary" type="submit" form="insert-link">Insert link</button>
    </>}>
      <form id="insert-link" onSubmit={insertLink}><Field label="URL"><input autoFocus value={link} onChange={event => setLink(event.target.value)} placeholder="https://example.com" /></Field>
        {linkError && <p role="alert" className="field-error">{linkError}</p>}
      </form>
    </Modal>}
    {(show === 'settings' || show === 'review') && <SettingsDialog post={post} review={show === 'review'} edits={scheduled ? fields : undefined} settings={settings} onClose={() => setShow('')}
      onApply={value => { setSettings(value); setShow('') }} />}
  </div>
}

function SettingsDialog({ post, review, edits, settings, onClose, onApply }) {
  const { commit } = useStore()
  const navigate = useAppNavigate()
  const [value, setValue] = useState(settings)
  const [scheduling, setScheduling] = useState(post?.status === 'scheduled')
  const initialTiming = localInput(post?.scheduledAt)
  const [timing, setTiming] = useState(initialTiming)
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    if (!review) { onApply(value); return }
    const scheduledAt = scheduling ? (timing === initialTiming && post.scheduledAt ? post.scheduledAt : timing) : null
    const issue = reviewIssue({ ...post, ...edits }, scheduledAt)
    if (issue) { setError(issue); return }
    const result = commit(previous => releasePost(previous, post.id, value, scheduledAt, edits), scheduling ? 'Post scheduled' : 'Post published')
    if (result || (scheduling && post.status === 'scheduled')) {
      onClose()
      navigate(postsUrl + (scheduling ? '?tab=scheduled' : ''))
    } else setError('This article is no longer available to publish.')
  }
  return <Modal title={review ? 'Publish' : 'Post settings'} onClose={onClose} side={review} footer={<>
    <button className="button" onClick={onClose}>Cancel</button>
    <button className="button primary" type="submit" form="post-review">{review ? (scheduling ? 'Schedule' : 'Publish now') : 'Apply settings'}</button>
  </>}>
    <form id="post-review" className="stack-form" onSubmit={submit} noValidate>
      <PostSettings value={value} onChange={setValue} />
      {review && <div className="stack-form schedule-controls">
        <label className="checkbox-field"><input type="checkbox" checked={scheduling} onChange={event => { setScheduling(event.target.checked); setError('') }} /> Schedule for later</label>
        {scheduling && <Field label="Publish date and time" hint="Uses your local time zone."><input type="datetime-local" value={timing} onChange={event => { setTiming(event.target.value); setError('') }} /></Field>}
      </div>}
      {error && <p role="alert" className="field-error">{error}</p>}
    </form>
  </Modal>
}

function PostSettings({ value, onChange }) {
  const [tagText, setTagText] = useState(value.tags.join(', '))
  const [policyChanged, setPolicyChanged] = useState(false)
  return <div className="stack-form">
    <Field label="Who is this post for?"><select value={value.audience} onChange={event => {
      const next = withAudience(value, event.target.value)
      setPolicyChanged(next.commentPolicy !== value.commentPolicy)
      onChange(next)
    }}>{Object.entries(audienceLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></Field>
    <Field label="Allow comments from" hint={policyChanged ? `Comment access changed to ${policyLabels[value.commentPolicy]} for this audience.` : undefined}>
      <select value={value.commentPolicy} onChange={event => { setPolicyChanged(false); onChange({ ...value, commentPolicy: event.target.value }) }}>
        {policiesFor(value.audience).map(id => <option value={id} key={id}>{policyLabels[id]}</option>)}
      </select>
    </Field>
    <Field label="Tags" hint="Separate tags with commas."><input value={tagText} onChange={event => {
      setTagText(event.target.value)
      onChange({ ...value, tags: Array.from(new Set(event.target.value.split(',').map(tag => tag.trim()).filter(Boolean))) })
    }} /></Field>
    <label className="checkbox-field"><input type="checkbox" checked={value.sendByEmailAndApp} onChange={event => onChange({ ...value, sendByEmailAndApp: event.target.checked })} /> Send via email and the Substack app</label>
  </div>
}

export function PostPreview({ post, author }) {
  const [channel, setChannel] = useState('web')
  const [size, setSize] = useState('desktop')
  const audienceOrder = ['everyone', 'free', 'paid', 'founding']
  const intended = audienceOrder.includes(post.audience) ? post.audience : 'everyone'
  const [audience, setAudience] = useState(intended)
  const entitled = audienceOrder.indexOf(audience) >= audienceOrder.indexOf(intended)
  return <div className="preview-controls">
    <div className="toolbar preview-toolbar">
      <Tabs items={[[ 'web', 'Web' ], [ 'email', 'Email' ]]} value={channel} onChange={setChannel} label="Preview channel" />
      <select aria-label="Preview audience" value={audience} onChange={event => setAudience(event.target.value)}>
        {Object.entries(audienceLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
      </select>
      <button type="button" className="icon-button" aria-label="Desktop" aria-pressed={size === 'desktop'} title="Desktop" onClick={() => setSize('desktop')}><Monitor size={16} /></button>
      <button type="button" className="icon-button" aria-label="Mobile" aria-pressed={size === 'mobile'} title="Mobile" onClick={() => setSize('mobile')}><Smartphone size={16} /></button>
    </div>
    <div className={`preview-paper ${size} ${channel}`}>
      <small>{channel === 'email' ? 'Email preview' : 'Web preview'} · {audienceLabels[audience]}</small>
      <h1 className="article-title">{post.title || 'Untitled'}</h1>
      {post.subtitle && <p className="article-subtitle">{post.subtitle}</p>}
      <div className="editor-byline">{author}</div>
      {entitled ? <div className="article-body" dangerouslySetInnerHTML={{ __html: cleanHtml(post.bodyHtml, true) }} />
        : <div className="reader-locked"><LockKeyhole size={18} /> This article is for {audienceLabels[intended].toLowerCase()}.</div>}
    </div>
  </div>
}

export function PreviewRoute() {
  const { state } = useStore()
  const { id } = useParams()
  const post = state.posts.find(item => item.id === id && item.status !== 'deleted')
  if (!post) return <Missing title="Post not found" to={postsUrl} action="Back to Posts" />
  return <div className="page standalone-preview">
    <div className="page-heading"><AppLink className="button" to={postPath(post)}><ArrowLeft size={16} /> Back to editor</AppLink>
      {post.status === 'published' && post.slug && <AppLink to={articlePath(post)}>View published post</AppLink>}</div>
    <PostPreview post={post} author={nameOf(state, post.authorId)} />
  </div>
}
