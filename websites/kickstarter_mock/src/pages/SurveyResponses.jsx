import { useState } from 'react'
import { dateLabel, Dialog, Empty, Field, FilterCount, list } from '../ui'

export function SurveyResponses({ rows, survey }) {
  const [status, setStatus] = useState('')
  const [reward, setReward] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const titles = [...new Set(rows.map(row => row.rewardTitle).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const visible = rows.filter(row =>
    (!status || status === (row.response ? 'answered' : 'pending')) && (!reward || row.rewardTitle === reward)
  )
  const selected = rows.find(row => row.id === selectedId)
  const filtered = Boolean(status || reward)
  const reset = () => { setStatus(''); setReward('') }

  return <>
    {rows.length > 0 && <>
      <div className="toolbar two panel">
        <Field label="Response status" as="select" value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All statuses</option><option value="answered">Answered</option><option value="pending">Pending</option>
        </Field>
        <Field label="Reward title" as="select" value={reward} onChange={event => setReward(event.target.value)}>
          <option value="">All rewards</option>{titles.map(title => <option key={title}>{title}</option>)}
        </Field>
      </div>
      <FilterCount count={visible.length} noun="recipient" filtered={filtered} onReset={reset} />
    </>}
    {visible.length ? <div className="table-wrap panel"><table aria-label="Survey responses">
      <thead><tr><th>Backer</th><th>Reward</th><th>Status</th><th>Submitted</th></tr></thead>
      <tbody>{visible.map(({ id, backer, rewardTitle, response }) => <tr key={id}>
        <th scope="row"><button className="text-button" type="button" onClick={() => setSelectedId(id)}>{backer?.name || 'Backer unavailable'}</button></th>
        <td>{rewardTitle || '—'}</td><td>{response ? 'Answered' : 'Pending'}</td><td>{dateLabel(response?.createdAt)}</td>
      </tr>)}</tbody>
    </table></div> : <Empty title={filtered ? 'No matching recipients' : 'No recipients to display'}>
      {filtered && <button className="button secondary" type="button" onClick={reset}>Clear filters</button>}
    </Empty>}
    {selected && <ResponseDetail row={selected} survey={survey} onClose={() => setSelectedId(null)} />}
  </>
}

function ResponseDetail({ row, survey, onClose }) {
  const { backer, rewardTitle, response } = row
  const questions = new Map(list(survey.questions).map(question => [question.id, question.label]))
  const answers = Object.entries(response?.answers || {})
  const address = response?.shippingAddress
  return <Dialog title={backer?.name || 'Backer unavailable'} onClose={onClose}>
    <div className="dialog-body survey-content">
      <p className="hint">{[rewardTitle, response ? 'Answered' : 'Pending'].filter(Boolean).join(' · ')}</p>
      {response ? <>
        {answers.length ? <dl className="response-answers">
          {answers.map(([id, answer]) => <div key={id}>
            <dt>{questions.get(id) || 'Question unavailable'}</dt><dd>{answer || 'No answer provided.'}</dd>
          </div>)}
        </dl> : <p>No question answers are available.</p>}
        {address && <section><h3>Shipping address</h3>
          <p>{[address.line1, address.city, address.region, address.postalCode, address.country].filter(Boolean).join(', ') || 'No address provided.'}</p>
        </section>}
      </> : <p>This recipient has not submitted a response.</p>}
    </div>
    <button className="button secondary" type="button" onClick={onClose}>Close response</button>
  </Dialog>
}

