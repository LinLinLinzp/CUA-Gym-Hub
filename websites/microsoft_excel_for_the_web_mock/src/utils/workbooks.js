import {active, append, audit, findRecord, newId, records, sheetsFor, touch, visibleSheets} from '../model.js'
import {address} from './coordinates.js'
import {mapReferences, renameReferences} from './formulas.js'

export const bookPath = (id, sheet, selection) => {
  const params = new URLSearchParams()
  if (sheet) params.set('sheet', sheet)
  if (selection) params.set('range', selection)
  return `/workbook/${encodeURIComponent(id)}${params.size ? '?' + params : ''}`
}
export const cleanBookName = name => name.trim().replace(/\.xlsx$/i,'').trim()
export const workbookError = name => !cleanBookName(name) ? 'Enter a workbook name.' :
  /["*:<>?/\\|]/.test(name) ? 'Use a name without " * : < > ? / \\ |.' : ''
export function sheetError(world, workbookId, name, id) {
  const normalized = name.trim().toLowerCase()
  if (!normalized || name.trim().length > 31) return 'Enter a name between 1 and 31 characters.'
  if (/[/\\?*:\[\]]|^'|'$/.test(name.trim()) || normalized === 'history') return 'Choose a different sheet name.'
  if (sheetsFor(world,workbookId).some(sheet => sheet.id !== id && sheet.name?.toLowerCase()===normalized)) return 'A sheet with that name already exists.'
  return ''
}

export function recipientMatches(grant, userId, email) {
  if (grant.recipientUserId) return grant.recipientUserId === userId
  return !!email && grant.recipientEmail?.trim().toLowerCase() === email.trim().toLowerCase()
}

export function workbookAccess(world, workbook, token) {
  if (!active(workbook)) return null
  if (workbook.ownerId === world.currentUserId || workbook.ownerId == null) return 'owner'
  const person = findRecord(world,'users',world.currentUserId)
  const grant = records(world,'shares').find(item => item.workbookId===workbook.id && item.status==='active' &&
    recipientMatches(item,world.currentUserId,person?.email))
  const link = token && records(world,'shareLinks').find(item => item.token===token && item.workbookId===workbook.id && item.status==='active')
  if (grant?.permission==='edit') return 'edit'
  if (link && (link.scope==='anyone' || link.scope==='organization' && person?.organization==='Contoso' ||
    link.scope==='specificPeople' && (link.recipientEmails || []).some(email=>email.toLowerCase()===person?.email?.toLowerCase()) ||
    link.scope==='existingAccess' && grant)) return grant?.permission==='view' ? 'view' : link.permission
  return grant?.permission || null
}

const nextNumber = (base, items) => {
  const names = new Set(items.map(item => item.name?.toLowerCase()))
  let number = 1
  while (names.has((base+number).toLowerCase())) number++
  return base+number
}
const makeSheet = (tx, workbookId, name, position) => ({
  ...audit(tx), id:newId('sheet'), workbookId, name, position, visibility:'visible', status:'active',
  tabColor:null, autoFilterRange:null, sourceSheetId:null, deletedAt:null, deletedBy:null,
})
const makeWorkbook = (tx, name, sheetId, templateId, location = 'OneDrive / Documents') => ({
  ...audit(tx), id:newId('wb'), name, ownerId:tx.actor, location, status:'active', favoriteUserIds:[],
  activeSheetId:sheetId, lastOpenedAt:tx.now, templateId, sourceWorkbookId:null, deletedAt:null, deletedBy:null,
})
const emit = (workbookId,sheetId,targetIds,details,options) => ({workbookId,sheetId,targetIds,details,...options})
export const templates = [
  {id:'blank', label:'Blank workbook', sheet:'Sheet1', rows:[]},
  {id:'budget', label:'Budget', sheet:'Budget', rows:[['Category','Planned','Actual','Variance'],['Payroll',6000,5800,'=B2-C2'],['Equipment',1600,1450,'=B3-C3'],['Travel',950,1120,'=B4-C4'],['Total','=SUM(B2:B4)','=SUM(C2:C4)','=SUM(D2:D4)']]},
  {id:'sales', label:'Sales', sheet:'Sales', rows:[['Region','Product','Quantity','Unit Price','Revenue'],['North','Office Chair',12,180,'=C2*D2'],['West','USB-C Dock',18,120,'=C3*D3'],['East','Keyboard',32,65,'=C4*D4']]},
]
export function createWorkbook(world,tx,templateId) {
  const template = templates.find(item => item.id===templateId) || templates[0]
  const name = template.id==='blank' ? nextNumber('Book ',records(world,'workbooks')) : nextNumber(template.label+' ',records(world,'workbooks'))
  const workbook = makeWorkbook(tx,name,null,template.id==='blank' ? null : template.id)
  const sheet = makeSheet(tx,workbook.id,template.sheet,0)
  workbook.activeSheetId = sheet.id
  append(world,'workbooks',workbook)
  append(world,'sheets',sheet)
  const cells = template.rows.flatMap((row,r) => row.map((input,c) => ({
    ...audit(tx),id:newId('cell'),workbookId:workbook.id,sheetId:sheet.id,row:r+1,column:c+1,address:address(r+1,c+1),input:String(input),
    ...(r===0?{format:{bold:true,fillColor:'#e9f5ee'}}:{}),
  })))
  if (cells.length) append(world,'cells',...cells)
  return emit(workbook.id,sheet.id,[workbook.id,sheet.id,...cells.map(cell=>cell.id)],{name,templateId:workbook.templateId},{calculate:cells.length>0})
}

export function changeWorkbook(world,tx,id,action,value) {
  const book = findRecord(world,'workbooks',id)
  if (!book || (action!=='restore' && !active(book))) return null
  if (action==='rename') {
    const name = cleanBookName(value)
    if (workbookError(value) || name===book.name) return null
    const before = book.name
    book.name = name
    return emit(id,null,[id],{before,name})
  }
  if (action==='open') {
    const before = book.lastOpenedAt ?? null
    book.lastOpenedAt = tx.now
    return emit(id,null,[id],{before,lastOpenedAt:tx.now},{updateWorkbook:false})
  }
  if (action==='favorite') {
    const ids = book.favoriteUserIds || []
    const favorite = !ids.includes(tx.actor)
    book.favoriteUserIds = favorite ? [...ids,tx.actor] : ids.filter(id=>id!==tx.actor)
    return emit(id,null,[id],{userId:tx.actor,favorite},{updateWorkbook:false})
  }
  const deleted = action==='delete'
  if (deleted === (book.status==='deleted')) return null
  Object.assign(book,{status:deleted?'deleted':'active',deletedAt:deleted?tx.now:null,deletedBy:deleted?tx.actor:null})
  return emit(id,null,[id],{status:book.status})
}

function copyChildren(world,tx,sourceWorkbook,targetWorkbook,sheetMap,rename) {
  const ids = new Map()
  const copies = {}
  for (const key of ['cells','tables','filters','sorts','comments','charts','conditionalFormats','validationRules']) {
    copies[key] = records(world,key).filter(item => item.workbookId===sourceWorkbook && sheetMap.has(item.sheetId) && item.status!=='deleted')
      .map(item => {
        const id = newId(key.slice(0,-1))
        ids.set(item.id,id)
        return {...structuredClone(item),...audit(tx),id,workbookId:targetWorkbook,sheetId:sheetMap.get(item.sheetId)}
      })
  }
  for (const [key,items] of Object.entries(copies)) {
    for (const item of items) {
      if (item.tableId) item.tableId = ids.get(item.tableId) ?? null
      if (item.parentId) item.parentId = ids.get(item.parentId) ?? null
      if (key==='tables') {
        item.columns = (item.columns || []).map(col => ({...col,id:newId('col')}))
        if (sourceWorkbook===targetWorkbook) {
          const names=records(world,'tables').filter(table=>table.workbookId===targetWorkbook).concat(items.filter(table=>table.id!==item.id))
          item.name=nextNumber((item.name || 'Table')+'_',names)
        }
      }
      if (key==='cells') {
        item.dependencies = (item.dependencies || []).map(dep => ({...dep,sheetId:sheetMap.get(dep.sheetId) || dep.sheetId}))
        if (rename && (item.formula || item.input?.startsWith('='))) {
          item.input = renameReferences(item.input ?? item.formula,...rename)
          item.formula = item.input
        }
      }
    }
    if (items.length) append(world,key,...items)
  }
  return [...ids.values()]
}
export function copyWorkbook(world,tx,id,name,location,selectedSheetId) {
  const source = findRecord(world,'workbooks',id)
  if (!active(source) || workbookError(name)) return null
  const workbook = {...makeWorkbook(tx,cleanBookName(name),null,null,location.trim() || 'OneDrive / Documents'),sourceWorkbookId:id}
  const sheetMap = new Map()
  const copies = sheetsFor(world,id).map((sheet,position) => {
    const copy = {...structuredClone(sheet),...audit(tx),id:newId('sheet'),workbookId:workbook.id,position,sourceSheetId:sheet.id}
    sheetMap.set(sheet.id,copy.id)
    return copy
  })
  const visible = copies.filter(sheet=>sheet.visibility!=='hidden')
  workbook.activeSheetId = visible.find(sheet=>sheet.id===sheetMap.get(selectedSheetId ?? source.activeSheetId))?.id ?? visible[0]?.id ?? null
  append(world,'workbooks',workbook)
  append(world,'sheets',...copies)
  const childIds = copyChildren(world,tx,id,workbook.id,sheetMap)
  return emit(workbook.id,workbook.activeSheetId,[id,workbook.id,...sheetMap.values(),...childIds],{sourceWorkbookId:id,targetWorkbookId:workbook.id,sheetMap:Object.fromEntries(sheetMap)},{calculate:true})
}

export function changeSheet(world,tx,workbookId,id,action,value) {
  const book = findRecord(world,'workbooks',workbookId)
  if (!active(book)) return null
  const sheets = sheetsFor(world,workbookId)
  const visible = visibleSheets(world,workbookId)
  if (action==='add') {
    sheets.forEach((item,position)=>{if(item.position!==position){item.position=position;touch(item,tx)}})
    const sheet = makeSheet(tx,workbookId,nextNumber('Sheet',sheets),sheets.length)
    append(world,'sheets',sheet)
    book.activeSheetId = sheet.id
    return emit(workbookId,sheet.id,[sheet.id],{name:sheet.name,position:sheet.position})
  }
  const sheet = sheets.find(item=>item.id===id)
  if (!sheet) return null
  if (action==='select') {
    if (sheet.visibility==='hidden' || book.activeSheetId===id) return null
    const before = book.activeSheetId ?? null
    book.activeSheetId = id
    return emit(workbookId,id,[id],{before,activeSheetId:id},{updateWorkbook:false})
  }
  if (action==='rename') {
    const name = value.trim()
    if (sheetError(world,workbookId,name,id) || name===sheet.name) return null
    const before = sheet.name
    sheet.name = name
    touch(sheet,tx)
    const rewritten = []
    for (const cell of records(world,'cells').filter(cell=>cell.workbookId===workbookId)) {
      const input = cell.input ?? cell.formula
      const next = renameReferences(input,before,name)
      if (next===input) continue
      cell.input = cell.formula = next
      touch(cell,tx)
      rewritten.push(cell.id)
    }
    return emit(workbookId,id,[id,...rewritten],{before,name,rewrittenCellIds:rewritten},{calculate:true})
  }
  if (action==='duplicate' || action==='reorder') {
    const ordered = [...sheets]
    let target = sheet
    const before = Object.fromEntries(sheets.map(item=>[item.id,item.position??0]))
    let childIds = []
    if (action==='duplicate') {
      const stem = (sheet.name || 'Sheet').slice(0,24)
      const name = nextNumber(stem+' ',sheets)
      target = {...structuredClone(sheet),...audit(tx),id:newId('sheet'),name,sourceSheetId:id}
      append(world,'sheets',target)
      ordered.splice(ordered.indexOf(sheet)+1,0,target)
      childIds = copyChildren(world,tx,workbookId,workbookId,new Map([[id,target.id]]),[sheet.name,name])
      if (target.visibility!=='hidden') book.activeSheetId = target.id
    } else {
      const index = Math.max(0,Math.min(sheets.length-1,value))
      if (ordered.indexOf(sheet)===index) return null
      ordered.splice(ordered.indexOf(sheet),1)
      ordered.splice(index,0,sheet)
    }
    ordered.forEach((item,position)=>{if(item.position!==position){item.position=position;touch(item,tx)}})
    return emit(workbookId,target.id,[target.id,...childIds],{before,positions:Object.fromEntries(ordered.map(item=>[item.id,item.position])),sourceSheetId:action==='duplicate'?id:null},{calculate:action==='duplicate'})
  }
  if (action==='color') {
    if ((sheet.tabColor ?? null)===value) return null
    const before = sheet.tabColor ?? null
    sheet.tabColor = value
    touch(sheet,tx)
    return emit(workbookId,id,[id],{before,tabColor:value})
  }
  const rewrittenCellIds=[]
  if (action==='hide' || action==='delete') {
    if (sheet.visibility!=='hidden' && visible.length<=1) return null
    if (action==='hide' && sheet.visibility==='hidden') return null
    if (action==='hide') sheet.visibility = 'hidden'
    else {
      Object.assign(sheet,{status:'deleted',deletedAt:tx.now,deletedBy:tx.actor})
      for (const cell of records(world,'cells')) {
        if (cell.workbookId!==workbookId || cell.sheetId===id) continue
        const input=cell.input ?? cell.formula
        if (!input?.startsWith('=')) continue
        const next=mapReferences(input,tokens=>tokens.some(token=>token.sheet && token.sheet.toLowerCase()===sheet.name?.toLowerCase()) ? {error:'#REF!'} : null)
        if (next===input) continue
        cell.input=cell.formula=next
        touch(cell,tx)
        rewrittenCellIds.push(cell.id)
      }
    }
  } else if (action==='unhide') {
    if (sheet.visibility!=='hidden') return null
    sheet.visibility = 'visible'
    book.activeSheetId = id
  } else return null
  touch(sheet,tx)
  if (!visibleSheets(world,workbookId).some(item=>item.id===book.activeSheetId)) book.activeSheetId = visibleSheets(world,workbookId)[0]?.id ?? null
  return emit(workbookId,id,[id,...rewrittenCellIds],{visibility:sheet.visibility,status:sheet.status,activeSheetId:book.activeSheetId,...(action==='delete'?{rewrittenCellIds}:{})},{calculate:action==='delete'})
}
