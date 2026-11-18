import { useEffect, useRef, useState } from 'react'
import { List, Map as MapIcon, MapPin, Search } from 'lucide-react'
import { OfficeCard } from '../components/Office'
import { Empty, Page, ButtonLink } from '../components/ui'
import { useStore } from '../context/Store'
import { officeMatches } from '../data/appointments'
import { byId, list, services } from '../data/display'
import { routes } from '../data/routes'

const regions = [
  ['Sacramento Valley', 67, 26],
  ['Bay Area', 16, 41],
  ['Central Valley', 71, 52],
  ['Los Angeles', 45, 71],
  ['Inland Empire', 88, 63],
  ['Orange County', 48, 85],
  ['San Diego', 69, 95],
]

function OfficeAction({ office, service }) {
  const selected = service || list(office?.serviceTypes).find((key) => Object.hasOwn(services, key))
  if (!selected) return <p className="muted">Online appointment services unavailable.</p>
  const query = new URLSearchParams({ service: selected, office: office.id, step: 'time' })
  return <ButtonLink secondary to={`${routes.schedule}?${query}`}>Make an Appointment<span className="sr-only"> at {office.name || 'this office'}</span></ButtonLink>
}

function OfflineMap({ offices, selectedId, selectOffice }) {
  const viewport = useRef(null)
  const selectedPin = useRef(null)
  const positioned = offices.filter(({ mapPosition: pin }) => pin && [pin.x, pin.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 100))

  useEffect(() => {
    const map = viewport.current
    const pin = selectedPin.current
    if (!pin || map.scrollWidth <= map.clientWidth) return
    const bounds = map.getBoundingClientRect()
    const target = pin.getBoundingClientRect()
    if (target.left < bounds.left || target.right > bounds.right || target.top < bounds.top || target.bottom > bounds.bottom) {
      map.scrollTo(pin.offsetLeft - map.clientWidth / 2, pin.offsetTop - map.clientHeight / 2)
    }
  }, [selectedId])

  return <div className={`map-viewport${positioned.length ? ' map-with-pins' : ''}`} ref={viewport} role="region" aria-label="California field office map" tabIndex={0}>
    <div className="offline-map">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" className="map-backdrop" aria-hidden="true">
        <path d="M0 0H100V100H0Z" fill="#e6f2f6" />
        <path d="M16 0H64L64 34 94 67 100 76 95 87 97 100H83L78 94 73 90 66 84 52 81 45 75 40 66 37 58 29 47 26 39 19 28 17 17 14 10Z" fill="#f7f6eb" stroke="#a1b7bd" strokeWidth=".35" />
        <path d="M27 27Q45 29 47 37T53 52 62 67 67 76 75 83 85 95M31 40 48 32M47 44 61 48M53 52 76 75M63 67 82 69" fill="none" stroke="#c5c7a6" strokeWidth=".34" strokeDasharray="1 .65" />
      </svg>
      {regions.map(([label, x, y]) => <span key={label} className="map-region" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%` }}>{label}</span>)}
      {positioned.map((office) => <button key={office.id} ref={selectedId === office.id ? selectedPin : null} type="button" className="map-pin" aria-label={office.name || 'DMV office'} aria-pressed={selectedId === office.id}
        style={{ '--pin-x': `${office.mapPosition.x}%`, '--pin-y': `${office.mapPosition.y}%` }} onClick={() => selectOffice(office.id)}><MapPin size={17} aria-hidden="true" /></button>)}
      {!positioned.length && <p className="map-no-pins">Map positions are unavailable. Use the List view for office details.</p>}
    </div>
  </div>
}

export default function Locations() {
  const { state } = useStore()
  const [search, setSearch] = useState('')
  const [service, setService] = useState('')
  const [view, setView] = useState('list')
  const [selectedId, selectOffice] = useState('')
  const offices = list(state.offices).filter((office) => office?.id && officeMatches(office, search) && (!service || list(office.serviceTypes).includes(service)))
  const selected = byId(offices, selectedId) ?? offices[0]

  return <Page title="DMV Locations">
    <p className="lead">Find a field office and check its hours and appointment services.</p>
    <div className="card location-filters">
      <div className="office-search">
        <label htmlFor="location-search">City or ZIP Code</label>
        <div className="search-control"><Search size={20} aria-hidden="true" /><input id="location-search" type="search" value={search} placeholder="Enter a city, office name or ZIP code" onChange={(event) => setSearch(event.target.value)} /></div>
      </div>
      <div className="field">
        <label htmlFor="location-service">Service</label>
        <select id="location-service" value={service} onChange={(event) => setService(event.target.value)}>
          <option value="">All services</option>
          {Object.entries(services).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
    </div>
    <div className="section-heading location-heading">
      <h2>Field offices</h2>
      <div className="view-switch" role="group" aria-label="Office display">
        <button type="button" className="button button-secondary" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={18} aria-hidden="true" />List</button>
        <button type="button" className="button button-secondary" aria-pressed={view === 'map'} onClick={() => setView('map')}><MapIcon size={18} aria-hidden="true" />Map</button>
      </div>
    </div>
    <p role="status" className="muted">{offices.length} {offices.length === 1 ? 'office' : 'offices'} found</p>
    {!offices.length ? <Empty title="No matching offices">Try another city, a shorter ZIP prefix or a different service.</Empty> : <>
      {view === 'list' ? <div className="location-list">{offices.map((office) => <OfficeCard key={office.id} office={office} selected={selected?.id === office.id}>
        <button type="button" className="text-button office-focus" aria-pressed={selected?.id === office.id} onClick={() => selectOffice(office.id)}>Select<span className="sr-only"> {office.name || 'office'}</span></button>
        <OfficeAction office={office} service={service} />
      </OfficeCard>)}</div> : <div className="map-layout">
        <OfflineMap offices={offices} selectedId={selected?.id} selectOffice={selectOffice} />
        {selected && <OfficeCard office={selected} selected><OfficeAction office={selected} service={service} /></OfficeCard>}
      </div>}
    </>}
  </Page>
}
