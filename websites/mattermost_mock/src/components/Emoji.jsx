import { useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog, Empty } from './UI.jsx'

const categories = {
  'Smileys & people': {
    smile: '😄', laugh: '😂', wink: '😉', thinking: '🤔', eyes: '👀', thumbsup: '👍', thumbsdown: '👎',
    wave: '👋', clap: '👏', raised_hands: '🙌', pray: '🙏', muscle: '💪', heart: '❤️',
  },
  'Objects & symbols': {
    white_check_mark: '✅', warning: '⚠️', rocket: '🚀', tada: '🎉', fire: '🔥', bulb: '💡', memo: '📝',
    calendar: '📅', link: '🔗', pushpin: '📌', coffee: '☕', sparkles: '✨', bug: '🐛',
  },
  'Animals & nature': { dog: '🐶', cat: '🐱', octopus: '🐙', seedling: '🌱', sunflower: '🌻', rainbow: '🌈' },
}

export const emojiGlyph = name => Object.values(categories).find(row => name in row)?.[name] ?? ':' + name + ':'

export function EmojiPicker({ close, select }) {
  const [query, setQuery] = useState('')
  const needle = query.toLowerCase().trim()
  const groups = Object.entries(categories).map(([label, items]) => [label, Object.entries(items).filter(([name, glyph]) =>
    name.replaceAll('_', ' ').includes(needle) || glyph.includes(needle))]).filter(([, items]) => items.length)

  return <Dialog title="Choose an emoji" close={close}>
    <div className="content">
      <label className="search-field"><Search size={16} /><input data-focus aria-label="Search emoji" placeholder="Search emoji" value={query}
        onChange={event => setQuery(event.target.value)} /></label>
      {!groups.length && <Empty title="No emoji match" />}
      {groups.map(([label, items]) => <section className="emoji-section" key={label}>
        <h3>{label}</h3><div className="emoji-grid">{items.map(([name, glyph]) => <button type="button" className="icon-button" key={name}
          title={name} aria-label={name} onClick={() => { close(); select(name, glyph) }}>{glyph}</button>)}</div>
      </section>)}
    </div>
  </Dialog>
}
