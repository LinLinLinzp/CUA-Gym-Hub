import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { deleteFinish, saveFinish, saveGoal } from './actions.js'
import { authorName, bookName, byLatestFinish, displayDate, matchesBook, today, validDate } from './model.js'
import { Confirmation } from './shelves.jsx'
import { useReader } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import { bookPath, DialogActions, FieldError, Heading, Icon, Modal, SiteLink } from './ui.jsx'

function FinishList({ logs, showBook, onDate, onDeleteDate }) {
  const { bookById } = useReader()
  return <ul className="record-list finish-list">{logs.map(log => {
    const book = bookById.get(log.bookId)
    const date = displayDate(log.finishedOn)
    const label = showBook ? `${bookName(book)}, ${date}` : date
    return <li key={log.id}>
      <div>
        {showBook && <h3><SiteLink to={bookPath(log.bookId)}>{bookName(book)}</SiteLink></h3>}
        <span className="muted">{date}</span>
      </div>
      <div className="inline-actions">
        <button className="text-button" aria-label={`Edit date for ${label}`} onClick={() => onDate({ bookId: log.bookId, log })}>Edit date</button>
        <button className="text-button destructive" aria-label={`Remove date for ${label}`} onClick={() => onDeleteDate(log)}>Remove date</button>
      </div>
    </li>
  })}</ul>
}

export function BookFinishes({ bookId, onDate, onDeleteDate, addInHeader }) {
  const { logsByBook, bookById } = useReader()
  const logs = logsByBook.get(bookId) || []
  return <section className="panel detail-panel">
    <div className="section-heading"><h2>Dates read</h2>
      {!addInHeader && bookById.has(bookId) && <button className="button secondary" onClick={() => onDate({ bookId })}><Icon name="calendar" /> Add date read</button>}
    </div>
    {logs.length ? <FinishList {...{ logs, onDate, onDeleteDate }} /> : <p className="muted">No dates read have been recorded.</p>}
  </section>
}

export function Challenge({ onDate, onDeleteDate }) {
  const { challenges, logs, books } = useReader()
  const [parameters] = useSearchParams()
  const navigate = useNavigate()
  const [editingYear, setEditingYear] = useState(null)
  const runtimeYear = new Date().getFullYear()
  const requested = parameters.get('year') || ''
  const year = /^\d{4}$/.test(requested) && Number(requested) > 0 ? Number(requested) : runtimeYear
  const knownYears = [
    runtimeYear, year, ...challenges.map(goal => goal.year).filter(Number.isInteger),
    ...logs.filter(log => validDate(log.finishedOn)).map(log => Number(log.finishedOn.slice(0, 4))),
  ]
  const years = [...new Set(knownYears)].sort((a, b) => b - a)
  const goal = challenges.find(challenge => challenge.year === year)
  const goalBooks = Number.isInteger(goal?.goalBooks) && goal.goalBooks > 0 ? goal.goalBooks : null
  const finishes = logs.filter(log => log.finishedOn?.startsWith(`${String(year).padStart(4, '0')}-`)).sort(byLatestFinish)
  const remaining = goalBooks === null ? null : Math.max(0, goalBooks - finishes.length)
  const percent = goalBooks === null ? 0 : Math.min(100, finishes.length / goalBooks * 100)
  return <>
    <Heading title="Reading Challenge" description="Set a yearly goal and track the books you finish.">
      <div className="year-select">
        <label htmlFor="challenge-year">Year</label>
        <select id="challenge-year" value={year} onChange={event => {
          navigate(withSid(`/reading-challenge?year=${event.target.value.padStart(4, '0')}`))
        }}>
          {years.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
    </Heading>
    <div className="challenge-grid">
      <section className="panel progress-panel">
        <h2>{year} reading goal</h2>
        <div className="challenge-count"><strong>{finishes.length}</strong><span>{goalBooks === null ? 'books finished' : `of ${goalBooks} books finished`}</span></div>
        {goalBooks !== null ? <>
          <progress value={percent} max="100" aria-label="Reading challenge progress" />
          <p>{remaining ? `${remaining} ${remaining === 1 ? 'book' : 'books'} remaining` : 'Goal reached!'}</p>
        </> : <p>Set a goal to track your progress.</p>}
        <button className="button" onClick={() => setEditingYear(year)}>{goalBooks === null ? 'Set goal' : 'Edit goal'}</button>
      </section>
      <section className="panel activity-panel">
        <div className="section-heading"><h2>Finished books</h2>
          <button className="button secondary" disabled={!books.length} onClick={() => onDate({})}><Icon name="plus" /> Log a finished book</button>
        </div>
        {finishes.length ? <FinishList logs={finishes} showBook {...{ onDate, onDeleteDate }} />
          : <p className="muted">No finishes recorded for {year}.</p>}
      </section>
    </div>
    {editingYear !== null && <GoalEditor year={editingYear} goal={challenges.find(challenge => challenge.year === editingYear)} onClose={() => setEditingYear(null)} />}
  </>
}

function GoalEditor({ year, goal, onClose }) {
  const { commit } = useReader()
  const [value, setValue] = useState(goal?.goalBooks ?? '')
  const [error, setError] = useState(null)
  return <Modal title={goal ? 'Edit reading goal' : 'Set reading goal'} onClose={onClose}>
    <p className="dialog-context">{year} Reading Challenge</p>
    <form noValidate onSubmit={async event => {
      event.preventDefault()
      const problem = await commit(state => saveGoal(state, year, value), 'Reading goal saved.')
      if (problem) setError(problem)
      else onClose()
    }}>
      <div className="field">
        <label htmlFor="goal-books">Books to read</label>
        <input id="goal-books" type="number" min="1" max="999" step="1" data-initial-focus value={value}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'goal-error' : undefined}
          onChange={event => { setValue(event.target.value); setError(null) }} />
        <FieldError id="goal-error">{error}</FieldError>
      </div>
      <DialogActions onClose={onClose} submit="Save goal" />
    </form>
  </Modal>
}

export function DateEditor({ bookId: fixedBookId, log, onClose }) {
  const { bookById, books, commit } = useReader()
  const [bookId, setBookId] = useState(fixedBookId || '')
  const [query, setQuery] = useState('')
  const [date, setDate] = useState(log ? log.finishedOn || '' : today)
  const [error, setError] = useState(null)
  const matches = books.filter(book => book.id === bookId || matchesBook(book, query))
  return <Modal title={log ? 'Edit date read' : fixedBookId ? 'Add date read' : 'Log a finished book'} onClose={onClose}>
    {fixedBookId && <p className="dialog-context">{bookName(bookById.get(fixedBookId))}</p>}
    <form noValidate onSubmit={async event => {
      event.preventDefault()
      const problem = await commit(state => saveFinish(state, bookId, log?.id, date), 'Date read saved.')
      if (problem) setError(problem)
      else onClose()
    }}>
      {!fixedBookId && <>
        <div className="field">
          <label htmlFor="finish-search">Find a book</label>
          <input id="finish-search" data-initial-focus type="search" placeholder="Search title or author" value={query}
            onChange={event => { setQuery(event.target.value); setError(null) }} />
        </div>
        <div className="field">
          <label htmlFor="finish-book">Book</label>
          <select id="finish-book" value={bookId} onChange={event => { setBookId(event.target.value); setError(null) }}>
            <option value="">{matches.length ? 'Choose a book' : 'No matching books'}</option>
            {matches.map(book => <option key={book.id} value={book.id}>{bookName(book)} · {authorName(book)}</option>)}
          </select>
        </div>
      </>}
      <div className="field">
        <label htmlFor="finish-date">Date read</label>
        <input id="finish-date" data-initial-focus={fixedBookId ? '' : undefined} type="date" max={today()} value={date}
          onChange={event => { setDate(event.target.value); setError(null) }} aria-describedby={error ? 'finish-error' : undefined} />
      </div>
      <FieldError id="finish-error">{error}</FieldError>
      <DialogActions onClose={onClose} submit="Save date" />
    </form>
  </Modal>
}

export function DateManager({ bookId, onClose, onDate, onDeleteDate }) {
  const { bookById, logsByBook } = useReader()
  return <Modal title="Dates read" onClose={onClose}>
    <p className="dialog-context">{bookName(bookById.get(bookId))}</p>
    <FinishList logs={logsByBook.get(bookId) || []} {...{ onDate, onDeleteDate }} />
    {bookById.has(bookId) && <div className="dialog-actions"><button className="button" onClick={() => onDate({ bookId })}>Add date read</button></div>}
  </Modal>
}

export function DateDeletion({ log, onClose }) {
  const { bookById, commit } = useReader()
  return <Confirmation title="Remove this date read?" submit="Remove date" onClose={onClose}
    onConfirm={() => commit(state => deleteFinish(state, log.id), 'Date read removed.')}>
    Remove the {displayDate(log.finishedOn)} finish for <strong>{bookName(bookById.get(log.bookId))}</strong> from your reading activity and challenge progress?
  </Confirmation>
}

