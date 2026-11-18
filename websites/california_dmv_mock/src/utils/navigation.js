import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { withSid } from './dataManager'

export function useSiteNavigate() {
  const navigate = useNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function useWizard(fallback) {
  const [params, setParams] = useSearchParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const step = params.get('step') || fallback

  function go(next, back = false) {
    if (back && state?.wizardPrevious === next) {
      navigate(-1)
      return
    }
    const updated = new URLSearchParams(params)
    if (next === fallback) updated.delete('step')
    else updated.set('step', next)
    setParams(updated, { replace: back, state: back ? null : { wizardPrevious: step } })
  }
  return [step, go]
}
