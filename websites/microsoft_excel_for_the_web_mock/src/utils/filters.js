import {append, audit, newId, records, touch} from '../model.js'
import {address, colName, inside, overlap, range, rangeName} from './coordinates.js'
import {asCellMap, editCells, inputOf, relocateReferences, sizeOf, MAX_EDIT_CELLS} from './cells.js'
import {workbookValues} from './formulas.js'

export function filterRanges(world,sheet) {
  const tables=records(world,'tables').filter(item=>item.sheetId===sheet.id&&item.status!=='deleted'&&item.filterEnabled!==false)
  return [
    ...(sheet.autoFilterRange?[{range:sheet.autoFilterRange,tableId:null}]:[]),
    ...tables.map(table=>({range:table.range,tableId:table.id})),
  ].map(item=>({...item,bounds:range(item.range)})).filter(item=>item.bounds)
}
const sameRange = (a,b) => (a.tableId ?? null)===(b.tableId ?? null) && (a.tableId || a.range===b.range)
export function validFilters(world,sheet,scopes) {
  return records(world,'filters').filter(item=>item.sheetId===sheet.id && item.status==='active' && scopes.some(scope=>sameRange(item,scope)))
}
export const filterValue = (cells,row,column) => {
  const cell = cells.get(address(row,column))
  return cell?.error || cell?.value || (cell?.value===0?0:cell?.value===false?false:null)
}
export function testPredicate(value,predicate,kind) {
  if (value == null) return false
  if (kind==='number' && typeof value!=='number') return false
  if (kind==='date' && !(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value))) return false
  const {operator,value:target,value2}=predicate
  const a=kind==='text'?String(value).toLowerCase():value, b=kind==='text'?String(target).toLowerCase():target
  switch(operator) {
    case 'equals':return a===b
    case 'contains':return String(a).includes(b)
    case 'beginsWith':return String(a).startsWith(b)
    case 'greaterThan':case 'after':return a>b
    case 'lessThan':case 'before':return a<b
    case 'between':return a>=b && a<=value2
    default:return true
  }
}
export function matchesFilters(filters,cells,row,excluding) {
  return filters.every(filter=>{
    if (excluding && filter.column===excluding.column && sameRange(filter,excluding)) return true
    const bounds=range(filter.range)
    if (!bounds || row<=bounds.r1 || row>bounds.r2) return true
    const value=filterValue(cells,row,filter.column)
    if (filter.kind==='values') return (filter.values || []).includes(value)
    const predicates=filter.predicates || []
    if (!predicates.length) return true
    return filter.join==='or'?predicates.some(p=>testPredicate(value,p,filter.kind)):predicates.every(p=>testPredicate(value,p,filter.kind))
  })
}
export function choicesFor(scope,filters,cells) {
  const choices=new Map()
  for (let row=scope.bounds.r1+1; row<=scope.bounds.r2;row++) {
    if (!matchesFilters(filters,cells,row,scope)) continue
    const value=filterValue(cells,row,scope.column)
    choices.set(value,value===null?'(Blanks)':String(value))
  }
  return [...choices].sort(([a,x],[b,y])=>a===null?1:b===null?-1:typeof a==='number'&&typeof b==='number'?a-b:x.localeCompare(y,undefined,{numeric:true}))
}
export function clearFilters(world,tx,workbookId,sheetId,scope) {
  const filters=records(world,'filters').filter(item=>item.sheetId===sheetId&&item.status==='active'&&(!scope || sameRange(item,scope)&&(scope.column==null||scope.column===item.column)))
  if (!filters.length) return null
  for (const filter of filters) {
    Object.assign(filter,{status:'cleared',values:[],predicates:[]})
    touch(filter,tx)
  }
  return {workbookId,sheetId,targetIds:filters.map(item=>item.id),details:{range:scope?.range??null,column:scope?.column??null,status:'cleared'}}
}
export function setFilter(world,tx,workbookId,sheetId,scope,configuration) {
  let filter=records(world,'filters').find(item=>item.sheetId===sheetId&&item.column===scope.column&&sameRange(item,scope))
  if (filter?.status==='active' && Object.keys(configuration).every(key=>JSON.stringify(filter[key])===JSON.stringify(configuration[key]))) return null
  const before=filter?{kind:filter.kind,values:filter.values,predicates:filter.predicates,join:filter.join,status:filter.status}:null
  if (!filter) {
    filter={...audit(tx),id:newId('filter'),workbookId,sheetId,tableId:scope.tableId ?? null,range:scope.range,column:scope.column}
    append(world,'filters',filter)
  }
  Object.assign(filter,configuration,{status:'active'})
  touch(filter,tx)
  return {workbookId,sheetId,targetIds:[filter.id],details:{range:scope.range,column:scope.column,tableId:filter.tableId,before,...configuration}}
}
export function toggleFilter(world,tx,workbookId,sheet,bounds) {
  const before=sheet.autoFilterRange ?? null
  if (!before && (!bounds||bounds.r2<=bounds.r1)) return null
  const cleared=before && clearFilters(world,tx,workbookId,sheet.id,{range:before,tableId:null})
  sheet.autoFilterRange=before?null:rangeName(bounds)
  touch(sheet,tx)
  return {workbookId,sheetId:sheet.id,targetIds:[sheet.id,...(cleared?.targetIds || [])],details:{before,autoFilterRange:sheet.autoFilterRange}}
}
function tableError(world,sheetId,bounds,cells,hasHeaders) {
  if (!bounds || sizeOf(bounds)>MAX_EDIT_CELLS || bounds.r2===1048576&&!hasHeaders) return 'Enter a valid range such as A1:D20.'
  if (![...cells.values()].some(cell=>inside(cell,bounds) && inputOf(cell))) return 'Select a range containing data.'
  const finalBounds={...bounds,r2:bounds.r2+(hasHeaders?0:1)}
  if (records(world,'tables').some(table=>table.sheetId===sheetId && table.status!=='deleted' && overlap(range(table.range),finalBounds))) return 'The range overlaps an existing table.'
  if (!hasHeaders && [...cells.values()].some(cell=>cell.row===finalBounds.r2 && inside(cell,finalBounds) && (inputOf(cell)||cell.format))) return 'The row below this range contains data.'
  return ''
}
export function createTable(world,tx,workbookId,sheetId,bounds,hasHeaders,style) {
  const cells=asCellMap(records(world,'cells').filter(cell=>cell.sheetId===sheetId))
  const problem=tableError(world,sheetId,bounds,cells,hasHeaders)
  if (problem) return {error:problem}
  const movedCellIds=[]
  let rewrittenCellIds=[]
  if (!hasHeaders) {
    const mapping=new Map()
    for(let r=bounds.r1;r<=bounds.r2;r++) for(let c=bounds.c1;c<=bounds.c2;c++) mapping.set(address(r,c),{r:r+1,c,moved:true})
    rewrittenCellIds=relocateReferences(world,tx,workbookId,sheetId,sheetId,mapping,{moveBounds:bounds})
    if (!rewrittenCellIds) return {error:'Adding headers would split a range used in a formula. Include the full referenced range or select My table has headers.'}
    for (const cell of cells.values()) {
      if (!inside(cell,bounds)) continue
      cell.row++
      cell.address=address(cell.row,cell.column)
      touch(cell,tx)
      movedCellIds.push(cell.id)
    }
  }

  const nameSet=new Set(records(world,'tables').filter(table=>table.workbookId===workbookId).map(table=>table.name?.toLowerCase()))
  let suffix=1
  while (nameSet.has('table'+suffix)) suffix++
  const table={...audit(tx),id:newId('table'),workbookId,sheetId,name:'Table'+suffix,
    range:rangeName({...bounds,r2:bounds.r2+(hasHeaders?0:1)}),hasHeaders:true,style,filterEnabled:true,columns:[],status:'active'}
  const evaluated = hasHeaders ? asCellMap(workbookValues(world,workbookId).filter(cell=>cell.sheetId===sheetId)) : null
  const labels = Array.from({length:bounds.c2-bounds.c1+1},(_,index)=>{
    const value = evaluated && filterValue(evaluated,bounds.r1,bounds.c1+index)
    return value === null ? null : String(value)
  })
  const reserved = new Set(labels.map(label=>label?.toLowerCase()))
  const used = new Set()
  labels.forEach((label,index)=>{
    const base=label ?? `Column${index+1}`
    let name=base, count=1
    if (label===null || used.has(label.toLowerCase())) {
      while (used.has(name.toLowerCase()) || reserved.has(name.toLowerCase())) name=base+(++count)
    }
    used.add(name.toLowerCase())
    table.columns.push({id:newId('col'),name,column:bounds.c1+index})
  })
  const header=editCells(world,tx,workbookId,sheetId,{...bounds,r2:bounds.r1},(r,c)=>{
    const index=c-bounds.c1
    const name=table.columns[index].name
    return labels[index]===name ? null : {input:name}
  })
  append(world,'tables',table)
  return {workbookId,sheetId,targetIds:[table.id,...new Set([...(header?.targetIds || []),...movedCellIds,...rewrittenCellIds])],
    details:{name:table.name,range:table.range,style,insertedHeaders:!hasHeaders,movedCellIds,rewrittenCellIds},calculate:!hasHeaders||!!header}
}

const collator=new Intl.Collator('en-US',{sensitivity:'base',numeric:false})
function compare(a,b) {
  if (typeof a===typeof b) return typeof a==='number'?a-b:typeof a==='boolean'?Number(a)-Number(b):collator.compare(a,b)
  const rank={number:0,string:1,boolean:2}
  return rank[typeof a]-rank[typeof b]
}
export function sortRange(world,tx,workbookId,sheetId,scope,keys,hasHeaders) {
  const bounds=scope.bounds
  if (!bounds || sizeOf(bounds)>MAX_EDIT_CELLS || !keys.length || keys.some(key=>key.column<bounds.c1||key.column>bounds.c2)) return null
  const sourceRows=Array.from({length:Math.max(0,bounds.r2-bounds.r1+1-(hasHeaders?1:0))},(_,i)=>bounds.r1+i+(hasHeaders?1:0))
  if (!sourceRows.length) return null
  const cells=records(world,'cells').filter(cell=>cell.sheetId===sheetId)
  const lookup=asCellMap(workbookValues(world,workbookId).filter(cell=>cell.sheetId===sheetId))
  const target=sourceRows.slice().sort((a,b)=>{
    for (const {column,direction} of keys) {
      const x=filterValue(lookup,a,column), y=filterValue(lookup,b,column)
      if (x===null || y===null) {
        if (x!==y) return x===null?1:-1
      } else {
        const order=compare(x,y)
        if (order) return direction==='desc'?-order:order
      }
    }
    return a-b
  })
  const rowMap=new Map(target.map((row,index)=>[row,sourceRows[index]]))
  const permutation=[...rowMap].map(([before,after])=>({before,after}))
  const mapping=new Map()
  for (const {before,after} of permutation) {
    if (before===after) continue
    for(let c=bounds.c1;c<=bounds.c2;c++) mapping.set(address(before,c),{r:after,c,moved:true})
  }
  const movedIds=[]
  for (const cell of cells) {
    const point=mapping.get(address(cell.row,cell.column))
    if (!point) continue
    cell.row=point.r
    cell.address=address(cell.row,cell.column)
    touch(cell,tx)
    movedIds.push(cell.id)
  }
  const rewrittenCellIds=relocateReferences(world,tx,workbookId,sheetId,sheetId,mapping)
  for (const old of records(world,'sorts')) {
    if (old.sheetId===sheetId&&old.range===scope.range&&old.status==='active') {old.status='superseded';touch(old,tx)}
  }
  const sort={...audit(tx),id:newId('sort'),workbookId,sheetId,tableId:scope.tableId ?? null,range:scope.range,keys,hasHeaders,status:'active'}
  append(world,'sorts',sort)
  return {workbookId,sheetId,targetIds:[sort.id,...new Set([...movedIds,...rewrittenCellIds])],details:{range:scope.range,keys,permutation,rewrittenCellIds},calculate:true}
}
export const columnChoices = (bounds,cells) => Array.from({length:bounds.c2-bounds.c1+1},(_,i)=>{
  const column=bounds.c1+i
  return {column,label:`${colName(column)}${filterValue(cells,bounds.r1,column)!=null?' — '+filterValue(cells,bounds.r1,column):''}`}
})
