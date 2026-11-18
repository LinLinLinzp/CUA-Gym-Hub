import React, { useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAccount } from './store.jsx'
import { getSessionId, withSid } from './utils/dataManager.js'
import { byId, ensure, groupPath, list, makeOrder, merchantName, newId, orderPath, ordersNewest, replaceRecord, subtotalOf, totalsFor, validQuantity } from './model.js'
import { Amounts, Back, Confirm, Details, FoodArt, Icon, ListPanel, Missing, PageHeading, QuantityField, RecordRow, SessionLink, Status, matches, money, receiptRows, useSessionNavigate, when } from './ui.jsx'

const filters = [['all', 'All'], ['open', 'Open'], ['closed', 'Closed'], ['placed', 'Placed'], ['canceled', 'Canceled']]
const guestPath = (group) => groupPath(group.id) + '/join?invite=' + encodeURIComponent(group.inviteToken)

function groupSubtotal(group) {
  return list(group.participants).reduce((sum, person) => sum + subtotalOf(person.items), 0)
}

function checkoutItems(group) {
  return list(group.participants).flatMap((person) => list(person.items).map((item) => ({ ...item, participantId: person.id })))
}

function checkoutTotals(items) {
  return totalsFor(items, { deliveryFeeCents: 299, serviceFeeCents: 199 })
}

const validLine = (item) => item.name && validQuantity(item.unitPriceCents) && validQuantity(item.quantity) && item.quantity > 0

export function Groups() {
  const { state } = useAccount()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [starting, setStarting] = useState(false)
  const merchants = list(state.merchants).filter((merchant) => merchant.id)
  const groups = ordersNewest(state.groupOrders).filter((group) => (filter === 'all' || group.status === filter) &&
    matches(query, group.name, group.id, merchantName(state, group), ...list(group.participants).map((person) => person.name)))

  return <>
    <PageHeading title="Group orders" description="Share a restaurant cart and place one order for everyone.">
      <button className="button primary" disabled={!merchants.length || !state.account?.id} onClick={() => setStarting(true)}><Icon name="plus" />Start group order</button>
    </PageHeading>
    <ListPanel title="Group orders" placeholder="Search groups, restaurants or participants" query={query} setQuery={setQuery}
      filter={filter} setFilter={setFilter} filters={filters} count={groups.length}>
      {groups.map((group, index) => {
        const count = list(group.participants).length
        return <RecordRow key={group.id || index} art={<FoodArt merchantId={group.merchantId} />} title={group.name || 'Group order'}
          subtitle={[merchantName(state, group), group.id, when(group.createdAt), count + (count === 1 ? ' participant' : ' participants')].filter(Boolean).join(' · ')}
          status={group.status} amount={money(groupSubtotal(group))} to={group.id && groupPath(group.id)} action="View group" />
      })}
    </ListPanel>
    {starting && <StartGroup merchants={merchants} close={() => setStarting(false)} />}
  </>
}

function StartGroup({ merchants, close }) {
  const { commit } = useAccount()
  const navigate = useSessionNavigate()
  const [merchantId, setMerchantId] = useState('')
  const [name, setName] = useState('')
  const [deadline, setDeadline] = useState('')

  async function start() {
    let group
    await commit((state, now) => {
      const merchant = byId(state.merchants, merchantId)
      ensure(merchant && state.account?.id, 'Choose an available restaurant.')
      ensure(name.trim(), 'Enter a name for the group.')
      ensure(!deadline || Number.isFinite(Date.parse(deadline)), 'Enter a valid deadline.')
      group = {
        id: newId('GO'), name: name.trim(), merchantId: merchant.id, merchantName: merchant.name || 'Restaurant',
        hostId: state.account.id, inviteToken: newId('join'), createdAt: now, createdBy: state.account.id, status: 'open',
        ...(deadline && { deadlineAt: new Date(deadline).toISOString() }),
        participants: [{ id: state.account.id, name: state.account.name || 'Host', role: 'host', joinedAt: now, items: [] }],
      }
      return { ...state, groupOrders: [...list(state.groupOrders), group] }
    }, 'Group order started.')
    navigate(groupPath(group.id))
  }

  return <Confirm title="Start group order" submitLabel="Create group order" onClose={close} onConfirm={start}>
    <label className="field">Restaurant
      <select required value={merchantId} onChange={(event) => setMerchantId(event.target.value)}>
        <option value="">Choose a restaurant</option>
        {merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name || merchant.id}</option>)}
      </select>
    </label>
    <label className="field">Group name<input required maxLength="100" value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label className="field">Deadline (optional)
      <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
      <small>Uses your device’s time zone. The cart stays open until the host closes it.</small>
    </label>
  </Confirm>
}

export function GroupDetails() {
  const { groupId } = useParams()
  const { state } = useAccount()
  const group = byId(state.groupOrders, groupId)
  return group ? <HostView key={groupId} group={group} /> : <Missing title="Group order unavailable" to="/group-orders" back="All group orders" />
}

function HostView({ group }) {
  const { state, commit } = useAccount()
  const navigate = useSessionNavigate()
  const [dialog, setDialog] = useState(null)
  const [checkoutReview, setCheckoutReview] = useState([])
  const dismiss = () => setDialog(null)
  const isHost = Boolean(state.account?.id) && group.hostId === state.account.id
  const host = byId(group.participants, group.hostId)
  const merchant = byId(state.merchants, group.merchantId)
  const items = checkoutItems(group)
  const canEdit = isHost && group.status === 'open'
  const canCancel = isHost && ['open', 'closed'].includes(group.status)
  const canCheckout = isHost && group.status === 'closed' && !group.orderId && group.merchantId && items.length && items.every(validLine)

  function changeStatus(status) {
    const closed = status === 'closed'
    return commit((latest, now) => {
      const current = byId(latest.groupOrders, group.id)
      const eligible = closed ? ['open'] : ['open', 'closed']
      ensure(current?.hostId && current.hostId === latest.account?.id && eligible.includes(current.status), 'This group can no longer be updated.')
      const next = { ...current, status, [closed ? 'closedAt' : 'canceledAt']: now, updatedAt: now, updatedBy: latest.account.id }
      return { ...latest, groupOrders: replaceRecord(latest.groupOrders, next) }
    }, closed ? 'Group order closed.' : 'Group order canceled.')
  }

  async function checkout() {
    let order
    await commit((latest, now) => {
      const current = byId(latest.groupOrders, group.id)
      ensure(current?.status === 'closed' && current.hostId && current.hostId === latest.account?.id, 'This group is no longer eligible for checkout.')
      ensure(!current.orderId && !list(latest.orders).some((entry) => entry.groupOrderId === current.id), 'This group already has an order.')
      const selected = checkoutItems(current)
      ensure(current.merchantId && selected.length && selected.every(validLine), 'The group must have valid items to check out.')
      ensure(JSON.stringify(selected) === JSON.stringify(checkoutReview), 'The cart changed. Open checkout again to review the latest items.')
      const lines = selected.map((item) => ({ ...item, id: newId('line') }))
      order = makeOrder(latest.account, { id: current.merchantId, name: merchantName(latest, current) }, lines,
        checkoutTotals(lines), now, { groupOrderId: current.id })
      const next = { ...current, status: 'placed', orderId: order.id, placedAt: now, updatedAt: now, updatedBy: latest.account.id }
      return { ...latest, orders: [...list(latest.orders), order], groupOrders: replaceRecord(latest.groupOrders, next) }
    }, 'Group order placed.')
    navigate(orderPath(order.id))
  }

  const totals = checkoutTotals(checkoutReview)
  return <>
    <Back to="/group-orders">All group orders</Back>
    <PageHeading title={group.name || 'Group order'} description={[merchantName(state, group), group.id].join(' · ')}>
      {canEdit && <button className="button primary" onClick={() => setDialog('close')}>Close group</button>}
      {canCheckout ? <button className="button primary" onClick={() => { setCheckoutReview(items); setDialog('checkout') }}>Review checkout</button> : null}
      {canCancel && <button className="button secondary" onClick={() => setDialog('cancel')}>Cancel group</button>}
    </PageHeading>
    <div className="detail-grid">
      <div className="stack">
        {isHost && host && <CartEditor group={group} person={host} merchant={merchant} editable={canEdit} title="Your cart" />}
        <section className="panel panel-pad">
          <h2>Participants</h2>
          {list(group.participants).map((person, index) => <div className="participant" key={person.id || index}>
            <div className="participant-heading">
              <h3 className="wrap">{person.name || 'Participant'} <small className="muted">{person.role === 'host' ? '· Host' : ''}</small></h3>
              <strong>{money(subtotalOf(person.items))}</strong>
            </div>
            <CartLines items={person.items} />
          </div>)}
          {!list(group.participants).length && <p className="muted">No participants have joined.</p>}
        </section>
      </div>
      <aside className="stack">
        <section className="panel panel-pad">
          <h2>Group summary</h2>
          <Details rows={[
            ['Status', <Status value={group.status} />], ['Created', when(group.createdAt, true)],
            ['Deadline', group.deadlineAt && when(group.deadlineAt, true)],
            ['Group subtotal', money(groupSubtotal(group))],
            ['Order', group.orderId && (byId(state.orders, group.orderId) ? <SessionLink to={orderPath(group.orderId)}>{group.orderId}</SessionLink> : group.orderId)],
          ]} />
        </section>
        {isHost && group.inviteToken && <Invite group={group} />}
      </aside>
    </div>
    {dialog === 'close' && <Confirm title="Close group order?" submitLabel="Confirm close" onClose={dismiss} onConfirm={() => changeStatus('closed')}>
      <p>Participants’ carts will be locked. You can review the combined order before placing it.</p>
    </Confirm>}
    {dialog === 'cancel' && <Confirm title="Cancel group order?" submitLabel="Confirm cancellation" onClose={dismiss} onConfirm={() => changeStatus('canceled')}>
      <p>This ends the group and locks every participant’s cart.</p>
    </Confirm>}
    {dialog === 'checkout' && <Confirm title="Review group checkout" submitLabel="Place order" onClose={dismiss} onConfirm={checkout}>
      <p>{merchantName(state, group)} · {list(group.participants).length} participants</p>
      <CartLines items={checkoutReview} />
      <Amounts rows={receiptRows(totals)} total={['Order total', totals.totalCents]} />
    </Confirm>}
  </>
}

function Invite({ group }) {
  const { setNotice } = useAccount()
  const field = useRef(null)
  const url = new URL(withSid(guestPath(group)), window.location.origin).href
  const [error, setError] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setError(false)
      setNotice({ message: 'Invite link copied.' })
    } catch {
      field.current.focus()
      field.current.select()
      setError(true)
    }
  }

  return <section className="panel panel-pad">
    <h2>Invite link</h2>
    <p className="muted">Share this link to let guests add their items.</p>
    <label className="field invite-field">Group invite URL<input ref={field} readOnly value={url} /></label>
    {error && <p className="inline-status" role="status">Use your keyboard or device menu to copy the selected link.</p>}
    <div className="actions section-actions"><button className="button secondary" onClick={copy}>Copy invite link</button></div>
  </section>
}

export function GroupGuest() {
  const { groupId } = useParams()
  const [params] = useSearchParams()
  const { state } = useAccount()
  const group = byId(state.groupOrders, groupId)
  const invite = params.get('invite')
  if (!group || !invite || invite !== group.inviteToken) return <Missing title="Invite unavailable" to="/group-orders" back="All group orders" />
  return <GuestView key={groupId + ':' + invite} group={group} />
}

function GuestView({ group }) {
  const { state, commit } = useAccount()
  const sessionKey = JSON.stringify(['doordash-guest', getSessionId(), group.id, group.inviteToken])
  const [guestId, setGuestId] = useState(() => sessionStorage.getItem(sessionKey))
  const [joining, setJoining] = useState(false)
  const [name, setName] = useState('')
  const person = byId(group.participants, guestId)
  const merchant = byId(state.merchants, group.merchantId)

  async function join() {
    let guest
    await commit((latest, now) => {
      const current = byId(latest.groupOrders, group.id)
      ensure(current?.status === 'open' && current.inviteToken === group.inviteToken, 'This invite is no longer open.')
      ensure(!byId(current.participants, sessionStorage.getItem(sessionKey)), 'You already joined this group.')
      ensure(name.trim(), 'Enter your name to join.')
      guest = { id: newId('guest'), name: name.trim(), role: 'guest', joinedAt: now, items: [] }
      const next = { ...current, participants: [...list(current.participants), guest], updatedAt: now, updatedBy: guest.id }
      return { ...latest, groupOrders: replaceRecord(latest.groupOrders, next) }
    }, 'You joined the group.')
    sessionStorage.setItem(sessionKey, guest.id)
    setGuestId(guest.id)
  }

  return <>
    <PageHeading title={group.name || 'Group order'} description={merchantName(state, group)}>
      <Status value={group.status} />
    </PageHeading>
    <div className="detail-grid">
      {person?.role === 'guest'
        ? <CartEditor title={person.name ? person.name + '’s cart' : 'Your cart'} group={group} person={person} merchant={merchant} editable={group.status === 'open'} guest />
        : <section className="panel panel-pad">
          <h2>{group.status === 'open' ? 'Join this group order' : 'This cart is closed'}</h2>
          <p className="muted">{group.status === 'open' ? 'Join to add your own items to the shared cart.' : 'The host has finished collecting items.'}</p>
          {group.status === 'open' && <button className="button primary section-actions" onClick={() => setJoining(true)}>Join group</button>}
        </section>}
      <aside className="panel panel-pad"><h2>Group summary</h2>
        <Details rows={[
          ['Restaurant', merchantName(state, group)], ['Participants', list(group.participants).length],
          ['Deadline', group.deadlineAt && when(group.deadlineAt, true)],
        ]} />
      </aside>
    </div>
    {joining && <Confirm title="Join group order" submitLabel="Join group" onClose={() => setJoining(false)} onConfirm={join}>
      <label className="field">Your name<input required maxLength="80" value={name} onChange={(event) => setName(event.target.value)} /></label>
    </Confirm>}
  </>
}

function CartLines({ items }) {
  return list(items).length ? <ul className="line-list">
    {list(items).map((item, index) => <li className="line-item" key={item.id || index}>
      <span className="wrap"><strong>{item.name || 'Item'}</strong><small>{item.quantity ?? '—'} × {money(item.unitPriceCents)}</small></span>
      <strong>{money(Number(item.quantity) * Number(item.unitPriceCents))}</strong>
    </li>)}
  </ul> : <p className="muted">No items added.</p>
}

const menuItems = (merchant) => list(merchant?.menu).filter((item) => item.id && item.name && validQuantity(item.unitPriceCents))

function CartEditor({ group, person, merchant, editable, title, guest = false }) {
  const [editing, setEditing] = useState(false)
  const menu = menuItems(merchant)
  return <section className="panel panel-pad">
    <h2>{title}</h2>
    <CartLines items={person.items} />
    {editable && menu.length > 0 && <button className="button secondary section-actions" onClick={() => setEditing(true)}>Edit items</button>}
    {editable && !menu.length && <p className="muted inline-status">The restaurant menu is unavailable.</p>}
    {editing && <EditCart group={group} person={person} menu={menu} guest={guest} close={() => setEditing(false)} />}
  </section>
}

function EditCart({ group, person, menu, guest, close }) {
  const { commit } = useAccount()
  const existing = list(person.items)
  const [original] = useState(() => JSON.stringify(existing))
  const [counts, setCounts] = useState(() => Object.fromEntries(menu.map((dish) => [
    dish.id, existing.filter((item) => item.menuItemId === dish.id).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
  ])))
  const [initialCounts] = useState(counts)
  const changed = Object.keys(counts).some((id) => Number(counts[id]) !== initialCounts[id])

  function save() {
    return commit((latest, now) => {
      const current = byId(latest.groupOrders, group.id)
      const participant = byId(current?.participants, person.id)
      const authorized = guest ? participant?.role === 'guest' && current?.inviteToken === group.inviteToken
        : current?.hostId === participant?.id && participant?.id === latest.account?.id
      ensure(current?.status === 'open' && participant && authorized, 'This cart can no longer be edited.')
      ensure(changed, 'Change at least one quantity before saving.')
      const previous = list(participant.items)
      ensure(JSON.stringify(previous) === original, 'Your cart changed in another tab. Reopen the editor for the latest items.')
      const available = menuItems(byId(latest.merchants, current.merchantId))
      const items = [...previous]
      for (const [id, value] of Object.entries(counts)) {
        const quantity = Number(value)
        ensure(value !== '' && validQuantity(quantity, Math.max(99, initialCounts[id])), 'Enter a whole quantity for each item.')
        if (quantity === initialCounts[id]) continue
        const dish = byId(available, id)
        ensure(dish, 'A selected item is no longer available.')
        const previousLine = items.find((line) => line.menuItemId === id)
        for (let index = items.length - 1; index >= 0; index--) {
          if (items[index].menuItemId === id) items.splice(index, 1)
        }
        if (quantity) items.push({ id: previousLine?.id || newId('line'), menuItemId: id, name: dish.name, quantity, unitPriceCents: dish.unitPriceCents })
      }
      const next = {
        ...current, participants: replaceRecord(current.participants, { ...participant, items }),
        updatedAt: now, updatedBy: participant.id,
      }
      return { ...latest, groupOrders: replaceRecord(latest.groupOrders, next) }
    }, 'Cart saved.')
  }

  return <Confirm title="Edit cart items" submitLabel="Save items" onClose={close} onConfirm={save} disabled={!changed}>
    <ul className="line-list">
      {menu.map((dish) => <li className="line-item" key={dish.id}>
        <span className="wrap"><strong>{dish.name}</strong><small>{money(dish.unitPriceCents)} each</small></span>
        <QuantityField label={dish.name + ' quantity'} value={counts[dish.id] ?? 0} max={Math.max(99, initialCounts[dish.id] || 0)}
          onChange={(value) => setCounts({ ...counts, [dish.id]: value })} />
      </li>)}
    </ul>
  </Confirm>
}
