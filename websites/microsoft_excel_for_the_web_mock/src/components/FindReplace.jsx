import React,{useMemo,useState} from 'react'
import {asCellMap,inputOf} from '../utils/cells.js'
import {filterRanges,matchesFilters,validFilters} from '../utils/filters.js'

function patternFor(query,whole,caseSensitive) {
  const escaped=query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  return new RegExp(whole?`^${escaped}$`:escaped,caseSensitive?'g':'gi')
}
export function FindReplace({world,sheet,sheets,cells,goTo,readOnly,replaceCells,clearFilter}) {
  const [query,setQuery]=useState('')
  const [replacement,setReplacement]=useState('')
  const [scope,setScope]=useState('sheet')
  const [caseSensitive,setCase]=useState(false)
  const [whole,setWhole]=useState(false)
  const [formulas,setFormulas]=useState(false)
  const [visibleOnly,setVisibleOnly]=useState(true)
  const [selected,setSelected]=useState(null)
  const [message,setMessage]=useState('')
  const matches=useMemo(()=>{
    if(!query)return []
    const pattern=patternFor(query,whole,caseSensitive)
    return (scope==='sheet'?[sheet]:sheets).filter(Boolean).flatMap(current=>{
      const all=cells.filter(cell=>cell.sheetId===current.id)
      const filters=visibleOnly?validFilters(world,current,filterRanges(world,current)):[]
      const lookup=asCellMap(all)
      return all.filter(cell=>{
        if (!matchesFilters(filters,lookup,cell.row)) return false
        if (visibleOnly && (current.hiddenRows?.includes(cell.row)||current.hiddenColumns?.includes(cell.column))) return false
        const text=formulas?inputOf(cell):String(cell.error || (cell.value ?? ''))
        pattern.lastIndex=0
        return pattern.test(text)
      }).sort((a,b)=>a.row-b.row||a.column-b.column)
    })
  },[query,whole,caseSensitive,scope,sheets,sheet,world,cells,formulas,visibleOnly])
  const index=matches.findIndex(cell=>cell.id===selected)
  function step(direction) {
    if(!matches.length)return
    const next=index<0?direction>0?0:matches.length-1:(index+direction+matches.length)%matches.length
    const cell=matches[next]
    setSelected(cell.id)
    setMessage('')
    goTo(cell)
  }
  function replace(all) {
    const candidates=all?matches:[matches[index<0?0:index]].filter(Boolean)
    const changes=candidates.flatMap(cell=>{
      if(cell.formula&&!formulas)return []
      const input=inputOf(cell)
      const text=!formulas&&input.startsWith("'")?input.slice(1):input
      const next=text.replace(patternFor(query,whole,caseSensitive),()=>replacement)
      return text!==next?[{...cell,input:!formulas&&input.startsWith("'")?"'"+next:next}]:[]
    })
    if(replaceCells(changes))setMessage(`Replaced ${changes.length} ${changes.length===1?'cell':'cells'}.`)
    else setMessage('No replaceable cells. Select Look in formulas to replace formula text.')
  }
  const limited=sheet && validFilters(world,sheet,filterRanges(world,sheet)).length>0
  return <div className="find-panel">
    <label className="field">Find what<input value={query} onChange={event=>{setQuery(event.target.value);setSelected(null);setMessage('')}} onKeyDown={event=>{if(event.key==='Enter')step(event.shiftKey?-1:1)}}/></label>
    {!readOnly&&<label className="field">Replace with<input value={replacement} onChange={event=>setReplacement(event.target.value)}/></label>}
    <label className="field">Search in<select value={scope} onChange={event=>setScope(event.target.value)}><option value="sheet">Worksheet</option><option value="workbook">Workbook</option></select></label>
    <label className="inline"><input type="checkbox" checked={caseSensitive} onChange={event=>setCase(event.target.checked)}/> Match case</label>
    <label className="inline"><input type="checkbox" checked={whole} onChange={event=>setWhole(event.target.checked)}/> Match entire cell</label>
    <label className="inline"><input type="checkbox" checked={formulas} onChange={event=>setFormulas(event.target.checked)}/> Look in formulas</label>
    <label className="inline"><input type="checkbox" checked={visibleOnly} onChange={event=>setVisibleOnly(event.target.checked)}/> Visible cells only</label>
    {limited&&visibleOnly&&<p className="muted">Filters are active. Include hidden rows by turning off Visible cells only.{!readOnly&&<button onClick={clearFilter}>Clear worksheet filters</button>}</p>}
    <div className="find-buttons"><button className="secondary" onClick={()=>step(-1)} disabled={!matches.length}>Previous</button><button className="secondary" onClick={()=>step(1)} disabled={!matches.length}>Find next</button></div>
    {!readOnly&&<div className="find-buttons"><button className="secondary" onClick={()=>replace(false)} disabled={!matches.length}>Replace</button><button className="primary" onClick={()=>replace(true)} disabled={!matches.length}>Replace all</button></div>}
    <p className="muted" role="status">{message || (query?`${matches.length} ${matches.length===1?'match':'matches'}${index>=0?` · ${index+1} of ${matches.length}`:''}`:'')}</p>
  </div>
}
