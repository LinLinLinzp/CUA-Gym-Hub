import { created, find, list, nextId, nextNumber, rebaseEditorFields, requireThat, scoped, stamp, update } from './model.js'

const terminal = ['succeeded','failed','rejected']
const deployable = ['ready', ...terminal]

export function releaseArtifacts(data, projectId, definition) {
  const pipeline = find(scoped(data.pipelines,projectId),definition?.artifactPipelineId)
  if (!pipeline) return []
  const runs = new Map(scoped(data.pipelineRuns,projectId).filter((row) => row.pipelineId === pipeline.id &&
    row.status === 'completed' && row.result === 'succeeded').map((row) => [row.id,row]))
  return scoped(data.pipelineArtifacts,projectId).filter((row) => row.pipelineId === pipeline.id && runs.has(row.runId))
}

function normalizedStages(data, projectId, input) {
  requireThat(input.length, 'Add at least one stage.')
  const project = find(data.projects,projectId)
  const ids = new Set()
  const names = new Set()
  return input.map((stage) => {
    const name = stage.name?.trim()
    const approverIds = [...new Set(list(stage.approverIds))]
    const dependsOnStageId = stage.dependsOnStageId || null
    requireThat(stage.id && !ids.has(stage.id) && name && !names.has(name.toLowerCase()), 'Enter a unique name for every stage.')
    requireThat(!dependsOnStageId || ids.has(dependsOnStageId), 'Each prerequisite must be an earlier stage.')
    requireThat(approverIds.every((id) => list(project?.memberIds).includes(id) && find(data.users,id)), 'Choose approvers from this project.')
    ids.add(stage.id)
    names.add(name.toLowerCase())
    return { id:stage.id,name,dependsOnStageId,approverIds }
  })
}

function definitionFields(definition) {
  return {
    name: definition.name?.trim() ?? '',
    artifactPipelineId: definition.artifactPipelineId ?? '',
    stages: list(definition.stages).map((stage) => ({
      id: stage.id, name: stage.name?.trim() ?? '', dependsOnStageId: stage.dependsOnStageId || null,
      approverIds: [...new Set(list(stage.approverIds))],
    })),
  }
}

export function saveReleaseDefinition(data, projectId, original, input, actor, now) {
  const rows = list(data.releaseDefinitions)
  const old = original && find(scoped(rows,projectId),original.id)
  requireThat(!original || old,'The release definition is unavailable.')
  const latest = old && definitionFields(old)
  const draft = definitionFields(input)
  const { name,artifactPipelineId,stages } = latest ? rebaseEditorFields(definitionFields(original),draft,latest,
    'The release definition changed while you were editing. Reopen the editor to review the latest version.') : draft
  requireThat(name,'Enter a release pipeline name.')
  requireThat(find(scoped(data.pipelines,projectId),artifactPipelineId),'Select an artifact source pipeline.')
  const validatedStages = normalizedStages(data,projectId,stages)
  const definition = { ...(old ?? created(actor,now)), id:old?.id ?? nextId(rows,'rd-'), projectId,
    name,artifactPipelineId,stages:stages === latest?.stages ? old.stages : validatedStages,...stamp(actor,now) }
  return [{ ...data,releaseDefinitions:old ? update(rows,definition) : [...rows,definition] },definition]
}

export function createRelease(data, projectId, definitionId, artifactId, text, actor, now) {
  const definition = find(scoped(data.releaseDefinitions,projectId),definitionId)
  requireThat(definition,'The release definition is unavailable.')
  const artifact = find(releaseArtifacts(data,projectId,definition),artifactId)
  requireThat(artifact,'Select an artifact from a successful pipeline run.')
  const stages = normalizedStages(data,projectId,list(definition.stages)).map((stage) => ({
    ...stage, status:stage.dependsOnStageId ? 'blocked' : 'ready',latestDeploymentId:null,
  }))
  const releases = list(data.releases)
  const id = nextNumber(releases)
  const run = find(data.pipelineRuns,artifact.runId)
  const release = { id,projectId,definitionId,name:'Release-' + id,artifactId,runId:artifact.runId,
    artifactVersion:artifact.version ?? run?.number ?? artifact.id,status:'active',description:text.trim(),stages,...created(actor,now),...stamp(actor,now) }
  return [{ ...data,releases:[...releases,release] },release]
}

export const stageAttempts = (data, release, stageId) => scoped(data.deployments,release.projectId)
  .filter((row) => row.releaseId === release.id && row.stageId === stageId).sort((a,b) => (Number(b.attempt) || 0) - (Number(a.attempt) || 0))

function prerequisitePassed(data,release,stage) {
  return !stage.dependsOnStageId || Boolean(find(release.stages,stage.dependsOnStageId)) &&
    stageAttempts(data,release,stage.dependsOnStageId).some((row) => row.status === 'succeeded')
}

function pinnedArtifact(data,release) {
  const artifact = find(scoped(data.pipelineArtifacts,release.projectId),release.artifactId)
  return artifact && artifact.runId === release.runId ? artifact : null
}

export function deploymentReason(data,release,stage) {
  const attempts = stageAttempts(data,release,stage.id)
  if (stage.status === 'pendingApproval' || attempts[0]?.status === 'pendingApproval') return 'A deployment is already waiting for approval.'
  if (!prerequisitePassed(data,release,stage)) return 'The prerequisite stage must succeed first.'
  if (!deployable.includes(stage.status) && stage.status !== 'blocked') return 'The stage is unavailable for deployment.'
  if (!pinnedArtifact(data,release)) return 'The pinned release artifact is unavailable.'
  if (list(stage.approverIds).some((id) => !find(data.users,id))) return 'A designated approver is unavailable.'
  return ''
}

function finishedAttempt(attempt,stage,version,status,actor,now,comment) {
  const success = status === 'succeeded'
  const logs = success ? [
    { step:'Download artifact',status,lines:['Resolved drop ' + version + '.','Artifact pinned for this release.'] },
    { step:'Deploy to ' + stage.name,status,lines:['Deployment completed.','Health check passed.'] },
  ] : [{ step:'Pre-deployment approval',status,lines:['Deployment rejected.',...(comment ? [comment] : [])] }]
  return { ...attempt,status,logs,startedAt:success ? attempt.startedAt ?? now : attempt.startedAt ?? null,finishedAt:now,finishedBy:actor }
}

function advanceRelease(data, release, stage, attempt, actor, now) {
  const withAttempt = { ...release,stages:list(release.stages).map((row) => row.id === stage.id
    ? { ...row,status:attempt.status,latestDeploymentId:attempt.id } : row) }
  const stages = withAttempt.stages.map((row) => row.status === 'blocked' && prerequisitePassed(data,withAttempt,row) ? { ...row,status:'ready' } : row)
  const succeeded = stages.length && stages.every((row) => row.status === 'succeeded')
  const failed = stages.some((row) => ['rejected','failed'].includes(row.status)) && !stages.some((row) => row.status === 'pendingApproval')
  return { ...data,releases:update(list(data.releases),{ ...release,stages,status:succeeded ? 'succeeded' : failed ? 'failed' : 'active',...stamp(actor,now) }) }
}

function releaseStage(data,projectId,releaseId,stageId) {
  const release = find(scoped(data.releases,projectId),releaseId)
  const stage = find(release?.stages,stageId)
  requireThat(release && stage,'The release stage is unavailable.')
  return { release,stage }
}

export function deployStage(data,projectId,releaseId,stageId,actor,now) {
  const { release,stage } = releaseStage(data,projectId,releaseId,stageId)
  const reason = deploymentReason(data,release,stage)
  requireThat(!reason,reason)
  const deployments = list(data.deployments)
  const attempts = stageAttempts(data,release,stage.id)
  const attemptNumber = (Number(attempts[0]?.attempt) || 0) + 1
  const approvers = [...new Set(list(stage.approverIds))]
  const id = nextId(deployments,'dep-' + release.id + '-' + stage.id + '-')
  const base = { id,projectId,releaseId,stageId,artifactId:release.artifactId,attempt:attemptNumber,
    requestedBy:actor,createdAt:now,startedAt:null,finishedAt:null,finishedBy:null }
  const attempt = approvers.length ? { ...base,status:'pendingApproval',logs:[
    { step:'Pre-deployment checks',status:'pendingApproval',lines:['Waiting for designated approvers.'] },
  ] } : finishedAttempt(base,stage,release.artifactVersion,'succeeded',actor,now)
  const next = { ...data,deployments:[...deployments,attempt] }
  if (approvers.length) {
    const rows = list(data.releaseApprovals)
    const approvals = approvers.map((approverId,index) => ({
      id:nextId(rows,'approval-' + id + '-' + (index + 1) + '-'),releaseId,stageId,deploymentId:id,approverId,
      status:'pending',comment:'',...created(actor,now),decidedBy:null,decidedAt:null,
    }))
    next.releaseApprovals = [...rows,...approvals]
  }
  return [advanceRelease(next,release,stage,attempt,actor,now),attempt]
}

export function decideApproval(data,projectId,releaseId,stageId,deploymentId,approved,message,actor,now) {
  const { release,stage } = releaseStage(data,projectId,releaseId,stageId)
  const deployment = find(stageAttempts(data,release,stageId),deploymentId)
  requireThat(stage.latestDeploymentId === deploymentId && deployment?.status === 'pendingApproval','There is no pending deployment for this stage.')
  const approvals = list(data.releaseApprovals)
  const belongs = (row) => row.deploymentId === deploymentId && row.releaseId === releaseId && row.stageId === stageId
  const own = approvals.find((row) => belongs(row) && row.approverId === actor && row.status === 'pending')
  requireThat(own,'Only the designated approver can decide this request.')
  requireThat(!approved || pinnedArtifact(data,release),'The pinned release artifact is unavailable.')
  const comment = message.trim()
  const decisions = approvals.map((row) => {
    if (row.id === own.id) return { ...row,status:approved ? 'approved' : 'rejected',comment,decidedBy:actor,decidedAt:now }
    if (!approved && belongs(row) && row.status === 'pending') return { ...row,status:'canceled',decidedBy:actor,decidedAt:now }
    return row
  })
  const next = { ...data,releaseApprovals:decisions }
  const complete = approved && decisions.filter(belongs).every((row) => row.status === 'approved')
  if (approved && !complete) {
    return [{ ...next,releases:update(list(data.releases),{ ...release,...stamp(actor,now) }) },'approved']
  }
  const attempt = finishedAttempt(deployment,stage,release.artifactVersion,approved ? 'succeeded' : 'rejected',actor,now,comment)
  next.deployments = update(list(data.deployments),attempt)
  return [advanceRelease(next,release,stage,attempt,actor,now),attempt.status]
}
