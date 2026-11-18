import { cloneElement, useId, useLayoutEffect, useRef } from 'react'
import { Link as RouterLink, NavLink as RouterNavLink, useNavigate as useRouterNavigate } from 'react-router-dom'
import { withSid } from './utils/dataManager'
import { label } from './workspace'

const icons = {
  home: 'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',
  model: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M4 7.5l8 5 8-5 M12 13v8',
  dataset: 'M4 6c0-4 16-4 16 0s-16 4-16 0z M4 6v6c0 4 16 4 16 0V6 M4 12v6c0 4 16 4 16 0v-6',
  space: 'M4 4h16v16H4z M4 8h16 M9 11l6 3-6 3z',
  access: 'M13 14a5 5 0 1 0-3-5l-7 7v4h4v-3h3z M16 8h.01',
  activity: 'M3 13h4l3-8 3 14 3-6h5',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  chevron: 'M9 5l7 7-7 7',
  arrow: 'M4 12h15 M13 6l6 6-6 6',
  plus: 'M12 4v16 M4 12h16',
  search: 'M17 10a7 7 0 1 0-14 0 7 7 0 0 0 14 0z M15 15l6 6',
  heart: 'M12 21s-9-5-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12z',
  check: 'M4 12l5 5L20 6',
  file: 'M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h8',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
}

export function Icon({ name, size = 19 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={icons[name]} /></svg>
}

export function Link({ to, ...props }) {
  return <RouterLink to={withSid(to)} {...props} />
}

export function NavLink({ to, ...props }) {
  return <RouterNavLink to={withSid(to)} {...props} />
}

export function useNavigate() {
  const navigate = useRouterNavigate()
  return (to, options) => navigate(withSid(to), options)
}

export function Badge({ value }) {
  return <span className={'badge badge-' + (value || 'unknown')}>{label(value)}</span>
}

export function Field({ title, children, hint, search }) {
  const id = useId()
  const control = cloneElement(children, { id, 'aria-describedby': hint ? id + '-hint' : undefined })
  return <div className="field">
    <label htmlFor={id}>{title}</label>
    {search ? <span className="search-input"><Icon name="search" />{control}<kbd aria-hidden="true">Ctrl K</kbd></span> : control}
    {hint && <small id={id + '-hint'}>{hint}</small>}
  </div>
}

export function SelectField({ title, value, onChange, options, first }) {
  return <Field title={title}><select value={value} onChange={(event) => onChange(event.target.value)}>
    {first && <option value="">{first}</option>}
    {options.map((option) => <option key={option} value={option}>{label(option)}</option>)}
  </select></Field>
}

export function Dialog({ title, children, onClose }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}><h2 id="dialog-title">{title}</h2>{children}</dialog>
}
