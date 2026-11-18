import {append,audit,findRecord,newId,records,touch} from '../model.js'

export function changeComment(world,tx,workbookId,sheetId,action,{id,anchor,body='',parentId=null}) {
  const comments=records(world,'comments')
  const parent=parentId && comments.find(item=>item.id===parentId && item.sheetId===sheetId && item.status==='open')
  if (action==='add' || action==='reply') {
    if (!body.trim() || parentId && !parent) return null
    const comment={...audit(tx),id:newId('comment'),workbookId,sheetId,anchor:parent?.anchor || anchor,
      parentId,body:body.trim(),status:'open'}
    append(world,'comments',comment)
    return {workbookId,sheetId,targetIds:[comment.id],details:{anchor:comment.anchor,parentId,body:comment.body,status:comment.status}}
  }
  const comment=comments.find(item=>item.id===id&&item.sheetId===sheetId&&item.status!=='deleted')
  if (!comment || action==='delete' && comment.createdBy!==tx.actor || action!=='delete' && comment.parentId) return null
  const before=comment.status
  comment.status={resolve:'resolved',reopen:'open',delete:'deleted'}[action]
  touch(comment,tx)
  return {workbookId,sheetId,targetIds:[comment.id],details:{anchor:comment.anchor,before,status:comment.status}}
}

export function changeChart(world,tx,workbookId,sheetId,action,{id,sourceRange,type,title,position,size}) {
  let chart=findRecord(world,'charts',id)
  const old=chart?{type:chart.type,title:chart.title,position:chart.position,size:chart.size,status:chart.status}:null
  if (action==='create') {
    chart={...audit(tx),id:newId('chart'),workbookId,sheetId,sourceRange,type,title,position,size,status:'active'}
    append(world,'charts',chart)
  } else {
    if (!chart || chart.sheetId!==sheetId || chart.status==='deleted') return null
    if (action==='delete') chart.status='deleted'
    else {
      const fields={type,title,position,size}
      const changes=Object.fromEntries(Object.entries(fields).filter(([,value])=>value!==undefined))
      if (Object.keys(changes).every(key=>JSON.stringify(chart[key])===JSON.stringify(changes[key]))) return null
      Object.assign(chart,changes)
    }
    touch(chart,tx)
  }
  return {workbookId,sheetId,targetIds:[chart.id],details:{sourceRange:chart.sourceRange,before:old,type:chart.type,title:chart.title,position:chart.position,size:chart.size,status:chart.status}}
}

export function sheetLayout(world,tx,workbookId,sheetId,action,dimension,indices,value) {
  const sheet=findRecord(world,'sheets',sheetId)
  if (!sheet || sheet.status==='deleted')return null
  if (action==='freeze') {
    const before={frozenRows:sheet.frozenRows ?? 0,frozenColumns:sheet.frozenColumns ?? 0}
    if (before.frozenRows===value.frozenRows && before.frozenColumns===value.frozenColumns) return null
    Object.assign(sheet,value)
    touch(sheet,tx)
    return {workbookId,sheetId,targetIds:[sheetId],details:{before,...value}}
  }
  const key=action==='resize' ? dimension==='row'?'rowHeights':'columnWidths' : dimension==='row'?'hiddenRows':'hiddenColumns'
  const before=sheet[key] || (action==='resize'?{}:[])
  let next
  if (action==='resize') next={...before,...Object.fromEntries(indices.map(index=>[index,value]))}
  else if (action==='hide') next=[...new Set([...before,...indices])].sort((a,b)=>a-b)
  else next=before.filter(index=>!indices.includes(index))
  if (JSON.stringify(next)===JSON.stringify(before)) return null
  sheet[key]=next
  touch(sheet,tx)
  return {workbookId,sheetId,targetIds:[sheetId],details:{dimension,indices,field:key,before,after:next}}
}

export function changePreference(world,key,value) {
  const before=world.preferences?.[key] ?? (key==='zoom'?100:'classic')
  if(before===value)return null
  world.preferences={...world.preferences,[key]:value}
  return {updateWorkbook:false,details:{setting:key,before,value}}
}
