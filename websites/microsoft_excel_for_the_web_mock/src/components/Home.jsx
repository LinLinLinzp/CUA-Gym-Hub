import React, {useState} from 'react'
import {BarChart3, Calculator, FileSpreadsheet, FolderOpen, House, MoreHorizontal, Plus, Star} from 'lucide-react'
import {active, findRecord, records, useStore} from '../store.jsx'
import {bookPath, changeWorkbook, createWorkbook, templates, workbookAccess, workbookError} from '../utils/workbooks.js'
import {Actions, AppLink, Avatar, eventPoint, Header, Menu, Modal, useAppNavigate} from './ui.jsx'
import {Sharing} from './Sharing.jsx'
import {ImportDialog} from './CsvPrint.jsx'

export function BookNameDialog({book, mode, close, onSave}) {
  const copying = mode === 'copy'
  const [name,setName] = useState(`${book.name ?? 'Workbook'}${copying ? ' - Copy' : ''}`)
  const [location,setLocation] = useState(book.location || 'OneDrive / Documents')
  const [error,setError] = useState('')
  return <Modal close={close} title={copying ? 'Save a Copy' : 'Rename workbook'}>
    <form onSubmit={event=>{event.preventDefault();const problem=workbookError(name);setError(problem);if(!problem)onSave(name,location)}}>
      <label>Workbook name<input autoComplete="off" value={name} onChange={event=>{setName(event.target.value);setError('')}} aria-invalid={!!error}/></label>
      {copying && <label>Location<input value={location} onChange={event=>setLocation(event.target.value)}/></label>}
      {error && <p className="error" role="alert">{error}</p>}
      <Actions close={close} label={copying?'Save':'Rename'}/>
    </form>
  </Modal>
}

const navItems = [['home','/','Home',House],['create','/create','Create',Plus],['content','/my-content','My Content',FolderOpen]]
const tileIcons = [Plus,Calculator,BarChart3]
const dateLabel = date => {
  if (!date || !Number.isFinite(Date.parse(date))) return '—'
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date))
}

export function Home({page}) {
  const {world,dispatch} = useStore()
  const navigate = useAppNavigate()
  const [tab,setTab] = useState('Recent')
  const [query,setQuery] = useState('')
  const [sort,setSort] = useState('opened')
  const [menu,setMenu] = useState(null)
  const [dialog,setDialog] = useState(null)
  const [recycle,setRecycle] = useState(false)
  const trash = page==='content' && recycle
  const me = findRecord(world,'users',world.currentUserId)
  function open(book) {
    dispatch('workbook.open',(state,tx)=>changeWorkbook(state,tx,book.id,'open'))
    navigate(bookPath(book.id))
  }
  function create(templateId) {
    const result = dispatch('workbook.create',(state,tx)=>createWorkbook(state,tx,templateId))
    navigate(bookPath(result.operation.workbookId,result.operation.sheetId))
  }
  function mutate(book,action,value) {
    dispatch(`workbook.${action}`,(state,tx)=>changeWorkbook(state,tx,book.id,action,value))
  }
  const books = records(world,'workbooks').filter(book => {
    if (trash ? book.status!=='deleted' : !active(book)) return false
    if (trash) {
      if (book.ownerId && book.ownerId!==world.currentUserId) return false
    } else {
      if (!workbookAccess(world,book)) return false
      if (tab==='Favorites' && !book.favoriteUserIds?.includes(world.currentUserId)) return false
      if (tab==='Shared' && book.ownerId===world.currentUserId) return false
    }
    const owner = findRecord(world,'users',book.ownerId)
    const needle = query.trim().toLowerCase()
    return !needle || [book.name,owner?.displayName,owner?.email].some(text=>text?.toLowerCase().includes(needle))
  }).sort((a,b)=>sort==='name' ? (a.name || '').localeCompare(b.name || '') : (b.lastOpenedAt || '').localeCompare(a.lastOpenedAt || ''))
  return <>
    <Header search={query} onSearch={value=>{setQuery(value);if(page==='create')navigate('/')}}/>
    <div className="home-layout">
      <nav className="rail" aria-label="Excel navigation">{navItems.map(([key,to,label,Icon])=><AppLink key={key} to={to} className={page===key?'active':''} aria-current={page===key?'page':undefined}><Icon size={22}/>{label}</AppLink>)}</nav>
      <main className="home-main">
        <h1>{page==='home'?me?.displayName?`Welcome, ${me.displayName.split(' ')[0]}`:'Welcome to Excel':page==='create'?'Create a workbook':'My Content'}</h1>
        {page!=='content' && <section>
          <div className="section-head"><h2>Templates</h2><div className="template-actions"><button className="secondary" onClick={()=>setDialog({type:'import'})}>Import CSV</button>{page!=='create' && <AppLink to="/create">More templates →</AppLink>}</div></div>
          <div className="template-strip">{templates.map((template,i)=>{const Icon=tileIcons[i];return <button key={template.id} className="template" onClick={()=>create(template.id)}><span className="template-preview"><Icon size={32}/></span><span>{template.label}</span></button>})}</div>
        </section>}
        {page!=='create' && <section aria-label="Workbooks">
          <div className="section-head"><h2>{trash?'Recycle bin':'Workbooks'}</h2>{page==='content' && <button className="secondary" onClick={()=>setRecycle(!recycle)}>{trash?'All workbooks':'Recycle bin'}</button>}</div>
          {!trash && <div className="file-tabs" role="tablist" aria-label="Workbook list">{['Recent','Favorites','Shared'].map(item=><button key={item} role="tab" aria-selected={item===tab} onClick={()=>setTab(item)}>{item}</button>)}</div>}
          <table className="file-table"><thead><tr><th><button onClick={()=>setSort('name')} aria-pressed={sort==='name'}>Name {sort==='name'?'↑':''}</button></th><th className="hide-narrow"><button onClick={()=>setSort('opened')} aria-pressed={sort==='opened'}>Last opened {sort==='opened'?'↓':''}</button></th><th>Owner</th><th className="hide-narrow">Location</th><th aria-label="Actions"/></tr></thead>
            <tbody>{books.map(book=>{
              const owner = findRecord(world,'users',book.ownerId)
              const favorite = book.favoriteUserIds?.includes(world.currentUserId)
              const canWrite = !['view',null].includes(workbookAccess(world,book)) || book.ownerId===world.currentUserId
              return <tr key={book.id}>
                <td>{trash?<span className="file-name"><FileSpreadsheet size={22}/>{book.name || 'Untitled workbook'}.xlsx</span>:<button className="file-name" onClick={()=>open(book)}><FileSpreadsheet size={22}/><span>{book.name || 'Untitled workbook'}.xlsx</span></button>}</td>
                <td className="hide-narrow">{dateLabel(book.lastOpenedAt)}</td>
                <td><span className="file-owner"><Avatar person={owner}/>{owner?.displayName ?? (book.ownerId===world.currentUserId?'You':'Unknown owner')}</span></td>
                <td className="hide-narrow muted">{book.location || 'OneDrive'}</td>
                <td><div className="file-actions">
                  {trash?<button className="secondary" onClick={()=>mutate(book,'restore')}>Restore</button>:<>
                    <button className={`icon ${favorite?'favorite':''}`} aria-label={favorite?'Remove from favorites':'Add to favorites'} aria-pressed={!!favorite} onClick={()=>mutate(book,'favorite')}><Star size={17} fill={favorite?'currentColor':'none'}/></button>
                    <button className="icon" aria-label={`Actions for ${book.name || 'workbook'}`} onClick={event=>setMenu({book,point:eventPoint(event),canWrite})}><MoreHorizontal size={18}/></button>
                  </>}
                </div></td>
              </tr>
            })}</tbody>
          </table>
          {!books.length && <p className="file-empty">{query?'No workbooks match your search.':trash?'The recycle bin is empty.':tab==='Favorites'?'Add a workbook to your favorites to see it here.':tab==='Shared'?'No workbooks have been shared with you.':'Create a workbook to get started.'}</p>}
        </section>}
      </main>
    </div>
    {menu && <Menu close={()=>setMenu(null)} point={menu.point} items={[
      {label:'Open',action:()=>open(menu.book)},
      {label:'Rename',disabled:!menu.canWrite,action:()=>setDialog({type:'rename',book:menu.book})},
      {label:'Share',disabled:!menu.canWrite,action:()=>setDialog({type:'share',book:menu.book})},
      {label:'Delete',disabled:menu.book.ownerId!==world.currentUserId && !!menu.book.ownerId,action:()=>setDialog({type:'delete',book:menu.book})},
    ]}/>}
    {dialog?.type==='rename' && <BookNameDialog book={dialog.book} mode="rename" close={()=>setDialog(null)} onSave={name=>{mutate(dialog.book,'rename',name);setDialog(null)}}/>}
    {dialog?.type==='delete' && <Modal title="Delete workbook?" close={()=>setDialog(null)}><p>Move <strong>{dialog.book.name}.xlsx</strong> to the recycle bin?</p><Actions close={()=>setDialog(null)} label="Delete" onAction={()=>{mutate(dialog.book,'delete');setDialog(null)}}/></Modal>}
    {dialog?.type==='import'&&<ImportDialog close={()=>setDialog(null)}/>}
    {dialog?.type==='share' && <Sharing workbook={dialog.book} close={()=>setDialog(null)}/>}
  </>
}
