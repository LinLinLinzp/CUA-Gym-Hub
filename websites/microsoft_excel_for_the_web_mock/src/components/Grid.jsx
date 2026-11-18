import React, {useLayoutEffect, useMemo, useRef, useState} from 'react'
import {ArrowDown, ArrowUp, ChevronDown, Filter} from 'lucide-react'
import {conditionalStyle} from '../utils/rules.js'
import {address, colName, inside, range} from '../utils/coordinates.js'

const HEADER = 20
const locate = (offsets, offset) => {
  let low = 0, high = offsets.length - 2
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (offsets[middle + 1] <= offset) low = middle + 1
    else high = middle
  }
  return low
}
const offsetsFor = (indices, getSize) => indices.reduce((offsets, index) => {
  offsets.push(offsets.at(-1) + getSize(index))
  return offsets
}, [0])
const windowFor = (offsets, start, length) => [
  Math.max(0, locate(offsets, start) - 2),
  Math.min(offsets.length - 1, locate(offsets, start + length) + 4),
]

export function displayValue(cell) {
  if (!cell) return ''
  if (cell.error) return cell.error
  const {value, format} = cell
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value !== 'number') return String(value)
  const numberFormat = format?.numberFormat
  const digits = Math.max(0, Math.min(20, format?.decimalPlaces ?? 2))
  if (numberFormat === 'Currency') return new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', minimumFractionDigits:digits, maximumFractionDigits:digits}).format(value)
  if (numberFormat === 'Percentage') return new Intl.NumberFormat('en-US', {style:'percent', maximumFractionDigits:digits}).format(value)
  if (numberFormat === 'Number') return value.toLocaleString('en-US', {minimumFractionDigits:digits, maximumFractionDigits:digits})
  if (numberFormat === 'Date' && Math.abs(value) < 3000000) {
    const epoch = Date.UTC(1899,11,value < 60 ? 31 : 30)
    return new Date(epoch + Math.trunc(value)*86400000).toISOString().split('T')[0]
  }
  return String(Number(value.toPrecision(14)))
}

export function Grid({sheet, cells, rows, columns, selection, anchor, select, selectAll, onKey, onEdit,
  onContext, onFilter, filterAt, onFill, draft, setDraft, finishDraft, cancelDraft, readOnly, gridRef,
  focusRequest, copyRange, referenceRange, onPaste, tables, tableStyles, commentAnchors, onHeaderMenu, zoom, sourceCells, formatRules, validationList, onValidation}) {
  const [viewport, setViewport] = useState({x:0, y:0, width:1000, height:600})
  const pointer = useRef(null)
  const draftInput = useRef(null)
  const merged = useMemo(() => (sheet.mergedRanges || []).map(range).filter(Boolean), [sheet.mergedRanges])
  const scale=zoom/100
  const gutter=(rows.at(-1) ?? 0)>=10000 ? 40 : 32
  const frozenRows=useMemo(()=>rows.filter(row=>row<=(sheet.frozenRows || 0)),[rows,sheet.frozenRows])
  const frozenCols=useMemo(()=>columns.filter(column=>column<=(sheet.frozenColumns || 0)),[columns,sheet.frozenColumns])
  const rowOffsets = useMemo(() => offsetsFor(rows, row => Math.round(scale*Math.max(12, Number(sheet.rowHeights?.[row]) || 20))), [rows, sheet.rowHeights, scale])
  const columnOffsets = useMemo(() => offsetsFor(columns, column => Math.round(scale*Math.max(24, Number(sheet.columnWidths?.[column]) || 64))), [columns, sheet.columnWidths, scale])
  const rowIndex = useMemo(() => new Map(rows.map((row,i) => [row,i])), [rows])
  const colIndex = useMemo(() => new Map(columns.map((col,i) => [col,i])), [columns])
  useLayoutEffect(() => {
    const grid = gridRef.current
    const measure = () => setViewport({x:grid.scrollLeft, y:grid.scrollTop, width:grid.clientWidth, height:grid.clientHeight})
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grid)
    grid.addEventListener('scroll', measure, {passive:true})
    return () => {observer.disconnect(); grid.removeEventListener('scroll', measure)}
  }, [gridRef])
  useLayoutEffect(() => {
    if (!focusRequest || !gridRef.current) return
    const grid = gridRef.current
    const ri = rowIndex.get(focusRequest.row), ci = colIndex.get(focusRequest.column)
    if (ri != null) {
      const top = rowOffsets[ri], bottom = rowOffsets[ri+1]+HEADER
      const pinned = rowOffsets[frozenRows.length] || 0
      if (ri>=frozenRows.length && top < grid.scrollTop+pinned) grid.scrollTop = Math.max(0,top-pinned)
      if (bottom > grid.scrollTop + grid.clientHeight) grid.scrollTop = bottom-grid.clientHeight
    }
    if (ci != null) {
      const left = columnOffsets[ci], right = columnOffsets[ci+1]+gutter
      const pinned = columnOffsets[frozenCols.length] || 0
      if (ci>=frozenCols.length && left < grid.scrollLeft+pinned) grid.scrollLeft = Math.max(0,left-pinned)
      if (right > grid.scrollLeft + grid.clientWidth) grid.scrollLeft = right-grid.clientWidth
    }
  }, [focusRequest, rowIndex, colIndex, rowOffsets, columnOffsets, gridRef, frozenRows.length, frozenCols.length, gutter])
  useLayoutEffect(() => {
    if (draft?.mode === 'cell' && draftInput.current) {
      draftInput.current.focus({preventScroll:true})
      const end = draftInput.current.value.length
      draftInput.current.setSelectionRange(end,end)
    }
  }, [draft?.mode, draft?.row, draft?.column])
  const [rowStart, rowEnd] = windowFor(rowOffsets, viewport.y, viewport.height)
  const [colStart, colEnd] = windowFor(columnOffsets, viewport.x, viewport.width)
  const actualRows = [...new Set([...frozenRows,...rows.slice(rowStart,rowEnd)])]
  const actualCols = [...new Set([...frozenCols,...columns.slice(colStart,colEnd)])]
  function hoveredCell(event) {
    const node = document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-grid-cell]')
    if (!node) return null
    return {row:Number(node.dataset.row),column:Number(node.dataset.column)}
  }
  function begin(event, row, column, fill = false) {
    if (event.button !== 0 || event.target.closest('button,input')) return
    event.preventDefault()
    gridRef.current.focus({preventScroll:true})
    pointer.current = {fill, origin:selection}
    if (!fill) select(row,column,event.shiftKey)
  }
  return <div className="grid-viewport" ref={gridRef} tabIndex={0} role="grid" aria-label={`${sheet.name || 'Worksheet'} cells`}
    aria-rowcount={rows.at(-1) ?? 0} aria-colcount={columns.at(-1) ?? 0}
    aria-activedescendant={rowIndex.has(anchor.row) && colIndex.has(anchor.column) && actualRows.includes(anchor.row) && actualCols.includes(anchor.column) ? `cell-${address(anchor.row,anchor.column)}` : undefined}
    onKeyDown={onKey} onPaste={onPaste} onPointerMove={event => {
      if (event.buttons===0) pointer.current=null
      if (!pointer.current) return
      const hit = hoveredCell(event)
      if (hit && !pointer.current.fill) select(hit.row,hit.column,true)
    }} onPointerUp={event => {
      if (pointer.current?.fill) {
        const hit = hoveredCell(event)
        if (hit) onFill(pointer.current.origin,hit)
      }
      pointer.current = null
    }} onPointerCancel={() => {pointer.current = null}}>
    <div className="grid-canvas" style={{'--row-gutter':`${gutter}px`,width:gutter+(columnOffsets.at(-1) || 0), height:HEADER+(rowOffsets.at(-1) || 0)}}>
      {actualRows.map(row => {
        const index = rowIndex.get(row)
        const frozen = index<frozenRows.length
        return <div className={`grid-row ${frozen?'pinned-row':''}`} role="row" aria-rowindex={row} key={row} style={{top:HEADER+rowOffsets[index]+(frozen?viewport.y:0), height:rowOffsets[index+1]-rowOffsets[index]}}>
          <div role="rowheader" className={`row-header ${row>=selection.r1&&row<=selection.r2?'heading-selected':''} ${index>0&&row-rows[index-1]>1?'filtered-row':''}`} style={{left:viewport.x}} onClick={() => select(row,anchor.column)} onContextMenu={event=>{event.preventDefault();onHeaderMenu(event,'row',row)}}>{row}</div>
          {actualCols.map(column => {
            const cIndex = colIndex.get(column)
            const pinned = cIndex<frozenCols.length
            const active = row === anchor.row && column === anchor.column
            const selected = inside({row,column}, selection)
            const merge = merged.find(bounds => inside({row,column},bounds))
            if (merge && (row!==merge.r1 || column!==merge.c1)) return null
            const cell = cells.get(address(row,column))
            const format = {...cell?.format,...conditionalStyle(formatRules,sourceCells.get(address(row,column)),{row,column})}
            const numeric = cell?.valueType === 'number' || cell?.valueType === 'date'
            const filter = filterAt?.(row,column)
            const SortArrow = filter?.direction==='asc' ? ArrowUp : filter?.direction==='desc' ? ArrowDown : null
            const sortLabel = SortArrow ? `Sorted ${filter.direction==='asc' ? 'ascending' : 'descending'}` : undefined
            const table = tables.find(item=>inside({row,column},item.bounds))
            const tableColor = table && tableStyles.get(table.style)
            const editing = draft?.mode === 'cell' && draft.row === row && draft.column === column
            const width = columnOffsets[(merge ? colIndex.get(merge.c2) ?? cIndex : cIndex)+1]-columnOffsets[cIndex]
            return <div key={column} id={`cell-${address(row,column)}`} data-grid-cell="" data-row={row} data-column={column}
              role="gridcell" aria-colindex={column} aria-selected={selected} aria-label={`${address(row,column)}${displayValue(cell) ? ` ${displayValue(cell)}` : ''}`}
              className={`grid-cell ${selected?'selected':''} ${active?'active-cell':''} ${inside({row,column},copyRange)?'copied-cell':''} ${inside({row,column},referenceRange)?'reference-cell':''} ${filter?'filter-header':''} ${SortArrow?'sorted-header':''} ${pinned?'pinned-cell':''}`}
              style={{left:gutter+columnOffsets[cIndex]+(pinned?viewport.x:0), width, height:merge?(rowOffsets[(rowIndex.get(merge.r2) ?? index)+1]-rowOffsets[index]):undefined, backgroundColor:format.fillColor || (tableColor && (row===table.bounds.r1 ? tableColor : (row-table.bounds.r1)%2 ? tableColor+'18' : undefined)),
                color:format.fontColor || (tableColor && row===table.bounds.r1 ? 'white' : undefined),fontFamily:format.fontFamily && `${JSON.stringify(format.fontFamily)}, var(--sheet-font)`, fontSize:`${(format.fontSize||11)*scale}pt`,
                fontWeight:format.bold?600:undefined, fontStyle:format.italic?'italic':undefined, textDecoration:format.underline?'underline':undefined,
                alignContent:format.verticalAlign==='bottom'?'end':format.verticalAlign==='middle'?'center':undefined, textAlign:format.horizontalAlign || (merge?'center':numeric?'right':undefined), whiteSpace:format.wrapText?'normal':undefined,
                zIndex:pinned?3:merge?2:undefined}}
              onPointerDown={event => begin(event,row,column)} onDoubleClick={() => !readOnly && onEdit(row,column)}
              onContextMenu={event => {event.preventDefault(); onContext(event,row,column)}}>
              {editing ? <input ref={draftInput} className="cell-edit" aria-label={`Edit ${address(row,column)}`} value={draft.text} onChange={event => setDraft({...draft,text:event.target.value})}
                onKeyDown={event => {
                  event.stopPropagation()
                  if (event.key==='Escape') {event.preventDefault(); cancelDraft()}
                  if (event.key==='Enter'||event.key==='Tab') {event.preventDefault(); finishDraft(event.key,event.shiftKey)}
                }}/> : <span>{displayValue(cell)}</span>}
              {commentAnchors.has(address(row,column)) && <span className="comment-anchor" title="Open comment"/>}
              {active && validationList && !filter && !editing && <button type="button" className="filter-arrow validation-arrow" aria-label="Validation choices" onClick={onValidation}><ChevronDown size={12}/></button>}
              {filter && <button type="button" className={`filter-arrow ${filter.active?'has-filter':''}`} aria-label={`Filter ${displayValue(cell) || colName(column)}`} title={sortLabel} onClick={event => onFilter(event,filter)}>
                {filter.active ? <Filter size={8}/> : <ChevronDown size={10}/>}
                {SortArrow ? <SortArrow size={11}/> : filter.active && <ChevronDown size={6}/>}
              </button>}
              {!readOnly && selected && row===selection.r2 && column===selection.c2 && !editing && <span className="fill-handle" role="presentation" onPointerDown={event => {event.stopPropagation(); begin(event,row,column,true)}}/>}
            </div>
          })}
        </div>
      })}
      <div role="row" className="column-headers" style={{top:viewport.y}}>
        {actualCols.map(column => {
          const i = colIndex.get(column)
          const pinned=i<frozenCols.length
          return <div role="columnheader" key={column} className={`column-header ${column>=selection.c1&&column<=selection.c2?'heading-selected':''}`} style={{left:gutter+columnOffsets[i]+(pinned?viewport.x:0),width:columnOffsets[i+1]-columnOffsets[i],zIndex:pinned?1:undefined}} onClick={() => select(anchor.row,column)} onContextMenu={event=>{event.preventDefault();onHeaderMenu(event,'column',column)}}>{colName(column)}</div>
        })}
      </div>
      <button className="grid-corner" type="button" aria-label="Select used cells" style={{top:viewport.y,left:viewport.x}} onClick={selectAll}/>
    </div>
  </div>
}
