import { Fragment } from 'react'
import { blockOffsets, blockText } from '../data/body.js'

const styleTags = { title: 'h1', heading1: 'h2', heading2: 'h3', normal: 'p' }

export function FormattedRuns({ entries }) {
  return entries.map(({ text, marks, className, changeId, onClick }, index) => <span key={index}
    className={className} data-change={changeId} onClick={onClick} style={{
      fontWeight: marks.includes('bold') ? 700 : undefined,
      fontStyle: marks.includes('italic') ? 'italic' : undefined,
      textDecorationLine: marks.includes('underline') ? 'underline' : undefined,
    }}>{text}</span>)
}

export function PaperBody({ body, renderBlock }) {
  let numbered = 0
  return blockOffsets(body).map((entry) => {
    const { block, start, end } = entry
    const Tag = styleTags[block.style]
    numbered = block.list === 'number' ? numbered + 1 : 0
    return <Tag key={block.id} data-block-start={start} data-block-end={end} data-block-id={block.id} style={{ textAlign: block.alignment }}
      className={`paper-block paper-${block.style}${block.list ? ' paper-list' : ''}`}>
      {block.list && <span className="list-marker" aria-hidden="true" contentEditable={false} data-decoration>{block.list === 'number' ? `${numbered}.` : '•'}</span>}
      {renderBlock ? renderBlock(entry) : <FormattedRuns entries={block.runs} />}
      {!blockText(block) && <Fragment><br /></Fragment>}
    </Tag>
  })
}

export function decoratedRuns({ block, start }, highlights, points = []) {
  let cursor = start
  const entries = []
  for (const run of block.runs) {
    const end = cursor + run.text.length
    const cuts = [...new Set([cursor, end, ...[...points, ...highlights.flatMap(({ range }) => [range.start, range.end])]
      .filter((point) => cursor < point && point < end)])].sort((a, b) => a - b)
    for (let index = 1; index < cuts.length; index += 1) {
      const from = cuts[index - 1]
      const until = cuts[index]
      const covered = highlights.filter(({ range }) => range.start <= from && range.end >= until)
      const tracked = covered.find((item) => item.changeId)
      const classes = covered.map(({ className }) => className)
      entries.push({ start: from, changeId: tracked?.changeId, onClick: tracked?.onClick, text: run.text.slice(from - cursor, until - cursor), marks: run.marks, className: classes.join(' ') || undefined })
    }
    cursor = end
  }
  return entries
}
