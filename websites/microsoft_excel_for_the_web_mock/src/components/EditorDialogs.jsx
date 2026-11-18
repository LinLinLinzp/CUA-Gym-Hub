import React, {useState} from 'react'
import {colName} from '../utils/coordinates.js'
import {signatures} from '../utils/formulas.js'
import {Actions,Modal} from './ui.jsx'

const theme=['#FFFFFF','#000000','#E8E8E8','#0E2841','#156082','#E97132','#196B24','#0F9ED5','#A02B93','#4EA72E']
const standard=['#C00000','#FF0000','#FFC000','#FFFF00','#92D050','#00B050','#00B0F0','#0070C0','#002060','#7030A0']
const shades=[.8,.6,.4,-.25,-.5]
const tint=(hex,factor)=>'#'+[1,3,5].map(i=>{
  const n=parseInt(hex.slice(i,i+2),16)
  return Math.round(factor>0?n+(255-n)*factor:n*(1+factor)).toString(16).padStart(2,'0')
}).join('').toUpperCase()
export function Colors({title,close,select,clearLabel}) {
  const choices=values=><div className="color-grid">{values.map((color,i)=><button key={color+i} type="button" aria-label={color} title={color} style={{background:color}} onClick={()=>select(color)}/>)}</div>
  return <Modal title={title} close={close}><h3>Theme Colors</h3>{choices([...theme,...shades.flatMap(factor=>theme.map(color=>tint(color,factor)))])}<h3>Standard Colors</h3>{choices(standard)}<button className="secondary" onClick={()=>select(null)}>{clearLabel}</button></Modal>
}
export function SheetChooser({mode,sheets,item,close,apply}) {
  const hidden=mode==='unhide'
  const [choice,setChoice]=useState(hidden?sheets[0]?.id ?? '':String(item.position ?? 0))
  return <Modal title={hidden?'Unhide sheet':'Reorder sheet'} close={close}>
    {!sheets.length ? <p>No hidden sheets.</p>:<form onSubmit={event=>{event.preventDefault();apply(hidden?choice:Number(choice))}}>
      <label>{hidden?'Sheet':'Move to position'}<select value={choice} onChange={event=>setChoice(event.target.value)}>{sheets.map((sheet,i)=><option key={sheet.id} value={hidden?sheet.id:i}>{hidden?sheet.name:`${i+1} — ${sheet.name}`}</option>)}</select></label>
      <Actions close={close} disabled={!choice && hidden}/>
    </form>}
  </Modal>
}
export function FunctionDialog({close,insert}) {
  const [query,setQuery]=useState('')
  const [selection,setSelection]=useState('SUM')
  const options=Object.keys(signatures).filter(name=>name.includes(query.trim().toUpperCase()))
  const current=options.includes(selection)?selection:options[0]
  return <Modal title="Insert Function" close={close} wide>
    <form onSubmit={event=>{event.preventDefault();if(current)insert(current)}}>
      <label>Search for a function<input type="search" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      {options.length?<label>Choose a function<select size={Math.min(8,Math.max(2,options.length))} value={current} onChange={event=>setSelection(event.target.value)}>{options.map(name=><option key={name}>{name}</option>)}</select></label>:<p>No functions match your search.</p>}
      {current&&<p><code>{signatures[current]}</code></p>}
      <Actions close={close} label="Insert" disabled={!current}/>
    </form>
  </Modal>
}
export function PasteDialog({close,paste}) {
  const [text,setText]=useState('')
  return <Modal title="Paste cells" close={close}><form onSubmit={event=>{event.preventDefault();if(text)paste(text)}}>
    <label>Paste tab-separated values<textarea value={text} rows={6} onChange={event=>setText(event.target.value)}/></label>
    <Actions close={close} disabled={!text} label="Paste"/>
  </form></Modal>
}

export function ResizeDimension({dimension,initial,close,apply}) {
  const [size,setSize]=useState(initial)
  const min=dimension==='row'?12:24
  return <Modal title={dimension==='row'?'Row height':'Column width'} close={close}>
    <form onSubmit={event=>{event.preventDefault();if(Number(size)>=min&&Number(size)<=600)apply(Number(size))}}>
      <label>Pixels<input type="number" min={min} max={600} value={size} onChange={event=>setSize(event.target.value)} required/></label>
      <Actions close={close} label="Apply"/>
    </form>
  </Modal>
}
export function UnhideDimensions({dimension,indices,close,apply}) {
  const [selected,setSelected]=useState(indices)
  return <Modal title={dimension==='row'?'Unhide rows':'Unhide columns'} close={close}>
    {indices.length?<form onSubmit={event=>{event.preventDefault();apply(selected)}}>
      <p>Select the hidden {dimension==='row'?'rows':'columns'} to show.</p>
      <div className="filter-checklist">{indices.map(index=><label className="inline" key={index}><input type="checkbox" checked={selected.includes(index)}
        onChange={event=>setSelected(event.target.checked?[...selected,index]:selected.filter(item=>item!==index))}/>{dimension==='row'?index:colName(index)}</label>)}</div>
      <Actions close={close} label="Unhide" disabled={!selected.length}/>
    </form>:<p>There are no hidden {dimension==='row'?'rows':'columns'}.</p>}
  </Modal>
}
