import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { bodyText, difference, locate, marksAt, sliceFragment, textFragment } from '../data/body.js'
import { placeSelection, readSelection, renderedText } from '../utils/selection.js'
import { PaperBody } from './Paper.jsx'

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

function deletionRange(text, range, type) {
  if (range.start !== range.end) return range
  const offset = range.start
  if (type === 'deleteWordBackward') return { start: offset - (text.slice(0, offset).match(/\s*[^\s]*$/)?.[0].length ?? 0), end: offset }
  if (type === 'deleteWordForward') return { start: offset, end: offset + (text.slice(offset).match(/^\s*[^\s]*/)?.[0].length ?? 0) }
  if (type.endsWith('Forward')) return { start: offset, end: offset + (graphemes.segment(text).containing(offset)?.segment.length ?? 0) }
  return { start: graphemes.segment(text).containing(offset - 1)?.index ?? offset, end: offset }
}

export function useEditorSelection(body, root, onEdit) {
  const selection = useRef({ start: 0, end: 0 })
  const restore = useRef(null)
  const typing = useRef(null)
  const [visualRange, setVisualRange] = useState(selection.current)
  const [typingMarks, setTypingMarks] = useState(null)
  useEffect(() => {
    function remember() {
      const selected = readSelection(root.current)
      if (!selected) return
      const previous = selection.current
      if (previous.start === selected.start && previous.end === selected.end) return
      selection.current = selected
      setVisualRange(selected)
      typing.current = null
      setTypingMarks(null)
    }
    document.addEventListener('selectionchange', remember)
    return () => document.removeEventListener('selectionchange', remember)
  }, [root])
  useLayoutEffect(() => {
    if (!restore.current) return
    placeSelection(root.current, restore.current)
    restore.current = null
  })
  const read = () => readSelection(root.current) ?? selection.current
  const setMarks = (marks) => {
    typing.current = marks
    setTypingMarks(marks)
  }
  function edit(range, after, formatScope, next, moveFocus = false) {
    const accepted = onEdit(range, after, formatScope)
    if (!accepted || !next) return accepted
    if (moveFocus) root.current?.focus()
    selection.current = next
    setVisualRange(next)
    restore.current = next
    return true
  }
  function formatMark(mark) {
    const range = read()
    const currentMarks = typing.current ?? marksAt(body, range.start)
    if (range.start === range.end) {
      setMarks(currentMarks.includes(mark) ? currentMarks.filter((value) => value !== mark) : [...currentMarks, mark])
      root.current?.focus()
      placeSelection(root.current, range)
      return
    }
    const fragment = sliceFragment(body, range)
    const remove = fragment.blocks.flatMap((block) => block.runs).every((run) => run.marks.includes(mark))
    const after = { blocks: fragment.blocks.map((block) => ({ ...block, runs: block.runs.map((run) => ({
      ...run, marks: remove ? run.marks.filter((value) => value !== mark) : [...new Set([...run.marks, mark])],
    })) })) }
    edit(range, after, 'inline', range, true)
  }
  function formatBlock(attributes) {
    const selected = read()
    const first = locate(body, selected.start)
    const endBlock = locate(body, selected.end)
    const last = selected.end === endBlock.start && selected.end > selected.start ? locate(body, selected.end - 1) : endBlock
    const range = { start: first.start, end: last.end }
    const fragment = sliceFragment(body, range, true)
    const after = { blocks: fragment.blocks.map((block) => ({ ...block, ...attributes })) }
    edit(range, after, 'paragraph', selected, true)
  }
  function replace(text, range = read(), moveFocus = false) {
    const marks = typing.current ?? marksAt(body, range.start)
    const value = text.replace(/\r\n?/g, '\n')
    const point = range.start + value.length
    return edit(range, textFragment(value, marks, locate(body, range.start).block), null, { start: point, end: point }, moveFocus)
  }
  return { read, replace, formatBlock, formatMark, visualRange, typingMarks, restore }
}

export function EditorSurface({ body, editable, editorRef, selection, renderBlock, onContextMenu, zoom = 100 }) {
  const composing = useRef(false)
  const [generation, redraw] = useState(0)
  const value = bodyText(body)
  useEffect(() => {
    const element = editorRef.current
    if (!editable || !element) return
    function beforeInput(event) {
      if (event.isComposing || composing.current || !event.cancelable) return
      const type = event.inputType
      if (type === 'insertParagraph' || type === 'insertLineBreak') {
        event.preventDefault()
        selection.replace('\n')
      } else if (type.startsWith('delete')) {
        event.preventDefault()
        const range = deletionRange(value, selection.read(), type)
        if (range.start !== range.end) selection.replace('', range)
      } else if (type === 'insertText' || type === 'insertReplacementText') {
        event.preventDefault()
        if (event.data != null) selection.replace(event.data)
      } else if (type.startsWith('format') || type === 'insertFromDrop') {
        event.preventDefault()
      }
    }
    element.addEventListener('beforeinput', beforeInput)
    return () => element.removeEventListener('beforeinput', beforeInput)
  }, [editable, editorRef, generation, selection, value])

  function reconcile() {
    if (composing.current) return
    const surface = editorRef.current
    const next = renderedText(surface)
    if (next === value) return
    const delta = difference(value, next)
    // The browser has changed managed nodes during composition or an input with no beforeinput.
    const accepted = selection.replace(delta.text, delta.range)
    if (!accepted) selection.restore.current = delta.range
    redraw((count) => count + 1)
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  return <article className="paper" style={zoom !== 100 ? { zoom: zoom / 100 } : undefined}>
    <div key={generation} ref={editorRef} className="editing-surface" contentEditable={editable} suppressContentEditableWarning
      role="textbox" aria-multiline="true" aria-readonly={!editable} aria-label="Document content" tabIndex={0}
      onContextMenu={onContextMenu}
      onCompositionStart={() => { composing.current = true }}
      onCompositionEnd={() => { composing.current = false; reconcile() }}
      onInput={reconcile}
      onPaste={(event) => {
        if (!editable) return
        event.preventDefault()
        const text = event.clipboardData.getData('text/plain')
        if (text) selection.replace(text)
      }}
      onCut={(event) => {
        if (!editable) return
        const range = selection.read()
        if (range.start === range.end) return
        event.preventDefault()
        event.clipboardData.setData('text/plain', value.slice(range.start, range.end))
        selection.replace('', range)
      }}
      onKeyDown={(event) => {
        if (!event.metaKey && !event.ctrlKey) return
        const key = event.key.toLowerCase()
        if (key === 'a') { event.preventDefault(); placeSelection(editorRef.current, { start: 0, end: value.length }) }
        const mark = { b: 'bold', i: 'italic', u: 'underline' }[key]
        if (editable && mark) { event.preventDefault(); selection.formatMark(mark) }
      }}>
      <PaperBody body={body} renderBlock={renderBlock} />
    </div>
  </article>
}
