import React,{useState} from 'react'
import {MessageSquare} from 'lucide-react'
import {findRecord,useStore} from '../store.jsx'
import {Avatar} from './ui.jsx'

export function Comments({comments,address,jump,change,readOnly}) {
  const {world}=useStore()
  const [reply,setReply]=useState(null)
  const [body,setBody]=useState('')
  const [newBody,setNewBody]=useState('')
  const roots=comments.filter(item=>!item.parentId)
  const author=comment=>findRecord(world,'users',comment.createdBy)
  function item(comment) {
    const person=author(comment)
    return <div key={comment.id} className="comment-message">
      <div className="comment-author"><Avatar person={person}/><strong>{person?.displayName ?? (comment.createdBy===world.currentUserId?'You':'Unknown author')}</strong></div>
      <p>{comment.body}</p>
      {!readOnly && comment.createdBy===world.currentUserId && <button aria-label={`Delete comment by ${person?.displayName ?? 'you'}`} onClick={()=>change('delete',{id:comment.id})}>Delete</button>}
    </div>
  }
  return <div className="comments-list">
    {!readOnly&&<form onSubmit={event=>{event.preventDefault();if(change('add',{anchor:address,body:newBody}))setNewBody('')}}>
      <label className="field">New comment at {address}<textarea value={newBody} onChange={event=>setNewBody(event.target.value)} placeholder="Write a comment"/></label>
      <button className="primary" disabled={!newBody.trim()} type="submit">Post comment</button>
    </form>}
    {!roots.length&&<p className="muted"><MessageSquare size={15}/> No comments on this worksheet.</p>}
    {roots.map(root=><article className="comment-thread" key={root.id}>
      <header><button className="secondary" onClick={()=>jump(root.anchor)}>{root.anchor}</button>{root.status==='resolved'&&<span className="muted">Resolved</span>}</header>
      {item(root)}
      <div className="comment-replies">{comments.filter(child=>child.parentId===root.id).map(item)}</div>
      {!readOnly&&<>
        <button onClick={()=>change(root.status==='resolved'?'reopen':'resolve',{id:root.id})}>{root.status==='resolved'?'Reopen':'Resolve thread'}</button>
        {root.status==='open'&&<button onClick={()=>{setReply(reply===root.id?null:root.id);setBody('')}}>Reply</button>}
        {reply===root.id&&root.status==='open'&&<form onSubmit={event=>{event.preventDefault();if(change('reply',{parentId:root.id,body})){setReply(null);setBody('')}}}>
          <label className="field">Reply<textarea value={body} onChange={event=>setBody(event.target.value)}/></label>
          <button className="primary" disabled={!body.trim()} type="submit">Post reply</button>
        </form>}
      </>}
    </article>)}
  </div>
}
