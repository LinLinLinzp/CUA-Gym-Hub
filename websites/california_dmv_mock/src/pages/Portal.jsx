import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, CalendarDays, CarFront, IdCard, MapPin, Search } from 'lucide-react'
import { routes } from '../data/routes'
import { addressLine, byId, byVehicle, fullName, garage, normalize, owned, showDate, vehicleName } from '../data/display'
import { ActionLink, Address, ButtonLink, Empty, Page, SiteLink, Status } from '../components/ui'

const directory = [
  { group: 'Renew', title: 'Vehicle registration renewal', keywords: 'car plate tags license vin cf boat', to: routes.renewal },
  { group: 'Renew', title: 'Check vehicle registration status', keywords: 'receipt paid payment car tags vin', to: routes.renewalStatus },
  { group: 'Apply / Request', title: 'Change your address', keywords: 'update move mailing residential DL ID garage', to: routes.address },
  { group: 'Apply / Request', title: 'Check change of address status', keywords: 'confirmation request account', to: routes.addressStatus },
  { group: 'Appointment', title: 'Schedule an appointment', keywords: 'real id office drivers license drive test booking', to: routes.appointments },
  { group: 'Appointment', title: 'View or cancel your appointment', keywords: 'booking confirmation lookup manage', to: routes.appointmentLookup },
  { group: 'Appointment', title: 'Find a DMV office', keywords: 'location city zip map field hours', to: routes.locations },
]

const shortcuts = [
  { icon: CarFront, title: 'Renew your registration', summary: 'Renew your vehicle or vessel registration online and check your renewal status.', action: 'Renew Registration', to: routes.renewal, tone: 'blue' },
  { icon: CalendarDays, title: 'Make an appointment', summary: 'Schedule a field office visit or a drive test at a location near you.', action: 'Make an Appointment', to: routes.appointments, tone: 'green' },
  { icon: IdCard, title: 'Change your address', summary: 'Update the address on your driver’s license, ID card or vehicle registration.', action: 'Change Address', to: routes.address, tone: 'gold' },
]

export function Home() {
  const [query, setQuery] = useState('')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  useEffect(() => { document.title = 'California DMV' }, [])
  return <main id="main" tabIndex={-1}>
    <section className="home-hero">
      <div className="container home-intro">
        <div>
          <h1>California DMV</h1>
          <p>Renew your registration, book an appointment or update your address.</p>
          <form className="service-search" role="search" onSubmit={(event) => {
            event.preventDefault()
            const next = new URLSearchParams(params)
            if (query.trim()) next.set('q', query.trim())
            else next.delete('q')
            navigate({ pathname: routes.online, search: next.toString() })
          }}>
            <label htmlFor="home-search">Find a DMV service</label>
            <div className="search-control">
              <Search size={21} aria-hidden="true" />
              <input id="home-search" placeholder="Search online services" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button className="button" type="submit">Search</button>
            </div>
          </form>
        </div>
        <div className="hero-account">
          <IdCard size={30} aria-hidden="true" />
          <h2>Your MyDMV account</h2>
          <p>View your driver’s license, Garage and transaction history.</p>
          <ActionLink to={routes.account}>Go to MyDMV</ActionLink>
        </div>
      </div>
    </section>
    <section className="container home-services" aria-labelledby="popular-services">
      <div className="section-heading">
        <h2 id="popular-services">Most popular services</h2>
        <ActionLink to={routes.online}>View all online services</ActionLink>
      </div>
      <div className="cards-grid">
        {shortcuts.map(({ icon: Icon, title, summary, action, to, tone }) => <article className="card service-card" key={to}>
          <span className={`service-icon ${tone}`}><Icon size={25} aria-hidden="true" /></span>
          <h3>{title}</h3>
          <p>{summary}</p>
          <ActionLink to={to}>{action}</ActionLink>
        </article>)}
      </div>
      <div className="location-strip">
        <MapPin size={22} aria-hidden="true" />
        <p><strong>Need to visit an office?</strong> Find locations, hours and available services.</p>
        <ActionLink to={routes.locations}>Find a DMV Office</ActionLink>
      </div>
    </section>
  </main>
}

export function OnlineServices() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const results = directory.filter((entry) => normalize(query).split(' ').every((word) => normalize(`${entry.title} ${entry.keywords} ${entry.group}`).includes(word)))
  function setQuery(value) {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  return <Page title="Online Services">
    <p className="lead">Complete DMV transactions and check their status online.</p>
    <div className="card directory-search" role="search">
      <label htmlFor="online-search">Search online services</label>
      <div className="search-control"><Search size={20} aria-hidden="true" /><input id="online-search" type="search" placeholder="Search by service or keyword" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    </div>
    <div className="cards-grid directory-groups" aria-live="polite">
      {!results.length && <Empty title="No services found">Try a different search, such as registration or appointment.</Empty>}
      {[...new Set(results.map((entry) => entry.group))].map((group) => <section className="card directory-card" key={group}>
        <h2>{group}</h2>
        <ul>{results.filter((entry) => entry.group === group).map(({ to, title }) => <li key={to}><SiteLink to={to}>{title}<ArrowRight size={17} aria-hidden="true" /></SiteLink></li>)}</ul>
      </section>)}
    </div>
  </Page>
}

export function Account({ state }) {
  const profile = state.profile
  const credential = profile?.credential
  const vehicles = garage(state)
  const receipts = owned(state, 'registrationRenewals')
  const requests = owned(state, 'addressChangeRequests').filter((record) => record.status === 'submitted')
  const pendingFor = (type, id) => id && requests.some((record) => type === 'credential' ? record.credentialId === id : record.registrationIds?.includes(id))

  return <Page title="MyDMV">
    <p className="lead">Welcome{fullName(profile?.contact) ? `, ${fullName(profile.contact)}` : ''}.</p>
    <div className="account-grid">
      <div>
        <section className="card" aria-labelledby="credential-heading">
          <h2 id="credential-heading">Driver’s License / ID</h2>
          {credential?.id ? <>
            <p><strong>{credential.type || 'DL/ID'}</strong> {credential.number ? `•••• ${String(credential.number).slice(-4)}` : ''}</p>
            <p>Expires {showDate(credential.expirationDate)}</p>
            <p className="muted">{addressLine(credential.residentialAddress)}</p>
            {pendingFor('credential', credential.id) && <SiteLink to={routes.addressStatus}>Address change submitted</SiteLink>}
          </> : <p>No driver’s license or ID card on file.</p>}
        </section>
        <section className="card" aria-labelledby="transaction-heading">
          <h2 id="transaction-heading">Transactions</h2>
          <ul className="link-list">
            <li><SiteLink to={routes.addressStart}>Change your address</SiteLink></li>
            <li><SiteLink to={routes.addressStatus}>Check address change status</SiteLink></li>
            <li><SiteLink to={routes.appointmentLookup}>View or cancel an appointment</SiteLink></li>
            <li><SiteLink to={routes.renewalStatus}>Check registration status</SiteLink></li>
          </ul>
        </section>
      </div>
      <section aria-labelledby="garage-heading">
        <div className="section-heading"><h2 id="garage-heading">Garage</h2><ButtonLink secondary to={routes.renewalStart}>Renew Registration</ButtonLink></div>
        {vehicles.length ? <div className="garage-list">{vehicles.map((vehicle) => {
          const registration = byVehicle(state, vehicle.id)
          const receipt = byId(receipts, registration?.lastRenewalId)
          return <article className="card garage-card" key={vehicle.id}>
            <span className="service-icon blue"><CarFront size={22} aria-hidden="true" /></span>
            <div>
              <h3>{vehicleName(vehicle)}</h3>
              <p>Plate / CF: <strong>{vehicle.plateNumber || 'Unavailable'}</strong> · VIN / HIN suffix: <strong>{vehicle.vinHinSuffix || 'Unavailable'}</strong></p>
              {registration && <><p>Expires {showDate(registration.expirationDate)} · <Status value={registration.status} /></p><p className="muted"><Address value={registration.residentialAddress} /></p></>}
              {receipt && <p><SiteLink to={routes.receipt + encodeURIComponent(receipt.id)}>View renewal receipt</SiteLink></p>}
              {pendingFor('registration', registration?.id) && <SiteLink to={routes.addressStatus}>Address change submitted</SiteLink>}
            </div>
          </article>
        })}</div> : <Empty title="No vehicles in your Garage" />}
      </section>
    </div>
  </Page>
}
