import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { contractTypes, find, label, list, money, newId } from '../data/model.js'
import { agreementError, contractUnits, saveContract, termsError } from '../data/contracts.js'
import { DateText, ErrorText, Facts, Field, Missing, PageTitle, Panel, recordPath, RouteLink, Select, useGo } from '../components/ui.jsx'
import { termsText } from './Contracts.jsx'

const steps = ['Worker and agreement', 'Payment terms', 'Review']
const emptyMilestone = () => ({ id: newId('ms'), title: '', amount: '', dueDate: '' })
const value = input => input == null ? '' : String(input)

export default function ContractForm() {
  const { state } = useWorkspace()
  const { id } = useParams()
  const existing = find(state.contracts, id)
  if (id && !existing) return <Missing noun="Contract" back={['/contracts', 'Back to contracts']} />
  if (existing && existing.status !== 'draft') return <Missing noun="Draft" back={[recordPath('/contracts', id), 'Back to contract']} />
  return <Editor key={id || 'new'} existing={existing} />
}

function Editor({ existing }) {
  const { state, commit } = useWorkspace()
  const go = useGo()
  const heading = useRef(null)
  const saving = useRef(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => ({
    title: value(existing?.title), scope: value(existing?.scope), workerId: value(existing?.workerId),
    legalEntityId: value(existing?.legalEntityId), type: existing?.type || 'fixed_rate',
    startDate: value(existing?.startDate), endDate: value(existing?.endDate),
    name: '', email: '', country: '', role: '', currency: existing?.currency || state.organization?.defaultCurrency || 'USD',
    rate: value(existing?.rate), rateUnit: existing?.rateUnit || contractUnits[existing?.type]?.[0] || 'month',
    noticeDays: existing?.noticeDays ?? 14,
    milestones: list(existing?.milestones).map(item => ({ id: item.id || newId('ms'), title: value(item.title), amount: value(item.amount), dueDate: value(item.dueDate) })),
  }))
  const back = existing ? [recordPath('/contracts', existing.id), 'Back to contract'] : ['/contracts', 'Back to contracts']
  const entities = list(state.legalEntities).filter(item => item.id)
  const contractors = list(state.workers).filter(item => item.type === 'contractor' && item.id)
  const update = (key, next) => setForm(previous => ({ ...previous, [key]: next }))
  const input = (title, key, props = {}) => <Field label={title}><input {...props} value={form[key]} onChange={event => update(key, event.target.value)} /></Field>
  const milestoneFields = form.milestones
  const initialStep = useRef(true)
  useEffect(() => {
    if (initialStep.current) initialStep.current = false
    else heading.current?.focus()
  }, [step])

  function changeType(type) {
    setForm(previous => ({
      ...previous, type, rate: '', rateUnit: contractUnits[type]?.[0] || '',
      milestones: type === 'milestone' && !previous.milestones.length ? [emptyMilestone()] : previous.milestones,
    }))
  }

  function editMilestone(id, key, next) {
    update('milestones', form.milestones.map(item => item.id === id ? { ...item, [key]: next } : item))
  }

  function advance(event) {
    event.preventDefault()
    const nextError = step === 0 ? agreementError(form, state) : termsError(form)
    setError(nextError)
    if (!nextError) setStep(step + 1)
  }

  async function save(send) {
    if (saving.current) return
    saving.current = true
    const result = await commit(saveContract(form, existing?.id, send))
    if (result.error) {
      setError(result.error)
      saving.current = false
    } else {
      go(recordPath('/contracts', result.id), { replace: true })
    }
  }

  return <>
    <PageTitle title={existing ? 'Edit draft' : 'Create contract'} back={back} />
    <ol className="steps" aria-label="Contract steps">{steps.map((name, index) =>
      <li key={name} aria-current={index === step ? 'step' : undefined}>{name}</li>)}</ol>
    <Panel className="form-panel">
      <h2 className="panel-heading" tabIndex={-1} ref={heading}>{steps[step]}</h2>
      <form onSubmit={step < 2 ? advance : event => event.preventDefault()}>
        {step === 0 && <div className="form-grid">
          <Select label="Contractor" value={form.workerId} onChange={value => update('workerId', value)}
            options={[[ '', 'Select a contractor'], ...contractors.map(item => [item.id, item.name || item.email || item.id]), ...(!existing ? [['new', 'Add a new contractor']] : [])]} />
          {form.workerId === 'new' && <fieldset className="full"><legend>New contractor</legend><div className="form-grid">
            {input('Full name', 'name', { required: true })}{input('Email', 'email', { type: 'email', required: true })}
            {input('Country', 'country', { required: true })}{input('Role', 'role', { required: true })}
          </div></fieldset>}
          <Select label="Legal entity" value={form.legalEntityId} onChange={value => update('legalEntityId', value)}
            options={[[ '', 'Select a legal entity'], ...entities.map(item => [item.id, item.name || item.id])]} />
          {input('Agreement title', 'title', { required: true })}
          <Select label="Contract type" value={form.type} onChange={changeType} options={Object.entries(contractTypes)} />
          {input('Start date', 'startDate', { type: 'date', required: true })}
          {input('End date (optional)', 'endDate', { type: 'date', min: form.startDate || undefined })}
          <div className="full"><Field label="Scope"><textarea required value={form.scope} onChange={event => update('scope', event.target.value)} /></Field></div>
        </div>}
        {step === 1 && <div className="form-grid">
          {input('Currency', 'currency', { required: true, maxLength: 3, placeholder: 'USD' })}
          {input('Notice days', 'noticeDays', { type: 'number', min: 0, step: 1, required: true })}
          {form.type === 'milestone' ? <>
            {milestoneFields.map((item, index) => <fieldset className="full" key={item.id}><legend>Milestone {index + 1}</legend>
              <div className="form-grid">
                <Field label="Milestone title"><input required value={item.title} onChange={event => editMilestone(item.id, 'title', event.target.value)} /></Field>
                <Field label="Milestone amount"><input required type="number" min=".01" step=".01" value={item.amount} onChange={event => editMilestone(item.id, 'amount', event.target.value)} /></Field>
                <Field label="Milestone due date (optional)"><input type="date" value={item.dueDate} onChange={event => editMilestone(item.id, 'dueDate', event.target.value)} /></Field>
                {milestoneFields.length > 1 && <div className="actions"><button type="button" onClick={() => update('milestones', milestoneFields.filter(other => other.id !== item.id))}>Remove milestone {index + 1}</button></div>}
              </div>
            </fieldset>)}
            <div className="full"><button type="button" onClick={() => update('milestones', [...milestoneFields, emptyMilestone()])}>Add milestone</button></div>
          </> : <>
            {input(form.type === 'fixed_rate' ? 'Rate' : 'Rate (optional)', 'rate', { type: 'number', min: '.01', step: '.01', required: form.type === 'fixed_rate' })}
            <Select label="Rate unit" value={form.rateUnit} onChange={value => update('rateUnit', value)}
              options={(contractUnits[form.type] || []).map(unit => [unit, unit[0].toUpperCase() + unit.slice(1)])} />
          </>}
        </div>}
        {step === 2 && <>
          <Facts entries={[
            ['Agreement', form.title], ['Contractor', form.workerId === 'new' ? form.name : find(state.workers, form.workerId)?.name],
            ['Contract type', label(form.type)], ['Legal entity', find(state.legalEntities, form.legalEntityId)?.name],
            ['Start date', <DateText value={form.startDate} />], ['End date', <DateText value={form.endDate} />],
            ['Currency', form.currency], ['Notice period', form.noticeDays + ' days'], ['Payment terms', termsText(form)],
          ]} />
          <p className="prose">{form.scope}</p>
          {form.type === 'milestone' && <ul className="compact-list prose">{milestoneFields.map(item =>
            <li key={item.id}><span>{item.title}</span><DateText value={item.dueDate} /><strong>{money(item.amount, form.currency)}</strong></li>)}</ul>}
        </>}
        <ErrorText message={error} />
        <div className="actions form-actions">
          {step > 0 ? <button type="button" onClick={() => { setError(''); setStep(step - 1) }}>Back</button>
            : <RouteLink className="button" to={back[0]}>Cancel</RouteLink>}
          {step < 2 ? <button key="continue" className="primary">{step === 0 ? 'Continue' : 'Review contract'}</button> : <>
            <button type="button" onClick={() => save(false)}>Save draft</button>
            <button type="button" className="primary" onClick={() => save(true)}>Sign and send</button>
          </>}
        </div>
      </form>
    </Panel>
  </>
}
