import React from 'react'
import { rows, titleOf } from '../utils/display.js'
import MediaPreview from './MediaPreview.jsx'

export default function DocumentView({ record, media, children }) {
  const list = rows(media)
  const featured = list.find((item) => item.id === record.featuredImageId)
  return <article className="document-view">
    <h1>{titleOf(record)}</h1>
    {featured && <figure className="preview-image"><MediaPreview item={featured} full /></figure>}
    {rows(record.blocks).map((block, index) => {
      const { type, id, text } = block
      const key = id || index
      switch (type) {
        case 'heading': {
          const Heading = ({ 2: 'h2', 3: 'h3', 4: 'h4' })[block.level] || 'h2'
          return <Heading key={key}>{text}</Heading>
        }
        case 'list': {
          const List = block.ordered ? 'ol' : 'ul'
          return <List key={key}>{rows(block.items).map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</List>
        }
        case 'quote': return <blockquote key={key}><p>{text}</p>{block.citation && <cite>{block.citation}</cite>}</blockquote>
        case 'image': return <figure className="preview-image" key={key}>
          <MediaPreview item={list.find((item) => item.id === block.mediaId)} full />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
        case 'paragraph': return <p key={key}>{text}</p>
        default: return null
      }
    })}
    {children}
  </article>
}
