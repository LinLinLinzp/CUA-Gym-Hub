import React, { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, CalendarClock, Check, CircleHelp, Eye, Heading, Image, List, ListTree, PanelRight, Plus, Quote, Trash2, Type, X } from 'lucide-react'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import { changeContentLifecycle, contentFields, saveContent, typeLabel, utcInput } from '../data/content.js'
import { difference, equal, makeId } from '../data/records.js'
import { useStore } from '../data/store.jsx'
import { AuthorOptions, ParentOptions, StatusOptions, TermChecks } from '../components/ContentSettings.jsx'
import { Confirm, Field, Modal, moveOptionFocus, StatusPill } from '../components/Controls.jsx'
import DocumentView from '../components/DocumentView.jsx'
import MediaPicker from '../components/MediaPicker.jsx'
import MediaPreview from '../components/MediaPreview.jsx'
import PreviewComments from '../components/PreviewComments.jsx'
import PreviewLayout from '../components/PreviewLayout.jsx'
import { displayDate, rows } from '../utils/display.js'
import { editorPath, listPath, SiteLink, useSessionRouting } from '../utils/navigation.jsx'

const blockChoices = {
  paragraph: { label: 'Paragraph', Icon: Type, initial: { text: '' } },
  heading: { label: 'Heading', Icon: Heading, initial: { text: '', level: 2 } },
  list: { label: 'List', Icon: List, initial: { items: [''], ordered: false } },
  image: { label: 'Image', Icon: Image, initial: { mediaId: null, caption: '' } },
  quote: { label: 'Quote', Icon: Quote, initial: { text: '', citation: '' } },
}
const dateFrom = (record) => utcInput(record?.scheduledAt || record?.publishedAt)
const liveStatus = (status) => ['published', 'private'].includes(status)
const blankTerms = { categories: '', tags: '' }
const splitTerms = (value) => value.split(',').map((name) => name.trim()).filter(Boolean)

function BlockEditor({ block, change, chooseImage, media }) {
  if (block.type === 'image') {
    const image = media.find((item) => item.id === block.mediaId)
    return <div className="image-block">
      {image && <MediaPreview item={image} full />}
      <button className="button" type="button" onClick={chooseImage}><Image size={16} /> {image ? 'Replace image' : 'Select image from Media Library'}</button>
      <input aria-label="Image caption" placeholder="Add a caption" value={block.caption ?? ''} onChange={(event) => change({ caption: event.target.value })} />
    </div>
  }
  if (block.type === 'list') return <textarea className="block-input" aria-label="List items" placeholder="Enter one list item per line…" value={rows(block.items).join('\n')} onChange={(event) => change({ items: event.target.value.split('\n') })} />
  const label = blockChoices[block.type]?.label
  if (!label) return <p className="muted">This block type is unavailable.</p>
  return <>
    <textarea className={'block-input ' + block.type} aria-label={label + ' text'} placeholder={block.type === 'paragraph' ? 'Start writing…' : 'Add ' + label.toLowerCase() + '…'} value={block.text ?? ''} onChange={(event) => change({ text: event.target.value })} />
    {block.type === 'quote' && <input aria-label="Quote citation" placeholder="Add a citation" value={block.citation ?? ''} onChange={(event) => change({ citation: event.target.value })} />}
  </>
}

function BlockSettings({ block, change }) {
  if (!block) return <p className="muted">Select a block to edit its settings.</p>
  const choice = blockChoices[block.type]
  return <div className="inspector-section">
    <h3>{choice?.label || 'Block'}</h3>
    {block.type === 'heading' && <Field label="Heading level"><select value={block.level ?? 2} onChange={(event) => change({ level: Number(event.target.value) })}>{[2, 3, 4].map((level) => <option key={level} value={level}>H{level}</option>)}</select></Field>}
    {block.type === 'list' && <label className="check-row"><input type="checkbox" checked={Boolean(block.ordered)} onChange={(event) => change({ ordered: event.target.checked })} /> Ordered list</label>}
    {block.type === 'image' && <Field label="Caption"><input value={block.caption ?? ''} onChange={(event) => change({ caption: event.target.value })} /></Field>}
    {block.type === 'paragraph' && <p className="muted">Edit the paragraph on the canvas.</p>}
    {block.type === 'quote' && <Field label="Citation"><input value={block.citation ?? ''} onChange={(event) => change({ citation: event.target.value })} /></Field>}
  </div>
}

export default function Editor({ type, record }) {
  const { state, commit, notify } = useStore()
  const { go } = useSessionRouting()
  const noun = typeLabel(type)
  const id = record?.id
  const [baseline, setBaseline] = useState(() => contentFields(record, type, state))
  const [values, setValues] = useState(baseline)
  const [initialDate, setInitialDate] = useState(() => dateFrom(record))
  const [date, setDate] = useState(initialDate)
  const [terms, setTerms] = useState(blankTerms)
  const [tab, setTab] = useState('document')
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [inserter, setInserter] = useState(false)
  const [shortcuts, setShortcuts] = useState(false)
  const [outline, setOutline] = useState(false)
  const inserterTrigger = useRef(null)
  const inserterMenu = useRef(null)
  const [preview, setPreview] = useState(false)
  const [settings, setSettings] = useState(() => window.innerWidth >= 960)
  const [picker, setPicker] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [lifecycleConfirm, setLifecycleConfirm] = useState(null)
  const [formError, setFormError] = useState(null)
  const leave = useRef(false)
  const blocks = values.blocks
  const headings = blocks.flatMap((block, index) => block.type === 'heading' ? [{ block, key: block.id || index }] : [])
  const jumpTo = (key) => {
    const block = document.getElementById('editor-' + key)
    block?.scrollIntoView?.({ block: 'center' })
    block?.querySelector('textarea')?.focus({ preventScroll: true })
  }
  const media = rows(state.media)
  const trashed = record?.status === 'trash'
  const dirty = !trashed && (!equal(baseline, values) || date !== initialDate || Object.values(terms).some((term) => term.trim()))
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !leave.current &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  useBeforeUnload((event) => {
    if (dirty && !leave.current) { event.preventDefault(); event.returnValue = '' }
  })

  const set = (name, value) => { setValues((previous) => ({ ...previous, [name]: value })); setFormError(null) }
  const setStatus = (status) => {
    set('status', status)
    setDate(status === baseline.status ? initialDate : status === 'scheduled' ? '' : liveStatus(status) && liveStatus(baseline.status) ? initialDate : '')
  }
  const patchBlock = (block, patch) => set('blocks', blocks.map((item) => item === block ? { ...item, ...patch } : item))
  const toggleInserter = (event) => {
    if (inserter) setInserter(false)
    else {
      inserterTrigger.current = event.currentTarget
      setInserter(true)
    }
  }
  const closeInserter = () => {
    setInserter(false)
    inserterTrigger.current?.focus()
  }
  useEffect(() => {
    if (!inserter) return
    inserterMenu.current?.querySelector('[data-keyboard-option]')?.focus()
    inserterMenu.current?.scrollIntoView?.({ block: 'nearest' })
  }, [inserter])
  const currentBlock = blocks.find((block) => block.id === selectedBlock)
  const insert = (type) => {
    const block = { id: makeId('block'), type, ...blockChoices[type].initial }
    const at = currentBlock ? blocks.indexOf(currentBlock) + 1 : blocks.length
    set('blocks', [...blocks.slice(0, at), block, ...blocks.slice(at)])
    setSelectedBlock(block.id)
    setInserter(false)
    requestAnimationFrame(() => document.getElementById('editor-' + block.id)?.querySelector('textarea, .image-block button')?.focus())
  }
  const move = (from, to) => {
    if (to < 0 || to >= blocks.length) return
    const next = [...blocks]
    next.splice(to, 0, ...next.splice(from, 1))
    set('blocks', next)
  }
  const remove = (index) => {
    set('blocks', blocks.filter((_, i) => i !== index))
    setSelectedBlock(null)
  }
  const fieldError = (name) => formError?.field === name ? formError.error : undefined
  const handleError = (result) => {
    setFormError(result)
    if (result.field === 'title') document.getElementById('editor-title')?.focus()
    if (result.field && result.field !== 'title') { setTab('document'); setSettings(true) }
  }
  const save = (status, dateOverride) => {
    const choices = { ...values, status }
    const fields = record ? difference(baseline, choices) : choices
    const dateChanged = date !== initialDate && (liveStatus(status) || status === 'scheduled') && dateOverride !== false
    if (dateChanged) fields.status = status
    const passedDate = dateChanged || 'status' in fields && status === 'scheduled' ? date :
      'status' in fields && liveStatus(status) && dateOverride !== false && date ? date : undefined
    const result = commit((current, stamp) => saveContent(current, stamp, type, id ? [id] : [], fields, {
      create: !id, date: passedDate, terms: { categories: splitTerms(terms.categories), tags: splitTerms(terms.tags) },
    }))
    setConfirmation(null)
    if (result.error) return handleError(result)
    if (!result.record) { notify('No changes to save.'); return }
    const saved = result.record
    const savedFields = contentFields(saved, type, result.next)
    const savedDate = dateFrom(saved)
    setBaseline(savedFields); setValues(savedFields); setInitialDate(savedDate); setDate(savedDate); setTerms(blankTerms); setFormError(null)
    if (!id) {
      leave.current = true
      go(editorPath(saved.id), { replace: true })
    }
  }
  const primaryAction = () => {
    const status = values.status
    if (liveStatus(status) && (!id || status !== record.status)) {
      if (!values.title.trim()) return handleError({ field: 'title', error: 'Enter a title to continue.' })
      setConfirmation(status)
      return
    }
    save(status)
  }
  const mainLabel = !id || record.status !== values.status
    ? { draft: id ? 'Save draft' : 'Publish', pending: 'Submit for review', published: 'Publish', private: 'Publish privately', scheduled: 'Schedule' }[values.status]
    : record.status === 'draft' ? 'Publish' : 'Update'
  const runPrimary = () => {
    if (mainLabel === 'Publish' && values.status === 'draft') {
      if (!values.title.trim()) return handleError({ field: 'title', error: 'Enter a title to continue.' })
      setConfirmation('published')
      return
    }
    primaryAction()
  }
  useEffect(() => {
    const keyboardSave = (event) => {
      if ((!event.metaKey && !event.ctrlKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      if (event.repeat || trashed || shortcuts || preview || picker || confirmation || lifecycleConfirm || blocker.state === 'blocked') return
      if (values.status === 'draft') save('draft', false)
      else runPrimary()
    }
    window.addEventListener('keydown', keyboardSave)
    return () => window.removeEventListener('keydown', keyboardSave)
  })
  const savedStatus = record?.status || 'draft'
  const changeLifecycle = (action) => {
    const result = commit((current, stamp) => changeContentLifecycle(current, stamp, type, [id], action))
    setLifecycleConfirm(null)
    if (result.error) { notify(result.error); return }
    leave.current = true
    go(listPath(type, action === 'delete' ? 'trash' : action === 'restore' ? 'draft' : undefined))
  }

  return <div className="editor">
    <header className="editor-header">
      <div className="editor-header-start"><SiteLink className="button subtle" to={listPath(type, trashed ? 'trash' : undefined)}><ArrowLeft size={17} /><span>Back</span></SiteLink>
        {!trashed && <button type="button" className="icon-button insert-toggle" aria-label="Add block" aria-expanded={inserter} onClick={toggleInserter}><Plus size={20} /></button>}
        {!trashed && <button type="button" className="icon-button" aria-label="Document outline" aria-pressed={outline} onClick={() => setOutline(!outline)}><ListTree size={19} /></button>}
        <div className="editor-title-status"><strong>{values.title || (id ? 'Untitled' : 'New ' + noun.toLowerCase())}</strong><StatusPill status={savedStatus} editorial /></div>
      </div>
      <div className="editor-header-actions">
        {!trashed && <button type="button" className="icon-button" aria-label="Keyboard shortcuts" onClick={() => setShortcuts(true)}><CircleHelp size={18} /></button>}
        {id && !dirty && <span className="saved-label meta"><Check size={14} /> Saved</span>}
        <button type="button" className="button subtle" onClick={() => setPreview(true)}><Eye size={16} /> Preview</button>
        {trashed && <>
          <button type="button" className="button" onClick={() => changeLifecycle('restore')}>Restore</button>
          <button type="button" className="button danger" onClick={() => setLifecycleConfirm('delete')}>Delete permanently</button>
        </>}
        {!trashed && <>
          {mainLabel !== 'Save draft' && (savedStatus === 'draft' || savedStatus === 'pending') && <button type="button" className="button" onClick={() => save('draft', false)}>Save draft</button>}
          <button type="button" className="button primary" onClick={runPrimary}>{mainLabel || 'Update'}</button>
          <button type="button" className="icon-button" aria-label="Settings" aria-pressed={settings} onClick={() => setSettings(!settings)}><PanelRight size={19} /></button>
        </>}
      </div>
    </header>
    {trashed ? <main className="editor-stage"><DocumentView record={record} media={media} /></main> : <div className="editor-layout">
      <main className="editor-stage">
        {outline && <nav className="editor-outline card" aria-label="Document outline">
          <h2>Outline</h2>
          {headings.length ? <ol>{headings.map(({ block, key }) => <li key={key} style={{ '--level': [2, 3, 4].includes(block.level) ? block.level - 2 : 0 }}><button type="button" className="text-button" onClick={() => jumpTo(key)}>{block.text || 'Untitled heading'}</button></li>)}</ol> : <p className="meta">Add a heading block to build the outline.</p>}
        </nav>}
        <div className="editor-canvas">
          <label className="visually-hidden" htmlFor="editor-title">Title</label>
          <textarea id="editor-title" className="canvas-title" placeholder="Add title" rows="1" value={values.title} onChange={(event) => set('title', event.target.value)} aria-invalid={Boolean(fieldError('title'))} />
          {fieldError('title') && <p className="text-danger" role="alert">{fieldError('title')}</p>}
          {formError && !formError.field && <p className="text-danger" role="alert">{formError.error}</p>}
          <div className="blocks">
            {blocks.map((block, index) => <section id={'editor-' + (block.id || index)} className={'editor-block' + (selectedBlock === block.id ? ' active' : '')} key={block.id || index} onFocus={() => setSelectedBlock(block.id)}>
              <div className="block-top"><span className="meta">{blockChoices[block.type]?.label || 'Block'}</span>
                <div className="block-actions">
                  <button type="button" className="icon-button" aria-label={'Move block ' + (index + 1) + ' up'} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowUp size={15} /></button>
                  <button type="button" className="icon-button" aria-label={'Move block ' + (index + 1) + ' down'} disabled={index === blocks.length - 1} onClick={() => move(index, index + 1)}><ArrowDown size={15} /></button>
                  <button type="button" className="icon-button text-danger" aria-label={'Remove block ' + (index + 1)} onClick={() => remove(index)}><Trash2 size={15} /></button>
                </div>
              </div>
              <BlockEditor block={block} change={(patch) => patchBlock(block, patch)} chooseImage={() => setPicker({ block })} media={media} />
            </section>)}
          </div>
          <button type="button" className="button add-block" aria-expanded={inserter} onClick={toggleInserter}><Plus size={16} /> Add block</button>
          {inserter && <section ref={inserterMenu} className="block-inserter card" aria-label="Block inserter" onKeyDown={(event) => {
            if (event.key === 'Escape') closeInserter()
            else moveOptionFocus(event)
          }}>
            {Object.entries(blockChoices).map(([type, { label, Icon }]) => <button type="button" key={type} className="button" data-keyboard-option onClick={() => insert(type)}><Icon size={16} />{label}</button>)}
            <button type="button" className="icon-button" aria-label="Close block inserter" onClick={closeInserter}><X size={16} /></button>
          </section>}
        </div>
      </main>
      {settings && <aside className="editor-inspector" aria-label="Editor settings">
        <div className="inspector-tabs">
          <button type="button" aria-pressed={tab === 'document'} onClick={() => setTab('document')}>{noun}</button>
          <button type="button" aria-pressed={tab === 'block'} onClick={() => setTab('block')}>Block</button>
          <button type="button" className="icon-button" aria-label="Close settings" onClick={() => setSettings(false)}><X size={18} /></button>
        </div>
        {tab === 'block' ? <BlockSettings block={currentBlock} change={(patch) => patchBlock(currentBlock, patch)} /> : <>
          <section className="inspector-section">
            <h3>Summary</h3>
            {record && <div className="saved-summary"><StatusPill status={savedStatus} editorial />{(record.scheduledAt || record.publishedAt) && <span className="meta">{displayDate(record.scheduledAt || record.publishedAt, true)}</span>}</div>}
            <Field label="Status" error={fieldError('status')}><select value={values.status} onChange={(event) => setStatus(event.target.value)}><StatusOptions /></select></Field>
            <Field label="Publish date and time (UTC)" error={fieldError('date')}><input type="datetime-local" value={date} onChange={(event) => {
              const next = event.target.value
              setDate(next); setFormError(null)
              if (values.status === 'draft' && next && next > utcInput(new Date())) set('status', 'scheduled')
            }} /></Field>
            <Field label="Slug" error={fieldError('slug')}><input value={values.slug} onChange={(event) => set('slug', event.target.value)} placeholder="Generated from title" /></Field>
            <Field label="Author"><select value={values.authorId ?? ''} onChange={(event) => set('authorId', event.target.value || null)}><option value="">— Select author —</option><AuthorOptions users={state.users} selected={values.authorId} /></select></Field>
            <Field label="Excerpt"><textarea value={values.excerpt} onChange={(event) => set('excerpt', event.target.value)} rows="3" /></Field>
          </section>
          {type === 'post' ? [['Categories', 'categories', 'categoryIds', 'New category'], ['Tags', 'tags', 'tagIds', 'New tags']].map(([label, key, field, newLabel]) => <section className="inspector-section" key={key}>
            <TermChecks label={label} items={rows(state[key])} values={values[field]} onChange={(value) => set(field, value)} />
            <Field label={newLabel}><input value={terms[key]} placeholder="Separate with commas" onChange={(event) => setTerms((previous) => ({ ...previous, [key]: event.target.value }))} /></Field>
          </section>) : <section className="inspector-section">
            <h3>Page attributes</h3>
            <Field label="Parent" error={fieldError('parentId')}><select value={values.parentId ?? ''} onChange={(event) => set('parentId', event.target.value || null)}><ParentOptions pages={state.pages} excludeIds={id ? [id] : []} selected={values.parentId} /></select></Field>
            <Field label="Order" error={fieldError('menuOrder')}><input type="number" step="1" value={values.menuOrder} onChange={(event) => set('menuOrder', event.target.value)} /></Field>
          </section>}
          <section className="inspector-section">
            <h3>Featured image</h3>
            {values.featuredImageId && <div className="tile-image"><MediaPreview item={media.find((item) => item.id === values.featuredImageId)} /></div>}
            <button type="button" className="button" onClick={() => setPicker({ featured: true })}>{values.featuredImageId ? 'Replace featured image' : 'Set featured image'}</button>
            {values.featuredImageId && <button type="button" className="button subtle" onClick={() => set('featuredImageId', null)}>Remove featured image</button>}
          </section>
          <section className="inspector-section"><h3>Discussion</h3><label className="check-row"><input type="checkbox" checked={Boolean(values.commentsOpen)} onChange={(event) => set('commentsOpen', event.target.checked)} /> Allow comments</label></section>
          {id && <section className="inspector-section"><button type="button" className="button text-danger" onClick={() => dirty ? setLifecycleConfirm('trash') : changeLifecycle('trash')}><Trash2 size={16} /> Move to Trash</button></section>}
        </>}
      </aside>}
    </div>}
    {shortcuts && <Modal title="Keyboard shortcuts" close={() => setShortcuts(false)}>
      <dl className="shortcuts-list">
        <div><dt>Save the current document</dt><dd><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></dd></div>
        <div><dt>Move between blocks or images in a picker</dt><dd><kbd>Arrow keys</kbd></dd></div>
        <div><dt>Select the focused option</dt><dd><kbd>Enter</kbd> or <kbd>Space</kbd></dd></div>
        <div><dt>Close a picker or dialog</dt><dd><kbd>Esc</kbd></dd></div>
      </dl>
    </Modal>}
    {picker && <MediaPicker media={media} selected={picker.featured ? values.featuredImageId : picker.block.mediaId} close={() => setPicker(null)} choose={(imageId) => {
      if (picker.featured) set('featuredImageId', imageId)
      else patchBlock(picker.block, { mediaId: imageId })
      setPicker(null)
    }} />}
    {preview && <Modal title="Preview" className="preview-modal" close={() => setPreview(false)}><PreviewLayout><DocumentView record={values} media={media}>{id && <PreviewComments state={state} type={type} id={id} />}</DocumentView></PreviewLayout></Modal>}
    {confirmation && <Confirm title={confirmation === 'private' ? 'Publish privately?' : 'Publish ' + noun.toLowerCase() + '?'} action={confirmation === 'private' ? 'Publish privately' : 'Publish'} close={() => setConfirmation(null)} confirm={() => save(confirmation, true)}>
      <p>Publish “{values.title.trim()}” {confirmation === 'private' ? 'with private visibility' : 'on ' + (state.site?.name || 'your site')}.</p>
      <p className="meta publish-details"><CalendarClock size={15} /> {date ? displayDate(date + 'Z', true) : 'Immediately'}</p>
    </Confirm>}
    {lifecycleConfirm && <Confirm title={lifecycleConfirm === 'delete' ? 'Delete ' + noun.toLowerCase() + ' permanently?' : 'Move to Trash?'} action={lifecycleConfirm === 'delete' ? 'Delete permanently' : 'Move to Trash'} destructive close={() => setLifecycleConfirm(null)} confirm={() => changeLifecycle(lifecycleConfirm)}>
      <p>{lifecycleConfirm === 'delete' ? 'This permanently removes this ' + noun.toLowerCase() + ' and its comments.' : 'Unsaved edits will be discarded when this ' + noun.toLowerCase() + ' moves to Trash.'}</p>
    </Confirm>}
    {blocker.state === 'blocked' && <Confirm title="Discard unsaved changes?" action="Discard changes" destructive close={() => blocker.reset()} confirm={() => blocker.proceed()}><p>Your edits will be lost if you leave the editor.</p></Confirm>}
  </div>
}
