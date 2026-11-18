import {findRecord} from '../model.js'
import {address,inside} from './coordinates.js'
import {editCells,parseClipboard,sizeOf} from './cells.js'
import {literal} from './formulas.js'
import {cleanBookName,createWorkbook} from './workbooks.js'

export function parseCsv(text) {
  return parseClipboard(text.replace(/^\uFEFF/,''),',').map(row=>row.map(cell=>cell.input))
}
function convert(value,mode) {
  if (value==='')return ''
  const parsed=literal(value)
  if (mode==='text')return "'"+value
  if (mode==='number')return parsed.valueType==='number'?String(parsed.value):null
  if (mode==='date')return parsed.valueType==='date'?String(parsed.value):null
  return value.startsWith('=') || value.startsWith("'") || /^0\d+$/.test(value) ? "'"+value : value
}
export function mapCsv(rows,mapping,headers) {
  const errors=[]
  const inputs=rows.map((row,r)=>row.map((value,c)=>{
    const mapped=convert(value,headers&&r===0?'text':mapping[c] || 'auto')
    if (mapped===null)errors.push(address(r+1,c+1))
    return mapped
  }))
  return {inputs,errors}
}
export function importCsv(world,tx,{filename,inputs,mapping,headers}) {
  if (!inputs.length || !inputs.some(row=>row.some(value=>value)))return null
  const width=inputs.reduce((max,row)=>Math.max(max,row.length),0)
  const bounds={r1:1,r2:inputs.length,c1:1,c2:width}
  if(width>16384 || sizeOf(bounds)>15000)return null
  const created=createWorkbook(world,tx,'blank')
  const workbook=findRecord(world,'workbooks',created.workbookId)
  const sheet=findRecord(world,'sheets',created.sheetId)
  const original=cleanBookName(filename.replace(/\.csv$/i,'').replace(/["*:<>?/\\|]/g,'-'))
  workbook.name=original || workbook.name
  sheet.name='Imported data'
  sheet.columnWidths=Object.fromEntries(Array.from({length:width},(_,i)=>[i+1,104]))
  const result=editCells(world,tx,workbook.id,sheet.id,bounds,(row,column)=>{
    const input=inputs[row-1][column-1]
    return input?{input,...(headers&&row===1?{format:{bold:true,fillColor:'#e9f5ee'}}:{})}:null
  })
  return {workbookId:workbook.id,sheetId:sheet.id,targetIds:[workbook.id,sheet.id,...(result?.targetIds || [])],details:{filename,rows:inputs.length,columns:width,mapping,headers},calculate:true}
}
const quote=value=>/[,"\r\n]/.test(value)?'"'+value.replaceAll('"','""')+'"':value
export function toCsv(cells,bounds) {
  const selected=cells.filter(cell=>inside(cell,bounds))
  const lookup=new Map(selected.map(cell=>[address(cell.row,cell.column),cell]))
  const rows=[]
  for (let row=bounds.r1;row<=bounds.r2;row++) {
    const values=[]
    for (let column=bounds.c1;column<=bounds.c2;column++) {
      const cell=lookup.get(address(row,column))
      const value=cell?.error ?? cell?.value ?? ''
      values.push(quote(typeof value==='boolean'?value?'TRUE':'FALSE':String(value)))
    }
    rows.push(values.join(','))
  }
  return rows.join('\r\n')
}
