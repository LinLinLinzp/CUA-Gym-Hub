import { useState } from 'react'
import { Gift, Search } from 'lucide-react'
import { RegistryGifts } from '../components/RegistryGifts.jsx'
import { useStore } from '../context/Store.jsx'
import { activeRegistry, deleteRegistry, ownedRegistry, registryPath, registryTitle, registryTypes, saveRegistry } from '../data/registries.js'
import { array, find } from '../data/model.js'
import { Back, ButtonLink, Dialog, Empty, Feedback, Field, Missing, displayDate, label } from '../components/UI.jsx'
import { useSiteNavigate } from '../utils/navigation.jsx'
import { withSid } from '../utils/dataManager.js'

export function RegistryHome() {
  const { state } = useStore()
  const [view, setView] = useState('mine')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const registries = array(state.registries).filter(activeRegistry)
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const mine = view === 'mine'
  const results = mine ? registries.filter(registry => ownedRegistry(state, registry)) : registries.filter(registry =>
    registry.visibility === 'public' && (!type || type === registry.type) &&
    words.every(word => `${registry.registrantName || ''} ${registry.name || ''}`.toLowerCase().includes(word)))
  return <div className="stack">
    <section className="registry-hero section-heading">
      <div className="stack small-gap"><h1 className="with-icon"><Gift size={28} aria-hidden="true" /> Gift registry</h1><p>Find a gift or create a registry for your event.</p></div>
      <ButtonLink to="/registry/new">Create a registry</ButtonLink>
    </section>
    <div className="actions registry-view-controls" role="group" aria-label="Registry views">
      <button className={`button ${mine ? 'primary' : 'secondary'}`} aria-pressed={mine} onClick={() => setView('mine')}>My registries</button>
      <button className={`button ${mine ? 'secondary' : 'primary'}`} aria-pressed={!mine} onClick={() => setView('find')}>Find a registry</button>
    </div>
    {!mine && <section className="panel stack" aria-label="Public registry search">
      <div className="field-row">
        <Field label="Search registries"><input type="search" placeholder="Registrant name or registry title" value={query} onChange={event => setQuery(event.target.value)} /></Field>
        <Field label="Registry type"><select value={type} onChange={event => setType(event.target.value)}><option value="">All types</option>
          {Object.entries(registryTypes).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select></Field>
      </div>
      <p className="with-icon small muted" role="status"><Search size={16} aria-hidden="true" />{results.length} {results.length === 1 ? 'registry' : 'registries'} found</p>
    </section>}
    {results.length ? <div className="registry-grid">{results.map((registry, index) => <article className="panel stack small-gap" key={registry.id ?? index}>
      <p className="small muted">{registryTypes[registry.type] || 'Gift registry'}{mine && registry.visibility && ` · ${label(registry.visibility)}`}</p>
      <h2>{registryTitle(registry)}</h2>
      <p>{registry.registrantName || 'Registrant unavailable'}</p>
      <p className="small muted">{displayDate(registry.eventDate)}</p>
      {registry.id && <div className="actions space-top"><ButtonLink kind="secondary" to={mine ? `${registryPath(registry)}/manage` : registryPath(registry)}>{mine ? 'Manage registry' : 'View registry'}</ButtonLink></div>}
    </article>)}</div> : <Empty title={mine ? 'You haven’t created a registry' : 'No matching registries'} to={mine ? '/registry/new' : undefined} action="Create a registry">
      {mine ? 'Create a Baby, Wedding or Classroom registry.' : 'Try a different name, title or event type.'}
    </Empty>}
  </div>
}

function RegistryFields({ initial, submitLabel, onSaved, onCancel }) {
  const { state, commit } = useStore()
  const addresses = array(state.profile?.addresses)
  const [values, setValues] = useState(() => ({
    name: initial?.name || '', registrantName: initial?.registrantName || state.profile?.name || '',
    type: initial?.type || '', eventDate: initial?.eventDate || '',
    visibility: initial?.visibility || 'private', addressId: initial?.addressId || addresses[0]?.id || '',
  }))
  const [error, setError] = useState('')
  const input = key => ({
    value: values[key],
    onChange: event => { setValues(current => ({ ...current, [key]: event.target.value })); setError('') },
  })
  return <form className="stack" onSubmit={event => {
    event.preventDefault()
    const result = commit(saveRegistry, { registryId: initial?.id, values })
    if (result.registry) onSaved(result.registry)
    else setError(result.error)
  }}>
    <Field label="Registry type"><select required {...input('type')}><option value="">Choose a type</option>
      {Object.entries(registryTypes).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select></Field>
    <Field label="Registry title"><input required maxLength={100} {...input('name')} /></Field>
    <Field label="Registrant name"><input required maxLength={100} {...input('registrantName')} /></Field>
    <Field label="Event date"><input required type="date" {...input('eventDate')} /></Field>
    <Field label="Gift shipping address"><select required {...input('addressId')}><option value="">Choose a saved address</option>
      {addresses.map(item => <option key={item.id} value={item.id}>{[item.label, item.line1].filter(Boolean).join(' · ') || 'Saved address'}</option>)}
    </select></Field>
    <Field label="Visibility" help="Public registries appear in search. Private registries are available by shared link.">
      <select required {...input('visibility')}><option value="private">Private</option><option value="public">Public</option></select>
    </Field>
    <Feedback>{error}</Feedback>
    <div className="actions"><button className="button primary">{submitLabel}</button>
      {onCancel ? <button className="button secondary" type="button" onClick={onCancel}>Cancel</button> : <ButtonLink kind="secondary" to="/registry">Cancel</ButtonLink>}
    </div>
  </form>
}

export function NewRegistry() {
  const navigate = useSiteNavigate()
  return <div className="stack registry-form">
    <Back to="/registry">Gift registry</Back>
    <h1>Create a registry</h1>
    <section className="panel"><RegistryFields submitLabel="Create registry" onSaved={registry => navigate(`${registryPath(registry)}/manage`, { replace: true })} /></section>
  </div>
}

function ShareLink({ registry }) {
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const shareUrl = new URL(withSid(registryPath(registry)), window.location.origin).href
  return <div className="stack small-gap">
    <div className="actions"><button className="button secondary" onClick={async () => {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
      } catch {
        setShowLink(true)
      }
    }}>Copy link</button></div>
    {copied && <Feedback success>Registry link copied.</Feedback>}
    {showLink && <Field label="Shareable registry link"><input readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} /></Field>}
  </div>
}

export function ManageRegistry({ record: registry }) {
  const { state, commit } = useStore()
  const navigate = useSiteNavigate()
  const [dialog, setDialog] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  if (!ownedRegistry(state, registry)) return <Missing name="Registry" to="/registry" action="Back to registries" />
  const address = find(state.profile?.addresses, registry.addressId)
  const close = () => { setDialog(''); setError('') }
  return <div className="stack">
    <Back to="/registry">My registries</Back>
    <section className="panel stack">
      <div className="section-heading"><h1>{registryTitle(registry)}</h1><span className="badge warning">{label(registry.visibility) || 'Visibility unavailable'}</span></div>
      <p>{[registry.registrantName, registryTypes[registry.type], displayDate(registry.eventDate)].filter(Boolean).join(' · ')}</p>
      <p className="small muted">Gift address: {address?.label || address?.line1 || 'No address selected'}</p>
      <div className="actions">
        <button className="button secondary" onClick={() => setDialog('edit')}>Edit registry</button>
        <ButtonLink kind="secondary" to={registryPath(registry)}>View shared registry</ButtonLink>
        <button className="text-button unavailable" onClick={() => setDialog('delete')}>Delete registry</button>
      </div>
      <ShareLink registry={registry} />
      <Feedback success>{notice}</Feedback>
    </section>
    <RegistryGifts registry={registry} owner />
    {dialog === 'edit' && <Dialog title="Edit registry" onClose={close}><RegistryFields initial={registry} submitLabel="Save changes" onSaved={() => { close(); setNotice('Registry updated.') }} onCancel={close} /></Dialog>}
    {dialog === 'delete' && <Dialog title="Delete this registry?" onClose={close}><div className="stack">
      <p>This removes the registry from your account, public search and its shared link.</p>
      <Feedback>{error}</Feedback>
      <div className="actions">
        <button className="button secondary" onClick={close} autoFocus>Keep registry</button>
        <button className="button danger" onClick={() => {
          const result = commit(deleteRegistry, { registryId: registry.id })
          if (result.state) navigate('/registry', { replace: true })
          else setError(result.error)
        }}>Confirm deletion</button>
      </div>
    </div></Dialog>}
  </div>
}

export function SharedRegistry({ record: registry }) {
  return <div className="stack">
    <Back to="/registry">Gift registry</Back>
    <section className="registry-hero stack small-gap">
      <p className="small">{registryTypes[registry.type] || 'Gift registry'}</p>
      <h1>{registryTitle(registry)}</h1>
      <p>{[registry.registrantName, displayDate(registry.eventDate)].filter(Boolean).join(' · ')}</p>
    </section>
    <RegistryGifts registry={registry} />
  </div>
}
