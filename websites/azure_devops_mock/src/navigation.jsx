import React, { createContext, useContext } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getSessionId, withSid } from './utils/dataManager.js'
import { find, list, scoped, segment, sprintChoices } from './model.js'
import { useStore } from './store.jsx'

export const ProjectContext = createContext(null)
export const useProject = () => useContext(ProjectContext)
export const orgProjects = (data) => list(data.projects).filter((row) => !row.organizationId || row.organizationId === data.organization?.id)
export const orgPath = (org) => '/' + segment(org?.slug ?? org?.id ?? 'organization')
export const projectPath = (org, project) => orgPath(org) + '/' + segment(project?.slug ?? project?.id ?? 'project')

export function decodeSegment(value) {
  if (value === undefined) return value
  try { return decodeURIComponent(value) } catch { return value }
}

export function sessionPath(path) {
  const [base] = path.split('#')
  const params = new URLSearchParams(base.split('?')[1])
  return params.has('sid') ? path : withSid(path)
}
export const SiteLink = ({ to, ...props }) => <Link to={sessionPath(to)} {...props} />
export const SiteTab = ({ to, ...props }) => <NavLink to={sessionPath(to)} {...props} />

export function useProjectNav() {
  const { base } = useProject()
  const navigate = useNavigate()
  return (path, options) => navigate(sessionPath(base + path), options)
}

export function PLink({ to = '', ...props }) {
  const { base } = useProject()
  return <SiteLink to={base + to} {...props} />
}

export function useQuery() {
  const [params, setParams] = useSearchParams()
  return [params, (values, options) => {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(values)) {
      if (value == null || value === '') next.delete(name)
      else next.set(name, value)
    }
    const sid = getSessionId()
    if (sid) next.set('sid', sid)
    setParams(next, options)
  }]
}

export function ProjectScope({ children, missing }) {
  const { data } = useStore()
  const { pathname } = useLocation()
  // Split the encoded pathname before decoding IDs that may contain slashes.
  const parts = pathname.replace(/\/+$/, '').split('/')
  const [, org, slug, section, ...route] = parts.map(decodeSegment)
  const projects = orgProjects(data)
  const project = projects.find((row) => row.slug === slug || row.id === slug)
  if (!project || ![data.organization?.slug, data.organization?.id].includes(org)) return missing
  const teams = scoped(data.teams, project.id)
  const defaultTeam = find(teams, project.defaultTeamId) ?? teams[0]
  const teamViews = { _boards: 'board', _backlogs: 'backlog', _sprints: 'backlog' }
  const teamId = teamViews[section] === route[0] ? route[1] : undefined
  const team = teamId ? find(teams, teamId) : defaultTeam
  const sprints = sprintChoices(data, project.id, team?.id)
  const sprint = find(sprints, team?.defaultSprintId) ?? sprints[0]
  const context = { project, teams, team, defaultTeam, sprints, sprint, section, route,
    base: parts.slice(0, 3).join('/') }
  return <ProjectContext.Provider value={context}>{children}</ProjectContext.Provider>
}
