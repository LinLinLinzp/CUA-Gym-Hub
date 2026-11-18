import { useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  canUseSnapshot, imageLabel, images, isHostLabel, planConfig, planLabel, plans,
  regionLabel, regions, syntheticIpv4,
} from './data/catalog.js'
import { newId, useWorkspace } from './store.jsx'
import { withSid } from './utils/dataManager.js'
import {
  Confirm, dateLabel, Facts, Field, FormActions, formValues, Heading, includes, invalid,
  labelOf, Missing, Modal, resourcePath, Search, Select, shown, SiteLink, Status, Table,
} from './ui.jsx'

const base = '/droplets'
const back = [base, 'Droplets']
const detailPath = id => resourcePath(base, id)
const projectOptions = projects => projects.map(project => [project.id, project.name || project.id])
const regionOptions = regions.map(([id, name]) => [id, `${name} (${id.toUpperCase()})`])
const planOptions = options => options.map(plan => [plan.slug, `${planLabel(plan)} · ${plan.diskGb} GB disk · $${plan.monthlyPrice}/mo`])
const units = (value, suffix) => value == null ? null : `${value} ${suffix}`

export function Droplets() {
  const { world } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [status, setStatus] = useState('')
  const selectedProject = params.get('project') || ''
  const rows = world.droplets.filter(droplet =>
    includes(search, droplet.name, droplet.ipv4) &&
    (!selectedProject || droplet.projectId === selectedProject) &&
    (!region || droplet.region === region) && (!status || droplet.status === status)
  )

  function setProject(id) {
    const next = new URLSearchParams(params)
    if (id) next.set('project', id)
    else next.delete('project')
    setParams(next)
  }

  const filtered = search || selectedProject || region || status
  return <>
    <Heading title="Droplets" subtitle="Manage virtual servers across your projects."
      action={<SiteLink to="/droplets/new" className="button primary">Create Droplet</SiteLink>} />
    <div className="filters">
      <Search label="Search by name or IP" value={search} onChange={event => setSearch(event.target.value)} />
      <Select aria-label="Filter by project" placeholder="All projects" value={selectedProject} options={projectOptions(world.projects)} onChange={event => setProject(event.target.value)} />
      <Select aria-label="Filter by region" placeholder="All regions" value={region} options={regionOptions} onChange={event => setRegion(event.target.value)} />
      <Select aria-label="Filter by status" placeholder="All statuses" value={status} options={ [['active', 'Active'], ['off', 'Off']] } onChange={event => setStatus(event.target.value)} />
      {filtered && <button type="button" onClick={() => { setSearch(''); setProject(''); setRegion(''); setStatus('') }}>Clear filters</button>}
    </div>
    <p className="results">{rows.length} of {world.droplets.length} Droplets</p>
    <Table label="Droplets" columns={['Name', 'Status', 'Region', 'Plan', 'IPv4', 'Project']} rows={rows}
      empty={filtered ? 'No Droplets match these filters.' : 'Create a Droplet to add a virtual server to your workspace.'}
      renderRow={row => <>
        <td><SiteLink to={detailPath(row.id)}>{row.name || row.id}</SiteLink></td>
        <td><Status value={row.status} /></td><td>{regionLabel(row.region)}</td><td>{planLabel(row)}</td>
        <td className="mono">{shown(row.ipv4)}</td><td>{labelOf(world.projects, row.projectId)}</td>
      </>} />
  </>
}

export function CreateDroplet() {
  const [params] = useSearchParams()
  return <DropletForm key={params.get('snapshot') || ''} requestedSnapshot={params.get('snapshot')} />
}

function DropletForm({ requestedSnapshot }) {
  const { world, commit } = useWorkspace()
  const navigate = useNavigate()
  const availableImages = world.snapshots.filter(snapshot => snapshot.status === 'available')
  const initialSnapshot = availableImages.find(snapshot => snapshot.id === requestedSnapshot)
  const [hostname, setHostname] = useState('')
  const [projectId, setProject] = useState(world.projects[0]?.id || '')
  const [imageChoice, setImageChoice] = useState(initialSnapshot ? `snapshot:${initialSnapshot.id}` : images[0][0])
  const [region, setRegion] = useState(initialSnapshot?.regions?.find(id => regions.some(([code]) => code === id)) || regions[0][0])
  const [planSlug, setPlan] = useState(plans.find(plan => !initialSnapshot || canUseSnapshot(initialSnapshot, region, plan.diskGb))?.slug || '')
  const [failure, setFailure] = useState('')
  const snapshot = availableImages.find(row => imageChoice === `snapshot:${row.id}`)
  const allowedRegions = snapshot ? regionOptions.filter(([id]) => (snapshot.regions ?? []).includes(id)) : regionOptions
  const allowedPlans = snapshot ? plans.filter(plan => canUseSnapshot(snapshot, region, plan.diskGb)) : plans
  const plan = allowedPlans.find(row => row.slug === planSlug)
  const imageSlug = snapshot ? snapshot.imageSlug || `snapshot-${snapshot.id}` : imageChoice

  function chooseImage(choice) {
    const chosen = availableImages.find(row => choice === `snapshot:${row.id}`)
    const possibleRegions = chosen ? regionOptions.filter(([code]) => (chosen.regions ?? []).includes(code)) : regionOptions
    const nextRegion = possibleRegions.some(([code]) => code === region) ? region : possibleRegions[0]?.[0] || ''
    const possiblePlans = chosen ? plans.filter(candidate => canUseSnapshot(chosen, nextRegion, candidate.diskGb)) : plans
    const nextPlan = possiblePlans.some(candidate => candidate.slug === planSlug) ? planSlug : possiblePlans[0]?.slug || ''
    setImageChoice(choice)
    setRegion(nextRegion)
    setPlan(nextPlan)
  }

  function create(event) {
    event.preventDefault()
    const form = event.currentTarget
    const name = hostname.trim().toLowerCase()
    if (!isHostLabel(name)) return invalid(form, 'hostname', 'Use 1–63 letters, numbers or hyphens. Start and end with a letter or number.')
    if (!world.projects.some(project => project.id === projectId) || !plan || !region) return
    const ipv4 = syntheticIpv4(world.droplets)
    if (!ipv4) {
      setFailure('This workspace has no free documentation IPv4 addresses.')
      return
    }
    const createdAt = new Date().toISOString()
    const droplet = {
      id: newId('drp'), name, projectId, region, imageSlug, ...planConfig(plan), ipv4, status: 'active',
      createdAt, createdBy: world.account.id, ...(snapshot && { sourceSnapshotId: snapshot.id }),
    }
    commit({
      entityType: 'droplet', entityId: droplet.id, kind: snapshot ? 'created_from_snapshot' : 'created', createdAt,
      details: { projectId, ...(snapshot && { snapshotId: snapshot.id, sourceDropletId: snapshot.sourceDropletId }), after: droplet },
      changes: { droplets: [...world.droplets, droplet] }, message: `${name} was created.`,
    })
    navigate(withSid(detailPath(droplet.id)))
  }

  return <>
    <Heading title="Create Droplet" subtitle="Choose placement, an image, and compute for your virtual server." back={back} />
    <div className="detail-layout">
      <form className="panel form" onSubmit={create}>
        {requestedSnapshot && !initialSnapshot && <p className="caution">The requested snapshot is unavailable. You can choose another image.</p>}
        <h2>Configuration</h2>
        <Field label="Hostname" hint="Use a single DNS label of up to 63 characters.">
          <input name="hostname" placeholder="e.g. web-edge-07" required value={hostname} maxLength={63} autoComplete="off" onChange={event => setHostname(event.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="Project"><Select required placeholder="Choose a project" value={projectId} options={projectOptions(world.projects)} onChange={event => setProject(event.target.value)} /></Field>
          <Field label="Region"><Select required placeholder="Choose a region" value={region} options={allowedRegions} onChange={event => setRegion(event.target.value)} /></Field>
        </div>
        <Field label="Image">
          <select required value={imageChoice} onChange={event => chooseImage(event.target.value)}>
            <optgroup label="Operating systems">{images.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</optgroup>
            {!!availableImages.length && <optgroup label="Snapshots">
              {availableImages.map(row => <option key={row.id} value={`snapshot:${row.id}`}>{row.name || row.id}</option>)}
            </optgroup>}
          </select>
        </Field>
        <Field label="Plan"><Select required placeholder="Choose a plan" value={planSlug} options={planOptions(allowedPlans)} onChange={event => setPlan(event.target.value)} /></Field>
        {snapshot && <p className="caution">This snapshot requires {shown(snapshot.minDiskGb)} GB of disk and a region where the image is available.</p>}
        {!world.projects.length && <p className="caution">A project is required to create a Droplet.</p>}
        {failure && <p role="alert" className="form-error">{failure}</p>}
        <div className="form-actions"><SiteLink className="button" to={base}>Cancel</SiteLink><button type="submit" className="primary" disabled={!projectId || !plan || !region}>Create Droplet</button></div>
      </form>
      <aside className="panel">
        <h2>Configuration summary</h2>
        <Facts entries={[
          ['Hostname', hostname.trim() || null], ['Project', labelOf(world.projects, projectId)],
          ['Region', regionLabel(region)], ['Image', snapshot?.name || imageLabel(imageSlug)],
          ['Compute', planLabel(plan)], ['Disk', units(plan?.diskGb, 'GB')], ['Monthly estimate', plan ? `$${plan.monthlyPrice}` : null],
        ]} />
      </aside>
    </div>
  </>
}

export function DropletDetail() {
  const { id } = useParams()
  return <DropletView key={id} id={id} />
}

function DropletView({ id }) {
  const { world, commit } = useWorkspace()
  const [dialog, setDialog] = useState('')
  const [menu, setMenu] = useState(false)
  const trigger = useRef(null)
  const navigate = useNavigate()
  const droplet = world.droplets.find(row => row.id === id)
  if (!droplet) return <Missing title="Droplet unavailable" to={base} label="Back to Droplets" />
  const name = droplet.name || droplet.id
  const snapshots = world.snapshots.filter(row => row.sourceDropletId === droplet.id)
  const restoredSnapshot = world.snapshots.find(row => row.id === droplet.lastRestoredSnapshotId)
  const sourceSnapshot = world.snapshots.find(row => row.id === droplet.sourceSnapshotId)
  const close = () => setDialog('')
  function openAction(action) {
    trigger.current.focus()
    setMenu(false)
    setDialog(action)
  }

  function update(kind, changes, before, extra = {}) {
    const createdAt = new Date().toISOString()
    const updated = { ...droplet, ...changes, updatedAt: createdAt }
    commit({
      entityType: 'droplet', entityId: droplet.id, kind, createdAt,
      details: { projectId: droplet.projectId, before, after: changes, ...extra },
      changes: { droplets: world.droplets.map(row => row.id === droplet.id ? updated : row) },
      message: `${name} was ${kind.replaceAll('_', ' ')}.`,
    })
    close()
  }

  function togglePower() {
    if (!['active', 'off'].includes(droplet.status)) return
    const active = droplet.status === 'active'
    update(active ? 'powered_off' : 'powered_on', { status: active ? 'off' : 'active' }, { status: droplet.status })
  }

  function destroy() {
    commit({
      entityType: 'droplet', entityId: droplet.id, kind: 'destroyed', createdAt: new Date().toISOString(),
      details: { projectId: droplet.projectId, before: droplet },
      changes: { droplets: world.droplets.filter(row => row.id !== droplet.id) },
      message: `${name} was destroyed.`,
    })
    navigate(withSid(base))
  }

  function takeSnapshot(snapshotName) {
    const createdAt = new Date().toISOString()
    const id = newId('snap')
    const snapshot = {
      id, name: snapshotName, sourceDropletId: droplet.id, sourceDropletName: name,
      imageSlug: `snapshot-${id}`, regions: [droplet.region], sizeGb: Math.round(droplet.diskGb * 3) / 10,
      minDiskGb: droplet.diskGb, status: 'available', createdBy: world.account.id, createdAt,
    }
    commit({
      entityType: 'snapshot', entityId: snapshot.id, kind: 'created', createdAt,
      details: { sourceDropletId: droplet.id, after: snapshot },
      changes: { snapshots: [...world.snapshots, snapshot] }, message: `${snapshotName} is available.`,
    })
    close()
  }

  const canCapture = Boolean(droplet.region && Number.isFinite(droplet.diskGb) && droplet.diskGb > 0)
  return <>
    <Heading title={name} subtitle="Droplet details" back={back}
      action={<div className="actions-menu" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(false) }}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            trigger.current.focus()
            setMenu(false)
          }
        }}>
        <button ref={trigger} type="button" aria-expanded={menu} onClick={() => setMenu(!menu)}>Actions <span aria-hidden="true">▾</span></button>
        {menu && <div className="action-popover">
          <button type="button" onClick={() => openAction('rename')}>Rename</button>
          <button type="button" disabled={!['active', 'off'].includes(droplet.status)} onClick={() => openAction('power')}>{droplet.status === 'off' ? 'Power On' : 'Power Off'}</button>
          <button type="button" disabled={droplet.status !== 'off'} onClick={() => openAction('resize')}>Resize</button>
          <button type="button" disabled={!canCapture} onClick={() => openAction('snapshot')}>Take Snapshot</button>
          <button type="button" className="destructive-link" onClick={() => openAction('destroy')}>Destroy Droplet</button>
        </div>}
      </div>} />
    <div className="detail-layout">
      <section className="stack">
        <div className="panel">
          <div className="section-heading"><h2>Configuration</h2><Status value={droplet.status} /></div>
          <Facts entries={[
            ['Image', imageLabel(droplet.imageSlug)], ['Plan', planLabel(droplet)], ['Disk', units(droplet.diskGb, 'GB')],
            ['Monthly estimate', droplet.monthlyPrice == null ? null : `$${droplet.monthlyPrice}`],
            ...(sourceSnapshot ? [['Source snapshot', <SiteLink to={`/snapshots?snapshot=${encodeURIComponent(sourceSnapshot.id)}`}>{sourceSnapshot.name || sourceSnapshot.id}</SiteLink>]] : []),
            ...(droplet.lastRestoredAt ? [['Last restored', dateLabel(droplet.lastRestoredAt)],
              ['Restored from', restoredSnapshot ? <SiteLink to={`/snapshots?snapshot=${encodeURIComponent(restoredSnapshot.id)}`}>{restoredSnapshot.name || restoredSnapshot.id}</SiteLink> : droplet.lastRestoredSnapshotId]] : []),
          ]} />
        </div>
        <section className="stack">
          <div className="section-heading"><h2>Snapshots</h2><button type="button" className="compact" disabled={!canCapture} onClick={() => setDialog('snapshot')}>Take Snapshot</button></div>
          <Table label="Droplet snapshots" columns={['Name', 'Status', 'Created']} rows={snapshots} empty="No snapshots have been taken for this Droplet."
            renderRow={row => <>
              <td><SiteLink to={`/snapshots?snapshot=${encodeURIComponent(row.id)}`}>{row.name || row.id}</SiteLink></td>
              <td><Status value={row.status} /></td><td>{dateLabel(row.createdAt)}</td>
            </>} />
        </section>
      </section>
      <aside className="panel">
        <h2>Placement and network</h2>
        <Facts entries={[
          ['Project', labelOf(world.projects, droplet.projectId)], ['Region', regionLabel(droplet.region)],
          ['IPv4', <span className="mono">{shown(droplet.ipv4)}</span>], ['Created', dateLabel(droplet.createdAt)],
        ]} />
        {droplet.status === 'active' && <p className="resize-hint">Power off this Droplet to resize it.</p>}
      </aside>
    </div>
    {dialog === 'rename' && <NameDialog title="Rename Droplet" fieldLabel="Hostname" initial={name} close={close} submitLabel="Save name" validate={isHostLabel}
      onSave={value => {
        const next = value.toLowerCase()
        if (next === droplet.name) return close()
        update('renamed', { name: next }, { name: droplet.name })
      }} />}
    {dialog === 'power' && <Modal title={droplet.status === 'off' ? 'Power On' : 'Power Off'} close={close}>
      <form className="form" onSubmit={event => { event.preventDefault(); togglePower() }}>
        <p>{droplet.status === 'off' ? 'Start' : 'Shut down'} <strong>{name}</strong>.</p>
        <FormActions close={close} label={droplet.status === 'off' ? 'Power On' : 'Power Off'} />
      </form>
    </Modal>}
    {dialog === 'resize' && <ResizeDialog droplet={droplet} close={close} update={update} />}
    {dialog === 'destroy' && <Confirm title="Destroy Droplet" name={name} close={close} onConfirm={destroy}>
      <p>This permanently removes <strong>{name}</strong>. Its snapshots will remain available.</p>
    </Confirm>}
    {dialog === 'snapshot' && <NameDialog title="Take Snapshot" fieldLabel="Snapshot name" close={close} submitLabel="Take Snapshot" onSave={takeSnapshot}>
      {droplet.status === 'active' && <p className="caution">This Droplet is active. A live snapshot may miss writes in progress. Power it off first for a consistent disk image.</p>}
    </NameDialog>}
  </>
}

function NameDialog({ title, fieldLabel, initial = '', close, submitLabel, onSave, validate, children }) {
  return <Modal title={title} close={close} drawer>
    <form className="form" onSubmit={event => {
      const form = event.currentTarget
      const { name } = formValues(event)
      const value = name.trim()
      if (!value || (validate && !validate(value))) return invalid(form, 'name', validate ? 'Enter a valid hostname using letters, numbers or hyphens.' : 'Enter a snapshot name.')
      onSave(value)
    }}>
      {children}
      <Field label={fieldLabel}><input name="name" defaultValue={initial} required maxLength={validate ? 63 : 100} autoComplete="off" /></Field>
      <FormActions close={close} label={submitLabel} />
    </form>
  </Modal>
}

function ResizeDialog({ droplet, close, update }) {
  const [mode, setMode] = useState('cpu_ram')
  const [slug, setSlug] = useState('')
  const choices = plans.filter(plan => {
    if (!Number.isFinite(droplet.diskGb)) return false
    if (mode === 'disk_cpu_ram') return plan.diskGb > droplet.diskGb
    return plan.vcpus !== droplet.vcpus || plan.memoryMb !== droplet.memoryMb
  })
  const selection = choices.find(plan => plan.slug === slug)
  return <Modal title="Resize Droplet" close={close} drawer>
    <form className="form" onSubmit={event => {
      event.preventDefault()
      if (!selection || droplet.status !== 'off') return
      const next = planConfig(selection)
      if (mode === 'cpu_ram') next.diskGb = droplet.diskGb
      const before = Object.fromEntries(Object.keys(next).map(key => [key, droplet[key] ?? null]))
      update('resized', next, before, { resizeMode: mode })
    }}>
      <Field label="Resize mode"><Select value={mode} options={ [['cpu_ram', 'CPU and RAM only'], ['disk_cpu_ram', 'Disk, CPU, and RAM']] }
        onChange={event => { setMode(event.target.value); setSlug('') }} /></Field>
      <p className="caution">{mode === 'cpu_ram' ? `Disk stays at ${shown(droplet.diskGb)} GB.` : 'Disk size can only increase. This resize permanently expands the disk.'}</p>
      <Field label="New plan"><Select required placeholder={choices.length ? 'Choose a plan' : 'No eligible plans'} options={planOptions(mode === 'cpu_ram' ? choices.map(plan => ({ ...plan, diskGb: droplet.diskGb })) : choices)} value={slug} onChange={event => setSlug(event.target.value)} /></Field>
      <FormActions close={close} label="Resize Droplet" disabled={!selection} />
    </form>
  </Modal>
}
