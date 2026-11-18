import React, { useState } from 'react'
import { rows, titleOf } from '../utils/display.js'
import { Modal, moveOptionFocus, Pagination, SearchBox } from './Controls.jsx'
import MediaPreview, { mediaKind } from './MediaPreview.jsx'

export const mediaMatches = (item, search) => [item.title, item.fileName, item.altText].some((value) => String(value || '').toLowerCase().includes(search.trim().toLowerCase()))

export default function MediaPicker({ media, selected, choose, close, title = 'Media Library' }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [id, setId] = useState(selected)
  const filtered = rows(media).filter((item) => mediaKind(item.mimeType) === 'image' && mediaMatches(item, search))
  const size = 18
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)))
  const apply = () => { if (filtered.some((item) => item.id === id)) choose(id) }
  return <Modal title={title} className="picker-modal" close={close} footer={<>
    <button type="button" className="button" onClick={close}>Cancel</button>
    <button className="button primary" type="button" disabled={!filtered.some((item) => item.id === id)} onClick={apply}>Select image</button>
  </>}>
    <div className="picker-body">
      <SearchBox label="Search images" value={search} onChange={(value) => { setPage(1); setSearch(value) }} />
      {filtered.length ? <div className="media-grid picker-grid" onKeyDown={(event) => {
        const columns = getComputedStyle(event.currentTarget).gridTemplateColumns.split(' ').filter((width) => width !== '0px').length || 1
        moveOptionFocus(event, columns)
      }}>
        {filtered.slice((current - 1) * size, current * size).map((item) => <button key={item.id} type="button" className="media-tile" data-keyboard-option aria-pressed={id === item.id} onClick={() => setId(item.id)} onDoubleClick={() => choose(item.id)}>
          <span className="tile-image"><MediaPreview item={item} decorative /></span><span className="tile-title">{item.title || item.fileName || titleOf(item)}</span>
        </button>)}
      </div> : <p className="muted">No images found.</p>}
      <Pagination count={filtered.length} page={current} size={size} change={setPage} />
    </div>
  </Modal>
}
