import React, {useEffect,useMemo,useRef,useState} from 'react'
import {Check, ChevronDown, Eye, FunctionSquare, MessageSquare, Pencil, Share2, X} from 'lucide-react'
import {useParams,useSearchParams} from 'react-router-dom'
import {active,findRecord,records,sheetsFor,touch,useStore,visibleSheets} from '../store.jsx'
import {address,inside,range,rangeName,colName} from '../utils/coordinates.js'
import {bookPath,changeSheet,changeWorkbook,copyWorkbook,sheetError,workbookAccess} from '../utils/workbooks.js'
import {applyUndo,asCellMap,contiguousBounds,editCells,fillRange,getClipboard,inputOf,MAX_EDIT_CELLS,mergeCells,parseClipboard,pasteRange,sizeOf,undoPatch,usedBounds} from '../utils/cells.js'
import {choicesFor,clearFilters,createTable,filterRanges,filterValue,matchesFilters,setFilter,sortRange,toggleFilter,validFilters} from '../utils/filters.js'
import {workbookValues} from '../utils/formulas.js'
import {Actions,AppLink,eventPoint,Header,Menu,Modal,useAppNavigate} from './ui.jsx'
import {BookNameDialog} from './Home.jsx'
import {Grid} from './Grid.jsx'
import {Comments} from './Comments.jsx'
import {FindReplace} from './FindReplace.jsx'
import {RulesDialog} from './Rules.jsx'
import {changeRule,scopedRules} from '../utils/rules.js'
import {downloadSheet,ImportDialog,PrintDialog,PrintSheet} from './CsvPrint.jsx'
import {changeChart,changeComment,changePreference,sheetLayout} from '../utils/extras.js'
import {ChartDialog,ChartOverlay} from './Charts.jsx'
import {ManageAccess,Sharing} from './Sharing.jsx'
import {Ribbon} from './Ribbon.jsx'
import {SheetBar} from './SheetBar.jsx'
import {Colors,FunctionDialog,PasteDialog,ResizeDimension,SheetChooser,UnhideDimensions} from './EditorDialogs.jsx'
import {CustomFilter,FilterMenu,SortDialog,TableDialog,tableStyles} from './FilterUI.jsx'

const tabs=['File','Home','Insert','Formulas','Data','Review','View']
const arrows={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}
const area=(a,b)=>({r1:Math.min(a.row,b.row),r2:Math.max(a.row,b.row),c1:Math.min(a.column,b.column),c2:Math.max(a.column,b.column)})
const topLeft=bounds=>({row:bounds.r1,column:bounds.c1})

export function Workbook() {
  const {workbookId}=useParams()
  const {world}=useStore()
  const book=findRecord(world,'workbooks',workbookId)
  if (!active(book)) return <><Header/><main className="unavailable"><h1>Workbook unavailable</h1><p>This workbook may have been moved or deleted.</p><AppLink to="/">Back to Excel Home</AppLink></main></>
  return <Editor key={book.id} book={book}/>
}
function Editor({book}) {
  const {world,dispatch,notify}=useStore()
  const [params]=useSearchParams()
  const navigate=useAppNavigate()
  const token=params.get('link')
  const zoom=world.preferences?.zoom ?? 100
  const ribbonMode=world.preferences?.ribbonMode ?? 'classic'
  const allSheets=sheetsFor(world,book.id)
  const visible=visibleSheets(world,book.id)
  const desired=params.get('sheet')?.toLowerCase()
  const sheet=visible.find(sheet=>sheet.id.toLowerCase()===desired||sheet.name?.toLowerCase()===desired) ||
    visible.find(sheet=>sheet.id===book.activeSheetId) || visible[0]
  const [tab,setTab]=useState('Home')
  const [viewing,setViewing]=useState(false)
  const access=workbookAccess(world,book,token)
  const readOnly=viewing || access==='view' || !access
  const [printBounds,setPrintBounds]=useState(null)
  const [expanded,setExpanded]=useState(false)
  const [showFormulas,setShowFormulas]=useState(false)
  const [gridlines,setGridlines]=useState(true)
  const [search,setSearch]=useState('')
  const [pane,setPane]=useState('')
  const [menu,setMenu]=useState(null)
  const [dialog,setDialog]=useState(null)
  const [rename,setRename]=useState(null)
  const clipboard=useRef(null)
  const history=useRef({undo:[],redo:[]})
  const gridRef=useRef(null)
  const formulaRef=useRef(null)
  const initialRange=range(params.get('range')) || range('A1')
  const [anchor,setAnchor]=useState(()=>topLeft(initialRange))
  const [end,setEnd]=useState(()=>({row:initialRange.r2,column:initialRange.c2}))
  const [focusRequest,setFocusRequest]=useState(()=>topLeft(initialRange))
  const [nameDraft,setNameDraft]=useState(null)
  const [draft,setDraft]=useState(null)
  const [copyRange,setCopyRange]=useState(null)
  const selection=area(anchor,end)

  const workbookCells=useMemo(()=>workbookValues(world,book.id),[world,book.id])
  const sheetCells=useMemo(()=>workbookCells.filter(cell=>cell.sheetId===sheet?.id),[workbookCells,sheet?.id])
  const cells=useMemo(()=>asCellMap(sheetCells),[sheetCells])
  const used=useMemo(()=>usedBounds(sheetCells),[sheetCells])
  const scopes=useMemo(()=>sheet?filterRanges(world,sheet):[],[world,sheet])
  const sorts=useMemo(()=>records(world,'sorts').filter(sort=>sort.sheetId===sheet?.id && sort.status==='active' && sort.hasHeaders!==false),[world,sheet?.id])
  const formatRules=useMemo(()=>sheet?scopedRules(world,'format',sheet.id):[],[world,sheet?.id])
  const validationRules=useMemo(()=>sheet?scopedRules(world,'validation',sheet.id):[],[world,sheet?.id])
  const filters=useMemo(()=>sheet?validFilters(world,sheet,scopes):[],[world,sheet,scopes])
  const tables=useMemo(()=>records(world,'tables').filter(table=>table.sheetId===sheet?.id&&table.status!=='deleted').map(table=>({...table,bounds:range(table.range)})).filter(table=>table.bounds),[world,sheet?.id])
  const rowCount=Math.min(1048576,Math.max(1000,used.r2+20,selection.r2+20,...scopes.map(scope=>scope.bounds.r2+20)))
  const columnCount=Math.min(16384,Math.max(52,used.c2+10,selection.c2+10,...scopes.map(scope=>scope.bounds.c2)))
  const rows=useMemo(()=>{
    const hidden=new Set(sheet?.hiddenRows || [])
    const result=[]
    for(let row=1;row<=rowCount;row++) {
      if (!hidden.has(row) && matchesFilters(filters,cells,row)) result.push(row)
    }
    return result
  },[rowCount,sheet?.hiddenRows,filters,cells])
  const columns=useMemo(()=>{
    const hidden=new Set(sheet?.hiddenColumns || [])
    return Array.from({length:columnCount},(_,i)=>i+1).filter(column=>!hidden.has(column))
  },[columnCount,sheet?.hiddenColumns])
  const selected=cells.get(address(anchor.row,anchor.column))
  const displayCells=useMemo(()=>showFormulas?new Map([...cells].map(([key,cell])=>[key,cell.formula?{...cell,value:cell.formula,valueType:'string',error:null}:cell])):cells,[cells,showFormulas])
  const visibleRowSet=useMemo(()=>new Set(rows),[rows])
  const selectedCells=sheetCells.filter(cell=>inside(cell,selection)&&visibleRowSet.has(cell.row)&&inputOf(cell))
  const numeric=selectedCells.filter(cell=>cell.valueType==='number')
  const total=numeric.reduce((sum,item)=>sum+item.value,0)
  const filterScope=scopes.find(scope=>inside(anchor,scope.bounds))
  const visibleDataRows=filters.length?rows.filter(row=>scopes.some(scope=>row>scope.bounds.r1&&row<=scope.bounds.r2)).length:0
  useEffect(()=>{
    const bounds=range(params.get('range')) || range('A1')
    const first=topLeft(bounds)
    setAnchor(first)
    setEnd({row:bounds.r2,column:bounds.c2})
    setFocusRequest(first)
    setDraft(null)
    setNameDraft(null)
    if (gridRef.current) {gridRef.current.scrollTop=0;gridRef.current.scrollLeft=0}
  },[sheet?.id,params.get('range')])
  useEffect(()=>{
    if (draft?.mode==='bar' && draft.focusBar) {
      formulaRef.current?.focus()
      const caret=draft.caret ?? draft.text.length
      formulaRef.current?.setSelectionRange(caret,caret)
    }
  },[draft?.focusBar,draft?.mode])
  useEffect(()=>{
    const nextRow=rows.includes(anchor.row)?anchor.row:rows.find(row=>row>=anchor.row) ?? rows.at(-1)
    const nextColumn=columns.includes(anchor.column)?anchor.column:columns.find(column=>column>=anchor.column) ?? columns.at(-1)
    if (nextRow && nextColumn && !draft && (nextRow!==anchor.row || nextColumn!==anchor.column)) select(nextRow,nextColumn,false,true)
  },[rows,columns,anchor.row,anchor.column,draft])

  function select(row,column,extend=false,scroll=false) {
    const point={row:Math.min(1048576,Math.max(1,row)),column:Math.min(16384,Math.max(1,column))}
    if (!extend) setAnchor(point)
    setEnd(point)
    setNameDraft(null)
    if (scroll) setFocusRequest(point)
  }
  function focusGrid() {gridRef.current?.focus({preventScroll:true})}
  function changeTab(action,id,value) {
    if (readOnly && action!=='select') return
    const sheetPath=target=>bookPath(book.id,target)+(token?`${target?'&':'?'}link=${encodeURIComponent(token)}`:'')
    if (action==='select' && readOnly) {
      navigate(sheetPath(id))
      return
    }
    const result=dispatch(`sheet.${action}`,(state,tx)=>changeSheet(state,tx,book.id,id,action,value))
    if (!result && (action==='hide'||action==='delete')) {notify('A workbook must have at least one visible sheet.');return}
    if (action!=='select' && !result) return
    if (result && ['rename','delete'].includes(action)) history.current={undo:[],redo:[]}
    if (['select','add','duplicate','hide','delete','unhide'].includes(action)) {
      const nextBook=result?findRecord(result.next,'workbooks',book.id):book
      const target=action==='select'?id:nextBook.activeSheetId
      navigate(sheetPath(target))
    }
  }
  function saveRename() {
    const error=sheetError(world,book.id,rename.name,rename.id)
    if (error) {setRename({...rename,error});return}
    changeTab('rename',rename.id,rename.name)
    setRename(null)
  }
  function mutate(type,handler,{undoable=false,onReject}={}) {
    if (readOnly || !sheet) return null
    const result=dispatch(type,handler,{onReject})
    if (result && undoable) {
      history.current.undo.push(undoPatch(result.before,result.next,book.id,result.operation))
      history.current.undo=history.current.undo.slice(-20)
      history.current.redo=[]
    } else if (result && ['range.sort','table.create'].includes(type)) history.current={undo:[],redo:[]}
    return result
  }
  function transactCells(type,bounds,patch,options,onReject) {
    if (sizeOf(bounds)>MAX_EDIT_CELLS) {notify('Select a smaller range.');return}
    return mutate(type,(state,tx)=>editCells(state,tx,book.id,sheet.id,bounds,patch,options),{undoable:true,onReject})
  }
  function beginDraft(row=anchor.row,column=anchor.column,text=inputOf(cells.get(address(row,column))),mode='cell',extras={}) {
    if (readOnly || !sheet) return
    setDraft({row,column,text,mode,...extras})
  }
  function cancelDraft() {setDraft(null);focusGrid()}
  function move(row,column,dr,dc,extend=false) {
    const r=rows.indexOf(row),c=columns.indexOf(column)
    const nextRow=dr && r>=0 ? rows[r+dr] ?? Math.min(rowCount,Math.max(1,row+dr)) : row
    const nextCol=dc && c>=0 ? columns[c+dc] ?? Math.min(columnCount,Math.max(1,column+dc)) : column
    select(nextRow,nextCol,extend,true)
  }
  function finishDraft(key,shift=false,retakeFocus=true) {
    if (!draft) return
    const {row,column,text}=draft
    const bounds=area({row,column},{row,column})
    const formula=text.startsWith('=')
    let rejected=false
    transactCells(formula?'formula.set':text?'cell.edit':'cell.clear',bounds,()=>({input:text}),{
      clear:!text,details:formula?{formula:text,address:address(row,column)}:{},
    },()=>{rejected=true})
    if(rejected) return
    setDraft(null)
    if (key==='Enter') move(row,column,shift?-1:1,0)
    if (key==='Tab') move(row,column,0,shift?-1:1)
    if (retakeFocus) focusGrid()
  }
  function clear() {transactCells('cell.clear',selection,()=>({input:''}),{clear:true});focusGrid()}
  function format(patch) {
    transactCells('range.format',selection,(_r,_c,cell)=>{
      const values={...(cell?.format || {})}
      for (const [key,value] of Object.entries(patch)) {
        if (value==null) delete values[key]
        else values[key]=value
      }
      return Object.keys(values).length || cell?.format?{format:Object.keys(values).length?values:null}:null
    },{calculate:false,details:{format:patch}})
  }
  function fill(source,hit) {
    const destination={r1:Math.min(source.r1,hit.row),r2:Math.max(source.r2,hit.row),c1:Math.min(source.c1,hit.column),c2:Math.max(source.c2,hit.column)}
    if (destination.r2>1048576 || destination.c2>16384 || sizeOf(destination)>MAX_EDIT_CELLS) {notify('Select a smaller range.');return}
    if (mutate('range.fill',(state,tx)=>fillRange(state,tx,book.id,sheet.id,source,destination),{undoable:true})) {
      setAnchor(topLeft(destination));setEnd({row:destination.r2,column:destination.c2})
    }
  }
  function copyCells(cut) {
    if (!sheet || cut && readOnly) return
    if (sizeOf(selection)>MAX_EDIT_CELLS) {notify('Select a smaller range.');return}
    clipboard.current=getClipboard(cells,selection,sheet.id,cut)
    setCopyRange({...selection,sheetId:sheet.id})
    navigator.clipboard?.writeText(clipboard.current.text).catch(()=>{})
    focusGrid()
  }
  function pasteData(text,internal=false) {
    if (readOnly || !sheet) return
    const stored=clipboard.current
    const source=(stored && (internal || text===stored.text)) ? stored : {rows:parseClipboard(text || '')}
    let rejected=false
    const result=mutate(source.cut?'range.cut':'range.paste',(state,tx)=>pasteRange(state,tx,book.id,sheet.id,anchor,source),{undoable:true,onReject:()=>{rejected=true}})
    if(rejected)return
    if (result && source.cut) {clipboard.current=null;setCopyRange(null)}
    const pasted=range(result?.operation.details.range)
    if (pasted) setEnd({row:pasted.r2,column:pasted.c2})
    setDialog(null)
    focusGrid()
  }
  async function requestPaste() {
    if (clipboard.current) {pasteData('',true);return}
    try {const text=await navigator.clipboard.readText();if(text){pasteData(text);return}} catch { /* The manual paste field works without clipboard permission. */ }
    setDialog({type:'paste'})
  }
  function undo(redo) {
    if (readOnly) return
    const from=redo?'redo':'undo', to=redo?'undo':'redo'
    const patch=history.current[from].at(-1)
    if (!patch) return
    if (patch.changes.some(change=>[change.before,change.after].some(cell=>cell&&!active(findRecord(world,'sheets',cell.sheetId))))) {
      history.current={undo:[],redo:[]};notify('The worksheet for that change is unavailable.');return
    }
    if (mutate(redo?'edit.redo':'edit.undo',(state,tx)=>applyUndo(state,tx,patch,redo))) {
      history.current[from].pop();history.current[to].push(patch)
    }
    focusGrid()
  }
  function gridKey(event) {
    if (event.target.tagName==='INPUT' || event.target.tagName==='BUTTON' && [' ','Enter'].includes(event.key)) return
    const {key,shiftKey,ctrlKey,metaKey,altKey}=event
    if (ctrlKey || metaKey) {
      const action={c:()=>copyCells(false),x:()=>copyCells(true),z:()=>undo(shiftKey),y:()=>undo(true),a:()=>{setAnchor(topLeft(used));setEnd({row:used.r2,column:used.c2})}}[key.toLowerCase()]
      if (action) {event.preventDefault();action()}
      return
    }
    if (key==='ContextMenu'||key==='F10'&&shiftKey) {
      const cell=document.getElementById(`cell-${address(anchor.row,anchor.column)}`)
      if (cell) {
        const rect=cell.getBoundingClientRect()
        event.preventDefault()
        setMenu({type:'cell',point:{x:rect.left,y:rect.bottom}})
      }
      return
    }
    if (arrows[key]) {event.preventDefault();move(shiftKey?end.row:anchor.row,shiftKey?end.column:anchor.column,...arrows[key],shiftKey);return}
    if (key==='Enter'||key==='Tab') {event.preventDefault();move(anchor.row,anchor.column,key==='Enter'?(shiftKey?-1:1):0,key==='Tab'?(shiftKey?-1:1):0);return}
    if (key==='Escape') {setCopyRange(null);clipboard.current=null;cancelDraft();return}
    if (readOnly) return
    if (key==='Delete'||key==='Backspace') {event.preventDefault();clear();return}
    if (key==='F2') {event.preventDefault();beginDraft();return}
    if (key.length===1&&!altKey) {event.preventDefault();beginDraft(anchor.row,anchor.column,key)}
  }
  function goTo(text) {
    const bounds=range(text)
    if (!bounds) {notify('Enter a cell or range such as A1 or A1:D10.');return false}
    const point=topLeft(bounds)
    setAnchor(point);setEnd({row:bounds.r2,column:bounds.c2});setNameDraft(null);setFocusRequest(point);focusGrid()
    return true
  }
  function autoSum(name) {
    const {row,column}=anchor
    let from=row-1
    const numericAt=(r,c)=>cells.get(address(r,c))?.valueType==='number'
    while(from>=1&&numericAt(from,column)) from--
    let reference=from<row-1?rangeName({r1:from+1,r2:row-1,c1:column,c2:column}):''
    if (!reference) {
      let left=column-1
      while(left>=1&&numericAt(row,left)) left--
      if (left<column-1) reference=rangeName({r1:row,r2:row,c1:left+1,c2:column-1})
    }
    const text=`=${name}(${reference})`
    beginDraft(row,column,text,'bar',{focusBar:true,referenceRange:range(reference),caret:reference?text.length:text.length-1})
  }
  function insertFunction(name) {
    setDialog(null)
    if (['SUM','AVERAGE','MIN','MAX','COUNT','COUNTA'].includes(name)) autoSum(name)
    else beginDraft(anchor.row,anchor.column,`=${name}()`,'bar',{focusBar:true,caret:name.length+2})
  }
  function boundsForData() {
    if (sizeOf(selection)>1) return selection
    const current=contiguousBounds(cells,anchor.row,anchor.column)
    if (sizeOf(current)>1) return current
    const row = sheetCells.find(cell=>cell.row===anchor.row&&inputOf(cell))
    return row?contiguousBounds(cells,row.row,row.column):used
  }
  function filterToggle() {
    const type=sheet.autoFilterRange?'filter.disable':'filter.enable'
    const bounds=boundsForData()
    if (!mutate(type,(state,tx)=>toggleFilter(state,tx,book.id,findRecord(state,'sheets',sheet.id),bounds))) notify('Select a data range with headers and at least one data row.')
  }
  function clearFilter(scope) {
    mutate('filter.clear',(state,tx)=>clearFilters(state,tx,book.id,sheet.id,scope))
    setDialog(null)
  }
  function applyFilter(scope,config) {
    mutate('filter.apply',(state,tx)=>setFilter(state,tx,book.id,sheet.id,scope,config))
    setDialog(null)
  }
  function doSort(scope,keys,headers=true) {
    if (!mutate('range.sort',(state,tx)=>sortRange(state,tx,book.id,sheet.id,scope,keys,headers))) notify('Select a sortable range and at least one sort column.')
    setDialog(null)
  }
  function requestSort() {
    const contiguous=contiguousBounds(cells,anchor.row,anchor.column)
    const partial=selection.c1>contiguous.c1||selection.c2<contiguous.c2
    const ownBounds=sizeOf(selection)>1?selection:boundsForData()
    const assigned=filterScope || {bounds:partial?contiguous:ownBounds,range:rangeName(partial?contiguous:ownBounds),tableId:null}
    setDialog({type:'sort',scope:assigned,ownBounds:sizeOf(selection)>1&&partial?selection:null})
  }
  function merge(unmerge) {
    if (sizeOf(selection)>MAX_EDIT_CELLS) {notify('Select a smaller range.');return}
    if (!unmerge && sheetCells.some(cell=>inside(cell,selection) && (cell.row!==selection.r1 || cell.column!==selection.c1) && inputOf(cell))) {
      setDialog({type:'merge'});return
    }
    mergeNow(unmerge)
  }
  function mergeNow(unmerge) {
    if (!mutate(unmerge?'range.unmerge':'range.merge',(state,tx)=>mergeCells(state,tx,book.id,findRecord(state,'sheets',sheet.id),selection,unmerge),{undoable:true}) && !unmerge) notify('Select two or more cells that do not overlap a merged range.')
    setDialog(null)
  }
  function findText(event) {
    if (event.key!=='Enter') return
    const needle=search.trim().toLowerCase()
    if (!needle) return
    const matching=sheetCells.filter(cell=>visibleRowSet.has(cell.row) && (inputOf(cell).toLowerCase().includes(needle) || String(cell.value ?? '').toLowerCase().includes(needle))).sort((a,b)=>a.row-b.row||a.column-b.column)
    const found=matching.find(cell=>cell.row>anchor.row||cell.row===anchor.row&&cell.column>anchor.column) || matching[0]
    if (!found) notify('No cells match your search.')
    else select(found.row,found.column,false,true)
  }
  function goToResult(cell) {
    if (cell.sheetId===sheet?.id) {goTo(address(cell.row,cell.column));return}
    const target=bookPath(book.id,cell.sheetId,address(cell.row,cell.column))
    navigate(target+(token?`&link=${encodeURIComponent(token)}`:''))
  }
  function replaceResults(results) {
    if (!results.length) return null
    return mutate('range.replace',(state,tx)=>{
      const groups=new Map()
      for (const cell of results) {
        if(!groups.has(cell.sheetId))groups.set(cell.sheetId,[])
        groups.get(cell.sheetId).push(cell)
      }
      const changes=[]
      for (const [sheetId,cells] of groups) {
        const lookup=asCellMap(cells)
        const patch=editCells(state,tx,book.id,sheetId,usedBounds(cells),(row,column)=>({input:inputOf(lookup.get(address(row,column)))}),
          {clear:true,coordinates:cells.map(cell=>({r:cell.row,c:cell.column}))})
        if(patch)changes.push(...patch.details.changes.map(change=>({...change,sheetId})))
      }
      return changes.length?{workbookId:book.id,sheetId:sheet.id,targetIds:changes.map(change=>change.id),details:{changes},calculate:true}:null
    },{undoable:true})
  }
  const updateLayout=(action,dimension,indices,value)=>mutate(`sheet.${action}`,(state,tx)=>sheetLayout(state,tx,book.id,sheet.id,action,dimension,indices,value))
  function freeze(mode) {
    const direction={row:[1,sheet.frozenColumns||0],column:[sheet.frozenRows||0,1],
      selection:[Math.max(0,anchor.row-1),Math.max(0,anchor.column-1)],none:[0,0]}[mode]
    const [frozenRows,frozenColumns]=direction
    if (frozenRows>30||frozenColumns>12) {notify('Choose a cell within the first 31 rows and 13 columns.');return}
    updateLayout('freeze',null,[],{frozenRows,frozenColumns})
  }
  const setPreference=(key,value)=>dispatch(`preference.${key}`,state=>changePreference(state,key,value))
  const favorite=book.favoriteUserIds?.includes(world.currentUserId)
  const favoriteBook=()=>dispatch('workbook.favorite',(state,tx)=>changeWorkbook(state,tx,book.id,'favorite'))
  const show=type=>setDialog({type})
  const close=()=>setDialog(null)
  const actions={
    home:()=>navigate('/'), copyBook:()=>{if(!readOnly)show('copy')}, renameBook:()=>show('rename'), favorite:favoriteBook,
    format, palette:key=>setDialog({type:'formatColor',key}), sum:autoSum, function:()=>show('function'), showFormulas:()=>setShowFormulas(!showFormulas),
    addSheet:()=>changeTab('add'),comments:()=>setPane(pane==='comments'?'':'comments'), manage:()=>{close();setPane('manage')},
    importCsv:()=>show('importCsv'),
    exportCsv:()=>{if(sheet && sizeOf(used)<=MAX_EDIT_CELLS)downloadSheet(sheet.name || 'Worksheet',sheetCells,used);else notify('The worksheet is too large to export as one CSV.')},
    print:()=>{if(sheet)show('print')},
    find:()=>setPane(pane==='find'?'':'find'),
    freeze,unhide:dimension=>setDialog({type:'unhideDimension',dimension}),
    ribbon:value=>setPreference('ribbonMode',value),zoom:value=>setPreference('zoom',value),
    gridlines:()=>setGridlines(!gridlines), statistics:()=>setPane(pane==='statistics'?'':'statistics'),
    paste:requestPaste,clipboard:copyCells,undo,clear,merge,
    fillDown:()=>selection.r1<selection.r2?fill({...selection,r2:selection.r1},{row:selection.r2,column:selection.c2}):fill(selection,{row:selection.r2+1,column:selection.c2}),
    sort:requestSort,filter:filterToggle,clearFilter:()=>clearFilter(),
    reapply:()=>{
      if (filters.length) mutate('filter.reapply',(state,tx)=>{
        const filterIds=filters.map(item=>item.id)
        for (const item of records(state,'filters')) if (filterIds.includes(item.id)) touch(item,tx)
        return {workbookId:book.id,sheetId:sheet.id,targetIds:filterIds,details:{filterIds,matchingRows:visibleDataRows}}
      })
      else notify('Apply a filter first.')
    },
    chart:()=>{if(sheetCells.some(cell=>inside(cell,selection)&&cell.valueType==='number'))show('chart');else notify('Select a range with numeric values.')},
    formatRules:()=>setDialog({type:'rules',mode:'format'}),validation:()=>setDialog({type:'rules',mode:'validation'}),
    table:()=>setDialog({type:'tableStyle',bounds:boundsForData()}),
  }
  const dialogScope=dialog?.scope
  const matchingFilter=dialogScope && filters.find(item=>item.column===dialogScope.column && (item.tableId ?? null)===(dialogScope.tableId ?? null) && item.range===dialogScope.range)
  const charts=records(world,'charts').filter(item=>item.sheetId===sheet?.id&&item.status!=='deleted')
  const chartAction=(action,data)=>mutate(`chart.${action}`,(state,tx)=>changeChart(state,tx,book.id,sheet.id,action,data))
  const activeComments=records(world,'comments').filter(item=>item.sheetId===sheet?.id&&item.status!=='deleted')
  const person=findRecord(world,'users',book.ownerId)
  const tableStylesById=new Map(tableStyles.map(([key,color])=>[key,color]))
  const validationList=!readOnly && validationRules.find(rule=>rule.kind==='list' && rule.values?.length && inside(anchor,rule.bounds))
  function updateRule(mode,id,config) {
    const action=config?id?'update':'create':'delete'
    return mutate(`${mode==='format'?'conditionalFormat':'validation'}.${action}`,(state,tx)=>changeRule(state,tx,book.id,sheet.id,mode,id,config))
  }
  const FormulaInput=expanded?'textarea':'input'
  return <main className={`editor ${ribbonMode==='simplified'?'compact-ribbon':''}`}>
    <Header showSaveStatus search={search} onSearch={setSearch} searchPlaceholder="Find in worksheet" onSearchKeyDown={findText}>
      <button className="file-title" aria-label={`Workbook name ${book.name || 'Untitled workbook'}`} onClick={event=>setMenu({type:'file',point:eventPoint(event)})}><span>{book.name || 'Untitled workbook'}</span><ChevronDown size={14}/></button>
    </Header>
    <div className="ribbon-tabs">
      <div className="tab-list" role="tablist" aria-label="Ribbon tabs">{tabs.map(name=><button key={name} role="tab" aria-selected={tab===name} onClick={()=>setTab(name)}>{name}</button>)}</div>
      <div className="editor-actions">
        <button className="secondary action-label" onClick={actions.comments}><MessageSquare size={15}/><span>Comments</span></button>
        <button className="secondary action-label" aria-label={readOnly?'Viewing':'Editing'} onClick={event=>setMenu({type:'mode',point:eventPoint(event)})}>{readOnly?<Eye size={15}/>:<Pencil size={14}/>} {readOnly?'Viewing':'Editing'} <ChevronDown size={13}/></button>
        <button className="primary action-label" disabled={readOnly} onClick={()=>show('share')}><Share2 size={15}/> Share</button>
      </div>
    </div>
    <Ribbon tab={tab} format={selected?.format || {}} readOnly={readOnly || !sheet} actions={actions} config={{favorite,filter:!!sheet?.autoFilterRange,gridlines,showFormulas,zoom,ribbonMode,hasSheet:!!sheet}}/>
    <div className={`formula-bar ${expanded?'expanded-formula':''}`}>
      <input className="name-box" aria-label="Name box" disabled={!sheet} value={nameDraft ?? rangeName(selection)} onChange={event=>setNameDraft(event.target.value)} onFocus={event=>event.target.select()} onBlur={()=>setNameDraft(null)} onKeyDown={event=>{
        if(event.key==='Enter'){event.preventDefault();goTo(event.currentTarget.value)}
        if(event.key==='Escape'){setNameDraft(null);focusGrid()}
      }}/>
      <button className="icon" title="Cancel" aria-label="Cancel formula" disabled={!draft} onMouseDown={event=>event.preventDefault()} onClick={cancelDraft}><X size={16}/></button>
      <button className="icon" title="Enter" aria-label="Enter formula" disabled={!draft || readOnly} onMouseDown={event=>event.preventDefault()} onClick={()=>finishDraft()}><Check size={17}/></button>
      <button className="icon" title="Insert Function" aria-label="Insert Function" disabled={readOnly||!sheet} onClick={actions.function}><FunctionSquare size={17}/></button>
      <FormulaInput className="formula-input" ref={formulaRef} aria-label="Formula bar" readOnly={readOnly||!sheet} value={draft?.text ?? inputOf(selected)} onChange={event=>{
        if (!draft) beginDraft(anchor.row,anchor.column,event.target.value,'bar')
        else setDraft({...draft,text:event.target.value,mode:'bar'})
      }} onKeyDown={event=>{
        if(event.key==='Escape'&&draft){event.preventDefault();cancelDraft()}
        if((event.key==='Enter'&&!(expanded&&event.altKey)||event.key==='Tab')&&draft){event.preventDefault();finishDraft(event.key,event.shiftKey)}
      }}/>
      <button className="icon" title={expanded?'Collapse formula bar':'Expand formula bar'} aria-label={expanded?'Collapse formula bar':'Expand formula bar'} onClick={()=>setExpanded(!expanded)}><ChevronDown size={16}/></button>
    </div>
    <div className={`worksheet-area ${gridlines?'':'no-gridlines'}`}>
      {sheet?<Grid key={sheet.id} {...{sheet,rows,columns,selection,anchor,select,draft,setDraft,finishDraft,cancelDraft,readOnly,gridRef,focusRequest}}
        cells={displayCells} sourceCells={cells} formatRules={formatRules} validationList={validationList}
        onValidation={event=>setMenu({type:'validation',point:eventPoint(event),values:validationList.values})}
        commentAnchors={new Set(activeComments.filter(item=>!item.parentId&&item.status==='open').map(item=>item.anchor))} tables={tables} tableStyles={tableStylesById} copyRange={copyRange?.sheetId===sheet.id ? copyRange : null} referenceRange={draft?.referenceRange}
        selectAll={()=>{setAnchor(topLeft(used));setEnd({row:used.r2,column:used.c2});focusGrid()}}
        onKey={gridKey} onPaste={event=>{if(!readOnly&&event.target.tagName!=='INPUT'){event.preventDefault();pasteData(event.clipboardData.getData('text/plain'))}}}
        onEdit={(row,column)=>{select(row,column);beginDraft(row,column)}}
        onContext={(event,row,column)=>{if(!inside({row,column},selection))select(row,column);setMenu({type:'cell',point:eventPoint(event)})}}
        zoom={zoom} onHeaderMenu={(event,dimension,index)=>setMenu({type:'dimension',point:eventPoint(event),dimension,index})}
        onFill={fill} onFilter={(event,scope)=>setDialog({type:'filter',scope,point:eventPoint(event)})} filterAt={(row,column)=>{
          const item=scopes.slice().reverse().find(scope=>scope.bounds.r1===row && column>=scope.bounds.c1 && column<=scope.bounds.c2)
          if (!item) return null
          const applies=record=>record.range===item.range && (record.tableId ?? null)===(item.tableId ?? null)
          const sort=sorts.find(applies)?.keys?.find(key=>key.column===column)
          return {...item,column,direction:sort?.direction,active:filters.some(filter=>filter.column===column && applies(filter))}
        }}/>
        :<section className="sheet-empty"><h2>No visible worksheets</h2><p>{readOnly?'This workbook has no sheets available.':'Add a worksheet or unhide an existing sheet.'}</p>{!readOnly&&<button className="secondary" onClick={actions.addSheet}>Add a worksheet</button>}</section>}
      {charts.map(chart=><ChartOverlay key={chart.id} chart={chart} cells={sheetCells} readOnly={readOnly}
        change={(action,data)=>chartAction(action,{...data,id:chart.id})}
        edit={()=>setDialog({type:'chart',chart})} remove={()=>setDialog({type:'deleteChart',chart})}/>)}
      {pane==='manage'?<ManageAccess workbook={book} close={()=>setPane('')} docked/>:pane&&<aside className="worksheet-pane">
        <div className="pane-heading"><h2>{pane==='comments'?'Comments':pane==='find'?'Find and Replace':'Workbook Statistics'}</h2><button className="icon" aria-label="Close pane" onClick={()=>setPane('')}><X size={16}/></button></div>
        {pane==='comments'?<Comments key={sheet?.id || 'empty'} comments={activeComments} address={address(anchor.row,anchor.column)} jump={goTo} readOnly={readOnly || !sheet}
          change={(action,data)=>mutate(`comment.${action}`,(state,tx)=>changeComment(state,tx,book.id,sheet.id,action,data))}/>:pane==='find'?
          <FindReplace world={world} sheet={sheet} sheets={visible} cells={workbookCells} readOnly={readOnly || !sheet} goTo={goToResult} replaceCells={replaceResults} clearFilter={()=>clearFilter()}/>:
          <dl><dt>Owner</dt><dd>{person?.displayName || 'Unknown'}</dd><dt>Worksheets</dt><dd>{allSheets.length}</dd><dt>Cells with content</dt><dd>{sheetCells.filter(cell=>inputOf(cell)).length}</dd><dt>Formulas</dt><dd>{sheetCells.filter(cell=>cell.formula).length}</dd></dl>}
      </aside>}
    </div>
    <SheetBar sheets={visible} {...{sheet,readOnly,rename,setRename}} change={changeTab} showDialog={setDialog} onRename={saveRename}/>
    <footer className="status-bar">
      <div><span>Calculation Mode: Automatic</span>{filters.length>0 && <span>{visibleDataRows} visible data rows</span>}</div>
      {selectedCells.length>0&&<div>{numeric.length>0&&<span>Average: {Number((total/numeric.length).toPrecision(10))}</span>}<span>Count: {selectedCells.length}</span>{numeric.length>0&&<span>Sum: {Number(total.toPrecision(12))}</span>}</div>}
      <div className="status-zoom">
        <button disabled={zoom<=50} aria-label="Zoom out" onClick={()=>setPreference('zoom',Math.max(50,zoom-10))}>−</button>
        <button aria-label="Reset zoom" onClick={()=>setPreference('zoom',100)}>{zoom}%</button>
        <button disabled={zoom>=200} aria-label="Zoom in" onClick={()=>setPreference('zoom',Math.min(200,zoom+10))}>+</button>
      </div>
    </footer>
    {menu&&<Menu close={()=>setMenu(null)} point={menu.point} items={menu.type==='file'?[
      {label:'Rename',disabled:readOnly,action:actions.renameBook},{label:'Save a Copy',action:actions.copyBook,disabled:readOnly},
      {label:favorite?'Remove from favorites':'Add to favorites',action:favoriteBook},{label:'Excel Home',action:actions.home},
    ]:menu.type==='mode'?[
      {label:'Editing',disabled:access==='view'||!access,action:()=>{setDraft(null);setViewing(false)}},
      {label:'Viewing',action:()=>{setDraft(null);setViewing(true)}},
    ]:menu.type==='validation'?menu.values.map(value=>({label:value,action:()=>{
      const input=/^0\d+$/.test(value)||value.startsWith('=')||value.startsWith("'")?"'"+value:value
      transactCells('cell.edit',area(anchor,anchor),()=>({input}))
      setDraft(null)
      focusGrid()
    }})):menu.type==='dimension'?[
      {label:menu.dimension==='row'?'Row height…':'Column width…',disabled:readOnly,action:()=>setDialog({type:'resizeDimension',dimension:menu.dimension,index:menu.index})},
      {label:menu.dimension==='row'?'Hide row':'Hide column',disabled:readOnly,action:()=>updateLayout('hide',menu.dimension,[menu.index])},
      {label:menu.dimension==='row'?'Unhide rows…':'Unhide columns…',disabled:readOnly,action:()=>actions.unhide(menu.dimension)},
    ]:[
      {label:'Cut',disabled:readOnly,action:()=>copyCells(true)},{label:'Copy',action:()=>copyCells(false)},{label:'Paste',disabled:readOnly,action:requestPaste},
      {label:'Clear contents',disabled:readOnly,action:clear},{label:'Copy link to range',disabled:readOnly,action:()=>show('rangeLink')},
    ]}/>}
    {(dialog?.type==='rename'||dialog?.type==='copy')&&<BookNameDialog book={book} mode={dialog.type} close={close}
      onSave={(name,location)=>{
        if(dialog.type==='rename') dispatch('workbook.rename',(state,tx)=>changeWorkbook(state,tx,book.id,'rename',name))
        else {
          const result=dispatch('workbook.copy',(state,tx)=>copyWorkbook(state,tx,book.id,name,location,sheet?.id))
          if(result)navigate(bookPath(result.operation.workbookId,result.operation.sheetId))
        }
        close()
      }}/>}
    {['share','rangeLink'].includes(dialog?.type)&&<Sharing workbook={book} close={close} onManageAccess={actions.manage}
      sheetId={dialog.type==='rangeLink'?sheet?.id ?? null:null} range={dialog.type==='rangeLink'?rangeName(selection):null}/>}
    {dialog?.type==='sheetDelete'&&<Modal title="Delete sheet?" close={close}><p>Delete <strong>{dialog.item.name}</strong> and its contents?</p><Actions close={close} label="Delete" onAction={()=>{changeTab('delete',dialog.item.id);close()}}/></Modal>}
    {['unhide','reorder'].includes(dialog?.type)&&<SheetChooser mode={dialog.type} sheets={dialog.type==='unhide'?allSheets.filter(item=>item.visibility==='hidden'):allSheets} item={dialog.item} close={close}
      apply={value=>{dialog.type==='unhide'?changeTab('unhide',value):changeTab('reorder',dialog.item.id,value);close()}}/>}
    {['tabColor','formatColor'].includes(dialog?.type)&&<Colors title={dialog.type==='tabColor'?'Tab Color':dialog.key==='fillColor'?'Fill color':'Font color'} clearLabel={dialog.key==='fontColor'?'Automatic':'No Color'} close={close}
      select={color=>{dialog.type==='tabColor'?changeTab('color',dialog.item.id,color):format({[dialog.key]:color});close()}}/>}
    {dialog?.type==='rules'&&<RulesDialog mode={dialog.mode} rules={dialog.mode==='format'?formatRules:validationRules} selection={selection}
      close={close} save={(id,config)=>updateRule(dialog.mode,id,config)} remove={id=>updateRule(dialog.mode,id,null)}/>}
    {dialog?.type==='importCsv'&&<ImportDialog close={close}/>}
    {dialog?.type==='print'&&<PrintDialog close={close} onPrint={scope=>{
      const bounds=scope==='selection'?selection:used
      if(sizeOf(bounds)>MAX_EDIT_CELLS){notify('Select a smaller print area.');return}
      close()
      setPrintBounds(bounds)
    }}/>}
    {printBounds&&<PrintSheet title={`${book.name || 'Workbook'} · ${sheet?.name || 'Worksheet'}`} cells={sheetCells} bounds={printBounds} finish={()=>setPrintBounds(null)}/>}
    {dialog?.type==='resizeDimension'&&<ResizeDimension dimension={dialog.dimension} initial={dialog.dimension==='row'?sheet.rowHeights?.[dialog.index]||20:sheet.columnWidths?.[dialog.index]||64}
      close={close} apply={value=>{updateLayout('resize',dialog.dimension,[dialog.index],value);close()}}/>}
    {dialog?.type==='unhideDimension'&&<UnhideDimensions dimension={dialog.dimension} indices={(dialog.dimension==='row'?sheet?.hiddenRows:sheet?.hiddenColumns)||[]}
      close={close} apply={indices=>{updateLayout('unhide',dialog.dimension,indices);close()}}/>}
    {dialog?.type==='chart'&&<ChartDialog chart={dialog.chart} sourceRange={rangeName(selection)} close={close} apply={data=>{
      chartAction(dialog.chart?'update':'create',{...data,id:dialog.chart?.id});close()
    }}/>}
    {dialog?.type==='deleteChart'&&<Modal title="Delete chart?" close={close}><p>Delete {dialog.chart.title}?</p><Actions label="Delete" close={close} onAction={()=>{chartAction('delete',{id:dialog.chart.id});close()}}/></Modal>}
    {dialog?.type==='function'&&<FunctionDialog close={close} insert={insertFunction}/>}
    {dialog?.type==='paste'&&<PasteDialog close={close} paste={pasteData}/>}
    {dialog?.type==='merge'&&<Modal title="Merge cells?" close={close}><p>Merging keeps the upper-left cell and clears the other values in this range.</p><Actions close={close} label="Merge" onAction={()=>mergeNow(false)}/></Modal>}
    {dialog?.type==='filter'&&<FilterMenu point={dialog.point} title={String(filterValue(cells,dialogScope.bounds.r1,dialogScope.column) ?? colName(dialogScope.column))}
      choices={choicesFor(dialogScope,filters,cells)} allChoices={choicesFor(dialogScope,[],cells)} filter={matchingFilter} close={close} readOnly={readOnly}
      onApply={config=>applyFilter(dialogScope,config)} onClear={()=>clearFilter(dialogScope)}
      onSort={direction=>doSort(dialogScope,[{column:dialogScope.column,direction}])} onCustom={kind=>setDialog({type:'custom',kind,scope:dialogScope})}/>}
    {dialog?.type==='custom'&&<CustomFilter kind={dialog.kind} filter={matchingFilter} close={close} onApply={config=>applyFilter(dialogScope,config)}/>}
    {dialog?.type==='tableStyle'&&<Modal title="Format as Table" close={close}><div className="table-style-list">{tableStyles.map(([style,color,label])=><button key={style} onClick={()=>setDialog({...dialog,type:'table',style})}><span style={{'--table-color':color}}/>{label}</button>)}</div></Modal>}
    {dialog?.type==='table'&&<TableDialog bounds={dialog.bounds} style={dialog.style} close={close}
      onCreate={(bounds,headers,style)=>{
        let error=''
        const result=mutate('table.create',(state,tx)=>createTable(state,tx,book.id,sheet.id,bounds,headers,style),{onReject:message=>{error=message}})
        if (result) close()
        return error
      }}/>}
    {dialog?.type==='sort'&&<SortDialog scope={dialogScope} ownBounds={dialog.ownBounds} defaultColumn={anchor.column>=dialogScope.bounds.c1&&anchor.column<=dialogScope.bounds.c2?anchor.column:null} cells={cells} close={close} onSort={doSort}/>}
  </main>
}
