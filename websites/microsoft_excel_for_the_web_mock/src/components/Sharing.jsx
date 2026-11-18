import React, {useEffect, useRef, useState} from 'react'
import {Check, Link2, Settings, Users, X} from 'lucide-react'
import {findRecord, records, useStore} from '../store.jsx'
import {cleanEmail, invite, makeLink, scopeLabels, shareUrl, updateAccess, validEmail} from '../utils/sharing.js'
import {Actions, Avatar, Modal} from './ui.jsx'

function Permission({value,change,label='Permission'}) {
  return <select value={value} aria-label={label} onChange={event=>change(event.target.value)}>
    <option value="edit">Can edit</option><option value="view">Can view</option>
  </select>
}
function Recipients({people,recipients,setRecipients,ownerEmail,label='Add a name, group, or email',error,setError,query,setQuery}) {
  const needle=query.trim().toLowerCase()
  const matches=needle?people.filter(person=>person.email && person.email.toLowerCase()!==ownerEmail && !recipients.includes(person.email.toLowerCase())&&
    [person.displayName,person.email].some(text=>text?.toLowerCase().includes(needle))).slice(0,6):[]
  const add=email=>{
    if (!validEmail(email)) {setError('Enter a valid email address or choose a person.');return false}
    email=cleanEmail(email)
    if (email===ownerEmail) {setError('The owner already has access.');return false}
    if (!recipients.includes(email)) setRecipients([...recipients,email])
    setQuery('')
    setError('')
    return true
  }
  return <div className="recipient-control">
    <div className="recipient-chips">{recipients.map(email=>{
      const person=people.find(person=>person.email?.toLowerCase()===email)
      return <span className="recipient-chip" key={email}>{person?.displayName || email}<button type="button" aria-label={`Remove ${person?.displayName || email}`} onClick={()=>setRecipients(recipients.filter(value=>value!==email))}><X size={13}/></button></span>
    })}</div>
    <input type="text" placeholder={label} aria-label={label} data-initial-focus value={query} onChange={event=>{setQuery(event.target.value);setError('')}} onKeyDown={event=>{
      if (event.key==='Enter' && needle) {event.preventDefault();add(matches[0]?.email || needle)}
    }}/>
    {needle && <div className="people-suggestions" aria-label="Matching people">
      {matches.map(person=><button type="button" key={person.id} onClick={()=>add(person.email)}><Avatar person={person}/><span>{person.displayName}<small>{person.email}</small></span></button>)}
      {validEmail(needle)&&!matches.some(person=>person.email.toLowerCase()===needle)&&<button type="button" onClick={()=>add(needle)}>Add {needle}</button>}
    </div>}
    {error&&<p className="error" role="alert">{error}</p>}
  </div>
}
function LinkSettings({settings,people,close,onApply}) {
  const [scope,setScope]=useState(settings.scope)
  const [permission,setPermission]=useState(settings.permission)
  const [recipients,setRecipients]=useState(settings.recipients)
  const [query,setQuery]=useState('')
  const [error,setError]=useState('')
  function apply(event) {
    event.preventDefault()
    const pending=scope==='specificPeople' && validEmail(query) ? [cleanEmail(query)] : []
    const emails=[...new Set([...recipients,...pending])]
    if (scope==='specificPeople'&&!emails.length) {setError('Add at least one recipient.');return}
    onApply({scope,permission,recipients:emails})
  }
  return <Modal title="Link settings" close={close} className="link-settings-dialog">
    <form onSubmit={apply}>
      <fieldset className="link-scopes"><legend>Who can use this link?</legend>
        {Object.entries(scopeLabels).map(([value,label])=><label className="inline" key={value}><input type="radio" name="scope" checked={scope===value} onChange={()=>setScope(value)}/>{label}</label>)}
      </fieldset>
      {scope==='specificPeople'&&<Recipients {...{people,recipients,setRecipients,error,setError,query,setQuery}} label="Add people for this link"/>}
      <label>Permission<Permission value={permission} change={setPermission}/></label>
      <Actions close={close} label="Apply"/>
    </form>
  </Modal>
}
export function ManageAccess({workbook,close,docked=false}) {
  const {world,dispatch}=useStore()
  const [tab,setTab]=useState('People')
  const [confirm,setConfirm]=useState(null)
  const heading=useRef(null)
  useEffect(()=>{
    if (!docked) return
    const previous = document.activeElement
    heading.current?.focus()
    return () => {if (previous?.isConnected) previous.focus({preventScroll:true})}
  },[docked])
  const owner=findRecord(world,'users',workbook.ownerId)
  const key=tab==='People'?'shares':'shareLinks'
  const entries=records(world,key).filter(item=>item.workbookId===workbook.id&&item.status==='active')
  const update=(id,permission)=>{
    const type=key==='shares' ? permission?'share.permission':'share.revoke' : permission?'share.link.update':'share.link.revoke'
    dispatch(type,(state,tx)=>updateAccess(state,tx,workbook.id,key,id,permission))
    setConfirm(null)
  }
  const confirmation=confirm&&<Modal title={tab==='People'?'Remove access?':'Revoke link?'} close={()=>setConfirm(null)}>
    <p className="access-name">{confirm.label} will lose access granted through this {tab==='People'?'invitation':'link'}.</p>
    <Actions close={()=>setConfirm(null)} label={tab==='People'?'Remove access':'Revoke link'} onAction={()=>update(confirm.id,null)}/>
  </Modal>
  const content=<>
    <p className="muted access-name">{workbook.name}.xlsx</p>
    <div className="file-tabs access-tabs" role="tablist" aria-label="Access type">{['People','Links'].map(item=><button key={item} role="tab" aria-selected={item===tab} onClick={()=>setTab(item)}>{item}</button>)}</div>
    {tab==='People'&&<div className="access-row"><Avatar person={owner}/><span>{owner?.displayName ?? 'Workbook owner'}</span><span className="muted">Owner</span></div>}
    {entries.map(item=>{
      const person=findRecord(world,'users',item.recipientUserId)
      const label=tab==='People'?person?.displayName || item.recipientEmail:scopeLabels[item.scope] || 'Shared link'
      return <div key={item.id} className="access-row">
        {tab==='People'?<Avatar person={person}/>:<Link2 size={19}/>}<span>{label}{item.recipientEmail&&person&&<small>{item.recipientEmail}</small>}</span>
        <Permission value={item.permission} change={permission=>update(item.id,permission)} label={`Permission for ${label}`}/>
        <button className="icon" aria-label={tab==='People'?`Remove access for ${label}`:`Revoke ${label} link`} onClick={()=>setConfirm({id:item.id,label})}><X size={16}/></button>
      </div>
    })}
    {!entries.length&&<p className="muted access-empty">{tab==='People'?'No other people have access.':'There are no active sharing links.'}</p>}
  </>
  if (!docked) return confirmation || <Modal title="Manage access" close={close} className="access-modal">{content}</Modal>
  return <aside className="worksheet-pane access-pane" role="dialog" aria-label="Manage access" onKeyDown={event=>{
    if (event.key==='Escape' && !confirm) {event.stopPropagation();close()}
  }}>
    <div className="pane-heading"><h2 tabIndex={-1} ref={heading}>Manage access</h2><button className="icon" aria-label="Close" onClick={close}><X size={16}/></button></div>
    {content}{confirmation}
  </aside>
}
export function Sharing({workbook,close,sheetId=null,range=null,onManageAccess}) {
  const {world,dispatch,notify}=useStore()
  const [view,setView]=useState('share')
  const [permission,setPermission]=useState('edit')
  const [recipients,setRecipients]=useState([])
  const [query,setQuery]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [settings,setSettings]=useState({scope:'organization',permission:'edit',recipients:[]})
  const [link,setLink]=useState('')
  const [copied,setCopied]=useState(false)
  const people=records(world,'users')
  const ownerEmail=people.find(person=>person.id===workbook.ownerId)?.email?.toLowerCase()
  const target={sheetId,range}
  if (view==='settings') return <LinkSettings settings={settings} people={people} close={()=>setView('share')} onApply={value=>{setSettings(value);setView('share')}}/>
  if (view==='manage') return <ManageAccess workbook={workbook} close={close}/>
  function send(event) {
    event.preventDefault()
    const email=cleanEmail(query)
    if (email && (!validEmail(email)||email===ownerEmail)) {setError('Enter a valid recipient email address.');return}
    const to=email?[...recipients,email]:recipients
    if (dispatch('share.invite',(state,tx)=>invite(state,tx,workbook.id,to,permission,message.trim()))) {notify('Access granted');close()}
  }
  async function copy() {
    const result=dispatch('share.link.copy',(state,tx)=>makeLink(state,tx,workbook.id,settings,target))
    if(!result) {setView('settings');return}
    const url=shareUrl(workbook.id,result.operation.details.token,target)
    setLink(url)
    try {await navigator.clipboard.writeText(url);setCopied(true)} catch {setCopied(false)}
  }
  return <Modal title={`Share "${workbook.name || 'Workbook'}"`} close={close} className="share-dialog">
    <form onSubmit={send}>
      <div className="share-pick"><Recipients {...{people,recipients,setRecipients,ownerEmail,error,setError,query,setQuery}}/><Permission value={permission} change={setPermission}/></div>
      <label>Add a message <span className="muted">(optional)</span><textarea placeholder="Add a message" value={message} onChange={event=>setMessage(event.target.value)}/></label>
      <div className="share-send"><button className="primary" disabled={!recipients.length&&!validEmail(query)} type="submit">Send</button></div>
    </form>
    <div className="share-link"><h3>Copy link</h3>
      <div><Link2 size={19}/><span>{scopeLabels[settings.scope]} · {settings.permission==='edit'?'Can edit':'Can view'}</span><button className="icon" aria-label="Link settings" onClick={()=>setView('settings')}><Settings size={17}/></button><button className="secondary" onClick={copy}>Copy</button></div>
      {link&&<div className="link-result" role="status">{copied?<><Check size={16}/>Link copied</>:null}<input aria-label="Sharing link" readOnly value={link} onFocus={event=>event.currentTarget.select()}/></div>}
    </div>
    <button className="action-label" onClick={onManageAccess || (()=>setView('manage'))}><Users size={17}/> Manage access</button>
  </Modal>
}
