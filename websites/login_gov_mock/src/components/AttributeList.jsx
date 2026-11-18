import { attributeLabel, attributes } from '../data/selectors.js'

export function AttributeList({ value }) {
  const names = attributes(value)
  return names.length
    ? <ul className="attributes">{names.map((name, index) => <li key={index}>{attributeLabel(name)}</li>)}</ul>
    : <p className="meta">No fields listed.</p>
}
