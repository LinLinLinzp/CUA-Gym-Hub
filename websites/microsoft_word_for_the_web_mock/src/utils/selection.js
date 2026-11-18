function textNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => node.parentElement.closest('[data-decoration]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  })
  const nodes = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node)
  return nodes
}

function pointOffset(root, node, offset) {
  if (node === root) {
    const next = root.children[offset]
    return next?.hasAttribute('data-block-start') ? Number(next.dataset.blockStart)
      : Number(root.lastElementChild?.dataset.blockEnd ?? 0)
  }
  const block = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest('[data-block-start]')
  if (!block || !root.contains(block)) return 0
  const range = document.createRange()
  range.setStart(block, 0)
  range.setEnd(node, offset)
  const prefix = range.cloneContents()
  prefix.querySelectorAll('[data-decoration]').forEach((item) => item.remove())
  return Math.min(Number(block.dataset.blockEnd), Number(block.dataset.blockStart) + prefix.textContent.length)
}

export function readSelection(root) {
  const selection = window.getSelection()
  if (!root || !selection?.rangeCount || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null
  const range = selection.getRangeAt(0)
  return { start: pointOffset(root, range.startContainer, range.startOffset), end: pointOffset(root, range.endContainer, range.endOffset) }
}

function domPoint(root, offset) {
  const blocks = [...root.querySelectorAll(':scope > [data-block-start]')]
  const block = blocks.find((element) => offset <= Number(element.dataset.blockEnd)) ?? blocks.at(-1)
  if (!block) return [root, 0]
  let local = Math.max(0, offset - Number(block.dataset.blockStart))
  const nodes = textNodes(block)
  for (const node of nodes) {
    if (local <= node.length) return [node, local]
    local -= node.length
  }
  const last = nodes.at(-1)
  return last ? [last, last.length] : [block, 0]
}

export function placeSelection(root, { start, end }) {
  if (!root) return
  const range = document.createRange()
  range.setStart(...domPoint(root, start))
  range.setEnd(...domPoint(root, end))
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

export function scrollToOffset(root, offset) {
  const [node] = domPoint(root, offset)
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  element.closest('[data-block-start]')?.scrollIntoView({ block: 'nearest' })
}

export function renderedText(root) {
  return [...root.childNodes].map((node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent
    return textNodes(node).map((item) => item.textContent).join('')
  }).join('\n')
}
