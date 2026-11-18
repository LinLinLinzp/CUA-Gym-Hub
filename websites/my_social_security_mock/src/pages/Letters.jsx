import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { addLetterActivity, isUnread, markNoticeRead, newId, useAccount } from '../account.jsx'
import { benefitStatus, compareDates, date, letterTypes, money, nameOf, records } from '../display.js'
import { AccountLink, Facts, LetterLink, PageHeading, Results, SortButton, Unavailable } from '../ui.jsx'
import { DocumentView } from '../documents.jsx'
import { withSid } from '../utils/dataManager.js'

const letterTitle = 'Benefit Verification Letter'

function snapshotOf(profile) {
  return {
    benefitStatus: profile?.benefitStatus ?? null,
    benefitType: profile?.benefitType ?? null,
    monthlyBenefit: profile?.monthlyBenefit ?? null,
  }
}

function benefitFacts(subject, snapshot) {
  const items = [['Subject', subject || 'Unavailable'], ['Benefit status', benefitStatus(snapshot?.benefitStatus)]]
  if (snapshot?.benefitStatus === 'receiving') {
    items.push(['Benefit type', snapshot.benefitType || 'Unavailable'], ['Monthly benefit', money(snapshot.monthlyBenefit)])
  }
  return items
}

export function Letters() {
  const { state, commit } = useAccount()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const review = search.get('verification') === '1'
  const reviewHeading = useRef(null)
  const reviewAction = useRef(null)
  const wasReviewing = useRef(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [readFilter, setReadFilter] = useState('')
  const [order, setOrder] = useState('newest')
  const letters = records(state.letters)
  const unread = letters.filter(isUnread).length
  const term = query.trim().toLowerCase()
  const matches = letters.filter(item => (!type || item.type === type) &&
    (!readFilter || (readFilter === 'unread' ? isUnread(item) : item.status === 'issued' && !isUnread(item))) &&
    String(item.title ?? '').toLowerCase().includes(term),
  ).sort((a, b) => compareDates(a.createdAt, b.createdAt, a.id, b.id, order))
  const subject = nameOf(state.profile)
  const snapshot = snapshotOf(state.profile)

  useEffect(() => {
    if (review) reviewHeading.current?.focus()
    else if (wasReviewing.current) reviewAction.current?.focus()
    wasReviewing.current = review
  }, [review])

  function resetFilters() {
    setQuery('')
    setType('')
    setReadFilter('')
  }

  function generate() {
    const createdAt = new Date().toISOString()
    const beneficiaryId = state.profile?.id ?? null
    const letter = {
      id: newId('letter'), beneficiaryId, type: 'benefit_verification', title: letterTitle,
      status: 'ready', actorId: beneficiaryId, createdAt, readAt: createdAt,
      subjectName: subject || null, benefitSnapshot: snapshot,
    }
    commit(previous => ({ ...previous, letters: [...previous.letters, letter] }))
    navigate(withSid('/letters/' + encodeURIComponent(letter.id)), { replace: true })
  }

  return <div className="stack">
    <PageHeading title="Letters" description="Create a benefit verification letter and find your account notices."
      action={!review && <AccountLink to="/letters?verification=1" className="button primary" ref={reviewAction}>Get benefit verification letter</AccountLink>} />
    {review && <section className="panel step-panel">
      <h2 tabIndex="-1" ref={reviewHeading}>Review your benefit verification letter</h2>
      <p>Review the information that will appear in your letter.</p>
      <Facts items={benefitFacts(subject, snapshot)} />
      <div className="button-row">
        <button className="button primary" type="button" onClick={generate}>Generate letter</button>
        <AccountLink to="/letters" className="button secondary">Cancel</AccountLink>
      </div>
    </section>}
    <section className="panel archive" aria-label="Letters and notices archive">
      <div className="section-heading">
        <h2>Letters and notices</h2>
        <span className={'pill ' + (unread ? 'success' : 'neutral')}>{unread} unread {unread === 1 ? 'notice' : 'notices'}</span>
      </div>
      <div className="filters">
        <label>Search letters<input type="search" value={query} placeholder="Title" onChange={event => setQuery(event.target.value)} /></label>
        <div><label htmlFor="letter-type">Type</label><select id="letter-type" value={type} onChange={event => setType(event.target.value)}>
          <option value="">All types</option>
          {Object.entries(letterTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></div>
        <div><label htmlFor="letter-read-status">Read status</label><select id="letter-read-status" value={readFilter} onChange={event => setReadFilter(event.target.value)}>
          <option value="">All statuses</option><option value="unread">Unread notices</option><option value="read">Read notices</option>
        </select></div>
      </div>
      <Results count={matches.length} noun="document" empty={letters.length ? 'No letters or notices match your filters.' : 'No letters or notices are available.'} reset={term || type || readFilter ? resetFilters : undefined} />
      {matches.length > 0 && <table className="archive-table" aria-label="Letters and notices">
        <thead><tr>
          <th scope="col">Document</th><th scope="col">Status</th>
          <th scope="col" aria-sort={order === 'newest' ? 'descending' : 'ascending'}><SortButton order={order} setOrder={setOrder} /></th>
        </tr></thead>
        <tbody>{matches.map((item, index) => <tr key={item.id ?? index}>
          <th scope="row"><LetterLink letter={item}>{item.title || 'Account letter'}</LetterLink>
            {letterTypes[item.type] && <span className="row-subtitle">{letterTypes[item.type]}</span>}
          </th>
          <td><LetterStatus letter={item} /></td><td>{date(item.createdAt)}</td>
        </tr>)}</tbody>
      </table>}
    </section>
  </div>
}

function LetterStatus({ letter }) {
  if (isUnread(letter)) return <span className="pill warning">Unread</span>
  if (letter.status === 'issued') return <span className="pill neutral">Read</span>
  if (letter.status === 'ready') return <span className="pill success">Ready</span>
  return <span className="muted">Unavailable</span>
}

export function LetterDetail() {
  const { letterId } = useParams()
  const { state, commit } = useAccount()
  const letter = records(state.letters).find(item => item.id === letterId)
  if (!letter) return <Unavailable title="Letter unavailable" to="/letters" linkText="Back to letters" />
  const verification = letter.type === 'benefit_verification'
  const doc = {
    title: letter.title || (verification ? letterTitle : 'Account notice'),
    date: date(letter.createdAt),
    facts: verification ? benefitFacts(letter.subjectName, letter.benefitSnapshot) : [],
    paragraphs: verification ? [] : [letter.body || 'The notice text is unavailable.'],
  }
  const markRead = isUnread(letter) && <button type="button" className="button secondary" onClick={() => markNoticeRead(commit, letterId)}>Mark as read</button>

  return <DocumentView doc={doc} backTo="/letters" backText="Back to letters" filename={letter.id}
    extraAction={markRead} onAction={action => addLetterActivity(commit, letterId, action)} />
}
