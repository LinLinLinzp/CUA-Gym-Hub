import React, { useState } from 'react'
import { Filter, Heading, Pill, Table } from '../components.jsx'
import { Icon } from '../icons.jsx'
import { roles } from '../data/catalog.js'
import { active, atMonth, byId, cents, dateKey, dateLabel, money, recordPath, RouteLink, rows, useWorkspace } from '../workspace.jsx'

const productNames = { iam: 'IAM', vm: 'Compute Engine', bucket: 'Cloud Storage', object: 'Cloud Storage', budget: 'Billing', project: 'Billing' }
const events = {
  'iam.grant': 'Granted role', 'iam.revoke': 'Revoked role', 'vm.create': 'Created instance',
  'vm.start': 'Started instance', 'vm.stop': 'Stopped instance', 'vm.reset': 'Reset instance', 'vm.delete': 'Deleted instance',
  'bucket.create': 'Created bucket', 'bucket.update': 'Updated bucket', 'bucket.delete': 'Deleted bucket',
  'object.upload': 'Uploaded object', 'object.delete': 'Deleted object', 'budget.create': 'Created budget',
  'budget.update': 'Updated budget', 'budget.delete': 'Deleted budget', 'project.billing_change': 'Changed project billing',
}

function activityTarget(event, state, scope) {
  const product = event.kind?.split('.')[0]
  const name = event.changes?.name || event.changes?.principal || byId(state.projects, event.entityId)?.name || event.entityId
  if (product === 'vm') {
    const vm = byId(state.vmInstances, event.entityId)
    if (vm && active(vm)) return <RouteLink to={recordPath('/compute/instances', vm)} scope={scope}>{name}</RouteLink>
  }
  if (product === 'bucket' || product === 'object') {
    const bucket = byId(state.buckets, product === 'bucket' ? event.entityId : event.changes?.bucketId)
    const object = byId(state.storageObjects, event.entityId)
    if (bucket && active(bucket) && (product === 'bucket' || (object && active(object)))) {
      return <RouteLink to={recordPath('/storage/buckets', bucket)} scope={scope}>{name}</RouteLink>
    }
  }
  if (product === 'iam') {
    const binding = byId(state.iamBindings, event.entityId)
    const role = roles[event.changes?.roleId] || event.changes?.roleId
    return <>{binding && active(binding) ? <RouteLink to="/iam" scope={scope}>{name}</RouteLink> : name}{role && <small className="subtext">{role}</small>}</>
  }
  if (product === 'budget') {
    const budget = byId(state.budgets, event.entityId)
    if (budget && active(budget)) return <RouteLink to="/billing/budgets" scope={{ ...scope, account: budget.billingAccountId }}>{name}</RouteLink>
  }
  if (product === 'project' && byId(state.projects, event.entityId)) {
    return <RouteLink to="/billing" scope={{ ...scope, account: event.changes?.billingAccountId || event.changes?.previousBillingAccountId }}>{name}</RouteLink>
  }
  return name || '—'
}

export function Overview({ project }) {
  const { state } = useWorkspace()
  const [product, setProduct] = useState('')
  const scoped = list => project.record ? rows(list).filter(record => record.projectId === project.id) : []
  const members = new Set(scoped(state.iamBindings).filter(active).map(r => JSON.stringify([r.principalType, r.principal]))).size
  const instances = scoped(state.vmInstances).filter(active)
  const running = instances.filter(r => r.status === 'RUNNING').length
  const buckets = scoped(state.buckets).filter(active).length
  const today = dateKey()
  const usage = scoped(state.billingCosts).filter(r => atMonth(r.date) && r.date <= today)
  const currentAccount = byId(state.billingAccounts, project.record?.billingAccountId)
  const reportAccount = currentAccount || usage.map(r => byId(state.billingAccounts, r.billingAccountId)).find(Boolean)
  const totals = new Map()
  for (const cost of usage) {
    const currency = cost.currency || byId(state.billingAccounts, cost.billingAccountId)?.currency || 'USD'
    totals.set(currency, (totals.get(currency) || 0) + cents(cost.amount))
  }
  const billed = totals.size
    ? [...totals].map(([currency, total]) => <div key={currency}>{money(total / 100, currency)}</div>)
    : money(0, reportAccount?.currency)
  const summary = [
    ['iam', 'IAM principals', members, 'With project access', '/iam'],
    ['compute', 'VM instances', instances.length, running + ' running', '/compute/instances'],
    ['storage', 'Storage buckets', buckets, 'In this project', '/storage/buckets'],
    ['billing', 'Billed usage', billed, 'Month to date', '/billing/reports'],
  ]
  const bars = [['Running VMs', running], ['Buckets', buckets], ['IAM principals', members]]
  const max = Math.max(1, ...bars.map(([, value]) => value))
  const allActivity = scoped(state.activity).sort((a, b) => String(b.createdAt || '').localeCompare(a.createdAt || '') || String(b.id).localeCompare(a.id))
  const scope = { project: project.id }
  return <>
    <Heading title="Overview" description="Monitor access, infrastructure, storage, and costs for your project." />
    <section className="project-panel" aria-label="Project summary">
      <div><p>Current project</p><h2>{project.record?.name || project.record?.id || 'No project selected'}</h2>
        {project.record && <code>{project.id}</code>}</div>
      {project.record && <div className="project-graph">{bars.map(([name, value], i) => <div key={name} className={'project-bar bar-' + i}>
        <span>{value}</span><div className="bar-track"><i style={{ '--fill': (value / max * 100) + '%' }} /></div><small>{name}</small>
      </div>)}</div>}
    </section>
    <section className="summary-grid" aria-label="Project resources">{summary.map(([icon, name, value, hint, path]) => <RouteLink key={icon} className={'card summary ' + icon} to={path}
      scope={icon === 'billing' ? { ...scope, account: reportAccount?.id, reportProject: project.id, reportThrough: today } : scope}>
      <div className="summary-top"><span className="service-icon"><Icon name={icon} /></span><Icon name="arrow" size={17} /></div>
      <div className="summary-label">{name}</div><div className="metric">{value}</div><div className="muted">{hint}</div>
    </RouteLink>)}</section>
    <section aria-labelledby="recent-activity"><h2 id="recent-activity" className="section-title">Recent activity</h2>
      <Table label="Recent activity" filterKey={product} filtered={!!product && allActivity.length > 0} empty="No activity for this project."
        filters={<Filter label="Product" options={['IAM', 'Compute Engine', 'Cloud Storage', 'Billing']} value={product} onChange={setProduct} />}
        data={allActivity.filter(e => !product || productNames[e.kind?.split('.')[0]] === product)} pageSize={6}
        columns={[
          { key: 'kind', label: 'Event', cell: r => events[r.kind] || r.kind || '—' },
          { key: 'resource', label: 'Resource', cell: r => activityTarget(r, state, scope) },
          { key: 'product', label: 'Product', cell: r => <Pill>{productNames[r.kind?.split('.')[0]] || 'Other'}</Pill> },
          { key: 'createdAt', label: 'Date and time', cell: r => dateLabel(r.createdAt, true) },
        ]} />
    </section>
  </>
}
