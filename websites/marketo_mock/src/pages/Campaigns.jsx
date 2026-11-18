import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../store.jsx'
import { usePaths } from '../navigation.jsx'
import { Button, Confirm, Definition, DetailHeader, Field, Modal, PagedTable, Pill, Table, displayDate } from '../ui.jsx'
import { campaignLocked, campaignMode, campaignReady, findRecord, flowTypes, log, metadata, qualifiedPeople, records, replace, runCampaign,
  validAudience, validFlow, validTriggers } from '../data/model.js'
import { AudienceEditor } from '../components/AudienceEditor.jsx'
import { FlowEditor } from '../components/FlowEditor.jsx'
import { Activity } from '../components/Activity.jsx'
import { Missing } from '../App.jsx'

const tabs = [['smart-list', 'Smart List'], ['flow', 'Flow'], ['schedule', 'Schedule'], ['results', 'Results']]

export function CampaignPage() {
  const { id } = useParams()
  const { state } = useWorkspace()
  const campaign = findRecord(state.smartCampaigns, id)
  return campaign ? <CampaignDetail key={id} campaign={campaign} /> : <Missing section="campaigns" title="Smart campaign" />
}

function CampaignDetail({ campaign }) {
  const { state, commit } = useWorkspace()
  const { params, path } = usePaths()
  const tab = tabs.some(([key]) => key === params.get('tab')) ? params.get('tab') : tabs[0][0]
  const base = '/campaigns/' + encodeURIComponent(campaign.id)
  const programId = params.get('programId')
  const program = findRecord(state.programs, campaign.programId)
  const isLocked = campaignLocked(campaign)
  const runs = records(state.campaignRuns).filter(run => run.campaignId === campaign.id)

  function saveConfiguration(part, getFields, success) {
    return commit(previous => {
      const current = findRecord(previous.smartCampaigns, campaign.id)
      if (!current || campaignLocked(current)) return previous
      const fields = getFields(previous, current)
      if (!fields) return previous
      const meta = metadata(previous)
      const updated = { ...current, ...fields, ...meta.updated }
      return log({ ...previous, smartCampaigns: replace(previous.smartCampaigns, updated) },
        meta, 'campaign_' + part + '_saved', 'smartCampaign', campaign.id)
    }, success)
  }

  function saveAudience({ matchMode, triggers, rules }) {
    return saveConfiguration('smart_list', (previous, current) => {
      if (!validAudience(previous, { matchMode, rules }) || !validTriggers(previous, triggers)) return null
      const mode = triggers.length ? 'trigger' : 'batch'
      return { matchMode, triggers, rules, mode, status: mode !== campaignMode(current) ? 'draft' : current.status ?? 'draft' }
    }, 'Campaign Smart List saved.')
  }

  function saveFlow(flow) {
    return saveConfiguration('flow', (previous, current) => !flow.length || validFlow(previous, current, flow) ? { flow } : null, 'Campaign flow saved.')
  }

  return <>
    <DetailHeader back={path('/campaigns', { programId })} section="Smart Campaigns" title={campaign.name || 'Untitled smart campaign'}
      meta={<><Pill value={campaign.status} /><Pill value={campaignMode(campaign)} /><span>{program?.name || 'Unavailable program'}</span></>}
      tabs={tabs} tab={tab} tabPath={value => path(base, { tab: value, programId })} />
    {campaign.description && <p className="detail-description preserve-lines">{campaign.description}</p>}
    {tab === 'smart-list' && <AudienceEditor config={campaign} campaign locked={isLocked} onSave={saveAudience} />}
    {tab === 'flow' && <FlowEditor campaign={campaign} locked={isLocked} onSave={saveFlow} />}
    {tab === 'schedule' && <Schedule campaign={campaign} runs={runs} onResults={() => path(base, { tab: 'results', programId })} />}
    {tab === 'results' && <Results runs={runs} campaign={campaign} />}
  </>
}

function Schedule({ campaign, runs, onResults }) {
  const { state, commit } = useWorkspace()
  const { navigate } = usePaths()
  const [dialog, setDialog] = useState(null)
  const [timing, setTiming] = useState('now')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const pending = runs.find(run => run.status === 'scheduled')
  const mode = campaignMode(campaign)
  const trigger = mode === 'trigger'
  const active = campaign.status === 'active'
  const ready = campaignReady(state, campaign)
  const qualified = qualifiedPeople(state, campaign).length

  function batchSubmit(event) {
    event.preventDefault()
    const schedule = timing === 'later'
    const selected = new Date(date)
    if (schedule && !(selected.getTime() > new Date().getTime())) {
      setError('Choose a date and time in the future.')
      return
    }
    const saved = commit(previous => {
      const current = findRecord(previous.smartCampaigns, campaign.id)
      if (!current || records(previous.campaignRuns).some(run => run.campaignId === current.id && run.status === 'scheduled')) return previous
      return runCampaign(previous, current, schedule ? selected.toISOString() : null)
    }, schedule ? 'Batch run scheduled.' : 'Batch run completed.')
    if (!saved) {
      setError('Check the saved campaign configuration and try again.')
      return
    }
    setDialog(null)
    if (!schedule) navigate(onResults())
  }

  function cancelRun() {
    commit(previous => {
      const run = findRecord(previous.campaignRuns, pending?.id)
      const current = findRecord(previous.smartCampaigns, campaign.id)
      if (!current || run?.status !== 'scheduled') return previous
      const meta = metadata(previous)
      const canceled = { ...run, status: 'canceled', canceledAt: meta.now, ...meta.updated }
      const hasCompleted = records(previous.campaignRuns).some(item => item.campaignId === current.id && item.status === 'completed')
      const updated = { ...current, status: hasCompleted ? 'completed' : 'draft', ...meta.updated }
      return log({
        ...previous, campaignRuns: replace(previous.campaignRuns, canceled), smartCampaigns: replace(previous.smartCampaigns, updated),
      }, meta, 'campaign_run_canceled', 'smartCampaign', current.id, [], run.id)
    }, 'Scheduled run canceled.')
    setDialog(null)
  }

  function toggleActivation() {
    commit(previous => {
      const current = findRecord(previous.smartCampaigns, campaign.id)
      if (!current || campaignMode(current) !== 'trigger' || (current.status === 'active') !== active) return previous
      if (!active && !campaignReady(previous, current)) return previous
      const meta = metadata(previous)
      const updated = active ? { ...current, status: 'inactive', deactivatedAt: meta.now, ...meta.updated }
        : { ...current, status: 'active', activatedAt: meta.now, ...meta.updated }
      return log({ ...previous, smartCampaigns: replace(previous.smartCampaigns, updated) }, meta,
        active ? 'campaign_deactivated' : 'campaign_activated', 'smartCampaign', current.id)
    }, active ? 'Campaign deactivated.' : 'Campaign activated.')
    setDialog(null)
  }

  return <div className="detail-grid">
    <section className="card content-card schedule-card">
      <div className="section-heading"><div><h2>Schedule</h2><p>{trigger ? 'Manage activation for this trigger campaign.' : 'Run the saved audience through the configured flow.'}</p></div>
        <Pill value={campaign.status} /></div>
      <Definition entries={[
        ['Qualified people', String(qualified)], ['Mode', <Pill value={mode} />],
        ...(pending ? [['Scheduled for', displayDate(pending.scheduledAt, true)]] : []),
        ...(trigger && campaign.activatedAt ? [['Last activated', displayDate(campaign.activatedAt, true)]] : []),
        ...(trigger && campaign.deactivatedAt ? [['Last deactivated', displayDate(campaign.deactivatedAt, true)]] : []),
      ]} />
      {!ready && <p className="callout">Save a valid Smart List and at least one complete Flow step before {trigger ? 'activating' : 'running'} this campaign.</p>}
      <div className="editor-actions">
        {trigger ? <Button variant={active ? 'secondary' : 'primary'} disabled={!active && !ready} onClick={() => setDialog('activation')}>
          {active ? 'Deactivate' : 'Activate'}
        </Button> : pending ? <Button onClick={() => setDialog('cancel')}>Cancel run</Button>
          : <Button variant="primary" disabled={!ready || campaignLocked(campaign)} onClick={() => {
            setTiming('now'); setDate(''); setError(''); setDialog('run')
          }}>Run once</Button>}
      </div>
    </section>
    <Activity entityType="smartCampaign" entityId={campaign.id} />
    {dialog === 'run' && <Modal title="Run campaign once" onClose={() => setDialog(null)}>
      <form onSubmit={batchSubmit} noValidate>
        <div className="form-body">
          <p>{qualified} {qualified === 1 ? 'person qualifies' : 'people qualify'} based on the saved Smart List.</p>
          <label className="radio-option"><input type="radio" name="timing" value="now" checked={timing === 'now'} onChange={() => setTiming('now')} /> Run now</label>
          <label className="radio-option"><input type="radio" name="timing" value="later" checked={timing === 'later'} onChange={() => setTiming('later')} /> Schedule for later</label>
          {timing === 'later' ? <Field label="Date and time (local)" error={error}><input type="datetime-local" value={date}
            onChange={event => { setDate(event.target.value); setError('') }} /></Field> : error && <p className="field-error" role="alert">{error}</p>}
        </div>
        <div className="dialog-actions"><Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button type="submit" variant="primary">{timing === 'now' ? 'Run now' : 'Schedule run'}</Button></div>
      </form>
    </Modal>}
    {dialog === 'cancel' && <Confirm title="Cancel scheduled run" message={'Cancel the run scheduled for ' + displayDate(pending?.scheduledAt, true) + '?'}
      label="Cancel run" destructive onClose={() => setDialog(null)} onConfirm={cancelRun} />}
    {dialog === 'activation' && <Confirm title={active ? 'Deactivate campaign' : 'Activate campaign'}
      message={active ? 'Deactivate this smart campaign?' : 'Activate this campaign with its saved triggers and flow?'}
      label={active ? 'Deactivate' : 'Activate'} onClose={() => setDialog(null)} onConfirm={toggleActivation} />}
  </div>
}

function Results({ campaign, runs }) {
  const { state } = useWorkspace()
  const [selected, setSelected] = useState(null)
  const run = findRecord(runs, selected)
  const columns = [
    { key: 'status', label: 'Status', sort: true, cell: row => <Pill value={row.status} /> },
    { key: 'createdAt', label: 'Recorded', sort: true, cell: row => displayDate(row.createdAt, true) },
    { key: 'scheduledAt', label: 'Scheduled for', sort: true, cell: row => displayDate(row.scheduledAt, true) },
    { key: 'completedAt', label: 'Completed', sort: true, cell: row => displayDate(row.completedAt, true) },
    { key: 'processedCount', label: 'People processed', sort: true, className: 'numeric', cell: row => row.processedCount ?? 0 },
    { key: 'steps', label: 'Outcomes', cell: row => row.status === 'completed'
      ? <Button className="text-button" aria-expanded={selected === row.id} onClick={() => setSelected(selected === row.id ? null : row.id)}>View step outcomes</Button> : '—' },
  ]
  const outcomes = records(run?.stepResults).map((step, index) => ({ ...step, id: step.stepId ?? String(index), order: index + 1 }))
  const outcomeColumns = [
    { key: 'order', label: 'Step' },
    { key: 'type', label: 'Action', cell: row => flowTypes[row.type] || '—' },
    { key: 'targetId', label: 'Target', cell: row =>
      findRecord(row.type === 'changeProgramStatus' ? state.programs : state.lists, row.targetId)?.name || '—' },
    { key: 'changedCount', label: 'People changed', className: 'numeric', cell: row => row.changedCount ?? 0 },
  ]

  return <>
    <div className="section-heading"><div><h2>Campaign results</h2><p>Review recorded runs and their flow outcomes.</p></div></div>
    <PagedTable columns={columns} rows={runs} defaultSort={{ key: 'createdAt', direction: -1 }} empty="No campaign runs recorded." />
    {run && <section className="card results-card"><div className="content-card"><h2>Step outcomes</h2></div>
      <Table columns={outcomeColumns} rows={outcomes} empty="No step outcomes recorded." /></section>}
    <Activity entityType="smartCampaign" entityId={campaign.id} />
  </>
}

