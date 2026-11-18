import {append, audit, newId, records, touch} from '../model.js'
import {address, coord, inside, overlap, points, range, rangeName} from './coordinates.js'
import {mapReferences, translateFormula} from './formulas.js'

export const inputOf = cell => String(cell?.input ?? cell?.formula ?? cell?.value ?? '')
export const asCellMap = cells => new Map(cells.map(cell=>[address(cell.row,cell.column),cell]))
export const MAX_EDIT_CELLS = 100000
export function sizeOf(bounds) {
  return (bounds.r2-bounds.r1+1)*(bounds.c2-bounds.c1+1)
}
export function usedBounds(cells) {
  if (!cells.length) return range('A1')
  return cells.reduce((bounds,cell)=>({r1:Math.min(bounds.r1,cell.row),r2:Math.max(bounds.r2,cell.row),c1:Math.min(bounds.c1,cell.column),c2:Math.max(bounds.c2,cell.column)}),
    {r1:Infinity,r2:1,c1:Infinity,c2:1})
}
export function contiguousBounds(cellMap,row,column) {
  const occupied = (r,c) => inputOf(cellMap.get(address(r,c))) !== ''
  const b = {r1:row,r2:row,c1:column,c2:column}
  if (!occupied(row,column)) return b
  let changed
  do {
    changed = false
    const previous = {...b}
    for (let c=previous.c1;c<=previous.c2;c++) {
      if (occupied(previous.r1-1,c)) b.r1=previous.r1-1
      if (occupied(previous.r2+1,c)) b.r2=previous.r2+1
    }
    for (let r=previous.r1;r<=previous.r2;r++) {
      if (occupied(r,previous.c1-1)) b.c1=previous.c1-1
      if (occupied(r,previous.c2+1)) b.c2=previous.c2+1
    }
    changed = b.r1!==previous.r1 || b.r2!==previous.r2 || b.c1!==previous.c1 || b.c2!==previous.c2
  } while(changed)
  return b
}
export function editCells(world,tx,workbookId,sheetId,bounds,patch,{clear=false,details={},calculate=true,coordinates}={}) {
  if (!bounds || (coordinates?.length ?? sizeOf(bounds))>MAX_EDIT_CELLS) return null
  const all = records(world,'cells')
  const cells = asCellMap(all.filter(cell=>cell.sheetId===sheetId))
  const deleted = new Set()
  const created = []
  const changes = []
  for (const {r,c} of coordinates || points(bounds)) {
    const key = address(r,c)
    const existing = cells.get(key)
    const update = patch(r,c,existing)
    if (!update) continue
    const before = {input:inputOf(existing),format:existing?.format ?? null}
    const after = {
      input: Object.hasOwn(update,'input') ? String(update.input ?? '') : before.input,
      format: Object.hasOwn(update,'format') ? update.format : before.format,
    }
    if (before.input===after.input && JSON.stringify(before.format)===JSON.stringify(after.format)) continue
    const cell = existing || {
      ...audit(tx),id:newId('cell'),workbookId,sheetId,row:r,column:c,address:key,
      formula:null,value:null,valueType:'blank',error:null,dependencies:[],
    }
    if (!after.input && !Object.keys(after.format || {}).length && (clear || Object.hasOwn(update,'input'))) {
      if (existing) deleted.add(existing.id)
      else continue
    } else {
      cell.input = after.input
      if (after.format) cell.format = after.format
      else delete cell.format
      touch(cell,tx)
      if (!existing) created.push(cell)
    }
    changes.push({id:cell.id,address:key,before,after})
  }
  if (!changes.length) return null
  world.cells = all.filter(cell=>!deleted.has(cell.id)).concat(created)
  return {workbookId,sheetId,targetIds:changes.map(item=>item.id),details:{range:rangeName(bounds),changes,...details},calculate}
}

export function fillRange(world,tx,workbookId,sheetId,source,destination) {
  if (!destination) return null
  const map = asCellMap(records(world,'cells').filter(cell=>cell.sheetId===sheetId))
  const repeated = (to,from,last) => from + ((to-from)%(last-from+1)+(last-from+1))%(last-from+1)
  return editCells(world,tx,workbookId,sheetId,destination,(row,column)=>{
    if (inside({row,column},source)) return null
    const r = repeated(row,source.r1,source.r2), c = repeated(column,source.c1,source.c2)
    const cell = map.get(address(r,c))
    return {input:translateFormula(inputOf(cell),row-r,column-c),format:cell?.format ?? null}
  },{clear:true,details:{sourceRange:rangeName(source)}})
}
export function getClipboard(cells, bounds, sheetId, cut) {
  const rows = []
  for (let r=bounds.r1;r<=bounds.r2;r++) {
    const row = []
    for(let c=bounds.c1;c<=bounds.c2;c++) {
      const cell = cells.get(address(r,c))
      row.push({input:inputOf(cell),format:cell?.format ?? null,id:cell?.id})
    }
    rows.push(row)
  }
  const text = rows.map(row=>row.map(({input})=>/[\r\n\t"]/.test(input)?'"'+input.replaceAll('"','""')+'"':input).join('\t')).join('\n')
  return {rows,source:bounds,sheetId,cut,text}
}
export function parseClipboard(text, delimiter = '\t') {
  const rows = [[]]
  let field = '', quoted = false
  for (let i=0; i<text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i+1] === '"') {field+='"';i++}
      else if (char === '"') quoted=false
      else field+=char
    } else if (char === '"' && !field && (i===0 || [delimiter,'\r','\n'].includes(text[i-1]))) quoted = true
    else if (char === delimiter || char === '\r' || char === '\n') {
      rows.at(-1).push({input:field})
      field=''
      if (char!==delimiter) {
        if (char==='\r' && text[i+1]==='\n') i++
        rows.push([])
      }
    } else field+=char
  }
  if (field || rows.at(-1).length || rows.length===1) rows.at(-1).push({input:field})
  else rows.pop()
  return rows
}

export function relocateReferences(world,tx,workbookId,oldSheetId,newSheetId,map,{previousFormulaSheets,moveBounds} = {}) {
  const sheets = records(world,'sheets').filter(sheet=>sheet.workbookId===workbookId && sheet.status!=='deleted')
  const destination = sheets.find(sheet=>sheet.id===newSheetId)
  const changed = []
  for(const cell of records(world,'cells')) {
    if (cell.workbookId!==workbookId) continue
    const input = inputOf(cell)
    if (!input.startsWith('=')) continue
    const previousSheetId = previousFormulaSheets?.get(cell.id) ?? cell.sheetId
    let split = false
    const next = mapReferences(input,tokens=>{
      const target = tokens[0].sheet
      const sheetId = target ? sheets.find(sheet=>sheet.name?.toLowerCase()===target.toLowerCase())?.id : previousSheetId
      const p = coord(tokens[0].ref)
      if (!p) return null
      if (tokens.length===1) {
        const moved = sheetId===oldSheetId && map.get(address(p.r,p.c))
        const targetSheet = moved ? destination : sheets.find(sheet=>sheet.id===sheetId)
        if (!moved && (tokens[0].sheet || cell.sheetId===previousSheetId || !targetSheet)) return null
        return {points:[moved || p],sheet:targetSheet.id!==cell.sheetId || tokens[0].sheet ? targetSheet.name : undefined}
      }
      const end = coord(tokens[1].ref)
      const sourceSheet = sheets.find(sheet=>sheet.id===sheetId)
      if (!end || !sourceSheet || tokens[1].sheet && tokens[1].sheet.toLowerCase() !== sourceSheet.name?.toLowerCase()) return null
      const bounds = {r1:Math.min(p.r,end.r),r2:Math.max(p.r,end.r),c1:Math.min(p.c,end.c),c2:Math.max(p.c,end.c)}
      if (sizeOf(bounds)>MAX_EDIT_CELLS) {
        if (moveBounds && sheetId===oldSheetId && overlap(bounds,moveBounds)) split = true
        return null
      }
      const mapped = [...points(bounds)].map(point=>sheetId===oldSheetId && map.get(address(point.r,point.c)) || point)
      const anyMoved = mapped.some(point=>point.moved)
      const allMoved = mapped.every(point=>point.moved)
      const targetSheet = allMoved ? destination : sourceSheet
      if (!targetSheet || (!anyMoved && (target || cell.sheetId===previousSheetId))) return null
      const edges = usedBounds(mapped.map(point=>({row:point.r,column:point.c})))
      if (anyMoved && ((!allMoved && newSheetId!==oldSheetId) || sizeOf(edges)!==mapped.length ||
        moveBounds && new Set(mapped.map(point=>address(point.r,point.c))).size!==mapped.length)) {
        split = true
        return null
      }
      const endpoints = [{r:p.r<=end.r?edges.r1:edges.r2,c:p.c<=end.c?edges.c1:edges.c2},{r:p.r<=end.r?edges.r2:edges.r1,c:p.c<=end.c?edges.c2:edges.c1}]
      return {points:endpoints,sheet:targetSheet.id!==cell.sheetId || tokens[0].sheet ? targetSheet.name : undefined}
    })
    if (moveBounds && split) return null
    if (next!==input) changed.push({cell, next})
  }
  return changed.map(({cell, next}) => {
    cell.input=cell.formula=next
    touch(cell,tx)
    return cell.id
  })
}

export function pasteRange(world,tx,workbookId,sheetId,at,clipboard) {
  const {rows,source,cut} = clipboard
  if (!rows.length) return null
  const width = rows.reduce((max,row)=>Math.max(max,row.length),0)
  const bounds = {r1:at.row,r2:at.row+rows.length-1,c1:at.column,c2:at.column+width-1}
  if (bounds.r2>1048576 || bounds.c2>16384 || sizeOf(bounds)>MAX_EDIT_CELLS) return null
  if (cut && source) {
    const previous = records(world,'cells')
    const moved = new Map()
    const priorSheets = new Map()
    const sourceIds = new Set(rows.flat().map(cell=>cell.id).filter(Boolean))
    for (const {r,c} of points(source)) moved.set(address(r,c),{r:r-source.r1+bounds.r1,c:c-source.c1+bounds.c1,moved:true})
    if (sheetId===clipboard.sheetId && rangeName(source)===rangeName(bounds)) return null
    const next = []
    const changes = []
    for (const cell of previous) {
      if (cell.sheetId===clipboard.sheetId && sourceIds.has(cell.id) && inside(cell,source)) {
        const old = address(cell.row,cell.column)
        const point = moved.get(old)
        priorSheets.set(cell.id,cell.sheetId)
        Object.assign(cell,{sheetId,row:point.r,column:point.c,address:address(point.r,point.c)})
        touch(cell,tx)
        changes.push({id:cell.id,before:old,after:cell.address})
        next.push(cell)
      } else if (cell.sheetId!==sheetId || !inside(cell,bounds)) next.push(cell)
      else changes.push({id:cell.id,before:address(cell.row,cell.column),after:null})
    }
    world.cells=next
    const rewrittenCellIds=relocateReferences(world,tx,workbookId,clipboard.sheetId,sheetId,moved,{previousFormulaSheets:priorSheets,moveBounds:source})
    if (!rewrittenCellIds) return {error:'This move would split a range used in a formula. Cut and paste the entire referenced range.'}
    return {workbookId,sheetId,targetIds:[...changes.map(change=>change.id),...rewrittenCellIds],details:{sourceSheetId:clipboard.sheetId,sourceRange:rangeName(source),range:rangeName(bounds),changes,rewrittenCellIds},calculate:true}
  }
  return editCells(world,tx,workbookId,sheetId,bounds,(r,c)=>{
    const item = rows[r-bounds.r1][c-bounds.c1] || {input:''}
    return {
      input:source ? translateFormula(item.input,bounds.r1-source.r1,bounds.c1-source.c1) : item.input,
      ...(source ? {format:item.format ?? null} : {}),
    }
  },{clear:true,details:{sourceRange:source?rangeName(source):null}})
}

export function mergeCells(world,tx,workbookId,sheet,bounds,unmerge) {
  const previous = sheet.mergedRanges || []
  const merges = previous.filter(name=>overlap(range(name),bounds))
  if (unmerge && !merges.length || !unmerge && (merges.length || sizeOf(bounds)<2)) return null
  const change = !unmerge && editCells(world,tx,workbookId,sheet.id,bounds,(r,c)=>r===bounds.r1&&c===bounds.c1?{format:{...(records(world,'cells').find(cell=>cell.sheetId===sheet.id&&cell.row===r&&cell.column===c)?.format || {}),horizontalAlign:'center'}}:{input:''},{clear:true})
  sheet.mergedRanges=unmerge ? previous.filter(name=>!merges.includes(name)) : [...previous,rangeName(bounds)]
  touch(sheet,tx)
  return {workbookId,sheetId:sheet.id,targetIds:[sheet.id,...(change?.targetIds || [])],details:{range:rangeName(bounds),before:previous,mergedRanges:sheet.mergedRanges,changes:change?.details?.changes || []},calculate:!!change}
}

export function undoPatch(before,next,workbookId,operation) {
  const old = new Map(records(before,'cells').filter(cell=>cell.workbookId===workbookId).map(cell=>[cell.id,cell]))
  const current = new Map(records(next,'cells').filter(cell=>cell.workbookId===workbookId).map(cell=>[cell.id,cell]))
  const changes = []
  for (const id of new Set([...old.keys(),...current.keys()])) {
    if (JSON.stringify(old.get(id))!==JSON.stringify(current.get(id))) changes.push({id,before:old.get(id),after:current.get(id)})
  }
  const previous = records(before,'sheets').find(sheet=>sheet.id===operation.sheetId)?.mergedRanges
  const later = records(next,'sheets').find(sheet=>sheet.id===operation.sheetId)?.mergedRanges
  return {operation,changes,merges:JSON.stringify(previous??[])===JSON.stringify(later??[]) ? null : {before:previous??[],after:later??[]}}
}

export function applyUndo(world,tx,patch,redo) {
  const field = redo?'after':'before'
  const {operation,changes,merges} = patch
  const ids = new Set(changes.map(change=>change.id))
  world.cells = records(world,'cells').filter(cell=>!ids.has(cell.id)).concat(changes.flatMap(change=>change[field]?[touch(structuredClone(change[field]),tx)]:[]))
  if (merges) {
    const sheet=records(world,'sheets').find(item=>item.id===operation.sheetId)
    if (sheet) {sheet.mergedRanges=structuredClone(merges[field]);touch(sheet,tx)}
  }
  return {workbookId:operation.workbookId,sheetId:operation.sheetId,targetIds:[...ids],details:{operationId:operation.id,range:operation.details.range},reversesOperationId:operation.id,calculate:true}
}
