import { Fragment } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, FilePenLine, GitCompareArrows, MessageSquarePlus, X } from 'lucide-react'
import { canEdit, userOf } from '../data/access.js'
import { bodyText } from '../data/body.js'
import { CommandButton } from './HomeCommands.jsx'
import { decoratedRuns, FormattedRuns } from './Paper.jsx'
import { Avatar, displayDate, Menu } from './ui.jsx'

const trackingModes = { off: 'Off', mine: 'Just Mine', everyone: 'For Everyone' }
export const changeLabels = { insert: 'Insertion', delete: 'Deletion', replace: 'Replacement', format: 'Formatting' }

export function ReviewCommands({ doc, role, writable, onComment, markup, setMarkup, onTracking, entries, onStep, canDecide, selected, onDecide }) {
  const focused = entries.find(({ change }) => change.id === selected) ?? entries[0]
  return <>
    <CommandButton label="New Comment" Icon={MessageSquarePlus} disabled={!writable} onClick={onComment}><span>New Comment</span></CommandButton>
    {canEdit(role) && <Menu className="review-picker" label="Track Changes" text="Track Changes" disabled={!canDecide}
      icon={<><FilePenLine size={15} /><ChevronDown size={12} /></>} align="start"
      items={Object.entries(trackingModes).map(([value, label]) => ({
        label, checked: (doc.tracking?.mode ?? 'off') === value, action: () => onTracking(value),
      }))} />}
    <Menu className="review-picker" label="Markup display" text={markup === 'all' ? 'All Markup' : 'Simple Markup'} align="start" icon={<><GitCompareArrows size={15} /><ChevronDown size={12} /></>}
      items={[{ label: 'Simple Markup', checked: markup === 'simple', action: () => setMarkup('simple') },
        { label: 'All Markup', checked: markup === 'all', action: () => setMarkup('all') }]} />
    <div className="command-group change-navigation">
      <CommandButton label="Previous change" Icon={ArrowUp} disabled={!entries.length} onClick={() => onStep(-1)} />
      <CommandButton label="Next change" Icon={ArrowDown} disabled={!entries.length} onClick={() => onStep(1)} />
    </div>
    <div className="command-group review-decisions">
      <Menu className="decision-picker" label="Accept" text="Accept" icon={<><Check size={15} /><ChevronDown size={12} /></>}
        disabled={!canDecide || !entries.some(({ valid }) => valid)} items={[
          { label: 'Accept Change', disabled: !focused?.valid, action: () => onDecide('accepted', focused.change.id) },
          { label: 'Accept All Changes', action: () => onDecide('accepted') },
        ]} />
      <Menu className="decision-picker" label="Reject" text="Reject" icon={<><X size={15} /><ChevronDown size={12} /></>}
        disabled={!canDecide || !entries.length} items={[
          { label: 'Reject Change', action: () => onDecide('rejected', focused.change.id) },
          { label: 'Reject All Changes', action: () => onDecide('rejected') },
        ]} />
    </div>
  </>
}

export function ReviewPanel({ entries, state, selected, onSelect, onClose, canDecide, onDecide }) {
  return <aside className="collaboration" aria-label="Tracked changes">
    <div className="panel-heading"><h2>Tracked changes</h2><button aria-label="Close tracked changes" className="icon-button" onClick={onClose}><X size={18} /></button></div>
    <div className="comment-cards review-cards">
      {entries.map(({ change, valid }) => {
        const author = userOf(state, change.authorId)
        const active = change.id === selected
        return <article className={`comment-card ${active ? 'comment-selected' : ''}`} key={change.id}>
          <button className="thread-target" type="button" onClick={() => onSelect(change.id)} aria-pressed={active}><GitCompareArrows size={14} /><strong>{changeLabels[change.kind] ?? 'Change'}</strong></button>
          <div className="comment-meta"><Avatar user={author} small /><div><strong>{author?.name || 'Unknown author'}</strong><small>{displayDate(change.createdAt)}</small></div></div>
          {!valid && <p className="review-description muted">The original range is unavailable.</p>}
          {change.kind !== 'format' && <div className="review-description">
            {!!bodyText(change.before) && <del>{bodyText(change.before)}</del>}
            {!!bodyText(change.after) && <ins>{bodyText(change.after)}</ins>}
          </div>}
          {change.kind === 'format' && <p className="review-description muted">{change.formatScope === 'paragraph' ? 'Paragraph format' : 'Text formatting'}</p>}
          {active && <div className="composer-actions review-card-actions">
            <button type="button" className="button" disabled={!canDecide} onClick={() => onDecide('rejected', change.id)}>Reject</button>
            <button type="button" className="button primary" disabled={!canDecide || !valid} onClick={() => onDecide('accepted', change.id)}>Accept</button>
          </div>}
        </article>
      })}
      {!entries.length && <div className="panel-empty"><GitCompareArrows size={25} /><p>No pending changes</p></div>}
    </div>
  </aside>
}

const authorClass = (author) => 'author-' + (String(author ?? '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4)

export function ReviewBlock({ entry, projected, highlights, markup, selected, onSelect }) {
  const { start, end } = entry
  const markers = projected.filter((item) => item.valid && start <= item.start && item.start <= end)
  const decorations = projected.filter((item) => item.valid && item.end > start && item.start < end)
  const context = [
    ...highlights,
    ...decorations.map(({ change, start: from, end: until }) => ({
      range: { start: from, end: until }, changeId: change.id, onClick: () => onSelect(change.id, false),
      className: [markup === 'all' ? (change.kind === 'format' ? 'tracked-format' : 'tracked-insert') : '',
        authorClass(change.authorId), selected === change.id ? 'tracked-selected' : ''].filter(Boolean).join(' '),
    })),
  ]
  const removals = (markup === 'all' ? markers : []).filter(({ change }) => ['delete', 'replace'].includes(change.kind) && bodyText(change.before))
  const caret = highlights.find(({ range, className }) => className === 'comment-highlight' && range.start === range.end &&
    start <= range.start && range.start <= end)?.range.start
  const runs = decoratedRuns(entry, context, [...removals.map((item) => item.start), caret])
  const deletedText = ({ change }) => <del key={change.id} className="tracked-delete" data-decoration contentEditable={false}
    onClick={() => onSelect(change.id, false)}>{bodyText(change.before).replaceAll('\n', '↵')}</del>
  const caretMark = <span aria-hidden="true" className="comment-caret" data-decoration contentEditable={false} />
  return <>
    {markers.map(({ change }, index) => <button type="button" key={change.id} contentEditable={false} data-decoration
      className={`margin-change ${authorClass(change.authorId)}`} style={{ '--marker-index': index }}
      aria-label={`Show ${(changeLabels[change.kind] ?? 'tracked change').toLowerCase()}`} aria-pressed={selected === change.id}
      onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(change.id)} />)}
    {runs.map((run, index) => <Fragment key={index}>
      {removals.filter((item) => item.start === run.start).map(deletedText)}
      {caret === run.start && caretMark}
      <FormattedRuns entries={[run]} />
    </Fragment>)}
    {removals.filter((item) => item.start === end).map(deletedText)}
    {caret === end && caretMark}
  </>
}
