import React, {useRef,useState} from 'react'
import {ChevronLeft, ChevronRight, List, MoreHorizontal, Plus} from 'lucide-react'
import {eventPoint,Menu} from './ui.jsx'

export function SheetBar({sheets,sheet,change,readOnly,showDialog,onRename,rename,setRename}) {
  const [menu,setMenu]=useState(null)
  const list=useRef(null)
  return <div className="sheet-bar">
    <button className="icon" title="Scroll sheet tabs left" aria-label="Scroll sheet tabs left" onClick={()=>list.current.scrollBy({left:-160})}><ChevronLeft size={15}/></button>
    <button className="icon" title="Scroll sheet tabs right" aria-label="Scroll sheet tabs right" onClick={()=>list.current.scrollBy({left:160})}><ChevronRight size={15}/></button>
    <button className="icon" aria-label="All Sheets" title="All Sheets" onClick={event=>setMenu({all:true,point:{x:eventPoint(event).x,y:window.innerHeight-36*(sheets.length+1)-40}})}><List size={17}/></button>
    <div className="sheet-list" role="tablist" aria-label="Worksheets" ref={list}>
      {sheets.map(item=><div className={`sheet-tab ${item.id===sheet?.id?'active-tab':''}`} key={item.id} style={{'--tab-color':item.tabColor || undefined}} draggable={!readOnly && rename?.id!==item.id}
        onDragStart={event=>{event.dataTransfer.setData('text/sheet-id',item.id);event.dataTransfer.effectAllowed='move'}}
        onDragOver={event=>{if(!readOnly&&event.dataTransfer.types.includes('text/sheet-id'))event.preventDefault()}}
        onDrop={event=>{const id=event.dataTransfer.getData('text/sheet-id');if(id&&!readOnly){event.preventDefault();change('reorder',id,item.position??0)}}}
        onContextMenu={event=>{event.preventDefault();setMenu({sheet:item,point:eventPoint(event)})}}>
        {rename?.id===item.id?<form onSubmit={event=>{event.preventDefault();onRename()}}><input aria-label="Sheet name" autoFocus value={rename.name} aria-invalid={!!rename.error} onChange={event=>setRename({...rename,name:event.target.value,error:null})} onKeyDown={event=>{if(event.key==='Escape')setRename(null)}}/><button type="submit" title="Save sheet name">✓</button>{rename.error&&<span className="sheet-error error" role="alert">{rename.error}</span>}</form>:
          <><button role="tab" aria-selected={item.id===sheet?.id} onClick={()=>change('select',item.id)} onDoubleClick={()=>!readOnly&&setRename({id:item.id,name:item.name||''})}>{item.name || 'Worksheet'}</button>
          {item.id===sheet?.id&&<button className="icon" aria-label={`Actions for ${item.name || 'worksheet'}`} onClick={event=>setMenu({sheet:item,point:eventPoint(event)})}><MoreHorizontal size={15}/></button>}</>}
      </div>)}
    </div>
    <button className="icon" aria-label="New sheet" title="New sheet" disabled={readOnly} onClick={()=>change('add')}><Plus size={17}/></button>
    {menu&&<Menu point={menu.point} label={menu.all?'All Sheets':'Sheet actions'} close={()=>setMenu(null)} items={menu.all?[
      ...sheets.map(item=>({label:item.name || 'Worksheet',action:()=>change('select',item.id)})),
      {label:'Unhide…',disabled:readOnly,action:()=>showDialog({type:'unhide'})},
    ]:[
      {label:'Rename',disabled:readOnly,action:()=>setRename({id:menu.sheet.id,name:menu.sheet.name||''})},
      {label:'Duplicate',disabled:readOnly,action:()=>change('duplicate',menu.sheet.id)},
      {label:'Reorder…',disabled:readOnly,action:()=>showDialog({type:'reorder',item:menu.sheet})},
      {label:'Tab Color…',disabled:readOnly,action:()=>showDialog({type:'tabColor',item:menu.sheet})},
      {label:'Hide',disabled:readOnly,action:()=>change('hide',menu.sheet.id)},
      {label:'Unhide…',disabled:readOnly,action:()=>showDialog({type:'unhide'})},
      {label:'Delete',disabled:readOnly,action:()=>showDialog({type:'sheetDelete',item:menu.sheet})},
    ]}/>}
  </div>
}
