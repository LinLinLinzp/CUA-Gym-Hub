import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Grid2X2, List, Package, Paperclip, Plane, Search } from 'lucide-react'
import { useStore } from '../store.jsx'
import { array, displayAddress, emailValid, isDraft, lower, shortDate, timeOf, visibleMail, views } from '../data/model.js'
import { AttachmentTiles, eligibleAttachments, useAttachmentViewer } from '../components/attachments.jsx'
import { Empty, IconButton, Modal, NotFound } from '../components/ui.jsx'
import { useSenderActions } from '../components/senderActions.jsx'
import { useOpenMail } from '../components/mailActions.jsx'

export default function Views() {
  const { view } = useParams()
  if (!Object.hasOwn(views, view)) return <NotFound title="This view is unavailable" />
  if (view === 'subscriptions') return <Subscriptions />
  if (view === 'orders' || view === 'travel') return <TravelAndOrders key={view} view={view} />
  return <FilesView key={view} view={view} />
}

function FilesView({ view }) {
  const { state } = useStore()
  const openMessage = useOpenMail()
  const [query, setQuery] = useState('')
  const [list, setList] = useState(false)
  const files = eligibleAttachments(state.messages).filter(({ message, file }) =>
    (view === 'attachments' || view === 'photos' && file.kind === 'image' || view === 'documents' && file.kind === 'document') &&
    lower([file.name, displayAddress(message.from)].join(' ')).includes(lower(query)))
  const viewer = useAttachmentViewer(files)
  return <section className="views-page">
    <header className="page-heading"><div><h1>{views[view]}</h1><p className="muted">{files.length} {files.length === 1 ? 'file' : 'files'}</p></div>
      <div className="view-tools"><label className="folder-search"><Search size={16} /><input aria-label="Search files" placeholder="Search files" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <IconButton label="Grid view" icon={Grid2X2} aria-pressed={!list} onClick={() => setList(false)} /><IconButton label="List view" icon={List} aria-pressed={list} onClick={() => setList(true)} />
      </div>
    </header>
    {files.length ? <AttachmentTiles items={files} compact={list} onOpen={viewer.open} onDownload={viewer.download} onMessage={openMessage} />
      : <Empty icon={Paperclip} title={query ? 'No matching files' : 'No files to show'}>{query && <button className="secondary" onClick={() => setQuery('')}>Clear search</button>}</Empty>}
    {viewer.modal}
  </section>
}

function Subscriptions() {
  const { state } = useStore()
  const openMessage = useOpenMail()
  const { unsubscribe } = useSenderActions()
  const latest = new Map()
  for (const message of array(state.messages).filter(visibleMail).filter(message => !isDraft(message)).sort((a, b) => timeOf(b) - timeOf(a))) {
    const email = lower(message.from?.email)
    if (message.listUnsubscribe && emailValid(email) && !latest.has(email)) latest.set(email, message)
  }
  const unsubscribed = new Set(array(state.unsubscribes).map(item => lower(item.senderEmail)))
  return <section className="views-page">
    <header className="page-heading"><div><h1>Subscriptions</h1><p className="muted">{latest.size} senders</p></div></header>
    {!latest.size && <Empty title="No subscriptions to show" />}
    <div className="metadata-list">
      {[...latest].map(([email, message]) => <article key={email} className="metadata-card">
        <div><h2>{displayAddress(message.from)}</h2><p className="muted">{email}</p></div>
        <footer><button className="tool-button" onClick={() => openMessage(message)}>Open email</button><button className="secondary" disabled={unsubscribed.has(email)} onClick={() => unsubscribe(message)}>{unsubscribed.has(email) ? 'Unsubscribed' : 'Unsubscribe'}</button></footer>
      </article>)}
    </div>
  </section>
}

function TravelAndOrders({ view }) {
  const { state } = useStore()
  const openMessage = useOpenMail()
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState(null)
  const orders = view === 'orders'
  const key = orders ? 'orderInfo' : 'travelInfo'
  const Icon = orders ? Package : Plane
  const items = array(state.messages).filter(visibleMail).filter(message => message[key] && lower([message.subject, ...Object.values(message[key])].join(' ')).includes(lower(query))).sort((a, b) => timeOf(b) - timeOf(a))
  const groups = new Map()
  for (const message of items) {
    const label = orders ? message[key].merchant : message[key].provider
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(message)
  }
  return <section className="views-page">
    <header className="page-heading"><h1>{views[view]}</h1><label className="folder-search"><Search size={15} /><input aria-label={'Search ' + views[view].toLowerCase()} placeholder="Search" value={query} onChange={event => setQuery(event.target.value)} /></label></header>
    {!items.length && <Empty icon={Icon} title={query ? 'No matching results' : 'No ' + views[view].toLowerCase() + ' to show'} />}
    {[...groups].map(([name, messages]) => <section className="metadata-group" key={name || 'unknown'}>
      <h2>{name || 'Unknown provider'}</h2>
      <div className="metadata-list">{messages.map(message => {
        const info = message[key]
        return <article className="metadata-card" key={message.id}>
          <div className="metadata-icon"><Icon size={20} /></div>
          <div><h3>{orders ? info.orderNumber || message.subject : [info.from, info.to].filter(Boolean).join(' → ') || message.subject}</h3><p className="muted">{orders ? [info.currency, info.total, info.status].filter(Boolean).join(' · ') : [info.confirmation, shortDate(info.departAt)].filter(Boolean).join(' · ')}</p></div>
          <footer><button className="tool-button" onClick={() => openMessage(message)}>Open email</button><button className="secondary" onClick={() => setDetail(message)}>{orders && info.trackingNumber ? 'Tracking details' : 'Details'}</button></footer>
        </article>
      })}</div>
    </section>)}
    {detail && <Modal title={orders ? 'Order details' : 'Travel details'} className="details-drawer" close={() => setDetail(null)}>
      <dl className="contact-data">{Object.entries(detail[key]).filter(([, value]) => value).map(([field, value]) => <div key={field}><dt>{({ orderNumber: 'Order number', trackingNumber: 'Tracking number', departAt: 'Departure' }[field] || field).replace(/^./, letter => letter.toUpperCase())}</dt><dd>{field === 'departAt' ? shortDate(value) : String(value)}</dd></div>)}</dl>
      <button className="primary" onClick={() => { const message = detail; setDetail(null); openMessage(message) }}>Open email</button>
    </Modal>}
  </section>
}
