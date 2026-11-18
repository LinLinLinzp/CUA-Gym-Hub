import {append, audit, findRecord, newId, records, touch} from '../model.js'
import {bookPath, recipientMatches} from './workbooks.js'
import {withSid} from './dataManager.js'

export const cleanEmail = value => value.trim().toLowerCase()
export const validEmail = value => /^[^@\s<>]+@[^@\s<>.]+(?:\.[^@\s<>.]+)+$/.test(cleanEmail(value))
export const scopeLabels = {anyone:'Anyone',organization:'People in Contoso',specificPeople:'Specific people',existingAccess:'People with existing access'}
export function invite(world,tx,workbookId,recipients,permission,message) {
  const ids=[]
  const updates=[]
  const owner=findRecord(world,'users',findRecord(world,'workbooks',workbookId)?.ownerId)
  const activeGrants=records(world,'shares').filter(item=>item.workbookId===workbookId && item.status==='active')
  for (const email of new Set(recipients.map(cleanEmail))) {
    if (!validEmail(email) || email===owner?.email?.trim().toLowerCase()) continue
    const person=records(world,'users').find(user=>user.email?.trim().toLowerCase()===email)
    const matches=activeGrants.filter(item=>recipientMatches(item,person?.id,email))
    const existing=matches.find(item=>item.recipientUserId===person?.id) || matches[0]
    const before=existing?{permission:existing.permission,message:existing.message}:null
    const grant=existing || {...audit(tx),id:newId('share'),workbookId}
    Object.assign(grant,{recipientUserId:person?.id ?? null,recipientEmail:email,permission,message,status:'active',revokedAt:null})
    touch(grant,tx)
    if (!existing) append(world,'shares',grant)
    const duplicates=matches.filter(item=>item!==grant)
    for (const duplicate of duplicates) touch(Object.assign(duplicate,{status:'revoked',revokedAt:tx.now}),tx)
    const revokedDuplicateGrantIds=duplicates.map(item=>item.id)
    ids.push(grant.id,...revokedDuplicateGrantIds)
    updates.push({recipientUserId:grant.recipientUserId,recipientEmail:email,before,permission,
      ...(revokedDuplicateGrantIds.length && {revokedDuplicateGrantIds})})
  }
  if (!ids.length) return null
  return {workbookId,targetIds:ids,details:{recipients:updates,permission,message}}
}
export function makeLink(world,tx,workbookId,settings,target) {
  const recipientEmails=settings.scope==='specificPeople'?[...new Set(settings.recipients.map(cleanEmail))].sort():[]
  if (settings.scope==='specificPeople' && (!recipientEmails.length || recipientEmails.some(email=>!validEmail(email)))) return null
  let link=records(world,'shareLinks').find(item=>item.workbookId===workbookId && item.status==='active' && item.scope===settings.scope &&
    item.permission===settings.permission && JSON.stringify([...(item.recipientEmails || [])].sort())===JSON.stringify(recipientEmails) &&
    (item.target?.sheetId ?? null)===target.sheetId && (item.target?.range ?? null)===target.range)
  if (!link) {
    link={...audit(tx),id:newId('link'),token:newId('access'),workbookId,scope:settings.scope,permission:settings.permission,recipientEmails,target,
      status:'active',copyCount:0,revokedAt:null}
    append(world,'shareLinks',link)
  }
  link.copyCount=(link.copyCount ?? 0)+1
  link.lastCopiedAt=tx.now
  touch(link,tx)
  return {workbookId,sheetId:target.sheetId,targetIds:[link.id],details:{token:link.token,scope:link.scope,permission:link.permission,recipientEmails,target,copyCount:link.copyCount}}
}
export function shareUrl(workbookId,token,target) {
  const path=bookPath(workbookId,target.sheetId,target.range)
  return new URL(withSid(`${path}${path.includes('?')?'&':'?'}link=${encodeURIComponent(token)}`),window.location.origin).href
}
export function updateAccess(world,tx,workbookId,key,id,permission) {
  const record=findRecord(world,key,id)
  if (record?.workbookId!==workbookId || record.status!=='active' || record.permission===permission) return null
  const before={permission:record.permission,status:record.status}
  if (permission) record.permission=permission
  else Object.assign(record,{status:'revoked',revokedAt:tx.now})
  touch(record,tx)
  return {workbookId,targetIds:[id],details:{before,permission:record.permission,status:record.status,revokedAt:record.revokedAt ?? null}}
}
