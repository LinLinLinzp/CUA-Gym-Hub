export function sourceSections(body = '') {
  const headings = [...body.matchAll(/^[ \t]*==[ \t]*([^=\r\n]+?)[ \t]*==[ \t]*(?:\r?\n|$)/gm)]
  const bounds = [{ title: 'Introduction', start: 0, headingAt: 0 }, ...headings.map(match => ({
    title: match[1].trim(), start: match.index + match[0].length, headingAt: match.index,
  }))]
  return bounds.map(({ title, start }, index) => {
    const end = bounds[index + 1]?.headingAt ?? body.length
    const text = body.slice(start, end)
    const leading = text.match(/^(?:[ \t]*\r?\n)*/)[0]
    const trailing = text.slice(leading.length).match(/(?:\r?\n[ \t]*)*$/)[0]
    return { title, index, text: text.slice(leading.length, text.length - trailing.length), start: start + leading.length, end: end - trailing.length, hasNext: index < headings.length, atLineStart: start === 0 || body[start - 1] === '\n' }
  })
}

export function updateSection(body, section, text) {
  const before = body.slice(0, section.start)
  const after = body.slice(section.end)
  const newline = body.includes('\r\n') ? '\r\n' : '\n'
  const draft = text.replace(/\r?\n/g, newline)
  return before + (section.atLineStart ? '' : newline) + draft
    + (section.hasNext && !after.startsWith('\n') && !after.startsWith('\r\n') ? newline + newline : '') + after
}
