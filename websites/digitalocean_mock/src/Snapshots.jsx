import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { canUseSnapshot, planLabel, regionLabel, regions } from './data/catalog.js'
import { useWorkspace } from './store.jsx'
import {
  Confirm, dateLabel, Facts, Field, FormActions, Heading, includes, invalid, Modal,
  resourcePath, Search, Select, shown, SiteLink, Status, Table,
} from './ui.jsx'

const base = '/snapshots'
const dropletPath = id => resourcePath('/droplets', id)

export function Snapshots() {
  const { world, commit } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [dialog, setDialog] = useState(null)
  const selectedId = params.get('snapshot')
  const sources = new Map(world.droplets.map(droplet => [droplet.id, droplet]))
  const rows = world.snapshots.filter(row =>
    (!selectedId || row.id === selectedId) &&
    includes(search, row.name, row.sourceDropletName, sources.get(row.sourceDropletId)?.name) &&
    (!region || row.regions?.includes(region))
  )
  const filtered = search || region || selectedId
  const close = () => setDialog(null)

  function clear() {
    setSearch('')
    setRegion('')
    if (selectedId) {
      const next = new URLSearchParams(params)
      next.delete('snapshot')
      setParams(next)
    }
  }

  function remove(snapshot) {
    commit({
      entityType: 'snapshot', entityId: snapshot.id, kind: 'deleted', createdAt: new Date().toISOString(),
      details: { sourceDropletId: snapshot.sourceDropletId, before: snapshot },
      changes: { snapshots: world.snapshots.filter(row => row.id !== snapshot.id) },
      message: `${snapshot.name || snapshot.id} was deleted.`,
    })
    close()
    if (selectedId) clear()
  }

  return <>
    <Heading title="Snapshots" subtitle="Manage recovery images for your Droplets."
      action={<SiteLink to="/droplets" className="button">View Droplets</SiteLink>} />
    <div className="filters">
      <Search label="Search by snapshot or source name" value={search} onChange={event => setSearch(event.target.value)} />
      <Select aria-label="Filter by region" options={regions} placeholder="All regions" value={region} onChange={event => setRegion(event.target.value)} />
      {selectedId && <span className="status">Linked snapshot</span>}
      {filtered && <button type="button" onClick={clear}>Clear filters</button>}
    </div>
    <p className="results">{rows.length} of {world.snapshots.length} snapshots</p>
    <Table label="Snapshots" columns={['Name', 'Source Droplet', 'Size', 'Regions', 'Created', 'Actions']} rows={rows}
      empty={filtered ? 'No snapshots match these filters.' : 'Open a Droplet and take a snapshot to save a recovery image.'}
      renderRow={row => {
        const source = sources.get(row.sourceDropletId)
        const sourceName = source?.name || row.sourceDropletName || row.sourceDropletId
        return <>
          <td><strong>{row.name || row.id}</strong><div className="row-meta"><Status value={row.status} /></div></td>
          <td>{source ? <SiteLink to={dropletPath(source.id)}>{sourceName}</SiteLink> : shown(sourceName)}</td>
          <td>{row.sizeGb == null ? '—' : `${row.sizeGb} GB`}</td>
          <td>{row.regions?.map(regionLabel).join(', ') || '—'}</td>
          <td>{dateLabel(row.createdAt)}</td>
          <td><div className="row-actions">
            {row.status === 'available' && <>
              <SiteLink className="button" to={`/droplets/new?snapshot=${encodeURIComponent(row.id)}`}>Create Droplet</SiteLink>
              <button type="button" onClick={() => setDialog({ type: 'restore', row })}>Restore</button>
            </>}
            <button type="button" className="destructive-link" onClick={() => setDialog({ type: 'delete', row })}>Delete</button>
          </div></td>
        </>
      }} />
    {dialog?.type === 'delete' && <Confirm title="Delete Snapshot" name={dialog.row.name || dialog.row.id} close={close} onConfirm={() => remove(dialog.row)}>
      <p>This permanently deletes the recovery image <strong>{dialog.row.name || dialog.row.id}</strong>.</p>
    </Confirm>}
    {dialog?.type === 'restore' && <RestoreDialog snapshot={dialog.row} close={close} />}
  </>
}

function RestoreDialog({ snapshot, close }) {
  const { world, commit } = useWorkspace()
  const [targetId, setTargetId] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const targets = world.droplets.filter(row => canUseSnapshot(snapshot, row.region, row.diskGb))
  const target = targets.find(row => row.id === targetId)
  const snapshotName = snapshot.name || snapshot.id
  const targetName = target?.name || target?.id

  function restore(event) {
    event.preventDefault()
    if (!target) return
    if (confirmation !== targetName) return invalid(event.currentTarget, 'confirmation', 'Enter the Droplet name exactly as shown.')
    const createdAt = new Date().toISOString()
    const restored = { lastRestoredSnapshotId: snapshot.id, lastRestoredAt: createdAt, updatedAt: createdAt }
    const before = Object.fromEntries(Object.keys(restored).map(key => [key, target[key] ?? null]))
    commit({
      entityType: 'droplet', entityId: target.id, kind: 'restored', createdAt,
      details: { projectId: target.projectId, snapshotId: snapshot.id, sourceDropletId: snapshot.sourceDropletId, before, after: restored },
      changes: { droplets: world.droplets.map(row => row.id === target.id ? { ...row, ...restored } : row) },
      message: `${targetName} was restored from ${snapshotName}.`,
    })
    close()
  }

  return <Modal title="Restore Droplet" close={close} drawer>
    <form className="form" onSubmit={restore}>
      <p className="caution">Restoring <strong>{snapshotName}</strong> replaces the target Droplet’s disk. Files and changes made after the snapshot will be lost.</p>
      <Field label="Target Droplet" hint={`Requires at least ${shown(snapshot.minDiskGb)} GB of disk in a region where the snapshot is available.`}>
        <Select required placeholder={targets.length ? 'Choose a compatible Droplet' : 'No compatible Droplets'} value={targetId}
          options={targets.map(row => [row.id, `${row.name || row.id} · ${regionLabel(row.region)}`])}
          onChange={event => { setTargetId(event.target.value); setConfirmation('') }} />
      </Field>
      {target && <>
        <Facts entries={ [['Compute', planLabel(target)], ['Disk', `${target.diskGb} GB`], ['IPv4', target.ipv4]] } />
        <Field key={target.id} label={`Type ${targetName} to confirm`}><input name="confirmation" required value={confirmation} autoComplete="off" onChange={event => setConfirmation(event.target.value)} /></Field>
      </>}
      <FormActions close={close} label="Restore Droplet" danger disabled={!target} />
    </form>
  </Modal>
}
