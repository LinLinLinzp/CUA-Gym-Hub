import { useState } from 'react'
import { useStore } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { commitFile, createBranch } from '../domain/repositories.js'
import { byId, query, repoPath } from '../utils/model.js'
import { ErrorText, Field, FormActions, Modal, useGo } from '../components/ui.jsx'

export function FileEditor({ workspace, repo, branch, path, prefix, operation, original, onClose }) {
  const { user, transact } = useStore()
  const toast = useToast()
  const go = useGo()
  const [expectedHead] = useState(branch.headCommitId)
  const [file, setFile] = useState(operation === 'add' ? prefix : path)
  const [content, setContent] = useState(original || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const result = transact(commitFile, { repositoryId: repo.id, branchId: branch.id, expectedHead, path: file, content, message, operation })
    if (result.error) return setError(result.error)
    toast('File committed')
    go(query(repoPath(workspace, repo, `commits/${encodeURIComponent(result.result.id)}`), { branch: branch.name }), { replace: true })
  }
  return <Modal title={operation === 'add' ? 'Add file' : 'Edit file'} onClose={onClose}>
    <form className="form-layout" onSubmit={submit}>
      <Field label="File path" hint="Paths are relative to the repository root."><input value={file} required readOnly={operation === 'modify'} onChange={event => setFile(event.target.value)} /></Field>
      <Field label="File contents"><textarea className="code-editor" value={content} onChange={event => setContent(event.target.value)} spellCheck={false} /></Field>
      <Field label="Commit message"><input value={message} required onChange={event => setMessage(event.target.value)} /></Field>
      <ErrorText>{error || (!user && 'A signed-in workspace member is required to commit files.')}</ErrorText>
      <FormActions label="Commit" onClose={onClose} disabled={!user} />
    </form>
  </Modal>
}

export function NewBranch({ workspace, repo, branches, onClose }) {
  const { user, transact } = useStore()
  const toast = useToast()
  const go = useGo()
  const [source, setSource] = useState(() => byId(branches, repo.defaultBranchId) || branches[0])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const result = transact(createBranch, { repositoryId: repo.id, sourceBranchId: source?.id, expectedHead: source?.headCommitId, name })
    if (result.error) return setError(result.error)
    toast('Branch created')
    go(query(repoPath(workspace, repo), { branch: result.result.name }))
  }
  return <Modal title="Create branch" onClose={onClose}><form className="form-layout" onSubmit={submit}>
    <Field label="From branch"><select value={source?.id || ''} required onChange={event => setSource(byId(branches, event.target.value))}>
      {!source && <option value="">Choose a branch</option>}{branches.map(branch => <option value={branch.id} key={branch.id}>{branch.name}</option>)}
    </select></Field>
    <Field label="Branch name" hint="For example, feature/update-readme."><input required value={name} onChange={event => setName(event.target.value)} /></Field>
    <ErrorText>{error || (!user && 'A signed-in workspace member is required to create a branch.')}</ErrorText>
    <FormActions label="Create branch" onClose={onClose} disabled={!user || !source} />
  </form></Modal>
}
