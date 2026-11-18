export const MARKS = ['bold', 'italic', 'underline']
export const STYLES = ['normal', 'title', 'heading1', 'heading2']

export function blockAttributes(block) {
  return {
    style: STYLES.includes(block?.style) ? block.style : 'normal',
    list: ['bullet', 'number'].includes(block?.list) ? block.list : null,
    alignment: ['center', 'right'].includes(block?.alignment) ? block.alignment : 'left',
  }
}

export function mergeRuns(runs) {
  const result = []
  for (const run of runs ?? []) {
    if (!run?.text) continue
    const marks = MARKS.filter((mark) => run.marks?.includes(mark))
    const previous = result.at(-1)
    if (previous && previous.marks.length === marks.length && previous.marks.every((mark, index) => mark === marks[index])) {
      previous.text += run.text
    } else {
      result.push({ text: String(run.text), marks })
    }
  }
  return result
}

export function normalizeBody(body, id = 'document') {
  const blocks = body?.blocks?.length ? body.blocks : [{}]
  return { blocks: blocks.map((block, index) => ({
    id: block?.id || `${id}_block_${index + 1}`, ...blockAttributes(block), runs: mergeRuns(block?.runs),
  })) }
}

export const blockText = (block) => (block?.runs ?? []).map((run) => run.text).join('')
export const bodyText = (body) => (body?.blocks ?? []).map(blockText).join('\n')
export const fragmentLength = (fragment) => bodyText(fragment).length

export function blockOffsets(body) {
  let start = 0
  return body.blocks.map((block, index) => {
    const end = start + blockText(block).length
    const entry = { block, index, start, end }
    start = end + 1
    return entry
  })
}

export function locate(body, offset) {
  const entries = blockOffsets(body)
  return entries.find(({ end }) => offset <= end) ?? entries.at(-1)
}

export function inBounds(body, range) {
  const text = bodyText(body)
  if (!Number.isInteger(range?.start) || !Number.isInteger(range?.end) ||
    range.start < 0 || range.end < range.start || range.end > text.length) return false
  return [range.start, range.end].every((point) => !(/[\uD800-\uDBFF]/.test(text[point - 1] ?? '') && /[\uDC00-\uDFFF]/.test(text[point] ?? '')))
}

export function sliceRuns(runs, start, end) {
  let offset = 0
  const result = []
  for (const run of runs) {
    const from = Math.max(0, start - offset)
    const until = Math.min(run.text.length, end - offset)
    if (until > from) result.push({ text: run.text.slice(from, until), marks: run.marks })
    offset += run.text.length
    if (offset >= end) break
  }
  return result
}

export function sliceFragment(body, range, paragraph = false) {
  if (range.start === range.end && !paragraph) return { blocks: [] }
  const first = locate(body, range.start)
  const last = locate(body, range.end)
  const blocks = body.blocks.slice(first.index, last.index + 1).map((block, index) => ({
    ...blockAttributes(block),
    runs: sliceRuns(block.runs, index === 0 ? range.start - first.start : 0,
      first.index + index === last.index ? range.end - last.start : Infinity),
  }))
  return { blocks }
}

export function textFragment(text, marks, block) {
  if (!text) return { blocks: [] }
  return {
    blocks: text.replace(/\r\n?/g, '\n').split('\n').map((line, index) => ({
      ...blockAttributes(index === 0 || block?.list ? block : { alignment: block?.alignment }),
      runs: line ? [{ text: line, marks }] : [],
    })),
  }
}

export function applyFragment(body, range, fragment, { paragraph = false, allocate } = {}) {
  const first = locate(body, range.start)
  const last = locate(body, range.end)
  const prefix = sliceRuns(first.block.runs, 0, range.start - first.start)
  const suffix = sliceRuns(last.block.runs, range.end - last.start, Infinity)
  const inserted = fragment?.blocks?.length ? fragment.blocks : [{}]
  const blocks = inserted.map((block, index) => {
    const atEnd = index === inserted.length - 1
    const old = paragraph ? body.blocks[first.index + index] :
      index === 0 ? first.block : (atEnd && first.index !== last.index ? last.block : null)
    const attributes = blockAttributes(!paragraph && index === 0 ? first.block : block)
    const id = old?.id || allocate?.(index) || `projection_${first.block.id}_${range.start}_${index}`
    return {
      id, ...attributes,
      runs: mergeRuns([...(index === 0 ? prefix : []), ...(block?.runs ?? []), ...(atEnd ? suffix : [])]),
    }
  })
  return { blocks: [...body.blocks.slice(0, first.index), ...blocks, ...body.blocks.slice(last.index + 1)] }
}

export function marksAt(body, offset) {
  const { block, start } = locate(body, offset)
  let point = start
  for (const run of block.runs) {
    point += run.text.length
    if (point >= offset) return run.marks
  }
  return []
}

export function difference(previous, next) {
  let start = 0
  let tail = 0
  while (start < previous.length && start < next.length && previous[start] === next[start]) start += 1
  if (/[\uD800-\uDBFF]/.test(previous[start - 1] ?? '')) start -= 1
  while (tail < previous.length - start && tail < next.length - start &&
    previous[previous.length - tail - 1] === next[next.length - tail - 1]) tail += 1
  if (/[\uDC00-\uDFFF]/.test(previous[previous.length - tail] ?? '')) tail -= 1
  return { range: { start, end: previous.length - tail }, text: next.slice(start, next.length - tail) }
}
