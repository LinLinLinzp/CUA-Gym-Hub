import React from 'react'
import { FileQuestion } from 'lucide-react'
import { Outlet, useParams } from 'react-router-dom'
import { AppLink, Empty } from './ui.jsx'
import { useStore } from '../store.jsx'

export function Unavailable({ title = 'Page unavailable', to = '/', link = 'Go to Home' }) {
  return <main className="page"><section className="panel"><Empty title={title} icon={FileQuestion}><AppLink to={to}>{link}</AppLink></Empty></section></main>
}

export function SheetResource() {
  const { state } = useStore()
  const { sheetId } = useParams()
  const sheet = (state.sheets ?? []).find(item => item.id === sheetId && item.status !== 'deleted')
  if (!sheet) return <Unavailable title="Sheet unavailable" to="/browse" link="Browse sheets" />
  return <Outlet context={sheet} />
}
