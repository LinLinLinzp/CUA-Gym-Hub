import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { activity, append, change, update, useStore } from '../store.jsx'
import { BackLink, Button, Confirmation, Dialog, Facts, Field, FormFooter, Heading, Panel, RowLink, Select, Status, Table, useFilters, useForm } from '../ui.jsx'
import { withSid } from '../utils/dataManager.js'
import { actor, byText, cents, find, fmtDate, label, list, matches, money, personName, uid } from '../utils/format.js'

const cadences = ['one_time', 'monthly', 'annual']
const choices = values => values.map(value => [value, label(value)])
const columns = [['Card'], ['Holder'], ['Type'], ['Spend / limit', true], ['Status']]

export function Cards() {
  const { state } = useStore()
  const filter = useFilters()
  const [issuing, setIssuing] = useState(false)
  const search = filter.get('q')
  const status = filter.get('status')
  const type = filter.get('type')
  const sort = filter.get('sort', 'issued')
  const cards = list(state.cards)
  const rows = cards.filter(card => (!status || card.status === status) && (!type || card.type === type)
    && matches(search, card.name, card.last4, personName(state, card.holderId))).sort((a, b) =>
    sort === 'name' ? byText(a.name, b.name) : sort === 'limit' ? (Number(b.limitAmount) || 0) - (Number(a.limitAmount) || 0) : byText(b.createdAt, a.createdAt))

  return <>
    <Heading title="Cards" subtitle="Issue virtual cards and manage spending limits.">
      <Button variant="primary" disabled={!actor(state) || !list(state.people).length} onClick={() => setIssuing(true)}>Issue virtual card</Button>
    </Heading>
    {!actor(state) && <p className="muted">A signed-in administrator is required to issue or manage cards.</p>}
    <Panel className="registry">
      <div className="toolbar">
        <Field label="Search cards" type="search" placeholder="Name, holder, or last four" value={search} onChange={event => filter.set('q', event.target.value)} />
        <Select label="Status" value={status} onChange={event => filter.set('status', event.target.value)} options={[[ '', 'All statuses' ], ...choices([...new Set(['active', 'locked', 'terminated', ...cards.map(card => card.status).filter(Boolean)])])]} />
        <Select label="Type" value={type} onChange={event => filter.set('type', event.target.value)} options={[[ '', 'All types' ], ...choices(['virtual', 'physical'])]} />
        <Select label="Sort by" value={sort} onChange={event => filter.set('sort', event.target.value)} options={[[ 'issued', 'Most recently issued' ], ['name', 'Card name'], ['limit', 'Highest limit']]} />
      </div>
      <Table columns={columns} rows={rows.map(card => [card.id, [
        <RowLink to={'/cards/' + encodeURIComponent(card.id)}>{card.name || 'Unnamed card'} <small>•••• {card.last4 || '—'}</small></RowLink>,
        personName(state, card.holderId), label(card.type), money(card.spentAmount, card.currency) + ' / ' + money(card.limitAmount, card.currency), <Status value={card.status} />,
      ]])} />
    </Panel>
    {issuing && <CardForm onClose={() => setIssuing(false)} />}
  </>
}

function CardForm({ card, onClose }) {
  const { state, commit } = useStore()
  const navigate = useNavigate()
  const form = useForm({ holderId: '', name: '', limitAmount: card?.limitAmount ?? '', limitCadence: card?.limitCadence || 'monthly' })
  const { values } = form
  const title = card ? 'Edit spending limit' : 'Issue virtual card'
  function submit(event) {
    const problems = {}
    const amount = cents(values.limitAmount)
    const name = values.name.trim()
    if (!card && !find(state.people, values.holderId)) problems.holderId = 'Select a cardholder.'
    if (!card && !name) problems.name = 'Enter a card name.'
    if (!amount) problems.limitAmount = 'Enter a positive USD amount with up to two decimal places.'
    if (!cadences.includes(values.limitCadence)) problems.limitCadence = 'Select a cadence.'
    form.submit(event, problems, () => {
      const id = card?.id || uid('card')
      commit((current, context) => {
        const { now, actorId } = context
        const rules = { limitAmount: amount / 100, limitCadence: values.limitCadence, updatedAt: now }
        if (card) {
          const before = find(current.cards, id)
          if (before?.type !== 'virtual' || !['active', 'locked'].includes(before.status)) throw new Error('This card cannot be edited.')
          const next = { ...before, ...rules }
          return activity({ ...current, cards: update(current.cards, id, next) }, context, 'card.limit_updated', 'card', id, {}, change(before, next, ['limitAmount', 'limitCadence']))
        }
        const record = { id, name, holderId: values.holderId, type: 'virtual', last4: String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, '0'),
          status: 'active', spentAmount: 0, currency: 'USD', createdAt: now, createdBy: actorId, ...rules }
        return activity({ ...current, cards: append(current.cards, record) }, context, 'card.issued', 'card', id)
      }, card ? 'Spending limit updated.' : 'Virtual card issued.')
      onClose()
      if (!card) navigate(withSid('/cards/' + encodeURIComponent(id)))
    })
  }
  return <Dialog title={title} onClose={onClose}>
    <form onSubmit={submit} noValidate>
      {!card && <>
        <Select label="Cardholder" {...form.bind('holderId')} options={[[ '', 'Select a cardholder' ], ...list(state.people).map(person => [person.id, person.name || person.id])]} />
        <Field label="Card name" {...form.bind('name')} />
      </>}
      <Field label="Spending limit (USD)" inputMode="decimal" {...form.bind('limitAmount')} />
      <Select label="Limit cadence" {...form.bind('limitCadence')} options={choices(cadences)} />
      <FormFooter onClose={onClose} submit={card ? 'Save limit' : title} error={form.errors.form} />
    </form>
  </Dialog>
}

const transitions = {
  lock: ['Lock card', 'locked', 'card.locked'],
  unlock: ['Unlock card', 'active', 'card.unlocked'],
  terminate: ['Terminate card', 'terminated', 'card.terminated'],
}

export function CardDetail() {
  const { id } = useParams()
  const { state, commit } = useStore()
  const [modal, setModal] = useState(null)
  const card = find(state.cards, id)
  const close = () => setModal(null)
  if (!card) return <><BackLink base="/cards">Cards</BackLink><Heading title="Card unavailable" /></>
  const allowed = actor(state) && ['active', 'locked'].includes(card.status)
  const owner = personName(state, card.holderId)
  const history = list(state.activity).filter(item => item.objectType === 'card' && item.objectId === id).sort((a, b) => byText(b.createdAt, a.createdAt))
  const transition = transitions[modal]
  function changeStatus() {
    const [, status, action] = transition
    commit((current, context) => {
      const before = find(current.cards, id)
      const allowedStatuses = modal === 'lock' ? ['active'] : modal === 'unlock' ? ['locked'] : ['active', 'locked']
      if (!allowedStatuses.includes(before?.status)) throw new Error('This card status has changed.')
      const next = { ...before, status, updatedAt: context.now }
      return activity({ ...current, cards: update(current.cards, id, next) }, context, action, 'card', id, {}, change(before, next, ['status']))
    }, 'Card ' + status + '.')
  }
  return <>
    <BackLink base="/cards">Cards</BackLink>
    <Heading title={card.name || 'Unnamed card'} subtitle={owner + ' · ' + label(card.type) + ' card'}>
      {allowed && <>
        {card.type === 'virtual' && <Button variant="primary" onClick={() => setModal('edit')}>Edit spending limit</Button>}
        {card.status === 'active' ? <Button onClick={() => setModal('lock')}>Lock card</Button> : <Button onClick={() => setModal('unlock')}>Unlock card</Button>}
        <Button variant="danger" onClick={() => setModal('terminate')}>Terminate card</Button>
      </>}
    </Heading>
    {!actor(state) && <p className="muted">A signed-in administrator is required to manage this card.</p>}
    <div className="detail-grid">
      <Panel title="Recent card activity">
        <Table columns={[[ 'Action' ], ['Actor'], ['Date']]} empty="No card activity yet."
          rows={history.map(item => [item.id, [label(String(item.action || '').split('.').at(-1)), personName(state, item.actorId), fmtDate(item.createdAt)]])} />
      </Panel>
      <Panel title="Card details">
        <div className="card-graphic"><span>Ramp</span><strong>•••• {card.last4 || '—'}</strong><small>{owner}</small></div>
        <Facts rows={[[ 'Status', <Status value={card.status} /> ], ['Spending limit', money(card.limitAmount, card.currency)],
          ['Cadence', label(card.limitCadence)], ['Spent', money(card.spentAmount, card.currency)],
          ['Remaining', card.limitAmount != null && card.spentAmount != null ? money(Math.round((Number(card.limitAmount) - Number(card.spentAmount)) * 100) / 100, card.currency) : '—'], ['Issued', fmtDate(card.createdAt)]]} />
      </Panel>
    </div>
    {modal === 'edit' && <CardForm card={card} onClose={close} />}
    {transition && <Confirmation title={transition[0]} onClose={close} onConfirm={changeStatus} danger={modal === 'terminate'}>
      {modal === 'terminate' ? 'This permanently closes the card. Its record and activity will stay visible.' :
        modal === 'lock' ? 'Lock this card to pause spending.' : 'Unlock this card to resume spending.'}
    </Confirmation>}
  </>
}
