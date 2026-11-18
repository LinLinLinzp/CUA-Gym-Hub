import { parseDocument } from 'yaml'
import { artifactFiles, runStages } from './data/seed.js'
import { commitFile, hasHead, repoBranches, snapshot, validPath } from './git.js'
import { created, find, list, nextId, nextNumber, rebaseEditorFields, requireThat, scoped, stamp, update } from './model.js'

export const isYamlPath = (path) => validPath(path) && /\.ya?ml$/i.test(path)
export function checkYaml(text) {
  requireThat(typeof text === 'string' && text.trim(), 'Enter a YAML pipeline definition.')
  const document = parseDocument(text, { uniqueKeys: true })
  requireThat(!document.errors.length, document.errors[0]?.message ?? 'Invalid YAML.')
  requireThat(document.contents?.items && Array.isArray(document.contents.items) && document.contents.items.some((item) => item.key?.value),
    'The YAML pipeline must contain a mapping with at least one key.')
}

export function pipelineSource(data, projectId, repoId, branchId, path) {
  const repo = find(scoped(data.repositories,projectId),repoId)
  const branch = repo && find(repoBranches(data,repo.id),branchId)
  const ready = repo && hasHead(data,repo.id,branch)
  const files = ready ? snapshot(data,repo.id,branch.headCommitId) : new Map()
  return { repo,branch,ready,files,text: files.get(path) }
}

function definitionFields(pipeline) {
  return { name: pipeline.name?.trim() ?? '', source: {
    repoId: pipeline.repoId ?? '', defaultBranchId: pipeline.defaultBranchId ?? '', yamlPath: pipeline.yamlPath?.trim() ?? '',
  } }
}

export function savePipeline(data, projectId, original, input, actor, now) {
  const pipelines = list(data.pipelines)
  const existing = original && find(scoped(pipelines,projectId),original.id)
  requireThat(!original || existing,'The pipeline definition is unavailable.')
  const draft = definitionFields(input)
  const { name,source } = existing ? rebaseEditorFields(definitionFields(original),draft,definitionFields(existing),
    'The pipeline definition changed while you were editing. Reopen the editor to review the latest version.') : draft
  requireThat(name,'Enter a pipeline name.')
  const { repoId,defaultBranchId,yamlPath } = source
  requireThat(isYamlPath(yamlPath),'Enter a relative YAML file path ending in .yml or .yaml.')
  const { repo,branch,ready,text } = pipelineSource(data,projectId,repoId,defaultBranchId,yamlPath)
  requireThat(ready,'Choose a repository and a branch with an available commit.')
  const yamlEdit = input.yamlEdit
  if (yamlEdit) {
    const requested = draft.source
    requireThat(repoId === requested.repoId && defaultBranchId === requested.defaultBranchId && yamlPath === requested.yamlPath,
      'The pipeline source changed while you were editing. Reopen the editor to review the latest version.')
    requireThat(text === yamlEdit.original || text === yamlEdit.text,
      'The YAML file changed while you were editing. Reopen the editor to review the latest version.')
  }
  const yaml = yamlEdit?.text ?? text
  checkYaml(yaml)
  let next = data
  if (text !== yaml) [next] = commitFile(data,projectId,repo.id,branch.id,yamlPath,yaml,
    (text == null ? 'Add ' : 'Update ') + yamlPath,actor,now)
  const pipeline = { ...(existing ?? created(actor,now)), id: existing?.id ?? nextId(pipelines,'pipe-'), projectId,
    name, ...source, ...stamp(actor,now) }
  return [{ ...next, pipelines: existing ? update(pipelines,pipeline) : [...pipelines,pipeline] },pipeline]
}

export function createRun(data, projectId, pipelineId, branchId, variables, rerunOfRunId, actor, now) {
  const pipeline = find(scoped(data.pipelines,projectId),pipelineId)
  requireThat(pipeline,'The pipeline definition is unavailable.')
  const { repo,branch,ready,text } = pipelineSource(data,projectId,pipeline.repoId,branchId,pipeline.yamlPath)
  requireThat(ready && typeof text === 'string' && text.trim(),'Select a branch containing the pipeline YAML file.')
  checkYaml(text)
  const runs = list(data.pipelineRuns)
  requireThat(!rerunOfRunId || scoped(runs,projectId).some((run) => run.id === rerunOfRunId && run.pipelineId === pipeline.id),
    'The previous run is unavailable.')
  const id = nextNumber(runs)
  const date = now.slice(0,10).replaceAll('-','')
  const numbers = new Set(runs.map((row) => row.number))
  let sequence = 1
  while (numbers.has(date + '.' + sequence)) sequence++
  const number = date + '.' + sequence
  const run = { id,projectId,pipelineId,repoId:repo.id,branchId:branch.id,commitId:branch.headCommitId,number,
    reason:'manual',status:'completed',result:'succeeded',variables,stages:runStages('completed','succeeded'),
    requestedBy:actor,createdAt:now,startedAt:now,finishedAt:now,rerunOfRunId:rerunOfRunId ?? null,canceledBy:null }
  const artifacts = list(data.pipelineArtifacts)
  const artifact = { id:nextId(artifacts,'artifact-' + id + '-'),projectId,pipelineId,runId:id,name:'drop',version:number,
    files:artifactFiles(repo.name ?? repo.id),...created(actor,now) }
  return [{ ...data, pipelineRuns:[...runs,run],pipelineArtifacts:[...artifacts,artifact] },run]
}

export const canCancel = (run) => ['queued','inProgress'].includes(run?.status)
export function cancelRun(data, projectId, id, actor, now) {
  const runs = list(data.pipelineRuns)
  const row = find(scoped(runs,projectId),id)
  requireThat(canCancel(row),'Only queued or in-progress runs can be canceled.')
  const terminal = { status:'completed',result:'canceled' }
  const stages = list(row.stages).map((stage) => ({
    ...stage, ...(stage.status === 'completed' ? {} : terminal),
    jobs:list(stage.jobs).map((job) => job.status === 'completed' ? job : { ...job,...terminal }),
  }))
  return [{ ...data, pipelineRuns:update(runs,{ ...row,...terminal,stages,finishedAt:now,canceledBy:actor }) }]
}
