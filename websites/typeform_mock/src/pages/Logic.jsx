import { useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, GitBranch, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAccount } from '../state.jsx'
import { answerText, draftOf, endingTitle, items, newId, operators, questionTitle, types, validRule } from '../model.js'
import { Confirm, Dialog, Empty, FormHeader } from '../ui.jsx'

function ruleCaption(rule, questions) {
  if (!rule.condition) return 'When no conditions match'
  const question = questions.find((entry) => entry.id === rule.condition.questionId)
  const choiceLabel = items(question?.choices).find((choice) => choice.id === rule.condition.value)?.label
  return questionTitle(question) + ' ' + (operators[rule.condition.operator] || rule.condition.operator) + ' “' +
    answerText({ value: rule.condition.value, choiceLabel }) + '”'
}

function targetCaption(rule, questions, endings) {
  if (rule.destination?.type === 'ending') {
    const ending = endings.find((entry) => entry.id === rule.destination.id)
    return ending ? 'Ending · ' + endingTitle(ending) : 'Missing ending'
  }
  const index = questions.findIndex((entry) => entry.id === rule.destination?.id)
  return index >= 0 ? 'Q' + (index + 1) + ' · ' + questionTitle(questions[index]) : 'Missing question'
}

function makeTarget(type, id) {
  return JSON.stringify({ type, id })
}

function ruleOrder(questions, rules) {
  const ordered = [...rules]
  const sourceOrder = new Map(questions.map((question, index) => [question.id, index]))
  return ordered.sort((a, b) => {
    const first = sourceOrder.get(a.sourceQuestionId) ?? questions.length
    const second = sourceOrder.get(b.sourceQuestionId) ?? questions.length
    return first - second || Number(a.condition === null) - Number(b.condition === null)
  })
}

function RuleDialog({ source, rule, questions, endings, logic, onSave, onClose }) {
  const sourceIndex = questions.findIndex((entry) => entry.id === source.id)
  const [fallback, setFallback] = useState(rule?.condition === null)
  const [conditionId, setConditionId] = useState(rule?.condition?.questionId || source.id)
  const [operator, setOperator] = useState(rule?.condition?.operator || 'equals')
  const [value, setValue] = useState(rule?.condition ? String(rule.condition.value ?? '') : '')
  const [target, setTarget] = useState(rule?.destination ? makeTarget(rule.destination.type, rule.destination.id) : '')
  const [error, setError] = useState('')
  const conditionQuestions = questions.slice(0, sourceIndex + 1)
  const conditionQuestion = conditionQuestions.find((question) => question.id === conditionId)
  const type = conditionQuestion?.type
  const choices = type === 'multiple_choice' ? items(conditionQuestion.choices).map((choice) => [choice.id, choice.label]) :
    type === 'yes_no' ? [['true', 'Yes'], ['false', 'No']] : null
  const targets = [
    ...questions.slice(sourceIndex + 1).map((question, index) => [makeTarget('question', question.id), 'Q' + (sourceIndex + index + 2) + ' · ' + questionTitle(question)]),
    ...endings.map((ending) => [makeTarget('ending', ending.id), 'Ending · ' + endingTitle(ending)]),
  ]
  const otherFallback = logic.some((entry) => entry.sourceQuestionId === source.id && entry.condition === null && entry.id !== rule?.id)
  const supportedOperators = type === 'number' ? Object.entries(operators) : Object.entries(operators).slice(0, 2)

  function save(event) {
    event.preventDefault()
    if (!targets.some(([key]) => key === target)) return setError('Choose a later question or an ending.')
    if (fallback && otherFallback) return setError('This question already has a fallback.')
    if (!fallback && (!value.trim() || (choices && !choices.some(([key]) => key === value)))) return setError('Enter or choose a comparison answer.')
    const typedValue = type === 'number' ? Number(value) : type === 'yes_no' ? value === 'true' : value.trim()
    const entry = {
      ...rule,
      id: rule?.id || newId('lr'),
      sourceQuestionId: source.id,
      condition: fallback ? null : { ...rule?.condition, questionId: conditionId, operator, value: typedValue },
      destination: { ...rule?.destination, ...JSON.parse(target) },
    }
    if (!validRule(entry, questions, endings)) return setError('Choose a valid comparison and a forward destination.')
    onSave(entry)
  }

  return <Dialog title={rule ? 'Edit branch rule' : 'Add branch rule'} onClose={onClose}>
    <form className="rule-fields" onSubmit={save} noValidate>
      <p className="muted">After Q{sourceIndex + 1} · {questionTitle(source)}</p>
      <label className="field">Rule type<select value={fallback ? 'fallback' : 'condition'} onChange={(event) => setFallback(event.target.value === 'fallback')} autoFocus>
        <option value="condition">Matching answer</option><option value="fallback" disabled={otherFallback && !fallback}>Fallback</option>
      </select></label>
      {!fallback && <>
        <label className="field">Condition question<select value={conditionId} onChange={(event) => { setConditionId(event.target.value); setValue(''); setOperator('equals') }}>
          {conditionQuestions.map((entry, index) => <option key={entry.id} value={entry.id}>Q{index + 1} · {questionTitle(entry)}</option>)}
        </select></label>
        <label className="field">Comparison<select value={operator} onChange={(event) => setOperator(event.target.value)}>
          {supportedOperators.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label className="field">Answer to match{choices ? <select value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="">Choose an answer</option>{choices.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select> : <input type={type === 'number' ? 'number' : 'text'} step="any" value={value} onChange={(event) => setValue(event.target.value)} />}</label>
      </>}
      <label className="field">Go to<select value={target} onChange={(event) => setTarget(event.target.value)}>
        <option value="">Choose a destination</option>{targets.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary">Save rule</button></div>
    </form>
  </Dialog>
}

export default function Logic({ form, workspace }) {
  const { editForm } = useAccount()
  const { questions, endings, logic } = draftOf(form)
  const [selectedId, setSelectedId] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [notice, setNotice] = useState('')
  const source = questions.find((entry) => entry.id === selectedId) || questions[0]
  const group = logic.filter((rule) => rule.sourceQuestionId === source?.id)
  const rules = ruleOrder(questions, group)
  const orphaned = logic.filter((rule) => !questions.some((question) => question.id === rule.sourceQuestionId))

  function save(next, ids, message) {
    const ordered = ruleOrder(questions, next)
    if (editForm(form.id, 'logic_updated', (current) => JSON.stringify(items(current.logic)) === JSON.stringify(ordered) ? null :
      { fields: { logic: ordered }, entityIds: ids })) setNotice(message)
    setDialog(null)
    setDeleting(null)
  }

  function move(from, to) {
    const first = logic.indexOf(rules[from])
    const second = logic.indexOf(rules[to])
    const reordered = [...logic]
    reordered[first] = rules[to]
    reordered[second] = rules[from]
    save(reordered, [rules[from].id], 'Rule order saved.')
  }

  return <>
    <FormHeader form={form} workspace={workspace} />
    <div className="section-heading"><div><h2>Branching logic</h2><p className="muted">Set where people go after each question.</p></div>
      {questions.length > 0 && <button onClick={() => setShowMap(!showMap)} aria-pressed={showMap}><GitBranch size={17} />{showMap ? 'Hide branch diagram' : 'Branch diagram'}</button>}
    </div>
    {notice && <p className="notice" role="status">{notice}</p>}
    {showMap && <section className="panel logic-map" aria-label="Branch diagram">
      {questions.map((question, index) => <div key={question.id}>
        <button onClick={() => { setSelectedId(question.id); setShowMap(false) }}>Q{index + 1} · {questionTitle(question)}</button>
        <div className="map-edges">{ruleOrder(questions, logic.filter((rule) => rule.sourceQuestionId === question.id)).map((rule) =>
          <button key={rule.id} onClick={() => { setSelectedId(question.id); setDialog({ source: question, rule }) }}>
            <ArrowRight size={16} />{targetCaption(rule, questions, endings)}
          </button>)}
          {!logic.some((rule) => rule.sourceQuestionId === question.id && rule.condition === null) && <span><ArrowRight size={16} />
            {questions[index + 1] ? 'Next question' : 'Default ending'}</span>}
        </div>
      </div>)}
    </section>}
    {source ? <div className="build-grid">
      <aside className="panel editor-index">
        <div className="index-heading"><h2>Questions</h2><span className="count">{questions.length}</span></div>
        <ol>{questions.map((question, index) => <li key={question.id}><button className={source.id === question.id ? 'active' : ''} aria-pressed={source.id === question.id}
          onClick={() => { setSelectedId(question.id); setNotice('') }}><span>{String(index + 1).padStart(2, '0')}</span><span>{questionTitle(question)}</span></button></li>)}</ol>
      </aside>
      <section className="panel editor logic-editor">
        <header className="editor-heading">
          <div><div className="eyebrow">Question {questions.indexOf(source) + 1} · {types[source.type] || 'Question'}</div><h2>{questionTitle(source)}</h2></div>
          <button className="primary" onClick={() => setDialog({ source })}><Plus size={17} /> Add rule</button>
        </header>
        <div className="rule-list">
          {rules.length === 0 ? <p className="muted">No branch rules. People continue in question order.</p> : rules.map((rule, index) => <article className="rule-card" key={rule.id}>
            <div><div className={'rule-kind' + (rule.condition === null ? ' fallback' : '')}>{rule.condition === null ? 'Fallback' : 'Rule ' + (index + 1)}</div>
              <h3>{ruleCaption(rule, questions)}</h3>
              <p className="rule-target"><ArrowRight size={16} />{targetCaption(rule, questions, endings)}</p>
              {!validRule(rule, questions, endings) && <p className="error">This rule has an invalid reference or comparison.</p>}
            </div>
            <div className="editor-actions">
              <button className="icon-button" aria-label={'Move rule ' + (index + 1) + ' up'} disabled={index === 0 || rule.condition === null || rules[index - 1]?.condition === null}
                onClick={() => move(index, index - 1)}><ArrowUp size={16} /></button>
              <button className="icon-button" aria-label={'Move rule ' + (index + 1) + ' down'} disabled={index === rules.length - 1 || rule.condition === null || rules[index + 1]?.condition === null}
                onClick={() => move(index, index + 1)}><ArrowDown size={16} /></button>
              <button className="icon-button" aria-label={'Edit rule ' + (index + 1)} onClick={() => setDialog({ source, rule })}><Pencil size={16} /></button>
              <button className="icon-button text-danger" aria-label={'Delete rule ' + (index + 1)} onClick={() => setDeleting(rule)}><Trash2 size={16} /></button>
            </div>
          </article>)}
          {rules.length > 0 && !rules.some((rule) => rule.condition === null) && <p className="muted">If no rule matches, continue to the next question or default ending.</p>}
        </div>
      </section>
    </div> : <section className="panel"><Empty title="No questions to branch from">Add questions in Build to start creating paths.</Empty></section>}
    {orphaned.length > 0 && <section className="panel rule-list">
      <h2>Rules with missing source questions</h2>
      {orphaned.map((rule) => <div key={rule.id} className="rule-card"><span>{rule.sourceQuestionId || 'Missing source'}</span>
        <button className="text-danger" onClick={() => setDeleting(rule)}>Delete rule</button></div>)}
    </section>}
    {dialog && <RuleDialog {...dialog} questions={questions} endings={endings} logic={logic} onClose={() => setDialog(null)} onSave={(entry) =>
      save(dialog.rule ? logic.map((rule) => rule.id === entry.id ? entry : rule) : [...logic, entry], [entry.id], 'Branch rule saved.')} />}
    {deleting && <Confirm title="Delete branch rule?" description={ruleCaption(deleting, questions) + ' will be removed.'}
      label="Delete rule" onClose={() => setDeleting(null)} onConfirm={() => save(logic.filter((rule) => rule.id !== deleting.id), [deleting.id], 'Branch rule deleted.')} />}
  </>
}
