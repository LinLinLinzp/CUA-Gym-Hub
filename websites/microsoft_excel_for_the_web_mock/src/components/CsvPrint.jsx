import React,{useEffect,useState} from 'react'
import {createPortal} from 'react-dom'
import {address,colName} from '../utils/coordinates.js'
import {importCsv,mapCsv,parseCsv,toCsv} from '../utils/csv.js'
import {bookPath} from '../utils/workbooks.js'
import {useStore} from '../store.jsx'
import {Actions,Modal,useAppNavigate} from './ui.jsx'
import {displayValue} from './Grid.jsx'

const modes=[['auto','Automatic'],['text','Text'],['number','Number'],['date','Date (YYYY-MM-DD)']]
export function ImportDialog({close}) {
  const {dispatch,notify}=useStore()
  const navigate=useAppNavigate()
  const [filename,setFilename]=useState('')
  const [rows,setRows]=useState([])
  const [headers,setHeaders]=useState(true)
  const [mapping,setMapping]=useState([])
  const [error,setError]=useState('')
  const width=mapping.length
  const preview=rows.slice(0,headers?6:5)
  async function openFile(event) {
    const file=event.target.files?.[0]
    setFilename('')
    setRows([])
    setMapping([])
    if(!file)return
    if(file.size>1000000) {setError('Choose a CSV file under 1 MB.');return}
    try {
      const parsed=parseCsv(await file.text())
      const count=parsed.reduce((max,row)=>Math.max(max,row.length),0)
      if(!count || !parsed.some(row=>row.some(Boolean))) {setError('Choose a CSV file with data.');return}
      if(count*parsed.length>15000) {setError('Choose a CSV file with at most 15,000 cells.');return}
      setFilename(file.name)
      setMapping(Array(count).fill('auto'))
      setRows(parsed)
      setError('')
    } catch {setError('The CSV file could not be read.')}
  }
  function submit(event) {
    event.preventDefault()
    const {inputs,errors}=mapCsv(rows,mapping,headers)
    if (errors.length) {setError(`Check the mapped type for ${errors.slice(0,5).join(', ')}.`);return}
    const result=dispatch('workbook.import_csv',(state,tx)=>importCsv(state,tx,{filename,inputs,mapping,headers}))
    if(!result)return
    const {workbookId,sheetId}=result.operation
    notify('CSV imported')
    close()
    navigate(bookPath(workbookId,sheetId))
  }
  return <Modal title="Import CSV" close={close} wide>
    <form onSubmit={submit}>
      <label>Choose a CSV file<input type="file" accept=".csv,text/csv" onChange={openFile}/></label>
      {!!rows.length&&<>
        <label className="inline"><input type="checkbox" checked={headers} onChange={event=>setHeaders(event.target.checked)}/> First row contains headers</label>
        <p className="muted">{rows.length} rows · {width} columns</p>
        <div className="csv-preview"><table><thead><tr>{mapping.map((mode,i)=><th key={i}>
          <label>{headers&&rows[0]?.[i] || colName(i+1)}<select aria-label={`Type for column ${colName(i+1)}`} value={mode} onChange={event=>{setMapping(mapping.map((value,index)=>index===i?event.target.value:value));setError('')}}>
            {modes.map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select></label>
        </th>)}</tr></thead><tbody>{preview.slice(headers?1:0).map((row,r)=><tr key={r}>{mapping.map((_,c)=><td key={c}>{row[c] || ''}</td>)}</tr>)}</tbody></table></div>
      </>}
      {error&&<p className="error" role="alert">{error}</p>}
      <Actions close={close} label="Import" disabled={!rows.length}/>
    </form>
  </Modal>
}
export function downloadSheet(name,cells,bounds) {
  const url=URL.createObjectURL(new Blob(['\uFEFF',toCsv(cells,bounds)],{type:'text/csv;charset=utf-8'}))
  const download=document.createElement('a')
  download.href=url
  download.download=`${name.replace(/[\\/:*?"<>|]/g,'-')}.csv`
  download.click()
  setTimeout(()=>URL.revokeObjectURL(url),5000)
}
export function PrintDialog({close,onPrint}) {
  const [scope,setScope]=useState('sheet')
  return <Modal title="Print worksheet" close={close}>
    <form onSubmit={event=>{event.preventDefault();onPrint(scope)}}>
      <label>Print<select value={scope} onChange={event=>setScope(event.target.value)}><option value="sheet">Active worksheet</option><option value="selection">Current selection</option></select></label>
      <Actions close={close} label="Print"/>
    </form>
  </Modal>
}
export function PrintSheet({title,cells,bounds,finish}) {
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>window.print())
    window.addEventListener('afterprint',finish,{once:true})
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('afterprint',finish)}
  },[])
  const lookup=new Map(cells.map(cell=>[address(cell.row,cell.column),cell]))
  const rows=Array.from({length:bounds.r2-bounds.r1+1},(_,i)=>bounds.r1+i)
  const columns=Array.from({length:bounds.c2-bounds.c1+1},(_,i)=>bounds.c1+i)
  return createPortal(<main className="print-sheet"><h1>{title}</h1>
    <table><thead><tr><th/>{columns.map(column=><th key={column}>{colName(column)}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={row}><th>{row}</th>{columns.map(column=><td key={column}>{displayValue(lookup.get(address(row,column)))}</td>)}</tr>)}</tbody>
    </table>
  </main>,document.body)
}
