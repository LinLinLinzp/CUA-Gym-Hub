import { linesOf } from './pullRequests.js'

export function diffLines(oldText, newText) {
  const before = linesOf(oldText)
  const after = linesOf(newText)
  const rows = []
  let left = 0
  let right = 0
  function equal() {
    rows.push({ type: 'context', oldLine: left + 1, newLine: right + 1, text: before[left] })
    left++
    right++
  }
  while (left < before.length && right < after.length && before[left] === after[right]) equal()
  let endLeft = before.length
  let endRight = after.length
  while (endLeft > left && endRight > right && before[endLeft - 1] === after[endRight - 1]) {
    endLeft--
    endRight--
  }
  const width = endRight - right + 1
  const height = endLeft - left + 1
  const cells = width * height <= 1_000_000 ? new Uint32Array(width * height) : null
  const originLeft = left
  const originRight = right
  const offset = (a, b) => (a - originLeft) * width + b - originRight
  if (cells) {
    for (let a = endLeft - 1; a >= left; a--) {
      for (let b = endRight - 1; b >= right; b--) {
        cells[offset(a, b)] = before[a] === after[b] ? 1 + cells[offset(a + 1, b + 1)] : Math.max(cells[offset(a + 1, b)], cells[offset(a, b + 1)])
      }
    }
  }
  while (left < endLeft || right < endRight) {
    if (left < endLeft && right < endRight && before[left] === after[right]) equal()
    else if (left < endLeft && (right === endRight || !cells || cells[offset(left + 1, right)] >= cells[offset(left, right + 1)])) {
      rows.push({ type: 'delete', oldLine: left + 1, text: before[left++] })
    } else {
      rows.push({ type: 'add', newLine: right + 1, text: after[right++] })
    }
  }
  while (left < before.length) equal()
  return rows
}
