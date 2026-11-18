import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AppLink, Art, Catalog, DownloadFile, Empty, ErrorMessage, FormActions, Heading, Icon, Missing, Modal, Table,
  bytes, count, date, deadline, optionsFrom, titleOf, useAppNavigate,
} from './ui.jsx'
import { activity, competitionPath, isJoined, uploadFiles, useStore, withRecord } from './store.jsx'
import { predictionScore } from './utils/csv.js'

const byDeadline = (a, b) => (Date.parse(a.endsAt) || Infinity) - (Date.parse(b.endsAt) || Infinity)
const scoreText = value => Number.isFinite(value) ? value.toFixed(4) : '—'
const tabs = [['overview', 'Overview'], ['data', 'Data'], ['rules', 'Rules'], ['leaderboard', 'Leaderboard'], ['submissions', 'My Submissions']]

function Status({ record, joined }) {
  const status = { closed: ['Closed', 'ended'], open: ['Open', 'good'] }[record.status] ?? ['Status unavailable', '']
  return <><span className={`badge ${status[1]}`}>{status[0]}</span>
    {joined && <span className="badge good">Joined</span>}</>
}

export function Competitions() {
  const { state } = useStore()
  const records = state.competitions.map(record => ({
    ...record, joined: Boolean(isJoined(state, record)), search: [record.title, record.summary, record.category],
  }))
  return <Catalog label="Competitions" type="competitions" description="Find challenges, compare approaches, and submit predictions."
    searchPlaceholder="Search competitions" records={records}
    filters={[
      { key: 'category', label: 'Category', any: 'All categories', options: optionsFrom(records.map(item => item.category)), match: (item, value) => item.category === value },
      { key: 'status', label: 'Status', any: 'All statuses', options: [['open', 'Open'], ['closed', 'Closed'], ['joined', 'Joined']],
        match: (record, value) => value === 'joined' ? record.joined : record.status === value },
    ]}
    sorts={[[ 'deadline', 'Deadline', byDeadline ], [ 'teams', 'Most teams', (a, b) => (b.teamCount ?? 0) - (a.teamCount ?? 0) ]]}
    render={(record, index) => <AppLink to={competitionPath(record)} className="panel record-card" key={record.id}>
      <Art type="competitions" variant={index} />
      <div className="record-kicker">{record.category ?? 'Competition'}<Status record={record} joined={record.joined} /></div>
      <div><h3>{titleOf(record, 'Untitled competition')}</h3><p>{record.host ?? 'Host unavailable'} · {record.metric ?? 'Metric unavailable'}</p>
        {record.summary && <p>{record.summary}</p>}</div>
      <div className="record-end"><span><Icon name="clock" size={15} />{deadline(record.endsAt, record.status === 'closed')}</span>
        <span>{count(record.teamCount)} teams</span></div>
    </AppLink>} />
}

function SubmissionForm({ competition, onClose, onSaved }) {
  const { command } = useStore()
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const score = await predictionScore(file, competition.scoreDirection)
      const [uploaded] = await uploadFiles([file])
      const saved = command(state => {
        const target = state.competitions.find(item => item.id === competition.id && item.status === 'open')
        const entry = target && isJoined(state, target)
        return entry && withRecord(state, 'competitionSubmissions', activity(state, {
          competitionId: target.id, entryId: entry.id, file: uploaded, description: description.trim(), status: 'scored', score,
        }))
      })
      if (!saved) throw new Error('The competition is no longer accepting your submission.')
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return <Modal title="Submit Predictions" onClose={onClose} busy={busy}>
    <form className="stack" onSubmit={submit}>
      <label>Predictions CSV<input type="file" accept=".csv,text/csv" disabled={busy} required
        aria-describedby="prediction-format"
        onChange={event => setFile(event.target.files[0])} /></label>
      <p className="muted" id="prediction-format">Include a unique id and a prediction for each holdout row.</p>
      <label>Description (optional)<textarea value={description} onChange={event => setDescription(event.target.value)} disabled={busy} maxLength={500} rows={2} /></label>
      <ErrorMessage error={error} />
      <FormActions onCancel={onClose} submit="Submit" busy={busy} pending="Uploading…" />
    </form>
  </Modal>
}

export function CompetitionDetail() {
  const { slug, tab = 'overview' } = useParams()
  const { state, command } = useStore()
  const competition = state.competitions.find(item => (item.slug ?? item.id) === slug)
  return competition && tabs.some(([key]) => key === tab)
    ? <CompetitionView key={competition.id} {...{ competition, tab, state, command }} /> : <Missing group="competitions" label="Competition" />
}

function CompetitionView({ competition, tab, state, command }) {
  const [modal, setModal] = useState('')
  const [feedback, setFeedback] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const navigate = useAppNavigate()
  const path = competitionPath(competition)
  const entry = isJoined(state, competition)
  const open = competition.status === 'open'
  const revision = competition.rulesVersion ?? 1
  const files = competition.files ?? []
  const submissions = state.competitionSubmissions.filter(item => item.competitionId === competition.id && item.actorId === state.account.id)
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
  const byScore = (a, b) => competition.scoreDirection === 'higher' ? b.score - a.score : a.score - b.score
  const best = submissions.filter(item => Number.isFinite(item.score)).sort(byScore)[0]
  const board = state.competitionLeaderboard.filter(item => item.competitionId === competition.id)
  const rows = [...board, ...(best ? [{ id: 'your-submission', teamName: state.account.displayName ?? 'You', score: best.score, submittedAt: best.createdAt }] : [])]
    .sort(byScore)
  function confirmRules(event) {
    event.preventDefault()
    if (command(current => {
      const target = current.competitions.find(item => item.id === competition.id && item.status === 'open')
      if (!target || isJoined(current, target) || (target.rulesVersion ?? 1) !== revision) return null
      return withRecord(current, 'competitionEntries', activity(current, {
        competitionId: target.id, rulesVersion: revision, status: 'joined',
      }))
    })) setFeedback(`Rules revision ${revision} accepted. You joined the competition.`)
    setModal('')
  }
  const accept = <button type="button" className="button" onClick={() => setModal('rules')}>Accept Rules</button>
  const submit = <button type="button" className="button" onClick={() => setModal('submit')}>Submit Predictions</button>
  const status = open ? entry ? '' : 'Accept the current rules to download data and submit predictions.'
    : competition.status === 'closed' ? 'This competition is closed. Joining, downloads, and new submissions are unavailable.'
      : 'Participation is unavailable because a competition status is missing.'
  return <>
    <AppLink to="/competitions" className="breadcrumb">← Competitions</AppLink>
    <Heading type="competitions" eyebrow={competition.category ?? 'Competition'} title={titleOf(competition, 'Untitled competition')}
      description={competition.summary} actions={open ? entry ? submit : accept : undefined} />
    <nav className="tabs" aria-label="Competition sections">{tabs.map(([key, text]) =>
      <AppLink to={key === 'overview' ? path : `${path}/${key}`} aria-current={tab === key ? 'page' : undefined} key={key}>{text}</AppLink>)}</nav>
    <div className="detail-grid">
      <div className="stack">
        <p className="notice" aria-live="polite">{feedback}</p>
        {tab === 'overview' && <section className="panel"><h2>About the challenge</h2>
          <p className="detail-text">{competition.description ?? competition.summary ?? 'A challenge description is unavailable.'}</p>
          {status && <p className="notice caution">{status}</p>}
        </section>}
        {tab === 'rules' && <section className="panel stack"><div><h2>Competition Rules</h2><p className="muted">Revision {revision}</p></div>
          <p className="detail-text">{competition.rules ?? 'Follow the data use and submission requirements for this competition.'}</p>
          <p>{entry ? `You accepted revision ${revision} on ${date(entry.createdAt)}.` : status}</p>
        </section>}
        {tab === 'data' && <section className="panel"><h2>Competition Files</h2>
          {status && <p className="notice caution">{status}</p>}<ErrorMessage error={downloadError} />
          {files.length ? files.map(file => <div className="file-row" key={file.id}>
            <div className="file-info"><Icon name="file" /><div><strong>{file.name ?? 'Unnamed file'}</strong><p className="muted">{bytes(file.sizeBytes)}</p></div></div>
            {open && entry ? <DownloadFile file={file} onError={setDownloadError} readDownload={current => {
              const target = current.competitions.find(item => item.id === competition.id && item.status === 'open')
              return target && isJoined(current, target) && target.files?.some(item => item.id === file.id)
                && { entityType: 'competition', entityId: target.id, versionId: null, fileId: file.id }
            }} /> : <button className="button secondary compact" disabled>Download File</button>}
          </div>) : <Empty title="No competition files" />}
        </section>}
        {tab === 'leaderboard' && <section className="panel"><h2>Leaderboard</h2>
          <Table headers={['Rank', 'Team', competition.metric ?? 'Score', 'Submitted']} empty="No ranked submissions"
            rows={rows.map((row, i) => [row.id, i + 1, row.id === 'your-submission' ? `${row.teamName} (you)` : row.teamName, scoreText(row.score), date(row.submittedAt)])} />
        </section>}
        {tab === 'submissions' && <section className="panel"><h2>My Submissions</h2>
          {status && <p className="notice caution">{status}</p>}
          <Table headers={['File', 'Description', 'Submitted', 'Status', 'Score']} empty="You have no submissions yet"
            rows={submissions.map(item => [item.id, item.file?.name ?? 'File unavailable', item.description || '—', date(item.createdAt),
              item.status === 'scored' ? 'Scored' : item.status ?? '—', scoreText(item.score)])} />
        </section>}
      </div>
      <aside className="panel"><h2>Challenge details</h2><dl>
        <div><dt>Status</dt><dd><Status record={competition} joined={entry} /></dd></div>
        <div><dt>Host</dt><dd>{competition.host ?? '—'}</dd></div>
        <div><dt>Metric</dt><dd>{competition.metric ?? '—'}</dd></div>
        <div><dt>Deadline</dt><dd>{date(competition.endsAt)}</dd></div>
        <div><dt>Teams</dt><dd>{count(competition.teamCount)}</dd></div>
        <div><dt>Rules revision</dt><dd>{revision}</dd></div>
      </dl></aside>
    </div>
    {modal === 'rules' && <Modal title="Accept Competition Rules" onClose={() => setModal('')}>
      <form className="stack" onSubmit={confirmRules}>
        <p className="detail-text">{competition.rules ?? 'Follow the competition data use and submission requirements.'}</p>
        <p>Confirm that you accept revision {revision} of the rules for {titleOf(competition)}.</p>
        <FormActions onCancel={() => setModal('')} submit="Accept Rules" />
      </form>
    </Modal>}
    {modal === 'submit' && <SubmissionForm competition={competition} onClose={() => setModal('')} onSaved={() => {
      setModal('')
      setFeedback('Predictions submitted and scored.')
      navigate(`${path}/submissions`)
    }} />}
  </>
}
