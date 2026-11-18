import React from 'react'
import { useParams } from 'react-router-dom'
import { authorName, bookName, READ } from './model.js'
import { BookFinishes } from './challenge.jsx'
import { BookReviews } from './reviews.jsx'
import { ShelfControl } from './shelves.jsx'
import { useReader } from './store.jsx'
import { Cover, Empty, Heading, Icon, SiteLink } from './ui.jsx'

export function NotFound({ title = 'Page not found' }) {
  return <><Heading title={title} /><Empty title="Nothing on this page"><SiteLink to="/my-books" className="button">Back to My Books</SiteLink></Empty></>
}

export function BookDetail(actions) {
  const { bookId } = useParams()
  const { bookById, entryByBook, logsByBook, reviews } = useReader()
  const book = bookById.get(bookId)
  const entry = entryByBook.get(bookId)
  const addInHeader = Boolean(book && entry?.statusShelfId === READ && !logsByBook.has(bookId))
  if (!book && !entry && !logsByBook.has(bookId) && !reviews.some(review => review.bookId === bookId)) {
    return <NotFound title="Book not found" />
  }
  return <>
    <SiteLink className="back-link" to="/my-books"><Icon name="arrow" /> My Books</SiteLink>
    <article className="panel book-detail">
      <Cover book={book} className="detail-cover" />
      <div className="detail-copy">
        <h1>{bookName(book)}</h1>
        <p className="detail-author">by {authorName(book)}</p>
        <ul className="book-meta">
          {Array.isArray(book?.genres) && book.genres.filter(Boolean).map(genre => <li key={genre}>{genre}</li>)}
          {book?.pageCount > 0 && <li>{book.pageCount} pages</li>}
          {book?.publicationYear > 0 && <li>{book.publicationYear}</li>}
        </ul>
        <p>{book?.synopsis?.trim() || 'No synopsis available.'}</p>
        {(book || entry) && <div className="detail-actions">
          <ShelfControl bookId={bookId} />
          {addInHeader &&
            <button className="text-button date-action" onClick={() => actions.onDate({ bookId })}><Icon name="calendar" /> Add date read</button>}
        </div>}
      </div>
    </article>
    <BookReviews key={bookId} bookId={bookId} {...actions} />
    <BookFinishes bookId={bookId} addInHeader={addInHeader} {...actions} />
  </>
}

