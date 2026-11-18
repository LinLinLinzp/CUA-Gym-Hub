import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { AppLink } from '../components/Navigation.jsx'
import { PageHeader } from '../components/Controls.jsx'
import { find, records } from '../utils/model.js'
import { homePath, listPath, resolveRoute } from '../utils/routes.js'

const queueTitles = {
  approveSales: 'Approve Sales Orders', fulfill: 'Fulfill Orders', billSales: 'Bill Sales Orders',
  approvePurchase: 'Approve Purchase Orders', receive: 'Receive Orders', billPurchase: 'Bill Purchase Orders',
  orderItems: 'Order Items', payBills: 'Pay Bills', search: 'Transaction Search',
}

export function Unavailable({ config, code }) {
  return <><PageHeader title={config ? `${config.title} unavailable` : 'Page unavailable'} />
    <AppLink to={config ? listPath(code) : homePath}>{config ? `Return to ${config.plural}` : 'Return to Home'}</AppLink></>
}

export default function RouteFrame({ pages }) {
  const location = useLocation()
  const { state } = useWorkspace()
  const route = resolveRoute(location.pathname, location.search)
  const query = new URLSearchParams(location.search)
  const config = records[route.code]
  const id = query.get('id')
  const record = config && find(state, config.key, id)
  const editing = query.get('e') === 'T' || query.get('e') === 'true'
  const sourceId = query.get('source') || query.get('createdFrom') || query.get('transform')
  const title = {
    home: 'Home', stock: 'Current Inventory Status', missing: 'Page unavailable',
    record: config?.title, list: config?.plural, queue: queueTitles[route.queue],
    workspace: { preferences: 'Set Preferences', tasks: 'Tasks', notes: 'User Notes', shortcuts: 'Manage Shortcuts' }[route.section],
  }[route.page]
  useEffect(() => {
    document.title = `${title} - NetSuite (${state.company?.name || 'Cascade Industrial Supply'})`
  }, [title, state.company?.name])
  if (route.page === 'missing' || (route.page === 'record' && id && !record)) return <Unavailable config={config} code={route.code} />
  const Page = pages[route.page]
  if (!Page) return <PageHeader title={title} />
  const key = new URLSearchParams(query)
  key.delete('sid')
  return <Page key={`${location.pathname}?${key}`} {...route} title={title} config={config} record={record} editing={editing} sourceId={sourceId} query={query} />
}
