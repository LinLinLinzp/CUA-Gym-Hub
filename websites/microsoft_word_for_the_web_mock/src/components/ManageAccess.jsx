import { useState } from 'react'
import { CheckCircle2, Link2, Trash2 } from 'lucide-react'
import { emailKey, permissionLabels, rows, scopeLabels, userOf } from '../data/access.js'
import { Avatar, Menu } from './ui.jsx'

function AccessRow({ icon, name, detail, menu, menuLabel, confirmation, onCancel, onConfirm }) {
  return <li className="access-row">
    <div className="access-row-main">
      {icon}
      <span className="access-identity"><strong>{name}</strong>{detail && <small>{detail}</small>}</span>
      {menu?.length > 0 && <Menu label={menuLabel} items={menu} />}
    </div>
    {confirmation && <div className="access-confirmation">
      <p>{confirmation}</p>
      <div className="composer-actions">
        <button type="button" className="button" onClick={onCancel}>Cancel</button>
        <button type="button" className="button danger" onClick={onConfirm}>Remove</button>
      </div>
    </div>}
  </li>
}

export function ManageAccess({ state, doc, role, onChange }) {
  const [removal, setRemoval] = useState(null)
  const [notice, setNotice] = useState('')
  const owner = userOf(state, doc.ownerId)
  const ownerEmail = emailKey(owner?.email)
  const grants = rows(state, 'shareGrants').filter((entry) => entry.documentId === doc.id && entry.status === 'active' &&
    entry.userId !== doc.ownerId && !(ownerEmail && emailKey(entry.email) === ownerEmail))
  const links = rows(state, 'shareLinks').filter((entry) => entry.documentId === doc.id && entry.status === 'active')
  function remove(collection, id, message) {
    setRemoval(null)
    onChange(collection, id)
    setNotice(message)
  }
  return <div className="manage-access">
    <section aria-labelledby="people-title">
      <h3 id="people-title">People</h3>
      <ul className="access-list">
        <AccessRow icon={<Avatar user={owner} small />} name={owner?.name || 'Unknown owner'} detail="Owner" />
        {grants.map((grant) => {
          const user = userOf(state, grant.userId)
          const name = user?.name || grant.email || 'Unknown recipient'
          const permission = permissionLabels[grant.permission] ?? 'Access granted'
          const removing = removal?.id === grant.id && removal.collection === 'shareGrants'
          const menu = role !== 'owner' ? [] : [
            ...Object.entries(permissionLabels).map(([value, label]) => ({ label, checked: grant.permission === value, action: () => {
              onChange('shareGrants', grant.id, value)
              setNotice(`Access updated for ${name}.`)
            } })),
            { label: 'Remove access', icon: <Trash2 size={15} />, danger: true, action: () => setRemoval({ id: grant.id, collection: 'shareGrants' }) },
          ]
          return <AccessRow key={grant.id} icon={<Avatar user={user || { name }} small />} name={name}
            detail={[user?.name && grant.email, permission].filter(Boolean).join(' · ')} menu={menu} menuLabel={`Access options for ${name}`}
            confirmation={removing ? `Remove ${name}’s direct access to this document?` : null}
            onCancel={() => setRemoval(null)} onConfirm={() => remove('shareGrants', grant.id, `Access removed for ${name}.`)} />
        })}
      </ul>
    </section>
    <section aria-labelledby="links-title">
      <h3 id="links-title">Links</h3>
      {links.length ? <ul className="access-list">
        {links.map((link) => {
          const name = scopeLabels[link.scope] || 'Sharing link'
          const removing = removal?.id === link.id && removal.collection === 'shareLinks'
          return <AccessRow key={link.id} icon={<span className="link-avatar"><Link2 size={15} /></span>} name={name}
            detail={[link.scope === 'existingAccess' ? 'Uses existing permission' : permissionLabels[link.permission],
              ...(link.scope === 'specificPeople' ? link.recipientEmails ?? [] : [])].filter(Boolean).join(' · ')}
            menu={role === 'owner' ? [{ label: 'Remove link', danger: true, icon: <Trash2 size={15} />,
              action: () => setRemoval({ id: link.id, collection: 'shareLinks' }) }] : []}
            menuLabel={`Link options for ${name}`}
            confirmation={removing ? 'Remove this link? People who use it will see that it’s unavailable.' : null}
            onCancel={() => setRemoval(null)} onConfirm={() => remove('shareLinks', link.id, 'Sharing link removed.')} />
        })}
      </ul> : <p className="muted">No active sharing links</p>}
    </section>
    {notice && <p className="share-confirmation" role="status"><CheckCircle2 size={17} />{notice}</p>}
  </div>
}
