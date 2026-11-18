import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Actions, Badge, Confirm, Feedback, Field, Inventory, Modal, Select, displayDate, searchText } from './components.jsx'
import { Missing, PageHeading, ProjectLink, liveClusters, useProjectLink, useWorkspace } from './workspace.jsx'

const providers = [
  ['AWS', 'Amazon Web Services (AWS)'], ['GCP', 'Google Cloud (GCP)'], ['AZURE', 'Microsoft Azure'],
]
const regions = {
  AWS: [['US_EAST_1', 'Virginia (us-east-1)'], ['US_WEST_2', 'Oregon (us-west-2)'], ['EU_WEST_1', 'Ireland (eu-west-1)']],
  GCP: [['CENTRAL_US', 'Iowa (us-central1)'], ['EASTERN_US', 'South Carolina (us-east1)'], ['WESTERN_EUROPE', 'Belgium (europe-west1)']],
  AZURE: [['US_EAST_2', 'Virginia (eastus2)'], ['US_WEST_2', 'Washington (westus2)'], ['EUROPE_WEST', 'Netherlands (westeurope)']],
}
const plans = [['free', 'Free'], ['flex', 'Flex'], ['dedicated', 'Dedicated']]
const dedicatedTiers = ['M10', 'M20', 'M30', 'M40', 'M50', 'M60', 'M80']
const isDedicated = tier => /^M[1-9]\d+$/.test(tier ?? '')
const planFor = tier => isDedicated(tier) ? 'dedicated' : tier === 'FLEX' ? 'flex' : 'free'
const planLabel = tier => plans.find(([id]) => id === planFor(tier))[1]
const regionName = (provider, region) => regions[provider]?.find(([id]) => id === region)?.[1] || region || '—'
const tierLabel = tier => tier ? (tier === 'FLEX' ? 'Flex' : tier + ' · ' + planLabel(tier)) : '—'
const yesNo = value => value === undefined || value === null ? '—' : value ? 'Enabled' : 'Disabled'

function clusterSettings(record) {
  return {
    name: record?.name ?? '',
    provider: record?.provider ?? 'AWS',
    region: record?.region ?? 'US_EAST_1',
    tier: record?.tier ?? 'M0',
    diskSizeGB: record?.diskSizeGB ?? 20,
    backupEnabled: record?.backupEnabled ?? false,
    terminationProtection: record?.terminationProtection ?? false,
  }
}

function ClusterForm({ original, records, onClose, onSave }) {
  const [fields, setFields] = useState(() => clusterSettings(original))
  const [review, setReview] = useState(false)
  const [errors, setErrors] = useState({})
  const plan = planFor(fields.tier)
  const dedicated = plan === 'dedicated'
  const editing = Boolean(original)
  const name = fields.name.trim()

  function change(field, value) {
    setFields(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  function submit() {
    if (review) {
      const sizing = {
        tier: fields.tier,
        diskSizeGB: dedicated ? Number(fields.diskSizeGB) : null,
        backupEnabled: dedicated && fields.backupEnabled,
        terminationProtection: fields.terminationProtection,
      }
      if (!editing) return onSave({ name, provider: fields.provider, region: fields.region, mongoVersion: '8.0', ...sizing, status: 'active' })
      const before = clusterSettings(original)
      return onSave(Object.fromEntries(Object.entries(sizing).filter(([field, value]) =>
        (dedicated || field === 'terminationProtection') && value !== before[field])))
    }
    const next = {}
    if (!editing && !/^[a-z][a-z0-9-]{0,62}$/i.test(name)) next.name = 'Use 1–63 letters, numbers or hyphens, starting with a letter.'
    else if (!editing && records.some(row => row.name?.toLowerCase() === name.toLowerCase())) next.name = 'A cluster with this name already exists in this project.'
    if (dedicated && (!Number.isInteger(Number(fields.diskSizeGB)) || Number(fields.diskSizeGB) < 10 || Number(fields.diskSizeGB) > 4096)) next.diskSizeGB = 'Enter a whole number between 10 and 4096 GB.'
    setErrors(next)
    if (!Object.keys(next).length) setReview(true)
  }

  const tierOptions = dedicated ? [...new Set([fields.tier, ...dedicatedTiers])].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).map(tier => [tier, tier]) : [[fields.tier, tierLabel(fields.tier)]]
  return <Modal sheet title={review ? (editing ? 'Review configuration' : 'Review cluster') : (editing ? 'Edit configuration' : 'Create cluster')}
    onClose={onClose} onSubmit={submit} submitLabel={review ? (editing ? 'Apply changes' : 'Deploy cluster') : 'Review'}
    footer={review && <button type="button" className="button" onClick={() => setReview(false)}>Back to edit</button>}>
    {review ? <dl className="details">
      {[
        ['Cluster name', name], ['Plan', planLabel(fields.tier)], ['Tier', tierLabel(fields.tier)],
        ['Provider', fields.provider], ['Region', regionName(fields.provider, fields.region)],
        ['Disk size', dedicated ? fields.diskSizeGB + ' GB' : 'Managed'],
        ['Backup', yesNo(dedicated && fields.backupEnabled)], ['Termination protection', yesNo(fields.terminationProtection)],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl> : <>
      {!editing && <>
        <Field label="Cluster name" error={errors.name}>{props => <input {...props} autoFocus value={fields.name} onChange={event => change('name', event.target.value)} />}</Field>
        <Field label="Deployment type">{props => <Select {...props} options={plans} value={plan} onChange={event => change('tier', { free: 'M0', flex: 'FLEX', dedicated: 'M10' }[event.target.value])} />}</Field>
        <div className="form-grid">
          <Field label="Cloud provider">{props => <Select {...props} options={providers} value={fields.provider} onChange={event => {
            const provider = event.target.value
            setFields({ ...fields, provider, region: regions[provider][0][0] })
          }} />}</Field>
          <Field label="Region">{props => <Select {...props} options={regions[fields.provider]} value={fields.region} onChange={event => change('region', event.target.value)} />}</Field>
        </div>
      </>}
      {(!editing || dedicated) && <Field label="Tier">{props => <Select {...props} options={tierOptions} value={fields.tier} onChange={event => change('tier', event.target.value)} />}</Field>}
      {dedicated && <>
        <Field label="Disk size (GB)" error={errors.diskSizeGB}>{props => <input {...props} type="number" value={fields.diskSizeGB} onChange={event => change('diskSizeGB', event.target.value)} />}</Field>
        <label className="checkbox"><input type="checkbox" checked={fields.backupEnabled} onChange={event => change('backupEnabled', event.target.checked)} />Enable backups</label>
      </>}
      <label className="checkbox"><input type="checkbox" checked={fields.terminationProtection} onChange={event => change('terminationProtection', event.target.checked)} />Enable termination protection</label>
    </>}
  </Modal>
}

export function Clusters() {
  const { state, project, mutate } = useWorkspace()
  const location = useLocation()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(Boolean(location.state?.create))
  const [message, setMessage] = useState(location.state?.notice || '')
  const records = liveClusters(state, project.id)
  useEffect(() => {
    if (location.state?.create || location.state?.notice) navigate(location.pathname + location.search, { replace: true, state: null })
  }, [location, navigate])

  return <Inventory title="Clusters" description="Deploy and manage database clusters in this project."
    addLabel="Create cluster" onAdd={() => setCreating(true)} records={records}
    columns={['Cluster name', 'Tier', 'Provider / region', 'Version', 'Status']}
    searchLabel="Search clusters" search={row => searchText(row.name)} name={row => row.name || row.id}
    filters={[
      { label: 'Tier', placeholder: 'All tiers', options: [['M0', 'M0 · Free'], ['FLEX', 'Flex'], ['dedicated', 'Dedicated'], ...dedicatedTiers.map(tier => [tier, tier])], match: (row, value) => value === 'dedicated' ? isDedicated(row.tier) : row.tier === value },
      { label: 'Status', placeholder: 'All statuses', options: [['active', 'Active'], ['paused', 'Paused']], match: (row, value) => row.status === value },
    ]}
    render={row => <>
      <td><ProjectLink to={'/clusters/' + encodeURIComponent(row.id)}>{row.name || row.id}</ProjectLink></td>
      <td>{tierLabel(row.tier)}</td><td>{row.provider || '—'}<small className="muted">{regionName(row.provider, row.region)}</small></td>
      <td>{row.mongoVersion || '—'}</td><td><Badge status={row.status} /></td>
    </>}>
    {creating && <ClusterForm records={records} onClose={() => setCreating(false)} onSave={fields => {
      mutate(project.id, 'clusters', null, 'cluster.created', fields)
      setCreating(false)
      setMessage('Cluster deployed.')
    }} />}
    <Feedback message={message} />
  </Inventory>
}

export function ClusterDetail() {
  const { state, project, mutate } = useWorkspace()
  const { clusterId } = useParams()
  const to = useProjectLink()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState('')
  const [message, setMessage] = useState('')
  const cluster = liveClusters(state, project.id).find(row => row.id === clusterId)
  if (!cluster) return <Missing title="Cluster unavailable"><p>This cluster is outside the current project or has been terminated.</p><ProjectLink to="/clusters">Back to Clusters</ProjectLink></Missing>
  const name = cluster.name || cluster.id
  const paused = cluster.status === 'paused'
  const canPause = isDedicated(cluster.tier) && ['active', 'paused'].includes(cluster.status)
  const close = () => setDialog('')

  function update(action, fields, notice) {
    if (mutate(project.id, 'clusters', cluster.id, 'cluster.' + action, fields)) setMessage(notice)
    close()
  }

  return <>
    <div className="breadcrumb"><ProjectLink to="/clusters">← Back to Clusters</ProjectLink></div>
    <PageHeading title={name}>
      <div className="detail-actions">
        <button className="button primary" disabled={paused} onClick={() => setDialog('edit')}>Edit configuration</button>
        <Actions name={name} options={[
          { label: paused ? 'Resume cluster' : 'Pause cluster', disabled: !canPause, run: () => setDialog(paused ? 'resume' : 'pause') },
          { label: 'Terminate cluster', disabled: cluster.terminationProtection, danger: true, run: () => setDialog('terminate') },
        ]} />
      </div>
    </PageHeading>
    <section className="detail-panel">
      <h2>Deployment details</h2>
      <dl className="details">
        {[
          ['Status', <Badge status={cluster.status} />], ['Tier', tierLabel(cluster.tier)], ['Cloud provider', cluster.provider || '—'],
          ['Region', regionName(cluster.provider, cluster.region)], ['MongoDB version', cluster.mongoVersion || '—'],
          ['Disk size', cluster.diskSizeGB != null ? cluster.diskSizeGB + ' GB' : 'Managed'],
          ['Backup', yesNo(cluster.backupEnabled)], ['Termination protection', yesNo(cluster.terminationProtection)],
          ['Created', displayDate(cluster.createdAt)], ['Updated', displayDate(cluster.updatedAt)],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>
    {dialog === 'edit' && <ClusterForm original={cluster} onClose={close} onSave={fields => update('updated', fields, 'Cluster configuration saved.')} />}
    {dialog === 'pause' && <Confirm title="Pause cluster" label="Pause cluster" text={'Pause ' + name + '? You can resume it from this page.'} onClose={close}
      onConfirm={() => update('paused', { status: 'paused' }, 'Cluster paused.')} />}
    {dialog === 'resume' && <Confirm title="Resume cluster" label="Resume cluster" text={'Resume ' + name + '?'} onClose={close}
      onConfirm={() => update('resumed', { status: 'active' }, 'Cluster resumed.')} />}
    {dialog === 'terminate' && <Confirm title="Terminate cluster" label="Terminate cluster" text={'Enter ' + name + ' to confirm termination.'} exact={name} dangerous onClose={close}
      onConfirm={() => {
        if (cluster.terminationProtection) return close()
        update('terminated', now => ({ status: 'terminated', terminatedAt: now }), 'Cluster terminated.')
        navigate(to('/clusters'), { state: { notice: 'Cluster terminated.' } })
      }} />}
    <Feedback message={message} />
  </>
}
