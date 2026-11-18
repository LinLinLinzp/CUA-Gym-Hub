import { useMemo, useState } from 'react'
import { modes, styles, useCitationActions } from './Citations.jsx'
import { creatorsOf } from '../utils/model.js'
import { formatOutput } from '../utils/citationFormat.js'
import apa from '../data/csl/apa.csl?raw'
import mla from '../data/csl/modern-language-association.csl?raw'
import chicago from '../data/csl/chicago-author-date.csl?raw'
import english from '../data/csl/locales-en-US.xml?raw'
import { Dialog, Tile } from './ui.jsx'

const xml = { 'apa-7': apa, 'mla-9': mla, 'chicago-author-date': chicago }

export default function CitationComposer({ items, libraryId, close }) {
  const { run, pending } = useCitationActions()
  const [style, setStyle] = useState('apa-7')
  const [mode, setMode] = useState('citation')
  const [draft, setDraft] = useState({})
  const [actionError, setActionError] = useState('')
  const preview = useMemo(() => {
    const locators = mode === 'citation' ? items.flatMap(({ id }) => {
      const entry = draft[id]
      return entry?.value?.trim() ? [{ itemId: id, label: entry.label ?? 'page', value: entry.value.trim() }] : []
    }) : []
    try {
      return { locators, output: formatOutput(items, xml[style], english, mode, locators) }
    } catch {
      return { locators, output: '', error: 'The selected references could not be formatted.' }
    }
  }, [draft, items, mode, style])

  function locator(id, update) {
    setDraft((previous) => ({ ...previous, [id]: { ...previous[id], ...update } }))
  }
  async function finish(action) {
    setActionError('')
    const completed = await run({
      libraryId, itemIds: items.map((item) => item.id), locators: preview.locators, mode, style, output: preview.output,
    }, action)
    if (completed) close()
    else setActionError(action === 'copied' ? 'Clipboard access failed. Try again or download the text.' : 'This action could not be completed.')
  }

  return <Dialog title="Create citation" close={pending ? () => {} : close} wide>
    <div className="form citation-form">
      <div className="form-grid">
        <label>Citation style<select aria-label="Citation style" data-initial-focus disabled={pending} value={style} onChange={(event) => setStyle(event.target.value)}>
          {Object.entries(styles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Output<select aria-label="Output" value={mode} disabled={pending} onChange={(event) => setMode(event.target.value)}>
          {Object.entries(modes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </div>
      <div className="citation-references">
        {items.map((item, index) => <div className="citation-reference" key={item.id}>
          <div className="reference-summary"><Tile type={item.itemType} /><div><strong>{item.title || 'Untitled reference'}</strong><span className="muted">{creatorsOf(item)}</span></div></div>
          {mode === 'citation' && <div className="locator-fields">
            <label>Locator type<select aria-label={'Locator type for reference ' + (index + 1)} disabled={pending}
              value={draft[item.id]?.label ?? 'page'} onChange={(event) => locator(item.id, { label: event.target.value })}>
              <option value="page">Page</option><option value="chapter">Chapter</option><option value="section">Section</option>
            </select></label>
            <label>Locator<input aria-label={'Locator for reference ' + (index + 1)} disabled={pending} placeholder="Optional" value={draft[item.id]?.value ?? ''}
              onChange={(event) => locator(item.id, { value: event.target.value })} /></label>
          </div>}
        </div>)}
      </div>
      <section className="preview-paper" aria-label="Citation preview"><h3>Preview</h3><p className="output-text">{preview.output || 'No preview available.'}</p></section>
      {(preview.error || actionError) && <p className="field-error" role="alert">{preview.error || actionError}</p>}
      <div className="form-actions">
        <button disabled={pending} onClick={close}>Cancel</button>
        <button disabled={!preview.output || pending} onClick={() => finish('copied')}>Copy</button>
        <button disabled={!preview.output || pending} onClick={() => finish('downloaded')}>Download</button>
        <button className="primary" disabled={!preview.output || pending} onClick={() => finish('saved')}>Save to History</button>
      </div>
    </div>
  </Dialog>
}
