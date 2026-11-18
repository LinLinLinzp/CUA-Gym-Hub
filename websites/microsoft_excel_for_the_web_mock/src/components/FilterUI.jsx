import React, {useState} from 'react'
import {Actions, Modal} from './ui.jsx'
import {columnChoices} from '../utils/filters.js'
import {range, rangeName} from '../utils/coordinates.js'

const operators = {
  text:[['equals','Equals'],['contains','Contains'],['beginsWith','Begins With']],
  number:[['equals','Equals'],['greaterThan','Greater Than'],['lessThan','Less Than'],['between','Between']],
  date:[['before','Before'],['after','After'],['between','Between']],
}
export function FilterMenu({title,choices,allChoices,filter,onApply,onClear,onSort,onCustom,close,readOnly,point}) {
  const [query,setQuery]=useState('')
  const [initial]=useState(()=>new Set(filter?.kind==='values' ? filter.values || [] : allChoices.map(([value])=>value)))
  const [selected,setSelected]=useState(initial)
  const [selectAll,setSelectAll]=useState(false)
  const search=query.trim().toLowerCase()
  const visible=choices.filter(([,label])=>label.toLowerCase().includes(search))
  const changed=selected.size!==initial.size || [...selected].some(value=>!initial.has(value))
  const checkboxChoices=search ? visible : allChoices
  const all=checkboxChoices.length>0 && checkboxChoices.every(([value])=>selected.has(value)) &&
    (search || !filter || changed || selectAll)
  const byKind=choices.some(([value])=>typeof value==='number')?'number':choices.some(([value])=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))?'date':'text'
  function confirm() {
    if (selectAll) onClear()
    else if (!changed) close()
    else if (allChoices.every(([value])=>selected.has(value))) onClear()
    else onApply({kind:'values',values:[...selected],predicates:[],join:'and'})
  }
  function toggleAll() {
    const next=new Set(selected)
    checkboxChoices.forEach(([value])=>all?next.delete(value):next.add(value))
    setSelected(next)
    setSelectAll(!search && !all)
  }
  function toggleValue(value) {
    const next=new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setSelected(next)
    setSelectAll(false)
  }
  return <Modal title={`Filter ${title}`} close={close} className="filter-dialog" point={point}>
    <div className="filter-tools">
      <button disabled={readOnly} onClick={()=>onSort('asc')}>{byKind==='number'?'Sort Smallest to Largest':byKind==='date'?'Sort Oldest to Newest':'Sort A to Z'}</button>
      <button disabled={readOnly} onClick={()=>onSort('desc')}>{byKind==='number'?'Sort Largest to Smallest':byKind==='date'?'Sort Newest to Oldest':'Sort Z to A'}</button>
      <button disabled={!filter||readOnly} onClick={onClear}>Clear Filter from {title}</button>
      <select aria-label="Custom filter type" value="" disabled={readOnly} onChange={e=>onCustom(e.target.value)}>
        <option value="" disabled>{byKind==='number'?'Number Filters':byKind==='date'?'Date Filters':'Text Filters'}</option>
        {[byKind,...Object.keys(operators).filter(kind=>kind!==byKind)].map(kind=><option key={kind} value={kind}>{kind[0].toUpperCase()+kind.slice(1)} Filters…</option>)}
      </select>
    </div>
    <input type="search" placeholder="Search" aria-label="Search filter values" value={query} onChange={event=>setQuery(event.target.value)}/>
    <div className="filter-checklist">
      <label className="inline"><input type="checkbox" checked={!!all} disabled={!checkboxChoices.length||readOnly} onChange={toggleAll}/>(Select All)</label>
      {visible.map(([value,label])=><label className="inline" key={JSON.stringify(value)}>
        <input type="checkbox" disabled={readOnly} checked={selected.has(value)} onChange={()=>toggleValue(value)}/>{label}
      </label>)}
      {!visible.length&&<p className="muted">No matching values.</p>}
    </div>
    <Actions close={close} disabled={changed&&!selected.size||readOnly} onAction={confirm}/>
  </Modal>
}
export function CustomFilter({kind,filter,close,onApply}) {
  const options=operators[kind]
  const old=filter?.kind===kind?filter:null
  const [rows,setRows]=useState(()=>[0,1].map(i=>({operator:old?.predicates?.[i]?.operator ?? (i===0?options[0][0]:''),value:old?.predicates?.[i]?.value ?? '',value2:old?.predicates?.[i]?.value2 ?? ''})))
  const [join,setJoin]=useState(old?.join ?? 'and')
  const [error,setError]=useState('')
  const type=kind==='number'?'number':kind==='date'?'date':'text'
  const update=(i,field,value)=>setRows(items=>items.map((item,index)=>i===index?{...item,[field]:value}:item))
  function submit(event) {
    event.preventDefault()
    const selected=rows.filter(row=>row.operator)
    const valid=value=>String(value).trim()!=='' && (kind!=='number'||Number.isFinite(Number(value))) && (kind!=='date'||Number.isFinite(Date.parse(value)))
    if (selected.some(row=>!valid(row.value)||row.operator==='between'&&(!valid(row.value2)||(type==='number'?Number(row.value)>Number(row.value2):row.value>row.value2)))) {
      setError('Enter valid filter values in ascending order.');return
    }
    onApply({kind,values:[],join,predicates:selected.map(({operator,value,value2})=>({operator,value:kind==='number'?Number(value):value,...operator==='between'&&{value2:kind==='number'?Number(value2):value2}}))})
  }
  return <Modal title={`${kind[0].toUpperCase()+kind.slice(1)} Filters`} close={close}>
    <form onSubmit={submit}>{rows.map((row,i)=><React.Fragment key={i}>
      {i===1&&<label>Match conditions<select value={join} onChange={event=>setJoin(event.target.value)}><option value="and">And</option><option value="or">Or</option></select></label>}
      <div className="filter-predicate">
        <label>Condition {i+1}<select value={row.operator} onChange={event=>update(i,'operator',event.target.value)}>{i===1&&<option value="">None</option>}{options.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        {row.operator&&<label>Value {i+1}<input type={type} step={type==='number'?'any':undefined} value={row.value} onChange={event=>update(i,'value',event.target.value)}/></label>}
        {row.operator==='between'&&<label>Upper value {i+1}<input type={type} step={type==='number'?'any':undefined} value={row.value2} onChange={event=>update(i,'value2',event.target.value)}/></label>}
      </div>
    </React.Fragment>)}{error&&<p role="alert" className="error">{error}</p>}<Actions close={close} label="Apply"/></form>
  </Modal>
}

export const tableStyles=[['TableStyleMedium2','#4472c4','Blue'],['TableStyleMedium4','#198453','Green'],['TableStyleMedium3','#e67832','Orange'],['TableStyleLight1','#717d75','Gray']]
export function TableDialog({bounds,style,onCreate,close}) {
  const [text,setText]=useState(rangeName(bounds))
  const [headers,setHeaders]=useState(true)
  const [error,setError]=useState('')
  return <Modal title="Create Table" close={close}>
    <form onSubmit={e=>{e.preventDefault();setError(onCreate(range(text),headers,style))}}>
      <label>Where is the data for your table?<input value={text} onChange={event=>setText(event.target.value)}/></label>
      <label className="inline"><input type="checkbox" checked={headers} onChange={event=>setHeaders(event.target.checked)}/> My table has headers</label>
      {error&&<p className="error" role="alert">{error}</p>}<Actions close={close}/>
    </form>
  </Modal>
}
export function SortDialog({scope,defaultColumn,cells,ownBounds,close,onSort}) {
  const [expand,setExpand]=useState(true)
  const bounds=expand?scope.bounds:ownBounds
  const options=columnChoices(bounds,cells)
  const [keys,setKeys]=useState([{column:defaultColumn||options[0].column,direction:'asc'}])
  const [hasHeaders,setHeaders]=useState(true)
  const [error,setError]=useState('')
  const update=(index,key,value)=>setKeys(items=>items.map((item,i)=>i===index?{...item,[key]:value}:item))
  return <Modal title="Sort" close={close} wide>
    <form onSubmit={event=>{
      event.preventDefault()
      if (new Set(keys.map(key=>key.column)).size<keys.length || keys.some(key=>key.column<bounds.c1||key.column>bounds.c2)) {setError('Select a different column for each sort level.');return}
      onSort(expand?scope:{bounds,range:rangeName(bounds),tableId:null},keys,hasHeaders)
    }}>
      <p className="muted">Range {rangeName(bounds)}</p>
      {ownBounds&&<label>Selection<select value={expand?'expand':'current'} onChange={event=>setExpand(event.target.value==='expand')}><option value="expand">Expand the selection</option><option value="current">Continue with the current selection</option></select></label>}
      <label className="inline"><input type="checkbox" checked={hasHeaders} onChange={event=>setHeaders(event.target.checked)}/> My data has headers</label>
      {keys.map((key,index)=><div className="filter-predicate" key={index}>
        <label>{index===0?'Sort by':'Then by'}<select value={key.column} onChange={event=>update(index,'column',Number(event.target.value))}>{options.map(option=><option key={option.column} value={option.column}>{option.label}</option>)}</select></label>
        <label>Order<select value={key.direction} onChange={event=>update(index,'direction',event.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
        {index>0&&<button type="button" onClick={()=>setKeys(items=>items.filter((_,i)=>i!==index))}>Remove</button>}
      </div>)}
      <button type="button" disabled={keys.length>=options.length} onClick={()=>setKeys([...keys,{column:options.find(option=>!keys.some(key=>key.column===option.column)).column,direction:'asc'}])}>+ Add level</button>
      {error&&<p className="error" role="alert">{error}</p>}<Actions close={close}/>
    </form>
  </Modal>
}
