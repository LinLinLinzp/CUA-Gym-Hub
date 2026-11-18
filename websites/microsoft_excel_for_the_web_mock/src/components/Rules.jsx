import React,{useState} from 'react'
import {range,rangeName} from '../utils/coordinates.js'
import {validDate} from '../utils/rules.js'
import {Actions,Modal} from './ui.jsx'

const comparisons={
  number:[['greaterThan','Greater than'],['lessThan','Less than'],['equals','Equal to'],['between','Between']],
  text:[['contains','Contains'],['beginsWith','Begins with'],['equals','Equal to']],
  date:[['before','Before'],['after','After'],['between','Between']],
}
const validNumber=value=>String(value).trim()!==''&&Number.isFinite(Number(value))
const compareValue=(kind,value)=>kind==='number'?Number(value):value
function ruleSummary(rule,mode) {
  if(mode==='format')return `${rule.predicate?.operator || 'Match'} ${rule.predicate?.value ?? ''}${rule.predicate?.value2!=null?' to '+rule.predicate.value2:''}`
  if(rule.kind==='list')return (rule.values || []).join(', ')
  return `${rule.kind} ${rule.minimum ?? ''}${rule.minimum!=null&&rule.maximum!=null?' to ':''}${rule.maximum ?? ''}`
}

export function RulesDialog({mode,rules,selection,close,save,remove}) {
  const formatting=mode==='format'
  const [editing,setEditing]=useState(null)
  const [confirm,setConfirm]=useState(null)
  const title=formatting?'Conditional Formatting':'Data Validation'
  if(confirm) return <Modal title="Delete rule?" close={()=>setConfirm(null)}>
    <p>Remove the rule for {confirm.range}?</p><Actions close={()=>setConfirm(null)} label="Delete" onAction={()=>{remove(confirm.id);setConfirm(null)}}/>
  </Modal>
  if(editing) return <RuleEditor mode={mode} rule={editing.rule} selection={selection} close={()=>setEditing(null)} save={config=>{save(editing.rule?.id,config);setEditing(null)}}/>
  return <Modal title={title} close={close}>
    <div className="rules-list">
      {rules.map(rule=><div key={rule.id} className="rule-row">
        <span><strong>{rule.range}</strong><small>{ruleSummary(rule,mode)}</small></span>
        <button type="button" className="secondary" aria-label={`Edit rule for ${rule.range}`} onClick={()=>setEditing({rule})}>Edit</button>
        <button type="button" aria-label={`Delete rule for ${rule.range}`} onClick={()=>setConfirm(rule)}>Delete</button>
      </div>)}
      {!rules.length&&<p className="muted">There are no rules on this worksheet.</p>}
    </div>
    <div className="dialog-actions"><button className="secondary" onClick={close}>Done</button><button className="primary" onClick={()=>setEditing({})}>New rule</button></div>
  </Modal>
}

function RuleEditor({mode,rule,selection,close,save}) {
  const format=mode==='format'
  const [target,setTarget]=useState(rule?.range || rangeName(selection))
  const [kind,setKind]=useState(rule?.kind || (format?'number':'list'))
  const [comparison,setComparison]=useState(rule?.predicate?.operator || 'greaterThan')
  const [first,setFirst]=useState(rule?.predicate?.value ?? rule?.minimum ?? '')
  const [second,setSecond]=useState(rule?.predicate?.value2 ?? rule?.maximum ?? '')
  const [list,setList]=useState(rule?.values?.join('\n') ?? '')
  const [allowBlank,setAllowBlank]=useState(rule?.allowBlank!==false)
  const [message,setMessage]=useState(rule?.message || '')
  const [fill,setFill]=useState(rule?.format?.fillColor || '#fff2bf')
  const [font,setFont]=useState(rule?.format?.fontColor || '#242424')
  const [bold,setBold]=useState(rule?.format?.bold ?? false)
  const [error,setError]=useState('')
  const valid=kind==='date'?validDate:kind==='number'?validNumber:value=>String(value).trim()!==''
  const inputType=kind==='date'?'date':kind==='number'?'number':'text'
  function submit(event) {
    event.preventDefault()
    const bounds=range(target)
    if(!bounds){setError('Enter a valid range such as A1:D20.');return}
    const base={range:rangeName(bounds),kind}
    if(format) {
      if (!valid(first)||comparison==='between'&&(!valid(second)||compareValue(kind,first)>compareValue(kind,second))) {
        setError('Enter valid comparison values in ascending order.');return
      }
      save({...base,predicate:{operator:comparison,value:compareValue(kind,first),
        ...(comparison==='between'?{value2:compareValue(kind,second)}:{})},format:{fillColor:fill,fontColor:font,bold}})
      return
    }
    const values=kind==='list'?[...new Set(list.split(/[,\r\n]+/).map(item=>item.trim()).filter(Boolean))]:[]
    const minimum=kind!=='list'&&first!==''?compareValue(kind,first):null
    const maximum=kind!=='list'&&second!==''?compareValue(kind,second):null
    const trim=message.trim()
    if(kind==='list'&&!values.length){setError('Enter at least one allowed value.');return}
    if(kind!=='list'&&(first!==''&&!valid(first)||second!==''&&!valid(second)||minimum!=null&&maximum!=null&&minimum>maximum)){
      setError('Enter valid bounds with the minimum less than or equal to the maximum.');return
    }
    save({...base,values,minimum,maximum,allowBlank,message:trim})
  }
  return <Modal title={`${rule?'Edit':'New'} ${format?'formatting':'validation'} rule`} close={close}>
    <form onSubmit={submit}>
      <label>Cell range<input value={target} onChange={event=>setTarget(event.target.value)}/></label>
      <label>Value type<select value={kind} onChange={event=>{const next=event.target.value;setKind(next);setComparison(comparisons[next]?.[0][0] || '');setFirst('');setSecond('');setError('')}}>
        {format?<option value="text">Text</option>:<option value="list">List</option>}<option value="number">Number</option><option value="date">Date</option>
      </select></label>
      {format&&<label>Condition<select value={comparison} onChange={event=>setComparison(event.target.value)}>{comparisons[kind].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>}
      {kind==='list'?<label>Allowed values<textarea placeholder="Enter one value per line" value={list} onChange={event=>setList(event.target.value)}/></label>:
        <div className="chart-fields">
          <label>{format?'Value':'Minimum'}<input type={inputType} step={kind==='number'?'any':undefined} value={first} onChange={event=>setFirst(event.target.value)}/></label>
          {(!format||comparison==='between')&&<label>{format?'Upper value':'Maximum'}<input type={inputType} step={kind==='number'?'any':undefined} value={second} onChange={event=>setSecond(event.target.value)}/></label>}
        </div>}
      {format?<div className="chart-fields">
        <label>Fill color<input type="color" value={fill} onChange={event=>setFill(event.target.value)}/></label>
        <label>Font color<input type="color" value={font} onChange={event=>setFont(event.target.value)}/></label>
        <label className="inline"><input type="checkbox" checked={bold} onChange={event=>setBold(event.target.checked)}/> Bold</label>
      </div>:<>
        <label className="inline"><input type="checkbox" checked={allowBlank} onChange={event=>setAllowBlank(event.target.checked)}/> Allow blanks</label>
        <label>Error message<input value={message} onChange={event=>setMessage(event.target.value)} placeholder="Enter a value that meets the validation rule."/></label>
      </>}
      {error&&<p className="error" role="alert">{error}</p>}
      <Actions close={close} label="Save rule"/>
    </form>
  </Modal>
}
