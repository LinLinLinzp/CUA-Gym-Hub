import { useId } from 'react'

const ratings = [1, 2, 3, 4, 5]

export function AnswerFields({ questions, answers, onChange, errors, allowClear }) {
  const prefix = useId()
  return questions.map((question, index) => {
    const value = answers[question.id]
    const inputId = prefix + '-answer-' + index
    const error = errors[question.id]
    const errorId = error ? inputId + '-error' : undefined
    const prompt = question.prompt || 'Untitled question'
    const options = question.options ?? []
    const chosen = Array.isArray(value) ? value : []
    const caption = <><span className="answer-number">{index + 1}.</span> {prompt}
      {question.required && <span className="required-mark">Required</span>}</>

    return <fieldset className="answer-card" key={question.id} aria-describedby={errorId} data-invalid={error ? true : undefined}>
      <legend>{caption}</legend>
      {question.type === 'openText' && <textarea id={inputId} aria-label={prompt} aria-required={Boolean(question.required)}
        value={value ?? ''} onChange={event => onChange(question.id, event.target.value)} rows={4} aria-invalid={Boolean(error)} aria-describedby={errorId}/>}
      {(question.type === 'multipleChoice' || question.type === 'checkboxes') &&
        (options.length ? options.map(option => {
          const multiple = question.type === 'checkboxes'
          const checked = multiple ? chosen.includes(option.id) : value === option.id
          return <label className="answer-option" key={option.id}>
            <input type={multiple ? 'checkbox' : 'radio'} name={inputId} checked={checked} aria-describedby={errorId}
              onChange={() => onChange(question.id, multiple ? (checked ? chosen.filter(id => id !== option.id) : [...chosen, option.id]) : option.id)}/>
            {option.label || 'Untitled choice'}
          </label>
        }) : <p className="muted">No choices available.</p>)}
      {question.type === 'rating' && <div className="rating-input">
        {ratings.map(number => <label key={number}>
          <input type="radio" name={inputId} checked={value === number} onChange={() => onChange(question.id, number)} aria-describedby={errorId}/>
          <span>{number}</span>
        </label>)}
      </div>}
      {allowClear?.(question) && (question.type === 'multipleChoice' || question.type === 'rating') && value != null && <button type="button" className="button text" onClick={() => onChange(question.id, undefined)}>Clear answer</button>}
      {error && <p className="error" id={errorId} role="alert">{error}</p>}
    </fieldset>
  })
}

export function focusAnswerError(form, errors) {
  requestAnimationFrame(() => {
    if (errors.email) form.querySelector('input[type=email]')?.focus()
    else form.querySelector('[data-invalid=true] input, [data-invalid=true] textarea')?.focus()
  })
}
