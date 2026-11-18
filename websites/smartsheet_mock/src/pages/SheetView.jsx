import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import FilterPanel from '../components/FilterPanel.jsx'
import Grid from '../components/Grid.jsx'
import { Problem } from '../components/ui.jsx'
import { sortRows, visibleRows } from '../data/filters.js'
import { useStore } from '../store.jsx'

export default function SheetView() {
  const { sheet, filter, setFilter, filterOpen, setFilterOpen } = useOutletContext()
  const { state, commit } = useStore()
  const [error, setError] = useState('')
  const rows = visibleRows(state, sheet, filter)
  function onSort(column, direction) {
    try {
      commit(current => sortRows(current, sheet, column, direction))
      setFilter(null)
      setError('')
    } catch (failure) { setError(failure.message) }
  }
  return <div className="sheet-workarea">
    {filterOpen && <FilterPanel sheet={sheet} filter={filter} setFilter={setFilter} close={() => setFilterOpen(false)} />}
    <Problem message={error} />
    <div className="grid-scroll"><Grid sheet={sheet} rows={rows} onSort={onSort} /></div>
  </div>
}
