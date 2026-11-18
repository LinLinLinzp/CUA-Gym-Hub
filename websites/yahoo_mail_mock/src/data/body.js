import { localFilePath } from './filesAccess.js'
import { withSid } from '../utils/dataManager.js'

const inline = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'BLOCKQUOTE', 'A'])
const removeContent = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH', 'OBJECT', 'IFRAME', 'VIDEO', 'AUDIO', 'EMBED'])
export const escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
export const plainHtml = text => escapeHtml(text).replace(/\r?\n/g, '<br>')
export const safeLink = value => /^(https?:\/\/[^\s]+|mailto:[^\s]+)$/i.test(value || '')

export function sanitizeHtml(html, renderImage) {
  const template = document.createElement('template')
  template.innerHTML = html || ''
  function clean(node) {
    if (node.nodeType === 3) return escapeHtml(node.textContent)
    if (node.nodeType !== 1 || removeContent.has(node.tagName)) return ''
    if (node.tagName === 'IMG') return renderImage?.(node.getAttribute('src'), node.getAttribute('alt')) || ''
    const inside = [...node.childNodes].map(clean).join('')
    if (!inline.has(node.tagName)) return inside
    if (node.tagName === 'BR') return '<br>'
    const tag = node.tagName.toLowerCase()
    const href = node.getAttribute('href')
    return '<' + tag + (tag === 'a' && safeLink(href) ? ' href="' + escapeHtml(href) + '" target="_blank" rel="noreferrer noopener"' : '') + '>' + inside + '</' + tag + '>'
  }
  return [...template.content.childNodes].map(clean).join('')
}

export function renderMessageBody(html, showLocalImages) {
  let hasLocalImages = false
  let hasBlockedImages = false
  const content = sanitizeHtml(html, (source, alt) => {
    const path = localFilePath(source)
    if (!path) {
      hasBlockedImages = true
      return ''
    }
    hasLocalImages = true
    return showLocalImages ? '<img src="' + escapeHtml(withSid(path)) + '" alt="' + escapeHtml(alt) + '">' : ''
  })
  return { content, hasLocalImages, hasBlockedImages }
}

export function htmlPlain(html) {
  const template = document.createElement('template')
  template.innerHTML = html.replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi, '\n')
  return template.content.textContent.trimEnd()
}

