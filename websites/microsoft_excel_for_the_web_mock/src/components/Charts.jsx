import React,{useRef,useState} from 'react'
import {Grip, Settings2, Trash2} from 'lucide-react'
import {inside,range} from '../utils/coordinates.js'
import {Actions,Modal} from './ui.jsx'

export const chartTypes=[['column','Column chart'],['line','Line chart'],['pie','Pie chart']]
const colors=['#107c41','#417ec3','#e0862e','#a25eb0','#427f78','#b94858','#5379a7']
const labelFor=type=>chartTypes.find(([value])=>type===value)?.[1] || 'Chart'
function series(cells,sourceRange) {
  const bounds=range(sourceRange)
  const rows=new Map()
  for (const cell of cells) {
    if(!inside(cell,bounds))continue
    if(!rows.has(cell.row))rows.set(cell.row,[])
    rows.get(cell.row).push(cell)
  }
  return [...rows].sort(([a],[b])=>a-b).flatMap(([row,record])=>{
    const values = record.filter(cell=>cell.valueType==='number'&&Number.isFinite(cell.value))
    return values.sort((a,b)=>a.column-b.column).map(cell=>({
      label:String(record.find(item=>item.column<cell.column&&item.valueType==='string')?.value ?? cell.address ?? row),
      value:cell.value,
    }))
  }).slice(0,60)
}
function Plot({chart,cells}) {
  const data=series(cells,chart.sourceRange)
  if(!data.length)return <p className="muted chart-empty">No numeric values in {chart.sourceRange}.</p>
  if(chart.type==='pie') {
    const positive=data.filter(item=>item.value>0)
    const total=positive.reduce((sum,item)=>sum+item.value,0)
    if(!total)return <p className="muted chart-empty">Pie charts show positive values.</p>
    let start=-Math.PI/2
    return <svg viewBox="0 0 420 240" role="img" aria-label={chart.title}>
      {positive.map(({value,label},i)=>{
        const angle=value/total*2*Math.PI
        const next=start+angle
        const origin=[132+Math.cos(start)*96,120+Math.sin(start)*96]
        const target=[132+Math.cos(next)*96,120+Math.sin(next)*96]
        start=next
        return <React.Fragment key={i}>
          {positive.length===1?<circle cx="132" cy="120" r="96" fill={colors[i%colors.length]}><title>{label} {value}</title></circle>:
            <path d={`M132,120 L${origin.join(',')} A96,96 0 ${angle>Math.PI?1:0},1 ${target.join(',')} Z`} fill={colors[i%colors.length]} stroke="white"><title>{label} {value}</title></path>}
          {i<8&&<text x="255" y={28+25*i} fontSize="12" fill={colors[i%colors.length]}>{label.slice(0,20)}</text>}
        </React.Fragment>
      })}
    </svg>
  }
  const min=Math.min(0,...data.map(item=>item.value))
  const max=Math.max(0,...data.map(item=>item.value))
  const scale=value=>206-186*(value-min)/(max-min || 1)
  const baseline=scale(0)
  const step=360/data.length
  const center=i=>45+(i+.5)*step
  return <svg viewBox="0 0 420 240" role="img" aria-label={chart.title}>
    {[min,(min+max)/2,max].map((value,i)=><g key={i}><line x1="44" x2="405" y1={scale(value)} y2={scale(value)} stroke="#dce6df"/><text x="4" y={scale(value)+4} fontSize="9">{Number(value.toPrecision(4))}</text></g>)}
    {chart.type==='line'&&<polyline points={data.map((item,i)=>`${center(i)},${scale(item.value)}`).join(' ')} fill="none" stroke="#107c41" strokeWidth="2.5"/>}
    {data.map(({label,value},i)=><g key={i}>
      {chart.type==='line'?<circle cx={center(i)} cy={scale(value)} r="3.5" fill="#107c41"><title>{label} {value}</title></circle>:
        <rect x={center(i)-step*.32} y={Math.min(baseline,scale(value))} width={step*.64} height={Math.abs(scale(value)-baseline)} fill="#107c41"><title>{label} {value}</title></rect>}
      {data.length<=10&&<text x={center(i)} y="224" textAnchor="middle" fontSize="10">{label.slice(0,9)}</text>}
    </g>)}
  </svg>
}
export function ChartOverlay({chart,cells,change,edit,remove,readOnly}) {
  const motion=useRef(null)
  const [preview,setPreview]=useState(null)
  const position=preview?.position || chart.position || {x:180,y:70}
  const size=preview?.size || chart.size || {width:400,height:260}
  function begin(event,mode) {
    if(readOnly||event.button!==0)return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    motion.current={mode,x:event.clientX,y:event.clientY,position,size,next:null}
  }
  function drag(event) {
    const gesture=motion.current
    if(!gesture)return
    const x=event.clientX-gesture.x, y=event.clientY-gesture.y
    gesture.next=gesture.mode==='move' ? {position:{x:Math.max(0,gesture.position.x+x),y:Math.max(0,gesture.position.y+y)}} :
      {size:{width:Math.max(240,gesture.size.width+x),height:Math.max(170,gesture.size.height+y)}}
    setPreview(gesture.next)
  }
  function stop(commit) {
    const gesture=motion.current
    if(commit && gesture?.next) change(gesture.mode==='move'?'move':'resize',gesture.next)
    motion.current=null
    setPreview(null)
  }
  const pointer=(mode)=>({onPointerDown:event=>begin(event,mode),onPointerMove:drag,onPointerUp:()=>stop(true),onPointerCancel:()=>stop(false)})
  return <article className="chart-overlay" aria-label={`${chart.title} ${labelFor(chart.type)}`} style={{left:position.x,top:position.y,width:size.width,height:size.height}}>
    <header><span className="chart-grip" title="Drag to move" {...pointer('move')}><Grip size={16}/>{chart.title}</span>
      {!readOnly&&<><button className="icon" aria-label="Edit chart" onClick={edit}><Settings2 size={15}/></button><button className="icon" aria-label="Delete chart" onClick={remove}><Trash2 size={15}/></button></>}
    </header>
    <Plot chart={chart} cells={cells}/>
    {!readOnly&&<span className="chart-resize" title="Drag to resize" {...pointer('resize')}/>}
  </article>
}
export function ChartDialog({chart,sourceRange,close,apply}) {
  const [type,setType]=useState(chart?.type || 'column')
  const [title,setTitle]=useState(chart?.title || 'Chart')
  const [position,setPosition]=useState(chart?.position || {x:180,y:75})
  const [size,setSize]=useState(chart?.size || {width:400,height:262})
  return <Modal title={chart?'Edit chart':'Insert chart'} close={close}>
    <form onSubmit={event=>{event.preventDefault();if(title.trim())apply({type,title:title.trim(),position,size,sourceRange:chart?.sourceRange || sourceRange})}}>
      <p className="muted">Source {chart?.sourceRange || sourceRange}</p>
      <label>Chart type<select value={type} onChange={event=>setType(event.target.value)}>{chartTypes.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Chart title<input required value={title} onChange={event=>setTitle(event.target.value)}/></label>
      {chart&&<div className="chart-fields">{[
        ['Left',position,setPosition,'x',0,1600],['Top',position,setPosition,'y',0,900],
        ['Width',size,setSize,'width',240,1600],['Height',size,setSize,'height',170,900],
      ].map(([label,object,update,key,min,max])=><label key={key}>{label}<input type="number" value={object[key]} min={min} max={max} required onChange={event=>update({...object,[key]:Number(event.target.value)})}/></label>)}</div>}
      <Actions close={close} label={chart?'Save':'Insert'} disabled={!title.trim()}/>
    </form>
  </Modal>
}
