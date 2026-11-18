import { withSid } from './dataManager.js'

const allowed = new Set(['P', 'DIV', 'BR', 'H1', 'H2', 'H3', 'H4', 'B', 'STRONG', 'I', 'EM', 'A', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'HR', 'U', 'S', 'CODE', 'PRE'])
const discard = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'TEMPLATE', 'SVG', 'MATH', 'OBJECT', 'EMBED'])

export function safeHref(value) {
  const url = String(value || '').trim()
  if (!url || /[\u0000-\u0020\\\u007f]/.test(url)) return null
  if (/^#|^\/(?!\/)/.test(url)) return url
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(url).protocol) ? url : null
  } catch {
    return null
  }
}

export function cleanHtml(html, linkSession = false) {
  const input = document.createElement('template')
  const output = document.createElement('div')
  input.innerHTML = String(html || '')
  function copy(source, destination) {
    for (const node of source.childNodes) {
      if (node.nodeType === 3) {
        destination.append(document.createTextNode(node.data))
      } else if (node.nodeType === 1 && !discard.has(node.tagName)) {
        if (!allowed.has(node.tagName)) {
          copy(node, destination)
          continue
        }
        const element = document.createElement(node.tagName)
        if (node.tagName === 'A') {
          const href = safeHref(node.getAttribute('href'))
          if (href) {
            const url = new URL(href, window.location.href)
            if (linkSession && !href.startsWith('#') && url.origin === window.location.origin) {
              url.searchParams.delete('sid')
              element.setAttribute('href', withSid(url.pathname + url.search + url.hash))
            } else element.setAttribute('href', href)
          }
        }
        copy(node, element)
        destination.append(element)
      }
    }
  }
  copy(input.content, output)
  return output.innerHTML
}

export function hasArticleBody(html) {
  const template = document.createElement('template')
  template.innerHTML = cleanHtml(html)
  return Boolean(template.content.textContent.trim())
}
