import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { checkIn } from './actions.js'
import { address, find, identified, isActivePickup, patientName, storeName, windowLabel } from './domain.js'
import { usePharmacy } from './state.jsx'
import { Details, Dialog, Empty, ErrorMessage, Items, Missing, PageHeader, RecordLink, Status } from './ui.jsx'

const methodNames = { counter: 'Pharmacy counter', drive_thru: 'Drive-thru' }

export function Pickup() {
  const { state } = usePharmacy()
  const orders = identified(state.pickupOrders)
  const groups = [
    ['Ready for pickup', orders.filter((order) => order.status === 'ready')],
    ['Preparing and checked in', orders.filter((order) => order.status !== 'ready' && isActivePickup(order))],
    ['Past pickups', orders.filter((order) => !isActivePickup(order))],
  ]
  return <div className="stack">
    <PageHeader title="Pickup" description="Check order status and tell your pharmacy when you arrive."/>
    {groups.map(([title, rows]) => <section className="panel" key={title}>
      <h2>{title}</h2>
      {rows.length ? rows.map((order) => {
        const store = find(state.stores, order.storeId)
        return <RecordLink key={order.id} to={'/pickup/' + encodeURIComponent(order.id)} icon="pickup"
          title={patientName(state, order.patientId) + ' · ' + order.id}
          meta={storeName(store) + ' · ' + windowLabel(order.pickupWindow, store)} end={<Status status={order.status}/>}/>
      }) : <Empty>No orders in this group.</Empty>}
    </section>)}
  </div>
}

export function PickupDetail() {
  const { id } = useParams()
  return <PickupRecord id={id} key={id}/>
}

function PickupRecord({ id }) {
  const { state, commit } = usePharmacy()
  const [confirm, setConfirm] = useState(false)
  const [method, setMethod] = useState('counter')
  const [error, setError] = useState('')
  const order = find(state.pickupOrders, id)
  if (!order) return <Missing record="Pickup order" back="/pickup" label="Back to pickup"/>
  const store = find(state.stores, order.storeId)
  const patient = patientName(state, order.patientId)

  function submit(event) {
    event.preventDefault()
    const { error } = commit((current) => checkIn(current, id, method))
    if (error) setError(error)
    else setConfirm(false)
  }

  return <div className="stack">
    <PageHeader title="Pickup details" description={'Order ' + id} back="/pickup" backLabel="Back to pickup"><Status status={order.status}/></PageHeader>
    {order.status === 'checked_in' && <div className="notice" role="status">You’re checked in{methodNames[order.checkInMethod] ? ' · ' + methodNames[order.checkInMethod] : ''}.</div>}
    <section className="panel">
      <h2>Pharmacy and pickup</h2>
      <Details entries={[
        ['Patient', patient], ['Pharmacy', storeName(store)], ['Address', address(store)],
        ['Requested pickup window', windowLabel(order.pickupWindow, store)],
        ...(order.pickupCode ? [['Pickup code', <strong>{order.pickupCode}</strong>]] : []),
        ...(order.checkInMethod ? [['Pickup method', methodNames[order.checkInMethod]]] : []),
      ]}/>
    </section>
    <section className="panel">
      <h2>Prescriptions in this order</h2><Items items={order.items}/>
    </section>
    <section className="panel">
      <h2>Pickup instructions</h2>
      <p>{order.status === 'preparing' ? 'Wait until your order is ready before visiting the pharmacy.' :
        order.status === 'ready' || order.status === 'checked_in' ? 'Have the patient’s name and pickup code if shown ready to share with pharmacy staff.' :
          'This order appears in your pickup history.'}</p>
      {order.status === 'ready' && <button className="button primary" onClick={() => { setError(''); setConfirm(true) }}>Check in for pickup</button>}
    </section>
    {confirm && <Dialog title="Check in for pickup" close={() => setConfirm(false)}>
      <p>{patient} · {id}</p>
      <p>{storeName(store)}<br/>{address(store)}</p>
      <form onSubmit={submit}>
        <fieldset><legend>Pickup method</legend>
          {Object.entries(methodNames).filter(([value]) => value === 'counter' || store?.driveThru === true).map(([value, label]) =>
            <label className="choice" key={value}><input type="radio" name="pickup-method" value={value} checked={method === value}
              onChange={() => setMethod(value)}/><span>{label}</span></label>)}
        </fieldset>
        <ErrorMessage>{error}</ErrorMessage>
        <div className="actions"><button type="button" className="button" autoFocus onClick={() => setConfirm(false)}>Go back</button>
          <button className="button primary" type="submit">Confirm check-in</button></div>
      </form>
    </Dialog>}
  </div>
}
