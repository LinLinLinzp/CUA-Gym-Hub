import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBank } from '../bank'
import { AccountOptions, Field, Notice, PageTitle, Panel } from '../ui'
import { alertTypes, audit, changeRecord, find, idFor, isCard, isDeposit, open, positiveCents, records } from '../utils/banking'

const delivery = [['email', 'Email'], ['text', 'Text'], ['push', 'Push']]
const applicable = (account) => isCard(account) ? ['payment_due', 'large_purchase'] : ['low_balance', 'deposit_posted', 'large_purchase']
const supported = (account) => open(account) && (isCard(account) || isDeposit(account))

function AlertRule({ account, type, existing }) {
  const { commit } = useBank()
  const definition = alertTypes[type]
  const [enabled, setEnabled] = useState(Boolean(existing?.enabled))
  const [channels, setChannels] = useState(() => Array.isArray(existing?.channels) ? existing.channels.filter((channel) => delivery.some(([id]) => channel === id)) : [])
  const [threshold, setThreshold] = useState(existing?.thresholdAmount ?? '')
  const [attempted, setAttempted] = useState(false)
  const [notice, setNotice] = useState('')
  const channelErrorId = useId()
  const cents = definition.threshold ? positiveCents(threshold) : null
  const channelError = enabled && !channels.length
  const thresholdError = enabled && definition.threshold && !cents

  function save(event) {
    event.preventDefault()
    setNotice('')
    setAttempted(true)
    if (channelError || thresholdError) return
    const saved = commit((state) => {
      const linked = find(state.accounts, account.id)
      if (!supported(linked) || !applicable(linked).includes(type)) return state
      const current = records(state.alertRules).find((item) => item.accountId === account.id && item.type === type)
      const { createdAt, createdBy } = audit(state)
      const patch = {
        enabled, channels, thresholdAmount: cents == null ? null : cents / 100,
        updatedAt: createdAt, updatedBy: createdBy,
      }
      const alertRules = current ? changeRecord(state.alertRules, current.id, patch) :
        [...(state.alertRules || []), { id: idFor('alert'), accountId: account.id, type, createdAt, createdBy, ...patch }]
      return { ...state, alertRules }
    })
    if (saved) setNotice(definition.title + ' alert saved.')
  }

  function toggleChannel(id) {
    setNotice('')
    setChannels(channels.includes(id) ? channels.filter((item) => item !== id) : [...channels, id])
  }

  return <Panel title={definition.title}>
    <p className="soft-text">{definition.description}</p>
    <form className="form alert-form" onSubmit={save} noValidate>
      <label className="check"><input type="checkbox" checked={enabled} onChange={(event) => { setNotice(''); setEnabled(event.target.checked) }} />Enable {definition.title.toLowerCase()} alert</label>
      <fieldset aria-describedby={attempted && channelError ? channelErrorId : undefined}>
        <legend>Delivery channels</legend>
        <div className="toggle-row">
          {delivery.map(([id, label]) => <label className="check" key={id}>
            <input type="checkbox" checked={channels.includes(id)} onChange={() => toggleChannel(id)} />{label}
          </label>)}
        </div>
        {attempted && channelError && <p className="error-text" id={channelErrorId}>Select at least one delivery channel.</p>}
      </fieldset>
      {definition.threshold && <Field label="Threshold amount ($)" error={attempted && thresholdError ? 'Enter a positive amount with up to two decimal places.' : undefined}>
        {(props) => <input {...props} inputMode="decimal" placeholder="0.00" value={threshold} onChange={(event) => { setNotice(''); setThreshold(event.target.value) }} />}
      </Field>}
      <div className="actions"><button className="primary">Save alert</button></div>
    </form>
    <Notice>{notice}</Notice>
  </Panel>
}

export default function Alerts() {
  const { state } = useBank()
  const accounts = records(state.accounts).filter(supported)
  const [query, setQuery] = useSearchParams()
  const accountId = query.get('account') ?? String(accounts[0]?.id ?? '')
  const account = find(accounts, accountId)
  const rules = records(state.alertRules)
  function selectAccount(id) {
    const next = new URLSearchParams(query)
    next.set('account', id)
    setQuery(next, { replace: true })
  }
  return <>
    <PageTitle title="Alerts" description="Choose which account activity you hear about and how." />
    <div className="stack">
      <Panel title="Alert preferences">
        {accounts.length ? <Field label="Account" className="compact-field">{(props) => <select {...props} value={account ? accountId : ''} onChange={(event) => selectAccount(event.target.value)}>
          <AccountOptions accounts={accounts} />
        </select>}</Field> : <p className="empty">There are no open accounts with alert preferences.</p>}
      </Panel>
      {account && <div className="grid alert-grid">
        {applicable(account).map((type) => <AlertRule key={account.id + '-' + type} account={account} type={type}
          existing={rules.find((item) => item.accountId === account.id && item.type === type)} />)}
      </div>}
    </div>
  </>
}
