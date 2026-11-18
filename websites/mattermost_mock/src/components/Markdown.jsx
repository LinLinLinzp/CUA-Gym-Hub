import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { withSid } from '../utils/dataManager.js'
import { emojiGlyph } from './Emoji.jsx'

function decorateText() {
  return function visit(node) {
    if (!node.children) return
    node.children = node.children.flatMap(child => {
      if (child.type !== 'text') {
        visit(child)
        return child
      }
      const tokens = child.value.split(/(:[a-z0-9_]+:|(?<![\w.@])@[\w.-]*[\w-])/g)
      return tokens.flatMap((value, index) => {
        if (!value) return []
        if (index % 2 === 1 && value.startsWith('@')) {
          return { type: 'strong', data: { hName: 'span', hProperties: { className: 'message-mention' } }, children: [{ type: 'text', value }] }
        }
        return { type: 'text', value: /^:[a-z0-9_]+:$/.test(value) ? emojiGlyph(value.slice(1, -1)) : value }
      })
    })
  }
}

export function MessageMarkdown({ message }) {
  return <div className="markdown"><Markdown remarkPlugins={[remarkGfm, decorateText]} skipHtml
    components={{
      a: ({ href, children }) => {
        if (!href) return <span>{children}</span>
        if (href.startsWith('#')) return <a href={href}>{children}</a>
        let target
        try { target = new URL(href, window.location.href) } catch { return <span>{children}</span> }
        if (target.origin === window.location.origin) {
          target.searchParams.delete('sid')
          const local = withSid(target.pathname + target.search + target.hash)
          if (/^\/(?:files|fixtures|avatars)\//.test(target.pathname)) return <a href={local}>{children}</a>
          return <Link to={local}>{children}</Link>
        }
        return <a href={href} target="_blank" rel="noreferrer">{children}</a>
      },
      img: ({ alt }) => <span>[{alt || 'Image'}]</span>,
    }}>{message ?? ''}</Markdown></div>
}
