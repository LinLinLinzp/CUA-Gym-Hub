import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { accessibleLink, accountId, active, getFile, parentOf, pathLabel, routeFor, sameName } from '../model'
import { Empty, FileMark, PageHeading, userName } from '../ui'
import { ShareDialog } from '../shareDialog'
import { useStore } from '../store'
import { withSid } from '../utils/dataManager'

export function SharedPage() {
  const { state } = useStore()
  const [tab, setTab] = useState('incoming')
  const [sharing, setSharing] = useState(null)
  const userId = accountId(state)
  const email = state.users.find(user => user.id === userId)?.email
  const outgoing = new Set()
  const incoming = new Set()
  for (const member of state.shareMembers) {
    if (member.status !== 'active') continue
    outgoing.add(member.fileId)
    if (member.userId === userId || (email && sameName(email, member.email))) incoming.add(member.fileId)
  }
  for (const link of state.shareLinks) {
    if (link.status !== 'active') continue
    outgoing.add(link.fileId)
    const item = getFile(state, link.fileId)
    if (active(item) && accessibleLink(state, item, link)) incoming.add(link.fileId)
  }
  const files = state.files.filter(item => active(item) && (tab === 'incoming'
    ? item.ownerId !== userId && incoming.has(item.id)
    : item.ownerId === userId && outgoing.has(item.id)))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return <section>
    <PageHeading title="Shared" subtitle="Find items shared with you and review the access you’ve granted." />
    <div className="segmented" aria-label="Share direction">
      <button type="button" aria-pressed={tab === 'incoming'} onClick={() => setTab('incoming')}>Shared with you</button>
      <button type="button" aria-pressed={tab === 'outgoing'} onClick={() => setTab('outgoing')}>Shared by you</button>
    </div>
    {files.length ? <div className="table-card"><table><thead><tr><th>Name</th><th className="file-meta">Location</th><th>Owner</th><th aria-label="Actions" /></tr></thead>
      <tbody>{files.map(item => <tr key={item.id}>
        <td><Link className="item-name" to={withSid(routeFor(item))}><FileMark item={item} />{item.name || 'Untitled item'}</Link></td>
        <td className="file-meta">{pathLabel(state, parentOf(item))}</td><td>{userName(state, item.ownerId)}</td>
        <td><button className="button compact" aria-label={'Share ' + item.name} onClick={() => setSharing(item.id)}><Share2 size={15} />Share</button></td>
      </tr>)}</tbody></table></div> : <Empty title={tab === 'incoming' ? 'Nothing shared with you yet' : 'You haven’t shared any items'} text="Shared files and folders appear here." />}
    {sharing && <ShareDialog fileId={sharing} onClose={() => setSharing(null)} />}
  </section>
}
