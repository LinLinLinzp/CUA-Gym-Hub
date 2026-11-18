import { useState } from 'react'
import { Confirm, Empty, Search, ViewHeader, WorkspaceLink } from '../components'
import { searchText, useWorkspace } from '../workspace'
import { CreateDocument, EditField } from './FirestoreForms'

const pathJoin = (parent, id) => parent ? `${parent}/${id}` : id
const atOrBelow = (path, root) => path === root || path.startsWith(`${root}/`)
const values = (document) => document?.fields ?? []

function adjacentResource(items, target) {
  const index = items.findIndex((item) => item.path === target.path)
  return items[index + 1] ?? items[index - 1]
}

function ResourceList({ items, name, selected, onPick, empty }) {
  if (!items.length) return <Empty>{empty}</Empty>
  return <ul className="resource-list" aria-label={name}>
    {items.map((item) => <li key={item.path}>
      <button type="button" className="resource" aria-current={selected === item.path ? 'true' : undefined}
        onClick={() => onPick(item)}><code>{item.id}</code><span aria-hidden="true">›</span></button>
    </li>)}
  </ul>
}

function displayValue(field) {
  if (field.value === undefined) return '—'
  if (field.type === 'string' || field.type === 'timestamp') return String(field.value)
  return JSON.stringify(field.value, null, 2)
}

export default function Firestore() {
  const { state, commit } = useWorkspace()
  const { id: projectId, databaseId = '(default)' } = state.project
  const inScope = (record) => record.projectId === projectId && record.databaseId === databaseId
  const collections = state.firestoreCollections.filter(inScope)
  const documents = state.firestoreDocuments.filter(inScope)
  const roots = collections.filter((row) => !row.parentDocumentPath)
  const [selection, setSelection] = useState(null)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const collection = selection ? collections.find((row) => row.path === selection.collectionPath) : roots[0]
  const collectionDocuments = collection ? documents.filter((row) => row.collectionPath === collection.path) : []
  const document = selection ? collectionDocuments.find((row) => row.path === selection.documentPath) : collectionDocuments[0]
  const siblings = collection?.parentDocumentPath ? collections.filter((row) => row.parentDocumentPath === collection.parentDocumentPath) : roots
  const nested = document ? collections.filter((row) => row.parentDocumentPath === document.path) : []
  const visibleDocuments = collectionDocuments.filter((row) => searchText(row.id).includes(searchText(query).trim()))
  const close = () => setDialog(null)

  function pickCollection(nextCollection) {
    const firstDocument = documents.find((row) => row.collectionPath === nextCollection?.path)
    setSelection({ collectionPath: nextCollection?.path, documentPath: firstDocument?.path })
    setQuery('')
  }

  function pickDocument(nextDocument) {
    setSelection({ collectionPath: nextDocument.collectionPath, documentPath: nextDocument.path })
  }

  function create(collectionId, documentId, fields) {
    const createsCollection = dialog.type === 'createCollection'
    const parentDocumentPath = dialog.parent ?? null
    const collectionPath = createsCollection ? pathJoin(parentDocumentPath, collectionId) : collection.path
    const documentPath = pathJoin(collectionPath, documentId)
    const action = createsCollection ? 'firestore.collection.create' : 'firestore.document.create'
    const targetId = createsCollection ? collectionPath : documentPath
    commit(action, createsCollection ? `Created collection ${collectionId}.` : `Added document ${documentId}.`, (current, { createdAt, actorId }) => {
      const scope = { projectId, databaseId, createdAt, createdBy: actorId }
      const newDocument = {
        id: documentId, path: documentPath, collectionPath, fields, ...scope, updatedAt: createdAt, updatedBy: actorId,
      }
      const patch = { firestoreDocuments: [...current.firestoreDocuments, newDocument] }
      if (createsCollection) patch.firestoreCollections = [...current.firestoreCollections, { id: collectionId, path: collectionPath, parentDocumentPath, ...scope }]
      const details = createsCollection ? { databaseId, firstDocumentPath: documentPath } : { databaseId, collectionPath }
      return { targetId, details, patch }
    })
    setSelection({ collectionPath, documentPath })
    setQuery('')
    close()
  }

  function changeField(operation, before, after) {
    const field = after ?? before
    const existing = values(document)
    const updated = {
      add: () => [...existing, after],
      update: () => existing.map((row) => row === before ? after : row),
      delete: () => existing.filter((row) => row !== before),
    }[operation]()
    const verbs = { add: 'Added', update: 'Updated', delete: 'Deleted' }
    commit(`firestore.field.${operation}`, `${verbs[operation]} field ${field.name}.`, (current, { createdAt, actorId }) => ({
      targetId: document.path, details: { databaseId, fieldName: field.name, fieldType: field.type },
      patch: {
        firestoreDocuments: current.firestoreDocuments.map((row) =>
          inScope(row) && row.path === document.path ? { ...row, fields: updated, updatedAt: createdAt, updatedBy: actorId } : row),
      },
    }))
    close()
  }

  function removeSubtree(type, target) {
    const matching = (row) => inScope(row) && atOrBelow(row.path, target.path)
    commit(`firestore.${type}.delete`, `Deleted ${type} ${target.id}.`, (current) => ({
      targetId: target.path,
      details: {
        databaseId,
        removedCollectionPaths: current.firestoreCollections.filter(matching).map((row) => row.path),
        removedDocumentPaths: current.firestoreDocuments.filter(matching).map((row) => row.path),
      },
      patch: {
        firestoreCollections: current.firestoreCollections.filter((row) => !matching(row)),
        firestoreDocuments: current.firestoreDocuments.filter((row) => !matching(row)),
      },
    }))
    if (type === 'document') {
      const next = adjacentResource(collectionDocuments, target)
      setSelection({ collectionPath: collection.path, documentPath: next?.path })
    } else {
      const next = adjacentResource(siblings, target)
      const parent = documents.find((row) => row.path === target.parentDocumentPath)
      if (next) pickCollection(next)
      else if (parent) pickDocument(parent)
      else pickCollection(null)
    }
    setQuery('')
    close()
  }

  const breadcrumb = (document?.path ?? collection?.path)?.split('/') ?? []
  let breadcrumbPath = ''
  return <>
    <ViewHeader title="Cloud Firestore" description="Browse collections and manage the project’s documents.">
      <WorkspaceLink className="button" to="/firestore/rules">Security Rules</WorkspaceLink>
      <button className="primary" onClick={() => setDialog({ type: 'createCollection' })}>Start collection</button>
    </ViewHeader>
    <nav className="breadcrumb" aria-label="Firestore path">
      <button type="button" onClick={() => pickCollection(roots[0])}>{databaseId}</button>
      {breadcrumb.map((id, i) => {
        breadcrumbPath = pathJoin(breadcrumbPath, id)
        const path = breadcrumbPath
        const target = (i % 2 ? documents : collections).find((row) => row.path === path)
        return <span key={path}><span aria-hidden="true">/</span>
          {i === breadcrumb.length - 1 || !target ? <code aria-current={i === breadcrumb.length - 1 ? 'page' : undefined}>{id}</code>
            : <button type="button" className="mono" onClick={() => i % 2 ? pickDocument(target) : pickCollection(target)}>{id}</button>}
        </span>
      })}
    </nav>
    <div className="firestore-grid">
      <section className="panel">
        <header className="panel-heading"><h2>{collection?.parentDocumentPath ? 'Subcollections' : 'Collections'}</h2><small>{siblings.length}</small></header>
        <ResourceList items={siblings} name="Collections" selected={collection?.path} onPick={pickCollection} empty="No collections yet." />
      </section>
      <section className="panel">
        <header className="panel-heading">
          <h2>Documents</h2>{collection && <button type="button" onClick={() => setDialog({ type: 'createDocument' })}>Add document</button>}
        </header>
        {collection ? <>
          <Search label="Search documents" value={query} onChange={setQuery} placeholder="Document ID" />
          <ResourceList items={visibleDocuments} name="Documents" selected={document?.path} onPick={pickDocument}
            empty={query ? 'No matching documents.' : 'This collection is empty.'} />
          <button className="danger-text collection-delete" onClick={() => setDialog({ type: 'deleteCollection' })}>Delete collection</button>
        </> : <Empty>Select a collection to browse documents.</Empty>}
      </section>
      <section className="panel detail-pane">
        <header className="panel-heading"><h2>Document details</h2>
          {document && <button className="danger-text" onClick={() => setDialog({ type: 'deleteDocument' })}>Delete document</button>}
        </header>
        {document ? <>
          <p className="document-id"><code>{document.id}</code></p>
          <div className="panel-heading detail-heading">
            <h3>Fields</h3><button onClick={() => setDialog({ type: 'addField' })}>Add field</button>
          </div>
          {values(document).length ? <ul className="field-list">
            {values(document).map((field) => <li key={field.name}>
              <div className="field-info"><strong>{field.name}</strong><small>{field.type}</small><pre>{displayValue(field)}</pre></div>
              <div className="actions">
                <button aria-label={`Edit ${field.name}`} onClick={() => setDialog({ type: 'editField', field })}>Edit</button>
                <button className="danger-text" aria-label={`Delete ${field.name}`} onClick={() => setDialog({ type: 'deleteField', field })}>Delete</button>
              </div>
            </li>)}
          </ul> : <Empty>This document has no fields.</Empty>}
          <div className="panel-heading detail-heading">
            <h3>Subcollections</h3><button onClick={() => setDialog({ type: 'createCollection', parent: document.path })}>Start subcollection</button>
          </div>
          <ResourceList items={nested} name="Subcollections" onPick={pickCollection} empty="This document has no subcollections." />
        </> : <Empty>Select a document to view its fields.</Empty>}
      </section>
    </div>
    {(dialog?.type === 'createCollection' || dialog?.type === 'createDocument') &&
      <CreateDocument createCollection={dialog.type === 'createCollection'}
        collectionExists={(id) => collections.some((row) => row.path === pathJoin(dialog.parent, id))}
        documentExists={(newCollection, id) => documents.some((row) => row.path === pathJoin(
          dialog.type === 'createCollection' ? pathJoin(dialog.parent, newCollection) : collection.path, id))}
        onSave={create} onClose={close} />}
    {(dialog?.type === 'addField' || dialog?.type === 'editField') && <EditField field={dialog.field} existingFields={values(document)}
      onSave={(field) => changeField(dialog.field ? 'update' : 'add', dialog.field, field)} onClose={close} />}
    {dialog?.type === 'deleteField' && <Confirm title="Delete field" label="Delete field" danger
      description={`Remove the field “${dialog.field.name}” from ${document.id}?`} onClose={close}
      onConfirm={() => changeField('delete', dialog.field)} />}
    {dialog?.type === 'deleteDocument' && <Confirm title="Delete document" label="Delete document" danger
      description={`Delete ${document.path} and all of its subcollections and documents?`} onClose={close}
      onConfirm={() => removeSubtree('document', document)} />}
    {dialog?.type === 'deleteCollection' && <Confirm title="Delete collection" label="Delete collection" danger
      description={`Delete ${collection.path} and all documents and subcollections within it?`} onClose={close}
      onConfirm={() => removeSubtree('collection', collection)} />}
  </>
}
