import { useState } from 'react'
import { Badge, childPath, Confirm, dateLabel, Empty, Field, FilterCount, includes, labels, list, money, projectPath, SectionHeading, SiteLink, useFeedback, useSiteNavigate } from '../ui'
import { creation, newId, put, timestamp, useStore } from '../store'
import { bind, textValues, validMoney } from '../forms'
import { Missing } from './Projects'

const rewardTypes = ['tier', 'add_on']
const methods = { digital: 'Digital', shipping: 'Shipping', pickup: 'Local pickup' }
const fields = ['type', 'title', 'description', 'minimumPledge', 'estimatedDelivery', 'quantityLimit', 'deliveryMethod']
const claimed = reward => Number(reward.claimedQuantity) || 0
const limited = reward => reward.quantityLimit != null && reward.quantityLimit !== ''
const positiveInteger = value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
const rewardLocked = reward => claimed(reward) > 0 || reward.status === 'archived'
const soldOut = reward => limited(reward) && claimed(reward) >= Number(reward.quantityLimit)

export function Rewards({ project }) {
  const { state } = useStore()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [availability, setAvailability] = useState('')
  const base = projectPath(project.id) + '/rewards'
  const all = list(state.rewards).filter(reward => reward.projectId === project.id)
  const rows = all.filter(reward => {
    if ((type && reward.type !== type) || !includes(reward.title, query)) return false
    if (availability === 'open') return reward.status === 'active' && !soldOut(reward)
    if (availability === 'full') return reward.status === 'active' && soldOut(reward)
    return !availability || reward.status === availability
  })
  const filtered = Boolean(query.trim() || type || availability)
  function reset() { setQuery(''); setType(''); setAvailability('') }

  return <>
    <SectionHeading title="Rewards" description="Manage pledge tiers and add-ons for this campaign.">
      <SiteLink className="button primary" to={base + '/new'}>New reward</SiteLink>
    </SectionHeading>
    <div className="toolbar panel">
      <Field label="Search rewards" type="search" placeholder="Search by title" value={query} onChange={event => setQuery(event.target.value)} />
      <Field label="Reward type" as="select" value={type} onChange={event => setType(event.target.value)}>
        <option value="">All types</option>{rewardTypes.map(item => <option key={item} value={item}>{labels[item]}</option>)}
      </Field>
      <Field label="Availability" as="select" value={availability} onChange={event => setAvailability(event.target.value)}>
        <option value="">All availability</option><option value="open">Available</option>
        <option value="full">Fully claimed</option><option value="active">Active</option><option value="archived">Archived</option>
      </Field>
    </div>
    <FilterCount count={rows.length} noun="reward" filtered={filtered} onReset={reset} />
    {rows.length ? <div className="table-wrap panel"><table aria-label="Rewards">
      <thead><tr><th>Reward</th><th>Type</th><th>Minimum pledge</th><th>Delivery</th><th>Claimed / limit</th><th>Status</th></tr></thead>
      <tbody>{rows.map(reward => <tr key={reward.id}>
        <th scope="row"><SiteLink to={childPath(base, reward.id)}>{reward.title || 'Untitled reward'}</SiteLink></th>
        <td>{labels[reward.type] || '—'}</td><td>{money(reward.minimumPledge, project.currency)}</td>
        <td>{dateLabel(reward.estimatedDelivery, true)}</td>
        <td>{claimed(reward)} / {limited(reward) ? reward.quantityLimit : 'Unlimited'}</td>
        <td><Badge status={reward.status} /></td>
      </tr>)}</tbody>
    </table></div> : <Empty title={filtered ? 'No matching rewards' : 'No rewards yet'}
      message={filtered ? 'Try a different search or filter.' : 'Create a pledge tier or an add-on for your campaign.'}>
      {filtered ? <button className="button secondary" onClick={reset}>Clear filters</button> : <SiteLink className="button primary" to={base + '/new'}>New reward</SiteLink>}
    </Empty>}
  </>
}

function lineRows(record, key, fields) {
  return list(record?.[key]).map(value => ({ key: newId(key), original: value, ...textValues(value, fields) }))
}

function setRow(setRows, key, field, value) {
  setRows(rows => rows.map(row => row.key === key ? { ...row, [field]: value } : row))
}

export function RewardRoute({ project, rewardId }) {
  const { state } = useStore()
  const reward = rewardId && list(state.rewards).find(entry => entry.id === rewardId && entry.projectId === project.id)
  if (rewardId && !reward) return <Missing title="Reward not found" to={projectPath(project.id) + '/rewards'} label="Back to rewards" />
  return <RewardEditor key={reward?.id || project.id} project={project} reward={reward} />
}

function RewardEditor({ project, reward }) {
  const { mutate } = useStore()
  const notify = useFeedback()
  const navigate = useSiteNavigate()
  const [values, setValues] = useState(() => textValues(reward || { type: 'tier', deliveryMethod: 'digital' }, fields))
  const [items, setItems] = useState(() => lineRows(reward, 'items', ['name', 'quantity']))
  const [shipping, setShipping] = useState(() => lineRows(reward, 'shipping', ['destination', 'amount']))
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(false)
  const base = projectPath(project.id) + '/rewards'
  const locked = Boolean(reward && rewardLocked(reward))
  const ships = values.deliveryMethod === 'shipping'
  const field = name => ({ ...bind(values, setValues, name), error: errors[name] })

  function validate(form) {
    const issues = {}
    if (!rewardTypes.includes(values.type)) issues.type = 'Choose a reward type.'
    if (!values.title.trim()) issues.title = 'Enter a reward title.'
    if (!validMoney(values.minimumPledge)) issues.minimumPledge = 'Enter a positive amount with up to two decimal places.'
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.estimatedDelivery) || values.estimatedDelivery.startsWith('0000') || form.elements.deliveryMonth.validity.badInput) {
      issues.estimatedDelivery = 'Choose a delivery month.'
    }
    if (values.quantityLimit.trim() && !positiveInteger(values.quantityLimit.trim())) issues.quantityLimit = 'Enter a positive whole number or leave it blank.'
    if (!Object.hasOwn(methods, values.deliveryMethod)) issues.deliveryMethod = 'Choose a delivery method.'
    for (const row of items) {
      if (!row.name.trim()) issues[row.key + 'name'] = 'Enter an item name.'
      if (!positiveInteger(row.quantity.trim())) issues[row.key + 'quantity'] = 'Enter a positive whole number.'
    }
    if (ships) {
      if (!shipping.length) issues.shipping = 'Add a shipping destination and cost.'
      const destinations = shipping.map(row => row.destination.trim().toLowerCase())
      for (const [index, row] of shipping.entries()) {
        if (!destinations[index]) issues[row.key + 'destination'] = 'Enter a destination.'
        else if (destinations.indexOf(destinations[index]) !== index) issues[row.key + 'destination'] = 'Use a different destination.'
        if (!validMoney(row.amount, true)) issues[row.key + 'amount'] = 'Enter a nonnegative cost with up to two decimal places.'
      }
    }
    setErrors(issues)
    return !Object.keys(issues).length
  }

  function save(event) {
    event.preventDefault()
    if (locked || !validate(event.currentTarget)) return
    const terms = {
      type: values.type, title: values.title.trim(), description: values.description.trim(),
      minimumPledge: Number(values.minimumPledge), estimatedDelivery: values.estimatedDelivery,
      items: items.map(row => ({ ...row.original, name: row.name.trim(), quantity: Number(row.quantity) })),
      quantityLimit: values.quantityLimit.trim() ? Number(values.quantityLimit) : null,
      deliveryMethod: values.deliveryMethod,
      shipping: ships ? shipping.map(row => ({ ...row.original, destination: row.destination.trim(), amount: Number(row.amount) })) : [],
    }
    let id
    mutate(current => {
      const existing = reward && list(current.rewards).find(entry => entry.id === reward.id && entry.projectId === project.id)
      if (reward && (!existing || rewardLocked(existing))) return current
      const next = existing
        ? { ...existing, ...terms, ...timestamp(current.account) }
        : { ...creation(current.account, 'reward'), ...terms, projectId: project.id, status: 'active', claimedQuantity: 0, archivedAt: null }
      id = next.id
      return put(current, 'rewards', next)
    })
    if (!id) return
    notify(reward ? 'Reward saved.' : 'Reward created.')
    navigate(childPath(base, id), { replace: !reward })
  }

  function archive() {
    const saved = mutate(current => {
      const existing = list(current.rewards).find(entry => entry.id === reward.id && entry.projectId === project.id)
      if (!existing || rewardLocked(existing)) return current
      const stamp = timestamp(current.account)
      return put(current, 'rewards', { ...existing, status: 'archived', archivedAt: stamp.updatedAt, ...stamp })
    })
    setConfirm(false)
    if (saved) notify('Reward archived.')
  }

  return <>
    <SiteLink className="breadcrumb" to={base}>← Rewards</SiteLink>
    <SectionHeading title={reward ? reward.title || 'Untitled reward' : 'New reward'}>
      {reward && <Badge status={reward.status} />}
    </SectionHeading>
    {locked && <p className="banner">{claimed(reward) > 0
      ? `This reward has ${claimed(reward)} claimed. Its terms and archive action are locked.`
      : 'This reward is archived and read-only.'}</p>}
    <form className="editor" onSubmit={save} noValidate>
      <fieldset className="panel editor-group" disabled={locked} aria-label="Reward details">
        <h3>Reward details</h3>
        <div className="field-pair">
          <Field label="Reward title" required {...field('title')} />
          <Field label="Reward type" as="select" {...field('type')}>
            {!rewardTypes.includes(values.type) && <option value={values.type}>Choose a reward type</option>}
            {rewardTypes.map(type => <option key={type} value={type}>{labels[type]}</option>)}
          </Field>
        </div>
        <Field label="Description" as="textarea" rows={3} {...field('description')} />
        <div className="field-pair">
          <Field label="Minimum pledge" inputMode="decimal" hint={project.currency || 'USD'} required {...field('minimumPledge')} />
          <Field label="Estimated delivery" name="deliveryMonth" type="month" required {...field('estimatedDelivery')} />
        </div>
        <Field label="Quantity limit" inputMode="numeric" hint="Leave blank for unlimited availability." {...field('quantityLimit')} />
      </fieldset>
      <fieldset className="panel editor-group" disabled={locked} aria-label="Included items">
        <h3>Included items</h3>
        {!items.length && <p className="hint">No items listed.</p>}
        {items.map((row, index) => <div className="repeat-row" key={row.key}>
          <Field label={`Item ${index + 1} name`} value={row.name} error={errors[row.key + 'name']}
            onChange={event => setRow(setItems, row.key, 'name', event.target.value)} />
          <Field label={`Item ${index + 1} quantity`} inputMode="numeric" value={row.quantity} error={errors[row.key + 'quantity']}
            onChange={event => setRow(setItems, row.key, 'quantity', event.target.value)} />
          {!locked && <button className="button secondary" type="button" aria-label={`Remove item ${index + 1}`}
            onClick={() => setItems(rows => rows.filter(item => item.key !== row.key))}>Remove</button>}
        </div>)}
        {!locked && <button className="button secondary align-start" type="button"
          onClick={() => setItems(rows => [...rows, { key: newId('item'), name: '', quantity: '1' }])}>Add item</button>}
      </fieldset>
      <fieldset className="panel editor-group" disabled={locked} aria-label="Delivery">
        <h3>Delivery</h3>
        <Field label="Delivery method" as="select" {...field('deliveryMethod')}>
          {!Object.hasOwn(methods, values.deliveryMethod) && <option value={values.deliveryMethod}>Choose a method</option>}
          {Object.entries(methods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Field>
        {ships && <>
          {shipping.map((row, index) => <div className="repeat-row" key={row.key}>
            <Field label={`Destination ${index + 1}`} value={row.destination} error={errors[row.key + 'destination']}
              onChange={event => setRow(setShipping, row.key, 'destination', event.target.value)} />
            <Field label={`Shipping cost ${index + 1}`} inputMode="decimal" value={row.amount} error={errors[row.key + 'amount']}
              onChange={event => setRow(setShipping, row.key, 'amount', event.target.value)} />
            {!locked && <button className="button secondary" type="button" aria-label={`Remove destination ${index + 1}`}
              onClick={() => setShipping(rows => rows.filter(item => item.key !== row.key))}>Remove</button>}
          </div>)}
          {errors.shipping && <p className="field-error" role="alert">{errors.shipping}</p>}
          {!locked && <button className="button secondary align-start" type="button"
            onClick={() => setShipping(rows => [...rows, { key: newId('shipping'), destination: '', amount: '' }])}>Add destination</button>}
        </>}
      </fieldset>
      <div className="actions">
        <button className="button primary" type="submit" disabled={locked}>Save reward</button>
        {reward && <button className="button secondary" type="button" disabled={locked} onClick={() => setConfirm(true)}>Archive reward</button>}
      </div>
    </form>
    {confirm && <Confirm title="Archive reward" danger onClose={() => setConfirm(false)} onConfirm={archive}>
      <p>Archive <strong>{reward.title}</strong>? It will be removed from the campaign’s active rewards.</p>
    </Confirm>}
  </>
}

