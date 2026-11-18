import {append,audit,findRecord,newId,records,touch} from '../model.js'
import {address,inside,range,rangeName} from './coordinates.js'
import {testPredicate} from './filters.js'

export const ruleKey=mode=>mode==='format'?'conditionalFormats':'validationRules'
export const scopedRules=(world,mode,sheetId)=>records(world,ruleKey(mode)).filter(rule=>rule.sheetId===sheetId&&rule.status!=='deleted')
  .map(rule=>({...rule,bounds:range(rule.range)})).filter(rule=>rule.bounds)

export function changeRule(world,tx,workbookId,sheetId,mode,id,config) {
  const key=ruleKey(mode)
  let rule=id?findRecord(world,key,id):null
  if (id && (!rule || rule.sheetId!==sheetId || rule.status==='deleted')) return null
  const before=rule?{...rule}:null
  if (config) {
    const bounds=range(config.range)
    if(!bounds)return null
    const next={...config,range:rangeName(bounds)}
    if (rule && Object.keys(next).every(field=>JSON.stringify(next[field])===JSON.stringify(rule[field]))) return null
    if (rule) Object.assign(rule,next)
    else {
      rule={...audit(tx),id:newId(mode==='format'?'conditional':'validation'),workbookId,sheetId,status:'active',...next}
      append(world,key,rule)
    }
  } else rule.status='deleted'
  touch(rule,tx)
  return {workbookId,sheetId,targetIds:[rule.id],details:{before,range:rule.range,kind:rule.kind,status:rule.status}}
}
export function conditionalStyle(rules,cell,point) {
  if (!cell || cell.error) return null
  return rules.find(rule=>inside(point,rule.bounds)&&rule.predicate&&testPredicate(cell.value,rule.predicate,rule.kind))?.format ?? null
}
export const validDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value
const validates=(cell,rule)=>{
  if (cell?.error) return false
  const value=cell?.value
  if (value==null || value==='')return rule.allowBlank!==false
  if (rule.kind==='list')return (rule.values || []).some(option=>String(option).toLowerCase()===String(value).toLowerCase())
  if (rule.kind==='number' && typeof value!=='number' || rule.kind==='date' && !validDate(value))return false
  return (rule.minimum==null || value>=rule.minimum) && (rule.maximum==null || value<=rule.maximum)
}
const validateActions=new Set(['cell.edit','cell.clear','formula.set','range.paste','range.cut','range.fill','range.replace','range.merge'])
export function transactionValidation(before,next,type,workbookId,targetIds) {
  if (!validateActions.has(type))return ''
  const rules=records(next,'validationRules').filter(rule=>rule.workbookId===workbookId&&rule.status!=='deleted')
    .map(rule=>({...rule,bounds:range(rule.range)})).filter(rule=>rule.bounds)
  if(!rules.length)return ''
  const ids=new Set(targetIds)
  const points=new Map()
  const key=cell=>JSON.stringify([cell.sheetId,cell.row,cell.column])
  for(const state of [before,next]) {
    for(const cell of records(state,'cells')) {
      if(ids.has(cell.id))points.set(key(cell),cell)
    }
  }
  const previous=new Map(), updated=new Map()
  for(const cell of records(before,'cells')) if(points.has(key(cell)))previous.set(key(cell),cell)
  for(const cell of records(next,'cells')) if(points.has(key(cell)))updated.set(key(cell),cell)
  for(const [key,point] of points) {
    const prev=previous.get(key), current=updated.get(key)
    if ((prev?.input ?? prev?.formula ?? prev?.value ?? '')===(current?.input ?? current?.formula ?? current?.value ?? ''))continue
    const rule=rules.find(rule=>rule.sheetId===point.sheetId&&inside(point,rule.bounds)&&!validates(current,rule))
    if(rule)return `${address(point.row,point.column)} — ${rule.message || 'Enter a value that meets the validation rule.'}`
  }
  return ''
}
