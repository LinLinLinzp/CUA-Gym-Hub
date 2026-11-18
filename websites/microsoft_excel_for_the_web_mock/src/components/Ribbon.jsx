import React from 'react'
import {AlignCenter, AlignLeft, AlignRight, Bold, Clipboard, Copy, Filter, Italic, Redo2, Scissors, Sigma, Underline, Undo2, WrapText} from 'lucide-react'

const fonts=['Calibri','Aptos Narrow','Aptos Display','Arial','Cambria','Consolas','Courier New','Georgia','Segoe UI','Tahoma','Times New Roman','Trebuchet MS','Verdana']
const formats=['General','Number','Currency','Percentage','Date']
const zoomPresets=[50,75,90,100,110,125,150,175,200]
const formulaList=['SUM','AVERAGE','COUNT','MAX','MIN']
function Group({name,children}) {return <section className="ribbon-group">{children}<label>{name}</label></section>}
export function Ribbon({tab,format,readOnly,actions,config}) {
  const button=(label,action,Icon,{disabled=readOnly,pressed}={})=><button type="button" aria-label={label} title={label} disabled={disabled} aria-pressed={pressed} onClick={action}>{Icon&&<Icon size={15}/>}<span>{label}</span></button>
  const icon=(label,action,Icon,pressed)=> <button key={label} type="button" disabled={readOnly} aria-pressed={pressed} aria-label={label} title={label} onClick={action}><Icon size={16}/></button>
  const set=(key,value)=>actions.format({[key]:value})
  const sum=<div>
    {button('AutoSum',()=>actions.sum('SUM'),Sigma)}
    <select aria-label="AutoSum function" disabled={readOnly} value="" onChange={e=>actions.sum(e.target.value)}>
      <option value="" disabled>Functions</option>{formulaList.map(name=><option key={name} value={name}>{name==='COUNT'?'Count Numbers':name[0]+name.slice(1).toLowerCase()}</option>)}
    </select>
  </div>
  if(tab==='File')return <div className="ribbon" role="toolbar" aria-label="File commands"><Group name="Workbook"><div>
    {button('Home',actions.home,null,{disabled:false})}{button('Save a Copy',actions.copyBook)}
    {button('Rename',actions.renameBook)}{button(config.favorite?'Remove from favorites':'Add to favorites',actions.favorite,null,{disabled:false})}
  </div></Group><Group name="Local files"><div>
    {button('Import CSV',actions.importCsv,null,{disabled:false})}{button('Download CSV',actions.exportCsv,null,{disabled:!config.hasSheet})}
    {button('Print',actions.print,null,{disabled:!config.hasSheet})}
  </div></Group></div>
  if(tab==='Data')return <div className="ribbon" role="toolbar" aria-label="Data commands"><Group name="Sort & Filter">
    <div>{button('Sort',actions.sort)}{button('Filter',actions.filter,Filter,{disabled:readOnly,pressed:config.filter})}</div>
    <div>{button('Clear',actions.clearFilter)}{button('Reapply',actions.reapply)}</div>
  </Group><Group name="Data tools"><div>{button('Data Validation',actions.validation)}</div></Group></div>
  if(tab==='Formulas')return <div className="ribbon" role="toolbar" aria-label="Formula commands"><Group name="Function Library">
    {sum}<div>{button('Insert Function',actions.function)}{button('Show Formulas',actions.showFormulas,null,{disabled:false,pressed:config.showFormulas})}</div>
  </Group></div>
  if(tab==='Insert')return <div className="ribbon" role="toolbar" aria-label="Insert commands"><Group name="Insert">
    <div>{button('Table',actions.table)}{button('New sheet',actions.addSheet)}{button('Chart',actions.chart)}</div>
  </Group></div>
  if(tab==='Review')return <div className="ribbon" role="toolbar" aria-label="Review commands"><Group name="Review">
    <div>{button('Comments',actions.comments,null,{disabled:false})}{button('Manage access',actions.manage,null,{disabled:readOnly})}</div>
  </Group></div>
  const zoomOptions=zoomPresets.includes(config.zoom) ? zoomPresets : [...zoomPresets,config.zoom].sort((a,b)=>a-b)
  if(tab==='View')return <div className="ribbon" role="toolbar" aria-label="View commands"><Group name="Worksheet view">
    <div>{button('Gridlines',actions.gridlines,null,{disabled:false,pressed:config.gridlines})}{button('Workbook Statistics',actions.statistics,null,{disabled:false})}</div>
    <div><select value="" aria-label="Freeze panes" disabled={readOnly} onChange={event=>actions.freeze(event.target.value)}>
      <option value="" disabled>Freeze panes</option><option value="selection">Freeze at selection</option><option value="row">Freeze top row</option><option value="column">Freeze first column</option><option value="none">Unfreeze panes</option>
    </select>{button('Unhide rows',()=>actions.unhide('row'))}{button('Unhide columns',()=>actions.unhide('column'))}</div>
  </Group><Group name="Display"><div>
    <select aria-label="Ribbon layout" value={config.ribbonMode} onChange={event=>actions.ribbon(event.target.value)}><option value="classic">Classic ribbon</option><option value="simplified">Simplified ribbon</option></select>
    <select aria-label="Zoom" value={config.zoom} onChange={event=>actions.zoom(Number(event.target.value))}>{zoomOptions.map(value=><option value={value} key={value}>{value}%</option>)}</select>
  </div></Group></div>
  return <div className="ribbon" role="toolbar" aria-label="Home commands">
    <Group name="Clipboard"><div>
      {button('Paste',actions.paste,Clipboard)}{icon('Cut',()=>actions.clipboard(true),Scissors)}<button type="button" aria-label="Copy" title="Copy" onClick={()=>actions.clipboard(false)}><Copy size={16}/></button>
    </div><div>{icon('Undo',()=>actions.undo(false),Undo2)}{icon('Redo',()=>actions.undo(true),Redo2)}</div></Group>
    <Group name="Font"><div>
      <select aria-label="Font family" value={format.fontFamily || 'Calibri'} disabled={readOnly} onChange={event=>set('fontFamily',event.target.value)}>{!fonts.includes(format.fontFamily)&&format.fontFamily&&<option>{format.fontFamily}</option>}{fonts.map(font=><option key={font}>{font}</option>)}</select>
      <select aria-label="Font size" value={format.fontSize || 11} disabled={readOnly} onChange={event=>set('fontSize',Number(event.target.value))}>{[8,9,10,11,12,14,16,18,20,24,28,36,48,72].map(size=><option key={size}>{size}</option>)}</select>
    </div><div>
      {icon('Bold',()=>set('bold',!format.bold),Bold,!!format.bold)}
      {icon('Italic',()=>set('italic',!format.italic),Italic,!!format.italic)}
      {icon('Underline',()=>set('underline',!format.underline),Underline,!!format.underline)}
      {button('Fill color',()=>actions.palette('fillColor'))}{button('Font color',()=>actions.palette('fontColor'))}
    </div></Group>
    <Group name="Alignment"><div>
      {[['left',AlignLeft],['center',AlignCenter],['right',AlignRight]].map(([align,Icon])=>icon('Align '+align,()=>set('horizontalAlign',align),Icon,format.horizontalAlign===align))}
      {icon('Wrap Text',()=>set('wrapText',!format.wrapText),WrapText,!!format.wrapText)}
    </div><div>{button('Merge & Center',()=>actions.merge(false))}{button('Unmerge',()=>actions.merge(true))}</div></Group>
    <Group name="Number"><div><select aria-label="Number format" value={format.numberFormat || 'General'} disabled={readOnly} onChange={event=>set('numberFormat',event.target.value)}>{formats.map(name=><option key={name}>{name}</option>)}</select></div>
    <div>{button('Currency',()=>set('numberFormat','Currency'))}{button('Percent',()=>set('numberFormat','Percentage'))}</div></Group>
    <Group name="Styles"><div>{button('Format as Table',actions.table)}</div><div>{button('Filter',actions.filter,Filter,{disabled:readOnly,pressed:config.filter})}{button('Conditional Formatting',actions.formatRules)}</div></Group>
    <Group name="Editing">{sum}<div>{button('Fill Down',actions.fillDown)}{button('Clear contents',actions.clear)}{button('Find & Replace',actions.find,null,{disabled:false})}</div></Group>
  </div>
}
