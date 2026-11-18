import { projectPath } from '../components/navigation.jsx'
import { Unavailable } from '../components/ui.jsx'
import { useProject } from '../store.jsx'

export function PendingTool({ title }) {
  const project = useProject()
  return <Unavailable title={`${title} unavailable`} to={projectPath(project)} label="Back to project" />
}
